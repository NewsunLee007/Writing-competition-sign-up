const express = require('express')
const router = express.Router()
const pool = require('../config/database')
const { createTicketNumber, applyQuotaOverride, getUnitName } = require('../utils/helpers')

const PHONE_REGEX = /^1[3-9]\d{9}$/

// ----------------------------------------------------------------------
// 1) /districts
// ----------------------------------------------------------------------

router.get('/districts', async (req, res) => {
  try {
    const result = await pool.query('SELECT code, name, quota FROM districts ORDER BY name')
    
    // 获取每个学区当前的已报名人数
    let countMap = new Map()
    try {
      const countResult = await pool.query(`
        SELECT district_code, COUNT(*)::int AS count
        FROM registrations
        GROUP BY district_code
      `)
      countMap = new Map(countResult.rows.map(row => [row.district_code, row.count]))
    } catch (e) {
      console.error('获取报名统计失败:', e)
    }

    const data = result.rows.map(d => {
      const quota = applyQuotaOverride(d.code, d.quota)
      const registered_count = countMap.get(d.code) || 0
      const remaining_quota = Math.max(0, quota - registered_count)

      return {
        code: d.code,
        name: getUnitName(d.code, d.name),
        quota,
        registered_count,
        remaining_quota
      }
    })

    res.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch districts:', error)
    res.status(500).json({ success: false, message: '获取学区列表失败' })
  }
})

router.get('/districts/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT code, name, quota FROM districts ORDER BY name')
    
    let countMap = new Map()
    try {
      const countResult = await pool.query(`
        SELECT district_code, COUNT(*)::int AS count
        FROM registrations
        GROUP BY district_code
      `)
      countMap = new Map(countResult.rows.map(row => [row.district_code, row.count]))
    } catch (e) {
      console.error('获取报名统计失败:', e)
    }

    const data = result.rows.map(d => {
      const quota = applyQuotaOverride(d.code, d.quota)
      const registered_count = countMap.get(d.code) || 0
      const remaining_quota = Math.max(0, quota - registered_count)

      return {
        code: d.code,
        name: getUnitName(d.code, d.name),
        quota,
        registered_count,
        remaining_quota
      }
    })

    res.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    res.status(500).json({ success: false, message: '获取统计信息失败' })
  }
})

// ----------------------------------------------------------------------
// 2) /visitor
// ----------------------------------------------------------------------

router.get('/visitor/context', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
  res.json({
    success: true,
    data: {
      client_ip: Array.isArray(clientIp) ? clientIp[0].split(',')[0].trim() : clientIp.split(',')[0].trim()
    }
  })
})

// ----------------------------------------------------------------------
// 3) /admin
// ----------------------------------------------------------------------

