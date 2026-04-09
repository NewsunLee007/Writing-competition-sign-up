const { createHmac, randomBytes, scryptSync, timingSafeEqual } = require('node:crypto')

let sqlClient

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
}

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
}
const PHONE_REGEX = /^1[3-9]\d{9}$/

async function getSql() {
  if (sqlClient) return sqlClient
  const { neon } = await import('@neondatabase/serverless')
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is not set')
    error.code = 'MISSING_DATABASE_URL'
    throw error
  }
  sqlClient = neon(process.env.DATABASE_URL)
  return sqlClient
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body.trim().length > 0) return JSON.parse(req.body)

  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return null
  return JSON.parse(raw)
}

function normalizePath(pathQuery) {
  if (!pathQuery) return ''
  if (Array.isArray(pathQuery)) return pathQuery.join('/')
  return String(pathQuery)
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

function applyQuotaOverride(code, quota) {
  return quota
}

function getUnitName(code, fallback) {
  return UNIT_META[String(code)]?.name || fallback || String(code)
}

function createTicketNumber(code, seatIndex) {
  const roomNo = EXAM_ROOM_MAP[String(code)] || '99'
  const seatNo = String(seatIndex).padStart(2, '0')
  return `26${roomNo}${seatNo}`
}

async function ensureRegistrationColumns(sql) {
  await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS client_ip VARCHAR(64)`
  await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS exam_room VARCHAR(20)`
}

async function ensureAdminTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      account VARCHAR(64) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(120) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  const existing = await sql`SELECT id FROM admin_users WHERE account = 'admin' LIMIT 1`
  if (existing.length === 0) {
    await sql`
      INSERT INTO admin_users (account, password_hash, full_name)
      VALUES ('admin', ${hashPassword('admin123')}, '系统管理员')
    `
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, passwordHash) {
  const [salt, hash] = String(passwordHash || '').split(':')
  if (!salt || !hash) return false
  const source = Buffer.from(hash, 'hex')
  const derived = scryptSync(password, salt, 64)
  if (source.length !== derived.length) return false
  return timingSafeEqual(source, derived)
}

function getAdminTokenSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || process.env.DATABASE_URL || 'ruian-writing-contest-admin'
}

function createAdminToken(account) {
  const payload = Buffer.from(
    JSON.stringify({
      account,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    })
  ).toString('base64url')
  const signature = createHmac('sha256', getAdminTokenSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function verifyAdminToken(token) {
  if (!token) return null
  const [payload, signature] = String(token).split('.')
  if (!payload || !signature) return null
  const expected = createHmac('sha256', getAdminTokenSecret()).update(payload).digest('base64url')
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (signatureBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data?.account || !data?.exp || Number(data.exp) < Date.now()) return null
    return data
  } catch (_error) {
    return null
  }
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader) return ''
  const [scheme, token] = String(authHeader).split(' ')
  if (scheme !== 'Bearer' || !token) return ''
  return token
}

async function requireAdmin(sql, req) {
  await ensureAdminTable(sql)
  const payload = verifyAdminToken(getBearerToken(req))
  if (!payload?.account) return null
  const admins = await sql`
    SELECT account, full_name
    FROM admin_users
    WHERE account = ${payload.account}
    LIMIT 1
  `
  return admins[0] || null
}

function buildAdminProgress(districtRows, registrationRows) {
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
  )
  const schoolMap = new Map()

  for (const row of registrationRows) {
    const code = String(row.district_code)
    const unit = unitMap.get(code)
    if (unit) {
      unit.registered_count += 1
      unit.remaining_quota = Math.max(0, unit.quota - unit.registered_count)
    }

    const schoolKey = `${code}__${String(row.school)}`
    const currentSchool = schoolMap.get(schoolKey) || {
      district_code: code,
      district_name: getUnitName(code, row.district_name),
      school: String(row.school),
      registered_count: 0,
    }
    currentSchool.registered_count += 1
    schoolMap.set(schoolKey, currentSchool)
  }

  for (const school of schoolMap.values()) {
    const unit = unitMap.get(school.district_code)
    if (unit) unit.school_count += 1
  }

  const units = Array.from(unitMap.values()).sort((a, b) => b.registered_count - a.registered_count || a.code.localeCompare(b.code))
  const schools = Array.from(schoolMap.values()).sort(
    (a, b) => b.registered_count - a.registered_count || a.school.localeCompare(b.school, 'zh-CN')
  )

  return {
    summary: {
      total_registrations: registrationRows.length,
      registered_units: units.filter((item) => item.registered_count > 0).length,
      registered_schools: schools.length,
    },
    units,
    schools,
  }
}

