import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { path } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : path || '';

  try {
    // Health check
    if (pathStr === 'health') {
      await pool.query('SELECT NOW()');
      return res.status(200).json({
        success: true,
        message: 'Writing Contest API is running',
        database: 'connected'
      });
    }

    // Get all districts
    if (pathStr === 'districts') {
      const result = await pool.query('SELECT * FROM districts ORDER BY id');
      return res.status(200).json({ success: true, data: result.rows });
    }

    // Get district stats
    if (pathStr === 'districts/stats') {
      const result = await pool.query(`
        SELECT d.id, d.name, d.quota, d.code,
               COUNT(r.id) as registered_count,
               d.quota - COUNT(r.id) as remaining
        FROM districts d
        LEFT JOIN registrations r ON d.id = r.district_id
        GROUP BY d.id, d.name, d.quota, d.code
        ORDER BY d.id
      `);
      return res.status(200).json({ success: true, data: result.rows });
    }

    // Search or get registrations
    if (pathStr === 'registrations') {
      if (req.method === 'GET') {
        const { ticket_number, student_name, school } = req.query;
        
        let sql = `
          SELECT r.*, d.name as district_name, d.code as district_code
          FROM registrations r
          JOIN districts d ON r.district_id = d.id
          WHERE 1=1
        `;
        const params: any[] = [];
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
        return res.status(200).json({ success: true, data: result.rows });
      }

      if (req.method === 'POST') {
        const { district_id, student_name, school, teacher_name, teacher_phone } = req.body;

        // Check quota
        const quotaCheck = await pool.query(
          'SELECT quota FROM districts WHERE id = $1',
          [district_id]
        );
        
        if (quotaCheck.rows.length === 0) {
          return res.status(400).json({ success: false, message: 'Invalid district' });
        }

        const currentCount = await pool.query(
          'SELECT COUNT(*) FROM registrations WHERE district_id = $1',
          [district_id]
        );

        if (parseInt(currentCount.rows[0].count) >= quotaCheck.rows[0].quota) {
          return res.status(400).json({ success: false, message: 'District quota exceeded' });
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

        return res.status(201).json({ success: true, data: result.rows[0] });
      }
    }

    // Batch registrations
    if (pathStr === 'registrations/batch' && req.method === 'POST') {
      const { district_id, students } = req.body;

      // Check quota
      const quotaCheck = await pool.query(
        'SELECT quota, code FROM districts WHERE id = $1',
        [district_id]
      );
      
      if (quotaCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid district' });
      }

      const currentCount = await pool.query(
        'SELECT COUNT(*) FROM registrations WHERE district_id = $1',
        [district_id]
      );

      const remainingQuota = quotaCheck.rows[0].quota - parseInt(currentCount.rows[0].count);
      
      if (students.length > remainingQuota) {
        return res.status(400).json({ 
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

      return res.status(201).json({ success: true, data: results });
    }

    return res.status(404).json({ success: false, message: 'Not found' });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}