router.post('/admin/login', async (req, res) => {
  const { account, password } = req.body

  if (!account || !password) {
    return res.status(400).json({ success: false, message: '请输入管理员账号和密码' })
  }

  try {
    // 确保 admin_users 表存在并有默认管理员
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        account VARCHAR(64) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // 检查默认管理员是否存在，如果不存在则创建（密码 admin123）
    const existing = await pool.query('SELECT id FROM admin_users WHERE account = $1 LIMIT 1', ['admin'])
    if (existing.rowCount === 0) {
      const { randomBytes, scryptSync } = require('crypto')
      const salt = randomBytes(16).toString('hex')
      const hash = scryptSync('admin123', salt, 64).toString('hex')
      const password_hash = `${salt}:${hash}`
      
      await pool.query(
        'INSERT INTO admin_users (account, password_hash, full_name) VALUES ($1, $2, $3)',
        ['admin', password_hash, '系统管理员']
      )
    }

    const adminResult = await pool.query(
      'SELECT account, password_hash, full_name FROM admin_users WHERE account = $1 LIMIT 1',
      [account]
    )

    const admin = adminResult.rows[0]
    if (!admin) {
      return res.status(401).json({ success: false, message: '管理员账号或密码错误' })
    }

    const { timingSafeEqual, scryptSync } = require('crypto')
    const [salt, hash] = (admin.password_hash || '').split(':')
    
    let isValid = false
    if (salt && hash) {
      const source = Buffer.from(hash, 'hex')
      const derived = scryptSync(password, salt, 64)
      if (source.length === derived.length) {
        isValid = timingSafeEqual(source, derived)
      }
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: '管理员账号或密码错误' })
    }

    // 生成 token
    const { createHmac } = require('crypto')
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || 'ruian-writing-contest-admin'
    const payload = Buffer.from(JSON.stringify({
      account: admin.account,
      exp: Date.now() + 1000 * 60 * 60 * 12
    })).toString('base64url')
    const signature = createHmac('sha256', secret).update(payload).digest('base64url')
    const token = `${payload}.${signature}`

    res.json({
      success: true,
      message: '管理员登录成功',
      data: {
        token,
        account: admin.account,
        full_name: admin.full_name
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({ success: false, message: '登录过程中发生错误' })
  }
})

// 管理员鉴权中间件
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '请先登录管理员账户' })
  }

  const [scheme, token] = String(authHeader).split(' ')
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: '请先登录管理员账户' })
  }

  try {
    const [payload, signature] = token.split('.')
    if (!payload || !signature) {
      return res.status(401).json({ success: false, message: '无效的登录凭证' })
    }

    const { createHmac, timingSafeEqual } = require('crypto')
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || 'ruian-writing-contest-admin'
    const expected = createHmac('sha256', secret).update(payload).digest('base64url')
    
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return res.status(401).json({ success: false, message: '无效的登录凭证' })
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data?.account || !data?.exp || Number(data.exp) < Date.now()) {
      return res.status(401).json({ success: false, message: '登录已过期，请重新登录' })
    }

    const adminResult = await pool.query('SELECT account, full_name FROM admin_users WHERE account = $1 LIMIT 1', [data.account])
    if (adminResult.rowCount === 0) {
      return res.status(401).json({ success: false, message: '管理员账户不存在' })
    }

    req.admin = adminResult.rows[0]
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: '请先登录管理员账户' })
  }
}

router.get('/admin/progress', requireAdmin, async (req, res) => {
  try {
    const districtResult = await pool.query('SELECT code, name, quota FROM districts ORDER BY name')
    const registrationResult = await pool.query(`
      SELECT r.district_code, r.school, d.name AS district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      ORDER BY r.registration_time DESC
    `)

    const unitMap = new Map(
      districtResult.rows.map(row => [
        row.code,
        {
          code: row.code,
          name: getUnitName(row.code, row.name),
          quota: applyQuotaOverride(row.code, row.quota),
          registered_count: 0,
          remaining_quota: applyQuotaOverride(row.code, row.quota),
          school_count: 0
        }
      ])
    )

    const schoolMap = new Map()

    for (const row of registrationResult.rows) {
      const code = row.district_code
      const unit = unitMap.get(code)
      if (unit) {
        unit.registered_count += 1
        unit.remaining_quota = Math.max(0, unit.quota - unit.registered_count)
      }

      const schoolKey = `${code}__${row.school}`
      const currentSchool = schoolMap.get(schoolKey) || {
        district_code: code,
        district_name: getUnitName(code, row.district_name),
        school: row.school,
        registered_count: 0
      }
      currentSchool.registered_count += 1
      schoolMap.set(schoolKey, currentSchool)
    }

    for (const school of schoolMap.values()) {
      const unit = unitMap.get(school.district_code)
      if (unit) unit.school_count += 1
    }

    const units = Array.from(unitMap.values()).sort((a, b) => b.registered_count - a.registered_count || a.code.localeCompare(b.code))
    const schools = Array.from(schoolMap.values()).sort((a, b) => b.registered_count - a.registered_count || a.school.localeCompare(b.school, 'zh-CN'))

    res.json({
      success: true,
      data: {
        summary: {
          total_registrations: registrationResult.rowCount,
          registered_units: units.filter(u => u.registered_count > 0).length,
          registered_schools: schools.length
        },
        units,
        schools
      }
    })
  } catch (error) {
    console.error('Failed to fetch admin progress:', error)
    res.status(500).json({ success: false, message: '获取报名进度失败' })
  }
})

