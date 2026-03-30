// API Routes for /api/contest/*
const { Pool } = require('@neondatabase/serverless');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper to send JSON response
const sendJSON = (res, status, data) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
};

// Health check
const healthHandler = async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    sendJSON(res, 200, { success: true, message: 'Writing Contest API is running', database: 'connected' });
  } catch (error) {
    sendJSON(res, 500, { success: false, message: 'Database connection failed', error: error.message });
  }
};

// Get all districts
const getDistricts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM districts ORDER BY id');
    sendJSON(res, 200, { success: true, data: result.rows });
  } catch (error) {
    sendJSON(res, 500, { success: false, message: 'Failed to fetch districts', error: error.message });
  }
};

// Get district stats
const getDistrictStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.name, d.quota, d.code,
             COUNT(r.id) as registered_count,
             d.quota - COUNT(r.id) as remaining
      FROM districts d
      LEFT JOIN registrations r ON d.id = r.district_id
      GROUP BY d.id, d.name, d.quota, d.code
      ORDER BY d.id
    `);
    sendJSON(res, 200, { success: true, data: result.rows });
  } catch (error) {
    sendJSON(res, 500, { success: false, message: 'Failed to fetch stats', error: error.message });
  }
};

// Get all registrations
const getRegistrations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, d.name as district_name, d.code as district_code
      FROM registrations r
      JOIN districts d ON r.district_id = d.id
      ORDER BY r.created_at DESC
    `);
    sendJSON(res, 200, { success: true, data: result.rows });
  } catch (error) {
    sendJSON(res, 500, { success: false, message: 'Failed to fetch registrations', error: error.message });
  }
};

// Search registrations
const searchRegistrations = async (req, res, query) => {
  try {
    const { ticket_number, student_name, school } = query;
    
    let sql = `
      SELECT r.*, d.name as district_name, d.code as district_code
      FROM registrations r
      JOIN districts d ON r.district_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (ticket_number) {
      sql += ` AND r.ticket_number ILIKE $${paramIndex}`;
      params.push(`%${ticket_number}%`);
      paramIndex++;
    }
    if (student_name) {
      sql += ` AND r.student_name ILIKE $${paramIndex}`;
      params.push(`%${student_name}%`);
      paramIndex++;
    }
    if (school) {
      sql += ` AND r.school ILIKE $${paramIndex}`;
      params.push(`%${school}%`);
      paramIndex++;
    }

    sql += ' ORDER BY r.created_at DESC';

    const result = await pool.query(sql, params);
    sendJSON(res, 200, { success: true, data: result.rows });
  } catch (error) {
    sendJSON(res, 500, { success: false, message: 'Search failed', error: error.message });
  }
};

// Create registration
const createRegistration = async (req, res) => {
  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    const { district_id, student_name, school, teacher_name, teacher_phone } = body;

    // Check quota
    const quotaCheck = await pool.query(
      'SELECT quota FROM districts WHERE id = $1',
      [district_id]
    );
    
    if (quotaCheck.rows.length === 0) {
      return sendJSON(res, 400, { success: false, message: 'Invalid district' });
    }

    const currentCount = await pool.query(
      'SELECT COUNT(*) FROM registrations WHERE district_id = $1',
      [district_id]
    );

    if (parseInt(currentCount.rows[0].count) >= quotaCheck.rows[0].quota) {
      return sendJSON(res, 400, { success: false, message: 'District quota exceeded' });
    }

    // Generate ticket number
    const districtCode = (await pool.query('SELECT code FROM districts WHERE id = $1', [district_id])).rows[0].code;
    const sequence = parseInt(currentCount.rows[0].count) + 1;
    const ticketNumber = `20260412${districtCode}${String(sequence).padStart(3, '0')}`;

    const result = await pool.query(
      `INSERT INTO registrations (district_id, student_name, school, teacher_name, teacher_phone, ticket_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [district_id, student_name, school, teacher_name, teacher_phone, ticketNumber]
    );

    sendJSON(res, 201, { success: true, data: result.rows[0] });
  } catch (error) {
    sendJSON(res, 500, { success: false, message: 'Failed to create registration', error: error.message });
  }
};

// Create multiple registrations
const createBatchRegistrations = async (req, res) => {
  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    const { district_id, students } = body;

    // Check quota
    const quotaCheck = await pool.query(
      'SELECT quota, code FROM districts WHERE id = $1',
      [district_id]
    );
    
    if (quotaCheck.rows.length === 0) {
      return sendJSON(res, 400, { success: false, message: 'Invalid district' });
    }

    const currentCount = await pool.query(
      'SELECT COUNT(*) FROM registrations WHERE district_id = $1',
      [district_id]
    );

    const remainingQuota = quotaCheck.rows[0].quota - parseInt(currentCount.rows[0].count);
    
    if (students.length > remainingQuota) {
      return sendJSON(res, 400, { 
        success: false, 
        message: `Only ${remainingQuota} spots remaining, but ${students.length} students provided` 
      });
    }

    const results = [];
    const districtCode = quotaCheck.rows[0].code;
    let sequence = parseInt(currentCount.rows[0].count) + 1;

    for (const student of students) {
      const ticketNumber = `20260412${districtCode}${String(sequence).padStart(3, '0')}`;
      
      const result = await pool.query(
        `INSERT INTO registrations (district_id, student_name, school, teacher_name, teacher_phone, ticket_number)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [district_id, student.student_name, student.school, student.teacher_name, student.teacher_phone, ticketNumber]
      );
      
      results.push(result.rows[0]);
      sequence++;
    }

    sendJSON(res, 201, { success: true, data: results });
  } catch (error) {
    sendJSON(res, 500, { success: false, message: 'Failed to create registrations', error: error.message });
  }
};

// Main handler
module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  // Route handling
  try {
    if (pathname === '/api/contest/health' && method === 'GET') {
      await healthHandler(req, res);
    } else if (pathname === '/api/contest/districts' && method === 'GET') {
      await getDistricts(req, res);
    } else if (pathname === '/api/contest/districts/stats' && method === 'GET') {
      await getDistrictStats(req, res);
    } else if (pathname === '/api/contest/registrations' && method === 'GET') {
      const query = Object.fromEntries(url.searchParams);
      if (query.ticket_number || query.student_name || query.school) {
        await searchRegistrations(req, res, query);
      } else {
        await getRegistrations(req, res);
      }
    } else if (pathname === '/api/contest/registrations' && method === 'POST') {
      await createRegistration(req, res);
    } else if (pathname === '/api/contest/registrations/batch' && method === 'POST') {
      await createBatchRegistrations(req, res);
    } else {
      sendJSON(res, 404, { success: false, message: 'Not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    sendJSON(res, 500, { success: false, message: 'Internal server error', error: error.message });
  }
};