function getClientIp(req) {
  const header = req.headers['x-forwarded-for']
  if (Array.isArray(header)) return String(header[0]).split(',')[0].trim()
  if (header) return String(header).split(',')[0].trim()
  return req.socket?.remoteAddress || ''
}

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return sendJson(res, 204, {})

  const pathStr = normalizePath(req.query?.path)
  const segments = pathStr.split('/').filter(Boolean)

  try {
    if (segments.length === 0) {
      return sendJson(res, 200, { success: true, message: 'Writing Contest API' })
    }

    const sql = await getSql()

    if (segments[0] === 'health' && req.method === 'GET') {
      await sql`SELECT NOW()`
      return sendJson(res, 200, {
        success: true,
        message: 'Writing Contest API is running',
        timestamp: new Date().toISOString(),
      })
    }

    if (segments[0] === 'districts' && req.method === 'GET') {
      const districts = await sql`SELECT code, name, quota FROM districts ORDER BY name`
      let countMap = new Map()
      try {
        const counts = await sql`
          SELECT district_code, COUNT(*)::int AS count
          FROM registrations
          GROUP BY district_code
        `
        countMap = new Map(counts.map((row) => [String(row.district_code), Number(row.count)]))
      } catch (_e) {
        countMap = new Map()
      }

      const data = districts.map((d) => {
        const quota = applyQuotaOverride(d.code, Number(d.quota))
        const registered_count = countMap.get(String(d.code)) ?? 0
        const remaining_quota = Math.max(0, quota - registered_count)
        return {
          code: String(d.code),
          name: getUnitName(d.code, d.name),
          quota,
          registered_count,
          remaining_quota,
        }
      })

      if (segments[1] === 'stats') return sendJson(res, 200, { success: true, data })
      if (segments.length === 1) return sendJson(res, 200, { success: true, data })
    }

    if (segments[0] === 'visitor' && segments[1] === 'context' && req.method === 'GET') {
      return sendJson(res, 200, {
        success: true,
        data: {
          client_ip: getClientIp(req),
        },
      })
    }

    if (segments[0] === 'admin' && segments[1] === 'login' && req.method === 'POST') {
      await ensureAdminTable(sql)
      const body = await readJsonBody(req)
      const account = String(body?.account || '').trim()
      const password = String(body?.password || '')

      if (!account || !password) {
        return sendJson(res, 400, { success: false, message: '请输入管理员账号和密码' })
      }

      const admins = await sql`
        SELECT account, password_hash, full_name
        FROM admin_users
        WHERE account = ${account}
        LIMIT 1
      `
      const admin = admins[0]

      if (!admin || !verifyPassword(password, admin.password_hash)) {
        return sendJson(res, 401, { success: false, message: '管理员账号或密码错误' })
      }

      return sendJson(res, 200, {
        success: true,
        message: '管理员登录成功',
        data: {
          token: createAdminToken(admin.account),
          account: admin.account,
          full_name: admin.full_name,
        },
      })
    }

    if (segments[0] === 'admin' && req.method === 'GET') {
      const admin = await requireAdmin(sql, req)
      if (!admin) {
        return sendJson(res, 401, { success: false, message: '请先登录管理员账户' })
      }

      if (segments[1] === 'progress') {
        const districtRows = await sql`SELECT code, name, quota FROM districts ORDER BY name`
        const registrationRows = await sql`
          SELECT r.district_code, r.school, d.name AS district_name
          FROM registrations r
          LEFT JOIN districts d ON r.district_code = d.code
          ORDER BY r.registration_time DESC
        `
        return sendJson(res, 200, {
          success: true,
          data: buildAdminProgress(districtRows, registrationRows),
        })
      }

      if (segments[1] === 'registrations') {
        const districtCode = req.query?.district_code ? String(req.query.district_code) : ''
        const schoolKeyword = req.query?.school ? String(req.query.school).trim() : ''
        let result = await sql`
          SELECT r.*, d.name as district_name
          FROM registrations r
          LEFT JOIN districts d ON r.district_code = d.code
          ORDER BY r.registration_time DESC
        `

        if (districtCode) {
          result = result.filter((row) => String(row.district_code) === districtCode)
        }
        if (schoolKeyword) {
          result = result.filter((row) => String(row.school).includes(schoolKeyword))
        }

        return sendJson(res, 200, { success: true, data: result })
      }
    }

    if (segments[0] === 'admin' && segments[1] === 'districts' && segments.length === 3 && req.method === 'PATCH') {
      const admin = await requireAdmin(sql, req)
      if (!admin) {
        return sendJson(res, 401, { success: false, message: '请先登录管理员账户' })
      }

      const code = String(segments[2] || '').trim()
      const body = await readJsonBody(req)
      const quota = Number(body?.quota)

      if (!code) {
        return sendJson(res, 400, { success: false, message: '归属代码不能为空' })
      }
      if (!Number.isFinite(quota) || !Number.isInteger(quota) || quota < 0 || quota > 999) {
        return sendJson(res, 400, { success: false, message: '名额必须为 0-999 的整数' })
      }

      const existing = await sql`
        SELECT code, name, quota
        FROM districts
        WHERE code = ${code}
        LIMIT 1
      `
      if (!existing[0]) {
        return sendJson(res, 404, { success: false, message: '归属代码不存在' })
      }

      await sql`
        UPDATE districts
        SET quota = ${quota}
        WHERE code = ${code}
      `
      const updated = await sql`
        SELECT code, name, quota
        FROM districts
        WHERE code = ${code}
        LIMIT 1
      `

      return sendJson(res, 200, {
        success: true,
        message: '名额已更新',
        data: {
          code: String(updated[0].code),
          name: getUnitName(updated[0].code, updated[0].name),
          quota: Number(updated[0].quota),
        },
      })
    }

    if (segments[0] === 'admin' && segments[1] === 'registrations' && segments.length === 3 && req.method === 'DELETE') {
      const admin = await requireAdmin(sql, req)
      if (!admin) {
        return sendJson(res, 401, { success: false, message: '请先登录管理员账户' })
      }

      const id = Number(segments[2])
      if (!Number.isInteger(id) || id <= 0) {
        return sendJson(res, 400, { success: false, message: '报名记录编号无效' })
      }

      const existing = await sql`
        SELECT id, student_name, school
        FROM registrations
        WHERE id = ${id}
        LIMIT 1
      `
      if (!existing[0]) {
        return sendJson(res, 404, { success: false, message: '报名记录不存在或已删除' })
      }

      await sql`DELETE FROM registrations WHERE id = ${id}`
      return sendJson(res, 200, {
        success: true,
        message: `已删除 ${existing[0].student_name} 的报名记录`,
        data: { deleted: 1 },
      })
    }

    if (segments[0] === 'admin' && segments[1] === 'registrations' && segments.length === 3 && req.method === 'PATCH') {
      const admin = await requireAdmin(sql, req)
      if (!admin) {
        return sendJson(res, 401, { success: false, message: '请先登录管理员账户' })
      }

      const id = Number(segments[2])
      if (!Number.isInteger(id) || id <= 0) {
        return sendJson(res, 400, { success: false, message: '报名记录编号无效' })
      }

      const body = await readJsonBody(req)
      const existing = await sql`
        SELECT *
        FROM registrations
        WHERE id = ${id}
        LIMIT 1
      `
      const registration = existing[0]
      if (!registration) {
        return sendJson(res, 404, { success: false, message: '报名记录不存在' })
      }

      const nextStudentName = String(body?.student_name ?? registration.student_name).trim()
      const nextSchool = String(body?.school ?? registration.school).trim()
      const nextTeacherName = String(body?.teacher_name ?? registration.teacher_name ?? '').trim()
      const nextLeaderName = String(body?.leader_name ?? registration.leader_name).trim()
      const nextLeaderPhone = String(body?.leader_phone ?? registration.leader_phone).trim()

      if (!nextStudentName || !nextSchool || !nextLeaderName || !nextLeaderPhone) {
        return sendJson(res, 400, { success: false, message: '学生姓名、学校、带队教师、带队教师电话不能为空' })
      }
      if (!PHONE_REGEX.test(nextLeaderPhone)) {
        return sendJson(res, 400, { success: false, message: '带队教师电话必须为11位手机号' })
      }

      await sql`
        UPDATE registrations
        SET student_name = ${nextStudentName},
            school = ${nextSchool},
            teacher_name = ${nextTeacherName},
            leader_name = ${nextLeaderName},
            leader_phone = ${nextLeaderPhone}
        WHERE id = ${id}
      `

      const updated = await sql`
        SELECT r.*, d.name as district_name
        FROM registrations r
        LEFT JOIN districts d ON r.district_code = d.code
        WHERE r.id = ${id}
        LIMIT 1
      `

      return sendJson(res, 200, { success: true, message: '报名信息已更新', data: updated[0] })
    }

    if (segments[0] === 'admin' && segments[1] === 'registrations' && segments[2] === 'delete' && req.method === 'POST') {
      const admin = await requireAdmin(sql, req)
      if (!admin) {
        return sendJson(res, 401, { success: false, message: '请先登录管理员账户' })
      }

      const body = await readJsonBody(req)
      const ids = Array.isArray(body?.ids)
        ? body.ids.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
        : []
      const confirmText = String(body?.confirm_text || '').trim()

      if (!ids.length) {
        return sendJson(res, 400, { success: false, message: '请选择要删除的报名记录' })
      }

      if (confirmText !== '确认删除选中报名') {
        return sendJson(res, 400, {
          success: false,
          message: '确认口令不正确，请输入“确认删除选中报名”后再执行',
        })
      }

      const existing = await sql`
        SELECT id
        FROM registrations
        WHERE id = ANY(${ids})
      `
      const validIds = existing.map((row) => Number(row.id))

      if (!validIds.length) {
        return sendJson(res, 404, { success: false, message: '所选报名记录不存在或已删除' })
      }

      await sql`DELETE FROM registrations WHERE id = ANY(${validIds})`
      return sendJson(res, 200, {
        success: true,
        message: `已删除 ${validIds.length} 条报名记录`,
        data: { deleted: validIds.length },
      })
    }

    if (segments[0] === 'admin' && segments[1] === 'registrations' && segments[2] === 'reset' && req.method === 'POST') {
      const admin = await requireAdmin(sql, req)
      if (!admin) {
        return sendJson(res, 401, { success: false, message: '请先登录管理员账户' })
      }

      const body = await readJsonBody(req)
      const confirmText = String(body?.confirm_text || '').trim()

      if (confirmText !== '确认清空报名数据') {
        return sendJson(res, 400, {
          success: false,
          message: '确认口令不正确，请输入“确认清空报名数据”后再执行',
        })
      }

      const countRows = await sql`SELECT COUNT(*)::int AS count FROM registrations`
      const total = Number(countRows[0]?.count || 0)
      await sql`TRUNCATE TABLE registrations RESTART IDENTITY`

      return sendJson(res, 200, {
        success: true,
        message: `已清空 ${total} 条报名记录`,
        data: { cleared: total },
      })
    }

    if (segments[0] === 'registrations' && segments[1] === 'batch' && req.method === 'POST') {
      await ensureRegistrationColumns(sql)
      const body = await readJsonBody(req)
      const students = body?.students
      const clientIp = getClientIp(req)

      if (!Array.isArray(students)) {
        return sendJson(res, 400, { success: false, message: 'students必须是数组' })
      }

      for (const student of students) {
        if (!student?.district_code) return sendJson(res, 400, { success: false, message: '学区代码不能为空' })
        if (!student?.student_name) return sendJson(res, 400, { success: false, message: '学生姓名不能为空' })
        if (!student?.school) return sendJson(res, 400, { success: false, message: '学校不能为空' })
        if (!student?.teacher_name) return sendJson(res, 400, { success: false, message: '指导教师不能为空' })
        if (!student?.leader_name) return sendJson(res, 400, { success: false, message: '带队教师姓名不能为空' })
        if (!student?.leader_phone) return sendJson(res, 400, { success: false, message: '带队教师电话不能为空' })
        if (!PHONE_REGEX.test(String(student.leader_phone))) {
          return sendJson(res, 400, { success: false, message: '带队教师电话必须为11位手机号' })
        }
      }

      const districtCodes = Array.from(new Set(students.map((s) => String(s.district_code))))
      const quotaRows = await sql`SELECT code, quota FROM districts WHERE code = ANY(${districtCodes})`
      const quotas = new Map(quotaRows.map((row) => [String(row.code), applyQuotaOverride(row.code, Number(row.quota))]))

      const countRows = await sql`
        SELECT district_code, COUNT(*)::int AS count
        FROM registrations
        WHERE district_code = ANY(${districtCodes})
        GROUP BY district_code
      `
      const currentCounts = new Map(countRows.map((row) => [String(row.district_code), Number(row.count)]))

      const results = []
      let failedCount = 0

      for (const student of students) {
        const client_id = student.client_id ? String(student.client_id) : undefined
        const districtCode = String(student.district_code)
        const quota = quotas.get(districtCode)
        const currentCount = currentCounts.get(districtCode) ?? 0

        if (quota == null) {
          results.push({ success: false, client_id, student_name: student.student_name, reason: '学区代码无效' })
          failedCount++
          continue
        }

        if (currentCount >= quota) {
          results.push({ success: false, client_id, student_name: student.student_name, reason: `${districtCode} 名额已满` })
          failedCount++
          continue
        }

        const ticket_number = createTicketNumber(districtCode, currentCount + 1)

        try {
          await sql`
            INSERT INTO registrations (ticket_number, district_code, student_name, school, teacher_name, leader_name, leader_phone, client_ip)
            VALUES (
              ${ticket_number},
              ${districtCode},
              ${student.student_name},
              ${student.school},
              ${student.teacher_name},
              ${student.leader_name},
              ${student.leader_phone},
              ${clientIp}
            )
          `

          results.push({ success: true, client_id, student_name: student.student_name, ticket_number })
          currentCounts.set(districtCode, currentCount + 1)
        } catch (error) {
          const code = error?.code
          const message = code === '23505' ? '准考证号重复' : error?.message || '报名失败'
          results.push({ success: false, client_id, student_name: student.student_name, reason: message })
          failedCount++
        }
      }

      return sendJson(res, 200, {
        success: true,
        message: `批量报名完成，成功 ${students.length - failedCount} 人，失败 ${failedCount} 人`,
        data: {
          total: students.length,
          success: students.length - failedCount,
          failed: failedCount,
          results,
        },
      })
    }

    if (segments[0] === 'registrations' && segments[1] === 'update' && req.method === 'POST') {
      const body = await readJsonBody(req)
      const ticketNumber = String(body?.ticket_number || '').trim()
      const currentLeaderPhone = String(body?.current_leader_phone || '').trim()

      if (!ticketNumber || !currentLeaderPhone) {
        return sendJson(res, 400, { success: false, message: '请提供准考证号与带队教师电话' })
      }
      if (!PHONE_REGEX.test(currentLeaderPhone)) {
        return sendJson(res, 400, { success: false, message: '带队教师电话必须为11位手机号' })
      }

      const existing = await sql`
        SELECT *
        FROM registrations
        WHERE ticket_number = ${ticketNumber}
        LIMIT 1
      `
      const registration = existing[0]
      if (!registration) {
        return sendJson(res, 404, { success: false, message: '报名记录不存在' })
      }
      if (String(registration.leader_phone) !== currentLeaderPhone) {
        return sendJson(res, 403, { success: false, message: '带队教师电话校验失败，无法修改报名信息' })
      }

      const nextStudentName = String(body?.student_name ?? registration.student_name).trim()
      const nextSchool = String(body?.school ?? registration.school).trim()
      const nextTeacherName = String(body?.teacher_name ?? registration.teacher_name ?? '').trim()
      const nextLeaderName = String(body?.leader_name ?? registration.leader_name).trim()
      const nextLeaderPhone = String(body?.leader_phone ?? registration.leader_phone).trim()

      if (!nextStudentName || !nextSchool || !nextLeaderName || !nextLeaderPhone) {
        return sendJson(res, 400, { success: false, message: '学生姓名、学校、带队教师、带队教师电话不能为空' })
      }
      if (!PHONE_REGEX.test(nextLeaderPhone)) {
        return sendJson(res, 400, { success: false, message: '带队教师电话必须为11位手机号' })
      }

      await sql`
        UPDATE registrations
        SET student_name = ${nextStudentName},
            school = ${nextSchool},
            teacher_name = ${nextTeacherName},
            leader_name = ${nextLeaderName},
            leader_phone = ${nextLeaderPhone}
        WHERE id = ${registration.id}
      `

      const updated = await sql`
        SELECT r.*, d.name as district_name
        FROM registrations r
        LEFT JOIN districts d ON r.district_code = d.code
        WHERE r.id = ${registration.id}
        LIMIT 1
      `

      return sendJson(res, 200, { success: true, message: '报名信息已更新', data: updated[0] })
    }

    if (segments[0] === 'registrations' && segments[1] === 'exam-room' && req.method === 'GET') {
      const { ticket_number, student_name, school, district_code } = req.query || {}

      if (!student_name && !school && !district_code && !ticket_number) {
        return sendJson(res, 400, { success: false, message: '请提供查询条件' })
      }

      // using neon sql syntax
      let results = await sql`
        SELECT r.ticket_number, r.student_name, r.school, r.exam_room, d.name as district_name
        FROM registrations r
        LEFT JOIN districts d ON r.district_code = d.code
      `;

      if (ticket_number) results = results.filter(r => String(r.ticket_number) === String(ticket_number));
      if (student_name) results = results.filter(r => String(r.student_name) === String(student_name));
      if (school) results = results.filter(r => r.school && String(r.school).includes(String(school)));
      if (district_code) results = results.filter(r => String(r.district_code) === String(district_code));

      if (results.length === 0) {
        return sendJson(res, 404, { success: false, message: '未找到匹配的考场信息' })
      }
      
      return sendJson(res, 200, { success: true, data: results })
    }

    if (segments[0] === 'registrations' && segments[1] === 'search' && req.method === 'GET') {
      const { ticket_number, student_name, school } = req.query || {}

      if (!ticket_number && !student_name && !school) {
        return sendJson(res, 400, { success: false, message: '请提供至少一个搜索条件' })
      }

      const allData = await sql`
        SELECT r.*, d.name as district_name
        FROM registrations r
        LEFT JOIN districts d ON r.district_code = d.code
        ORDER BY r.registration_time DESC
      `

      let filtered = allData
      const ticket = ticket_number ? String(ticket_number) : ''
      const name = student_name ? String(student_name) : ''
      const schoolStr = school ? String(school) : ''

      if (ticket) filtered = filtered.filter((r) => r.ticket_number && String(r.ticket_number).includes(ticket))
      if (name) filtered = filtered.filter((r) => r.student_name && String(r.student_name).includes(name))
      if (schoolStr) filtered = filtered.filter((r) => r.school && String(r.school).includes(schoolStr))

      return sendJson(res, 200, { success: true, data: filtered.slice(0, 100) })
    }

    if (segments[0] === 'registrations' && segments[1] === 'recent' && req.method === 'GET') {
      await ensureRegistrationColumns(sql)
      const clientIp = getClientIp(req)
      const districtCode = req.query?.district_code ? String(req.query.district_code) : ''
      const school = req.query?.school ? String(req.query.school) : ''

      let result = await sql`
        SELECT r.*, d.name as district_name
        FROM registrations r
        LEFT JOIN districts d ON r.district_code = d.code
        WHERE r.client_ip = ${clientIp}
        ORDER BY r.registration_time DESC
      `

      if (districtCode || school) {
        result = result.filter((row) => {
          const matchDistrict = districtCode ? String(row.district_code) === districtCode : false
          const matchSchool = school ? String(row.school) === school : false
          return matchDistrict || matchSchool
        })
      }

      return sendJson(res, 200, { success: true, data: result.slice(0, 100) })
    }

    if (segments[0] === 'registrations' && segments.length === 1 && req.method === 'GET') {
      const result = await sql`
        SELECT r.*, d.name as district_name
        FROM registrations r
        LEFT JOIN districts d ON r.district_code = d.code
        ORDER BY r.registration_time DESC
      `
      return sendJson(res, 200, { success: true, data: result })
    }

    if (segments[0] === 'registrations' && segments.length === 2 && req.method === 'DELETE') {
      const id = Number(segments[1])
      if (!Number.isFinite(id)) return sendJson(res, 400, { success: false, message: 'id无效' })
      await sql`DELETE FROM registrations WHERE id = ${id}`
      return sendJson(res, 200, { success: true, message: '删除成功' })
    }

    return sendJson(res, 404, { success: false, message: 'Not found' })
  } catch (error) {
    const message = error?.code === 'MISSING_DATABASE_URL' ? error.message : 'Internal server error'
    const detail = process.env.NODE_ENV === 'development' ? error?.message : undefined
    return sendJson(res, 500, { success: false, message, error: detail })
  }
}