router.get('/admin/registrations', requireAdmin, async (req, res) => {
  try {
    const { district_code, school } = req.query
    let query = `
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
    `
    const params = []
    const conditions = []

    if (district_code) {
      params.push(district_code)
      conditions.push(`r.district_code = $${params.length}`)
    }

    if (school) {
      params.push(`%${school}%`)
      conditions.push(`r.school ILIKE $${params.length}`)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` ORDER BY r.registration_time DESC`

    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Failed to fetch admin registrations:', error)
    res.status(500).json({ success: false, message: '获取报名记录失败' })
  }
})

router.patch('/admin/districts/:code', requireAdmin, async (req, res) => {
  const { code } = req.params
  const quota = parseInt(req.body.quota, 10)

  if (!code) {
    return res.status(400).json({ success: false, message: '归属代码不能为空' })
  }
  if (!Number.isInteger(quota) || quota < 0 || quota > 999) {
    return res.status(400).json({ success: false, message: '名额必须为 0-999 的整数' })
  }

  try {
    const existing = await pool.query('SELECT code FROM districts WHERE code = $1 LIMIT 1', [code])
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: '归属代码不存在' })
    }

    await pool.query('UPDATE districts SET quota = $1 WHERE code = $2', [quota, code])
    const updated = await pool.query('SELECT code, name, quota FROM districts WHERE code = $1 LIMIT 1', [code])

    res.json({
      success: true,
      message: '名额已更新',
      data: {
        code: updated.rows[0].code,
        name: getUnitName(updated.rows[0].code, updated.rows[0].name),
        quota: updated.rows[0].quota
      }
    })
  } catch (error) {
    console.error('Failed to update district quota:', error)
    res.status(500).json({ success: false, message: '更新名额失败' })
  }
})

router.delete('/admin/registrations/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: '报名记录编号无效' })
  }

  try {
    const existing = await pool.query('SELECT id, student_name FROM registrations WHERE id = $1 LIMIT 1', [id])
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: '报名记录不存在或已删除' })
    }

    await pool.query('DELETE FROM registrations WHERE id = $1', [id])
    res.json({
      success: true,
      message: `已删除 ${existing.rows[0].student_name} 的报名记录`,
      data: { deleted: 1 }
    })
  } catch (error) {
    console.error('Failed to delete registration:', error)
    res.status(500).json({ success: false, message: '删除报名记录失败' })
  }
})

router.patch('/admin/registrations/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: '报名记录编号无效' })
  }

  try {
    const existing = await pool.query('SELECT * FROM registrations WHERE id = $1 LIMIT 1', [id])
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: '报名记录不存在' })
    }

    const registration = existing.rows[0]
    const nextStudentName = (req.body.student_name ?? registration.student_name).trim()
    const nextSchool = (req.body.school ?? registration.school).trim()
    const nextTeacherName = (req.body.teacher_name ?? registration.teacher_name ?? '').trim()
    const nextLeaderName = (req.body.leader_name ?? registration.leader_name).trim()
    const nextLeaderPhone = (req.body.leader_phone ?? registration.leader_phone).trim()

    if (!nextStudentName || !nextSchool || !nextLeaderName || !nextLeaderPhone) {
      return res.status(400).json({ success: false, message: '学生姓名、学校、带队教师、带队教师电话不能为空' })
    }
    if (!PHONE_REGEX.test(nextLeaderPhone)) {
      return res.status(400).json({ success: false, message: '带队教师电话必须为11位手机号' })
    }

    await pool.query(
      `UPDATE registrations 
       SET student_name = $1, school = $2, teacher_name = $3, leader_name = $4, leader_phone = $5
       WHERE id = $6`,
      [nextStudentName, nextSchool, nextTeacherName, nextLeaderName, nextLeaderPhone, id]
    )

    const updated = await pool.query(
      `SELECT r.*, d.name as district_name 
       FROM registrations r 
       LEFT JOIN districts d ON r.district_code = d.code 
       WHERE r.id = $1 LIMIT 1`,
      [id]
    )

    res.json({ success: true, message: '报名信息已更新', data: updated.rows[0] })
  } catch (error) {
    console.error('Failed to update registration:', error)
    res.status(500).json({ success: false, message: '更新报名信息失败' })
  }
})

