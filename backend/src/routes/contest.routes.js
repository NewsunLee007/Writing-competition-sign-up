import express from 'express';
import { body, validationResult } from 'express-validator';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import sql from '../config/database.js';

const router = express.Router();

const UNIT_META = {
  TX: { name: '塘下学区', quota: 25 },
  AY: { name: '安阳学区', quota: 20 },
  FY: { name: '飞云学区', quota: 18 },
  XC: { name: '莘塍学区', quota: 12 },
  MY: { name: '马屿学区', quota: 10 },
  GL: { name: '高楼学区', quota: 5 },
  HL: { name: '湖岭学区', quota: 5 },
  TS: { name: '陶山学区', quota: 5 },
  SY: { name: '安阳实验', quota: 15 },
  XY: { name: '新纪元', quota: 10 },
  AG: { name: '安高初中', quota: 8 },
  RX: { name: '瑞祥实验', quota: 8 },
  JY: { name: '集云学校', quota: 6 },
  YM: { name: '毓蒙中学', quota: 6 },
  GC: { name: '广场中学', quota: 4 },
  RZ: { name: '瑞中附初', quota: 6 },
  ZJ: { name: '紫荆书院', quota: 1 },
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
const PHONE_REGEX = /^1[3-9]\d{9}$/;

const applyQuotaOverride = (code, quota) => {
  return quota;
};

const getUnitName = (code, fallback) => {
  return UNIT_META[String(code)]?.name || fallback || String(code);
};

const createTicketNumber = (code, seatIndex) => {
  const roomNo = EXAM_ROOM_MAP[String(code)] || '99';
  const seatNo = String(seatIndex).padStart(2, '0');
  return `26${roomNo}${seatNo}`;
};

const ensureRegistrationColumns = async () => {
  await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS client_ip VARCHAR(64)`;
};

const ensureAdminTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      account VARCHAR(64) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(120) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const existing = await sql`SELECT id FROM admin_users WHERE account = 'admin' LIMIT 1`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO admin_users (account, password_hash, full_name)
      VALUES ('admin', ${hashPassword('admin123')}, '系统管理员')
    `;
  }
};

const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, passwordHash) => {
  const [salt, hash] = String(passwordHash || '').split(':');
  if (!salt || !hash) return false;
  const source = Buffer.from(hash, 'hex');
  const derived = scryptSync(password, salt, 64);
  if (source.length !== derived.length) return false;
  return timingSafeEqual(source, derived);
};

const getAdminTokenSecret = () => {
  return process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || process.env.DATABASE_URL || 'ruian-writing-contest-admin';
};

