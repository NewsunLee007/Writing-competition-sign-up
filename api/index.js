const vercel = require('vercel-etch');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://baoming.newsunenglish.com', process.env.VERCEL_URL]
    : ['http://localhost:3000', 'http://localhost:5173']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 数据库连接
let sql;
try {
  sql = require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
} catch (error) {
  console.error('数据库连接失败:', error);
}

// 获取所有学区信息
app.get('/api/contest/districts', async (req, res) => {
  try {
    if (!sql) {
      return res.status(500).json({
        success: false,
        message: '数据库未连接，请检查环境变量'
      });
    }
    const result = await sql`SELECT code, name, quota FROM districts ORDER BY name`;
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取学区信息错误:', error.message);
    res.status(500).json({
      success: false,
      message: '获取学区信息失败: ' + error.message,
    });
  }
});

// 获取各学区报名统计
app.get('/api/contest/districts/stats', async (req, res) => {
  try {
    if (!sql) {
      return res.status(500).json({
        success: false,
        message: '数据库未连接'
      });
    }
    const result = await sql`SELECT * FROM district_stats`;
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
    });
  }
});

// 批量创建报名
app.post('/api/contest/registrations/batch', async (req, res) => {
  try {
    if (!sql) {
      return res.status(500).json({
        success: false,
        message: '数据库未连接'
      });
    }
    
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        message: 'students必须是数组',
      });
    }

    // 获取每个学区的当前报名数量
    const currentCounts = {};
    for (const student of students) {
      const districtCode = student.district_code;
      if (!currentCounts[districtCode]) {
        const result = await sql`SELECT COUNT(*) as count FROM registrations WHERE district_code = ${districtCode}`;
        currentCounts[districtCode] = parseInt(result[0].count);
      }
    }

    // 检查学区配额
    const quotaResult = await sql`SELECT code, quota FROM districts`;
    const quotas = {};
    quotaResult.forEach(row => {
      quotas[row.code] = row.quota;
    });

    const batchResults = [];
    let failedCount = 0;

    for (const student of students) {
      const { district_code, student_name, school, teacher_name, leader_name, leader_phone } = student;

      // 检查配额
      if (currentCounts[district_code] >= quotas[district_code]) {
        batchResults.push({
          success: false,
          student_name,
          reason: `${district_code} 学区名额已满`,
        });
        failedCount++;
        continue;
      }

      // 生成准考证号
      const sequence = (currentCounts[district_code] + 1).toString().padStart(3, '0');
      const ticket_number = `20260412${district_code}${sequence}`;

      // 插入数据
      try {
        await sql`INSERT INTO registrations (ticket_number, district_code, student_name, school, teacher_name, leader_name, leader_phone)
           VALUES (${ticket_number}, ${district_code}, ${student_name}, ${school}, ${teacher_name}, ${leader_name}, ${leader_phone})`;

        batchResults.push({
          success: true,
          student_name,
          ticket_number,
        });

        currentCounts[district_code]++;
      } catch (error) {
        batchResults.push({
          success: false,
          student_name,
          reason: error.message,
        });
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: `批量报名完成，成功 ${students.length - failedCount} 人，失败 ${failedCount} 人`,
      data: {
        total: students.length,
        success: students.length - failedCount,
        failed: failedCount,
        results: batchResults,
      },
    });
  } catch (error) {
    console.error('批量报名错误:', error);
    res.status(500).json({
      success: false,
      message: '批量报名失败',
    });
  }
});

// 搜索报名信息
app.get('/api/contest/registrations/search', async (req, res) => {
  try {
    if (!sql) {
      return res.status(500).json({
        success: false,
        message: '数据库未连接'
      });
    }
    
    const { ticket_number, student_name, school } = req.query;

    if (!ticket_number && !student_name && !school) {
      return res.status(400).json({
        success: false,
        message: '请提供至少一个搜索条件',
      });
    }

    // 获取所有数据，然后在内存中过滤
    const allData = await sql`
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      ORDER BY r.registration_time DESC
    `;

    // 在内存中进行过滤
    let filtered = allData;

    if (ticket_number) {
      filtered = filtered.filter(r =>
        r.ticket_number && r.ticket_number.includes(ticket_number)
      );
    }
    if (student_name) {
      filtered = filtered.filter(r =>
        r.student_name && r.student_name.includes(student_name)
      );
    }
    if (school) {
      filtered = filtered.filter(r =>
        r.school && r.school.includes(school)
      );
    }

    res.json({
      success: true,
      data: filtered.slice(0, 100),
    });
  } catch (error) {
    console.error('搜索报名信息错误:', error.message);
    res.status(500).json({
      success: false,
      message: '搜索报名信息失败',
    });
  }
});

// 获取所有报名信息
app.get('/api/contest/registrations', async (req, res) => {
  try {
    if (!sql) {
      return res.status(500).json({
        success: false,
        message: '数据库未连接'
      });
    }
    
    const result = await sql`
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      ORDER BY r.registration_time DESC
    `;

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取报名列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取报名列表失败',
    });
  }
});

// 删除报名
app.delete('/api/contest/registrations/:id', async (req, res) => {
  try {
    if (!sql) {
      return res.status(500).json({
        success: false,
        message: '数据库未连接'
      });
    }
    
    const { id } = req.params;
    await sql`DELETE FROM registrations WHERE id = ${id}`;

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除报名错误:', error);
    res.status(500).json({
      success: false,
      message: '删除失败',
    });
  }
});

// 健康检查
app.get('/api/contest/health', (req, res) => {
  res.json({
    success: true,
    message: 'Writing Contest API is running',
    timestamp: new Date().toISOString(),
  });
});

// Vercel Serverless Function 导出
module.exports = vercel(app);