router.post('/admin/registrations/delete', requireAdmin, async (req, res) => {
  const { ids, confirm_text } = req.body
  
  const validIds = Array.isArray(ids) ? ids.map(id => parseInt(id, 10)).filter(id => Number.isInteger(id) && id > 0) : []

  if (validIds.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要删除的报名记录' })
  }

  if (String(confirm_text).trim() !== '确认删除选中报名') {
    return res.status(400).json({ success: false, message: '确认口令不正确，请输入“确认删除选中报名”后再执行' })
  }

  try {
    const result = await pool.query('DELETE FROM registrations WHERE id = ANY($1::int[]) RETURNING id', [validIds])
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '所选报名记录不存在或已删除' })
    }

    res.json({
      success: true,
      message: `已删除 ${result.rowCount} 条报名记录`,
      data: { deleted: result.rowCount }
    })
  } catch (error) {
    console.error('Failed to delete registrations batch:', error)
    res.status(500).json({ success: false, message: '批量删除报名记录失败' })
  }
})

router.post('/admin/registrations/reset', requireAdmin, async (req, res) => {
  const { confirm_text } = req.body

  if (String(confirm_text).trim() !== '确认清空报名数据') {
    return res.status(400).json({ success: false, message: '确认口令不正确，请输入“确认清空报名数据”后再执行' })
  }

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM registrations')
    const total = countResult.rows[0].count

    await pool.query('TRUNCATE TABLE registrations RESTART IDENTITY')

    res.json({
      success: true,
      message: `已清空 ${total} 条报名记录`,
      data: { cleared: total }
    })
  } catch (error) {
    console.error('Failed to reset registrations:', error)
    res.status(500).json({ success: false, message: '清空报名数据失败' })
  }
})

// ----------------------------------------------------------------------
// 4) /registrations (Public)
// ----------------------------------------------------------------------