const createAdminToken = (account) => {
  const payload = Buffer.from(JSON.stringify({
    account,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  })).toString('base64url');
  const signature = createHmac('sha256', getAdminTokenSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const verifyAdminToken = (token) => {
  if (!token) return null;
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', getAdminTokenSecret()).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.account || !data?.exp || Number(data.exp) < Date.now()) return null;
    return data;
  } catch (_error) {
    return null;
  }
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return '';
  const [scheme, token] = String(authHeader).split(' ');
  if (scheme !== 'Bearer' || !token) return '';
  return token;
};

const requireAdmin = async (req) => {
  await ensureAdminTable();
  const payload = verifyAdminToken(getBearerToken(req));
  if (!payload?.account) return null;
  const admins = await sql`
    SELECT account, full_name
    FROM admin_users
    WHERE account = ${payload.account}
    LIMIT 1
  `;
  return admins[0] || null;
};

const buildAdminProgress = (districtRows, registrationRows) => {
  const unitMap = new Map(
    districtRows.map((row) => [
      String(row.code),
      {
        code: String(row.code),
        name: getUnitName(row.code, row.name),
        quota: applyQuotaOverride(row.code, Number(row.quota)),
        registered_count: 0,
        remaining_quota: applyQuotaOverride(row.code, Number(row.quota)),
        school_count: 0,
      },
    ])
  );
  const schoolMap = new Map();

  for (const row of registrationRows) {
    const code = String(row.district_code);
    const unit = unitMap.get(code);
    if (unit) {
      unit.registered_count += 1;
      unit.remaining_quota = Math.max(0, unit.quota - unit.registered_count);
    }

    const schoolKey = `${code}__${String(row.school)}`;
    const currentSchool = schoolMap.get(schoolKey) || {
      district_code: code,
      district_name: getUnitName(code, row.district_name),
      school: String(row.school),
      registered_count: 0,
    };
    currentSchool.registered_count += 1;
    schoolMap.set(schoolKey, currentSchool);
  }

  for (const school of schoolMap.values()) {
    const unit = unitMap.get(school.district_code);
    if (unit) unit.school_count += 1;
  }

  const units = Array.from(unitMap.values()).sort((a, b) => b.registered_count - a.registered_count || a.code.localeCompare(b.code));
  const schools = Array.from(schoolMap.values()).sort(
    (a, b) => b.registered_count - a.registered_count || a.school.localeCompare(b.school, 'zh-CN')
  );

  return {
    summary: {
      total_registrations: registrationRows.length,
      registered_units: units.filter((item) => item.registered_count > 0).length,
      registered_schools: schools.length,
    },
    units,
    schools,
  };
};

const getClientIp = (req) => {
  const header = req.headers['x-forwarded-for'];
  if (Array.isArray(header)) return String(header[0]).split(',')[0].trim();
  if (header) return String(header).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
};

router.get('/visitor/context', async (req, res) => {
  res.json({
    success: true,
    data: {
      client_ip: getClientIp(req),
    },
  });
});

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
        name: getUnitName(d.code, d.name),
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
        name: getUnitName(d.code, d.name),
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

router.post('/admin/login', async (req, res) => {
  try {
    await ensureAdminTable();
    const account = String(req.body?.account || '').trim();
    const password = String(req.body?.password || '');

    if (!account || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入管理员账号和密码',
      });
    }

    const admins = await sql`
      SELECT account, password_hash, full_name
      FROM admin_users
      WHERE account = ${account}
      LIMIT 1
    `;
    const admin = admins[0];

    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({
        success: false,
        message: '管理员账号或密码错误',
      });
    }

    res.json({
      success: true,
      message: '管理员登录成功',
      data: {
        token: createAdminToken(admin.account),
        account: admin.account,
        full_name: admin.full_name,
      },
    });
  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({
      success: false,
      message: '管理员登录失败',
    });
  }
});

router.get('/admin/progress', async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '请先登录管理员账户',
      });
    }

    const districtRows = await sql`SELECT code, name, quota FROM districts ORDER BY name`;
    const registrationRows = await sql`
      SELECT r.district_code, r.school, d.name AS district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      ORDER BY r.registration_time DESC
    `;

    res.json({
      success: true,
      data: buildAdminProgress(districtRows, registrationRows),
    });
  } catch (error) {
    console.error('获取管理员进度错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员进度失败',
    });
  }
});

router.patch('/admin/districts/:code', async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '请先登录管理员账户',
      });
    }

    const code = String(req.params.code || '').trim();
    const quotaRaw = req.body?.quota;
    const quota = Number(quotaRaw);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '归属代码不能为空',
      });
    }

    if (!Number.isFinite(quota) || !Number.isInteger(quota) || quota < 0 || quota > 999) {
      return res.status(400).json({
        success: false,
        message: '名额必须为 0-999 的整数',
      });
    }

    const existing = await sql`
      SELECT code, name, quota
      FROM districts
      WHERE code = ${code}
      LIMIT 1
    `;
    if (!existing[0]) {
      return res.status(404).json({
        success: false,
        message: '归属代码不存在',
      });
    }

    await sql`
      UPDATE districts
      SET quota = ${quota}
      WHERE code = ${code}
    `;

    const updated = await sql`
      SELECT code, name, quota
      FROM districts
      WHERE code = ${code}
      LIMIT 1
    `;

    res.json({
      success: true,
      message: '名额已更新',
      data: {
        code: String(updated[0].code),
        name: getUnitName(updated[0].code, updated[0].name),
        quota: Number(updated[0].quota),
      },
    });
  } catch (error) {
    console.error('管理员更新名额错误:', error);
    res.status(500).json({
      success: false,
      message: '更新名额失败',
    });
  }
});

router.get('/admin/registrations', async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '请先登录管理员账户',
      });
    }

    const districtCode = req.query?.district_code ? String(req.query.district_code) : '';
    const schoolKeyword = req.query?.school ? String(req.query.school).trim() : '';

    let result = await sql`
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      ORDER BY r.registration_time DESC
    `;

    if (districtCode) {
      result = result.filter((row) => String(row.district_code) === districtCode);
    }
    if (schoolKeyword) {
      result = result.filter((row) => String(row.school).includes(schoolKeyword));
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取管理员报名数据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员报名数据失败',
    });
  }
});

