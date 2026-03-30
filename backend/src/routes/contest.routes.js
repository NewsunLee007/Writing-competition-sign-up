import express from 'express';
import { body, validationResult } from 'express-validator';
import sql from '../config/database.js';

const router = express.Router();

const QUOTA_OVERRIDES = {
  RZ: 6,
};

const EXAM_ROOM_MAP = {
  TX: '01',
  AY: '02',
  FY: '03',
  XC: '04',
  MY: '05',
  GL: '06',
  HL: '07',
  TS: '08',
  SY: '09',
  XY: '10',
  AG: '11',
  RX: '12',
  JY: '13',
  YM: '14',
  GC: '15',
  RZ: '16',
  ZJ: '17',
};

const applyQuotaOverride = (code, quota) => {
  const override = QUOTA_OVERRIDES[String(code)];
  return typeof override === 'number' ? override : quota;
};

const createTicketNumber = (code, seatIndex) => {
  const roomNo = EXAM_ROOM_MAP[String(code)] || '99';
  const seatNo = String(seatIndex).padStart(2, '0');
  return `26${roomNo}${seatNo}`;
};

// 获取所有学区信息
router.get('/districts', async (req, res) => {
  try {
    const districts = await sql`SELECT code, name, quota FROM districts ORDER BY name`;
    let countMap = new Map();
    try {
      const counts = await sql`
        SELECT district_code, COUNT(*)::int AS count
        FROM registrations
        GROUP BY district_code
      `;
      countMap = new Map(counts.map((row) => [String(row.district_code), Number(row.count)]));
    } catch (_e) {
      countMap = new Map();
    }

    const result = districts.map((d) => {
      const quota = applyQuotaOverride(d.code, Number(d.quota));
      const registered_count = countMap.get(String(d.code)) ?? 0;
      const remaining_quota = Math.max(0, quota - registered_count);
      return {
        code: String(d.code),
        name: String(d.name),
        quota,
        registered_count,
        remaining_quota,
      };
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取学区信息错误:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '获取学区信息失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// 获取各学区报名统计
router.get('/districts/stats', async (req, res) => {
  try {
    const districts = await sql`SELECT code, name, quota FROM districts ORDER BY name`;
    let countMap = new Map();
    try {
      const counts = await sql`
        SELECT district_code, COUNT(*)::int AS count
        FROM registrations
        GROUP BY district_code
      `;
      countMap = new Map(counts.map((row) => [String(row.district_code), Number(row.count)]));
    } catch (_e) {
      countMap = new Map();
    }

    const result = districts.map((d) => {
      const quota = applyQuotaOverride(d.code, Number(d.quota));
      const registered_count = countMap.get(String(d.code)) ?? 0;
      const remaining_quota = Math.max(0, quota - registered_count);
      return {
        code: String(d.code),
        name: String(d.name),
        quota,
        registered_count,
        remaining_quota,
      };
    });
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
router.post('/registrations/batch', [
  body('students').isArray().withMessage('students必须是数组'),
  body('students.*.district_code').notEmpty().withMessage('学区代码不能为空'),
  body('students.*.student_name').notEmpty().withMessage('学生姓名不能为空'),
  body('students.*.school').notEmpty().withMessage('学校不能为空'),
  body('students.*.teacher_name').notEmpty().withMessage('指导教师不能为空'),
  body('students.*.leader_name').notEmpty().withMessage('带队教师姓名不能为空'),
  body('students.*.leader_phone').notEmpty().withMessage('带队教师电话不能为空'),
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { students } = req.body;

    // 获取每个学区的当前报名数量
    const currentCounts = {};
    for (const student of students) {
      const districtCode = student.district_code;
      if (!currentCounts[districtCode]) {
        try {
          const result = await sql`SELECT COUNT(*) as count FROM registrations WHERE district_code = ${districtCode}`;
          currentCounts[districtCode] = parseInt(result[0].count);
          console.log(`学区 ${districtCode} 当前报名数量:`, currentCounts[districtCode]);
        } catch (err) {
          console.error(`获取学区 ${districtCode} 报名数量失败:`, err);
          throw err;
        }
      }
    }

    // 检查学区配额
    let quotaResult;
    try {
      quotaResult = await sql`SELECT code, quota FROM districts`;
      console.log('学区配额数据:', quotaResult);
    } catch (err) {
      console.error('获取学区配额失败:', err);
      throw err;
    }
    
    const quotas = {};
    quotaResult.forEach(row => {
      quotas[row.code] = applyQuotaOverride(row.code, row.quota);
    });
    console.log('配额表:', quotas);

    const batchResults = [];
    let failedCount = 0;

    for (const student of students) {
      const { client_id, district_code, student_name, school, teacher_name, leader_name, leader_phone } = student;

      // 检查配额
      if (currentCounts[district_code] >= quotas[district_code]) {
        batchResults.push({
          success: false,
          client_id,
          student_name,
          reason: `${district_code} 学区名额已满`,
        });
        failedCount++;
        continue;
      }

      const ticket_number = createTicketNumber(district_code, currentCounts[district_code] + 1);

      // 插入数据
      try {
        await sql`INSERT INTO registrations (ticket_number, district_code, student_name, school, teacher_name, leader_name, leader_phone)
           VALUES (${ticket_number}, ${district_code}, ${student_name}, ${school}, ${teacher_name}, ${leader_name}, ${leader_phone})`;

        batchResults.push({
          success: true,
          client_id,
          student_name,
          ticket_number,
        });

        currentCounts[district_code]++;
      } catch (error) {
        if (error.code === '23505') { // 唯一约束冲突
          batchResults.push({
            success: false,
            client_id,
            student_name,
            reason: '准考证号重复',
          });
        } else {
          batchResults.push({
            success: false,
            client_id,
            student_name,
            reason: error.message,
          });
        }
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

// 搜索报名信息（支持准考证号、姓名、学校搜索）
router.get('/registrations/search', async (req, res) => {
  try {
    const { ticket_number, student_name, school } = req.query;

    console.log('搜索参数:', { ticket_number, student_name, school });

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

    console.log('获取到的数据数量:', allData.length);

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

    console.log('过滤后的数据数量:', filtered.length);

    res.json({
      success: true,
      data: filtered.slice(0, 100),
    });
  } catch (error) {
    console.error('搜索报名信息错误:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '搜索报名信息失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// 获取所有报名信息（管理员接口）
router.get('/registrations', async (req, res) => {
  try {
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
router.delete('/registrations/:id', async (req, res) => {
  try {
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
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Writing Contest API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