router.post('/registrations/batch', async (req, res) => {
  try {
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS client_ip VARCHAR(64)')
  } catch (e) {
    // 忽略列已存在的错误
  }

  const clientIp = Array.isArray(req.headers['x-forwarded-for']) 
    ? req.headers['x-forwarded-for'][0].split(',')[0].trim() 
    : req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || ''

  const { students } = req.body

  if (!Array.isArray(students)) {
    return res.status(400).json({ success: false, message: 'students必须是数组' })
  }

  for (const student of students) {
    if (!student?.district_code) return res.status(400).json({ success: false, message: '学区代码不能为空' })
    if (!student?.student_name) return res.status(400).json({ success: false, message: '学生姓名不能为空' })
    if (!student?.school) return res.status(400).json({ success: false, message: '学校不能为空' })
    if (!student?.teacher_name) return res.status(400).json({ success: false, message: '指导教师不能为空' })
    if (!student?.leader_name) return res.status(400).json({ success: false, message: '带队教师姓名不能为空' })
    if (!student?.leader_phone) return res.status(400).json({ success: false, message: '带队教师电话不能为空' })
    if (!PHONE_REGEX.test(String(student.leader_phone))) {
      return res.status(400).json({ success: false, message: '带队教师电话必须为11位手机号' })
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const districtCodes = [...new Set(students.map(s => s.district_code))]
    const quotaResult = await client.query(
      'SELECT code, quota FROM districts WHERE code = ANY($1)',
      [districtCodes]
    )
    
    const quotas = new Map(
      quotaResult.rows.map(row => [row.code, applyQuotaOverride(row.code, row.quota)])
    )

    const countResult = await client.query(
      `SELECT district_code, COUNT(*)::int AS count 
       FROM registrations 
       WHERE district_code = ANY($1) 
       GROUP BY district_code`,
      [districtCodes]
    )
    
    const currentCounts = new Map(
      countResult.rows.map(row => [row.district_code, row.count])
    )

    const results = []
    let failedCount = 0

    for (const student of students) {
      const { district_code, student_name, school, teacher_name, leader_name, leader_phone, client_id } = student
      const quota = quotas.get(district_code)
      const currentCount = currentCounts.get(district_code) || 0

      if (quota == null) {
        results.push({ success: false, client_id, student_name, reason: '学区代码无效' })
        failedCount++
        continue
      }

      if (currentCount >= quota) {
        results.push({ success: false, client_id, student_name, reason: `${district_code} 名额已满` })
        failedCount++
        continue
      }

      const ticket_number = createTicketNumber(district_code, currentCount + 1)

      try {
        await client.query(
          `INSERT INTO registrations 
           (ticket_number, district_code, student_name, school, teacher_name, leader_name, leader_phone, client_ip)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [ticket_number, district_code, student_name, school, teacher_name, leader_name, leader_phone, clientIp]
        )

        results.push({ success: true, client_id, student_name, ticket_number })
        currentCounts.set(district_code, currentCount + 1)
      } catch (error) {
        const message = error.code === '23505' ? '准考证号重复' : '报名失败'
        results.push({ success: false, client_id, student_name, reason: message })
        failedCount++
      }
    }

    await client.query('COMMIT')

    res.json({
      success: true,
      message: `批量报名完成，成功 ${students.length - failedCount} 人，失败 ${failedCount} 人`,
      data: {
        total: students.length,
        success: students.length - failedCount,
        failed: failedCount,
        results
      }
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Batch registration error:', error)
    res.status(500).json({ success: false, message: '批量报名过程中发生错误' })
  } finally {
    client.release()
  }
})

router.post('/registrations/update', async (req, res) => {
  const ticketNumber = String(req.body.ticket_number || '').trim()
  const currentLeaderPhone = String(req.body.current_leader_phone || '').trim()

  if (!ticketNumber || !currentLeaderPhone) {
    return res.status(400).json({ success: false, message: '请提供准考证号与带队教师电话' })
  }
  if (!PHONE_REGEX.test(currentLeaderPhone)) {
    return res.status(400).json({ success: false, message: '带队教师电话必须为11位手机号' })
  }

  try {
    const existing = await pool.query('SELECT * FROM registrations WHERE ticket_number = $1 LIMIT 1', [ticketNumber])
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: '报名记录不存在' })
    }

    const registration = existing.rows[0]
    if (registration.leader_phone !== currentLeaderPhone) {
      return res.status(403).json({ success: false, message: '带队教师电话校验失败，无法修改报名信息' })
    }

    const nextStudentName = String(req.body.student_name ?? registration.student_name).trim()
    const nextSchool = String(req.body.school ?? registration.school).trim()
    const nextTeacherName = String(req.body.teacher_name ?? registration.teacher_name ?? '').trim()
    const nextLeaderName = String(req.body.leader_name ?? registration.leader_name).trim()
    const nextLeaderPhone = String(req.body.leader_phone ?? registration.leader_phone).trim()

    if (!nextStudentName || !nextSchool || !nextLeaderName || !nextLeaderPhone) {
      return res.status(400).json({ success: false, message: '学生姓名、学校、带队教师、带队教师电话不能为空' })
    }
    if (!PHONE_REGEX.test(nextLeaderPhone)) {
      return res.status(400).json({ success: false, message: '带队教师电话必须为11位手机号' })
    }

    await pool.query(
      `UPDATE registrations 
       SET student_name = $1, school = $2, teacher_name = $3, leader_name = $4, leader_phone = $5
       WHERE id = $6`,
      [nextStudentName, nextSchool, nextTeacherName, nextLeaderName, nextLeaderPhone, registration.id]
    )

    const updated = await pool.query(
      `SELECT r.*, d.name as district_name 
       FROM registrations r 
       LEFT JOIN districts d ON r.district_code = d.code 
       WHERE r.id = $1 LIMIT 1`,
      [registration.id]
    )

    res.json({ success: true, message: '报名信息已更新', data: updated.rows[0] })
  } catch (error) {
    console.error('Failed to update registration by ticket:', error)
    res.status(500).json({ success: false, message: '更新报名信息失败' })
  }
})

router.get('/registrations/exam-room', async (req, res) => {
  const { ticket_number, student_name, school, district_code } = req.query

  if (!student_name && !school && !district_code && !ticket_number) {
    return res.status(400).json({ success: false, message: '请提供查询条件' })
  }

  try {
    let query = `
      SELECT r.ticket_number, r.student_name, r.school, r.exam_room, r.district_code, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      WHERE 1=1
    `
    const params = []
    
    if (ticket_number) {
      params.push(ticket_number.trim())
      query += ` AND r.ticket_number = $${params.length}`
    }
    if (student_name) {
      params.push(`%${student_name.trim()}%`)
      query += ` AND r.student_name ILIKE $${params.length}`
    }
    if (school) {
      params.push(`%${school.trim()}%`)
      query += ` AND r.school ILIKE $${params.length}`
    }
    if (district_code) {
      params.push(district_code.trim())
      query += ` AND r.district_code = $${params.length}`
    }

    const result = await pool.query(query, params)

    if (result.rowCount === 0) {
      return res.status(200).json({ success: true, data: [], message: '未找到匹配的考场信息' })
    }

    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Failed to query exam room:', error)
    res.status(500).json({ success: false, message: '查询考场信息失败' })
  }
})

router.get('/registrations/search', async (req, res) => {
  const { ticket_number, student_name, school } = req.query

  if (!ticket_number && !student_name && !school) {
    return res.status(400).json({ success: false, message: '请提供至少一个搜索条件' })
  }

  try {
    let query = `
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      WHERE 1=1
    `
    const params = []
    
    if (ticket_number) {
      params.push(`%${ticket_number}%`)
      query += ` AND r.ticket_number ILIKE $${params.length}`
    }
    if (student_name) {
      params.push(`%${student_name}%`)
      query += ` AND r.student_name ILIKE $${params.length}`
    }
    if (school) {
      params.push(`%${school}%`)
      query += ` AND r.school ILIKE $${params.length}`
    }

    query += ' ORDER BY r.registration_time DESC LIMIT 100'

    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Search failed:', error)
    res.status(500).json({ success: false, message: '搜索失败' })
  }
})

router.get('/registrations/recent', async (req, res) => {
  const clientIp = Array.isArray(req.headers['x-forwarded-for']) 
    ? req.headers['x-forwarded-for'][0].split(',')[0].trim() 
    : req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || ''
    
  const { district_code, school } = req.query

  try {
    let query = `
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      WHERE r.client_ip = $1
    `
    const params = [clientIp]

    if (district_code || school) {
      const conditions = []
      if (district_code) {
        params.push(district_code)
        conditions.push(`r.district_code = $${params.length}`)
      }
      if (school) {
        params.push(school)
        conditions.push(`r.school = $${params.length}`)
      }
      query += ` AND (${conditions.join(' OR ')})`
    }

    query += ' ORDER BY r.registration_time DESC LIMIT 100'

    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Failed to fetch recent registrations:', error)
    res.status(500).json({ success: false, message: '获取最近报名记录失败' })
  }
})

router.get('/registrations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, d.name as district_name
      FROM registrations r
      LEFT JOIN districts d ON r.district_code = d.code
      ORDER BY r.registration_time DESC
    `)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Failed to fetch registrations:', error)
    res.status(500).json({ success: false, message: '获取报名列表失败' })
  }
})

router.delete('/registrations/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ success: false, message: 'id无效' })
  }
  
  try {
    await pool.query('DELETE FROM registrations WHERE id = $1', [id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Failed to delete registration:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

module.exports = router