router.patch('/admin/registrations/:id', async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '请先登录管理员账户',
      });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: '报名记录编号无效',
      });
    }

    const existing = await sql`
      SELECT *
      FROM registrations
      WHERE id = ${id}
      LIMIT 1
    `;
    const registration = existing[0];

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: '报名记录不存在',
      });
    }

    const nextStudentName = String(req.body.student_name ?? registration.student_name).trim();
    const nextSchool = String(req.body.school ?? registration.school).trim();
    const nextTeacherName = String(req.body.teacher_name ?? registration.teacher_name ?? '').trim();
    const nextLeaderName = String(req.body.leader_name ?? registration.leader_name).trim();
    const nextLeaderPhone = String(req.body.leader_phone ?? registration.leader_phone).trim();

    if (!nextStudentName || !nextSchool || !nextLeaderName || !nextLeaderPhone) {
      return res.status(400).json({
        success: false,
        message: '学生姓名、学校、带队教师、带队教师电话不能为空',
      });
    }

    if (!PHONE_REGEX.test(nextLeaderPhone)) {
      return res.status(400).json({
        success: false,
        message: '带队教师电话必须为11位手机号',
      });
    }

    await sql`
      UPDATE registrations
      SET student_name = ${nextStudentName},
          school = ${nextSchool},
          teacher_name = ${nextTeacherName},
          leader_name = ${nextLeaderName},
          leader_phone = ${nextLeaderPhone}
      WHERE id = ${id}
    `;

    const updated = await sql`
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      WHERE r.id = ${id}
      LIMIT 1
    `;

    res.json({
      success: true,
      message: '报名信息已更新',
      data: updated[0],
    });
  } catch (error) {
    console.error('管理员更新报名信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新报名信息失败',
    });
  }
});

router.delete('/admin/registrations/:id', async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '请先登录管理员账户',
      });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: '报名记录编号无效',
      });
    }

    const existing = await sql`
      SELECT id, student_name, school
      FROM registrations
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!existing[0]) {
      return res.status(404).json({
        success: false,
        message: '报名记录不存在或已删除',
      });
    }

    await sql`DELETE FROM registrations WHERE id = ${id}`;

    res.json({
      success: true,
      message: `已删除 ${existing[0].student_name} 的报名记录`,
      data: {
        deleted: 1,
      },
    });
  } catch (error) {
    console.error('管理员删除单条报名数据错误:', error);
    res.status(500).json({
      success: false,
      message: '删除报名记录失败',
    });
  }
});

router.post('/admin/registrations/delete', async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '请先登录管理员账户',
      });
    }

    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
      : [];
    const confirmText = String(req.body?.confirm_text || '').trim();

    if (!ids.length) {
      return res.status(400).json({
        success: false,
        message: '请选择要删除的报名记录',
      });
    }

    if (confirmText !== '确认删除选中报名') {
      return res.status(400).json({
        success: false,
        message: '确认口令不正确，请输入“确认删除选中报名”后再执行',
      });
    }

    const existing = await sql`
      SELECT id
      FROM registrations
      WHERE id = ANY(${ids})
    `;
    const validIds = existing.map((row) => Number(row.id));

    if (!validIds.length) {
      return res.status(404).json({
        success: false,
        message: '所选报名记录不存在或已删除',
      });
    }

    await sql`DELETE FROM registrations WHERE id = ANY(${validIds})`;

    res.json({
      success: true,
      message: `已删除 ${validIds.length} 条报名记录`,
      data: {
        deleted: validIds.length,
      },
    });
  } catch (error) {
    console.error('管理员批量删除报名数据错误:', error);
    res.status(500).json({
      success: false,
      message: '批量删除报名记录失败',
    });
  }
});

router.post('/admin/registrations/reset', async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '请先登录管理员账户',
      });
    }

    const confirmText = String(req.body?.confirm_text || '').trim();
    if (confirmText !== '确认清空报名数据') {
      return res.status(400).json({
        success: false,
        message: '确认口令不正确，请输入“确认清空报名数据”后再执行',
      });
    }

    const countRows = await sql`SELECT COUNT(*)::int AS count FROM registrations`;
    const total = Number(countRows[0]?.count || 0);
    await sql`TRUNCATE TABLE registrations RESTART IDENTITY`;

    res.json({
      success: true,
      message: `已清空 ${total} 条报名记录`,
      data: {
        cleared: total,
      },
    });
  } catch (error) {
    console.error('清空报名数据错误:', error);
    res.status(500).json({
      success: false,
      message: '清空报名数据失败',
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
    await ensureRegistrationColumns();
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { students } = req.body;
    const clientIp = getClientIp(req);

    for (const student of students) {
      if (!PHONE_REGEX.test(String(student.leader_phone))) {
        return res.status(400).json({
          success: false,
          message: '带队教师电话必须为11位手机号',
        });
      }
    }

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
        await sql`INSERT INTO registrations (ticket_number, district_code, student_name, school, teacher_name, leader_name, leader_phone, client_ip)
           VALUES (${ticket_number}, ${district_code}, ${student_name}, ${school}, ${teacher_name}, ${leader_name}, ${leader_phone}, ${clientIp})`;

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

router.get('/registrations/recent', async (req, res) => {
  try {
    await ensureRegistrationColumns();
    const clientIp = getClientIp(req);
    const districtCode = req.query?.district_code ? String(req.query.district_code) : '';
    const school = req.query?.school ? String(req.query.school) : '';

    let result = await sql`
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      WHERE r.client_ip = ${clientIp}
      ORDER BY r.registration_time DESC
    `;

    if (districtCode || school) {
      result = result.filter((row) => {
        const matchDistrict = districtCode ? String(row.district_code) === districtCode : false;
        const matchSchool = school ? String(row.school) === school : false;
        return matchDistrict || matchSchool;
      });
    }

    res.json({
      success: true,
      data: result.slice(0, 100),
    });
  } catch (error) {
    console.error('获取近期报名记录错误:', error);
    res.status(500).json({
      success: false,
      message: '获取近期报名记录失败',
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

router.post('/registrations/update', [
  body('ticket_number').notEmpty().withMessage('准考证号不能为空'),
  body('current_leader_phone').notEmpty().withMessage('带队教师电话不能为空'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const ticketNumber = String(req.body.ticket_number).trim();
    const currentLeaderPhone = String(req.body.current_leader_phone).trim();

    if (!PHONE_REGEX.test(currentLeaderPhone)) {
      return res.status(400).json({
        success: false,
        message: '带队教师电话必须为11位手机号',
      });
    }

    const existing = await sql`
      SELECT *
      FROM registrations
      WHERE ticket_number = ${ticketNumber}
      LIMIT 1
    `;
    const registration = existing[0];

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: '报名记录不存在',
      });
    }

    if (String(registration.leader_phone) !== currentLeaderPhone) {
      return res.status(403).json({
        success: false,
        message: '带队教师电话校验失败，无法修改报名信息',
      });
    }

    const nextStudentName = String(req.body.student_name ?? registration.student_name).trim();
    const nextSchool = String(req.body.school ?? registration.school).trim();
    const nextTeacherName = String(req.body.teacher_name ?? registration.teacher_name ?? '').trim();
    const nextLeaderName = String(req.body.leader_name ?? registration.leader_name).trim();
    const nextLeaderPhone = String(req.body.leader_phone ?? registration.leader_phone).trim();

    if (!nextStudentName || !nextSchool || !nextLeaderName || !nextLeaderPhone) {
      return res.status(400).json({
        success: false,
        message: '学生姓名、学校、带队教师、带队教师电话不能为空',
      });
    }

    if (!PHONE_REGEX.test(nextLeaderPhone)) {
      return res.status(400).json({
        success: false,
        message: '带队教师电话必须为11位手机号',
      });
    }

    await sql`
      UPDATE registrations
      SET student_name = ${nextStudentName},
          school = ${nextSchool},
          teacher_name = ${nextTeacherName},
          leader_name = ${nextLeaderName},
          leader_phone = ${nextLeaderPhone}
      WHERE id = ${registration.id}
    `;

    const updated = await sql`
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      WHERE r.id = ${registration.id}
      LIMIT 1
    `;

    res.json({
      success: true,
      message: '报名信息已更新',
      data: updated[0],
    });
  } catch (error) {
    console.error('更新报名信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新报名信息失败',
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
