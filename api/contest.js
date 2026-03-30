let sqlClient

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return sendJson(res, 204, {})

  const sql = await getSql()
  const pathStr = normalizePath(req.query?.path)
  const segments = pathStr.split('/').filter(Boolean)

  try {
    if (segments.length === 0) {
      return sendJson(res, 200, { success: true, message: 'Writing Contest API' })
    }

    if (segments[0] === 'health' && req.method === 'GET') {
      await sql`SELECT NOW()`
      return sendJson(res, 200, {
        success: true,
        message: 'Writing Contest API is running',
        timestamp: new Date().toISOString(),
      })
    }

    if (segments[0] === 'districts' && segments.length === 1 && req.method === 'GET') {
      const result = await sql`SELECT code, name, quota FROM districts ORDER BY name`
      return sendJson(res, 200, { success: true, data: result })
    }

    if (segments[0] === 'districts' && segments[1] === 'stats' && req.method === 'GET') {
      const result = await sql`SELECT * FROM district_stats`
      return sendJson(res, 200, { success: true, data: result })
    }

    if (segments[0] === 'registrations' && segments[1] === 'batch' && req.method === 'POST') {
      const body = await readJsonBody(req)
      const students = body?.students

      if (!Array.isArray(students)) {
        return sendJson(res, 400, { success: false, message: 'students必须是数组' })
      }

      for (const student of students) {
        if (!student?.district_code) return sendJson(res, 400, { success: false, message: '学区代码不能为空' })
        if (!student?.student_name) return sendJson(res, 400, { success: false, message: '学生姓名不能为空' })
        if (!student?.school) return sendJson(res, 400, { success: false, message: '学校不能为空' })
        if (!student?.leader_name) return sendJson(res, 400, { success: false, message: '带队教师姓名不能为空' })
        if (!student?.leader_phone) return sendJson(res, 400, { success: false, message: '带队教师电话不能为空' })
      }

      const districtCodes = Array.from(new Set(students.map((s) => String(s.district_code))))
      const quotaRows = await sql`SELECT code, quota FROM districts WHERE code = ANY(${districtCodes})`
      const quotas = new Map(quotaRows.map((row) => [String(row.code), Number(row.quota)]))

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
        const districtCode = String(student.district_code)
        const quota = quotas.get(districtCode)
        const currentCount = currentCounts.get(districtCode) ?? 0

        if (quota == null) {
          results.push({ success: false, student_name: student.student_name, reason: '学区代码无效' })
          failedCount++
          continue
        }

        if (currentCount >= quota) {
          results.push({ success: false, student_name: student.student_name, reason: `${districtCode} 学区名额已满` })
          failedCount++
          continue
        }

        const sequence = String(currentCount + 1).padStart(3, '0')
        const ticket_number = `20260412${districtCode}${sequence}`

        try {
          await sql`
            INSERT INTO registrations (ticket_number, district_code, student_name, school, teacher_name, leader_name, leader_phone)
            VALUES (
              ${ticket_number},
              ${districtCode},
              ${student.student_name},
              ${student.school},
              ${student.teacher_name ?? null},
              ${student.leader_name},
              ${student.leader_phone}
            )
          `

          results.push({ success: true, student_name: student.student_name, ticket_number })
          currentCounts.set(districtCode, currentCount + 1)
        } catch (error) {
          const code = error?.code
          const message = code === '23505' ? '准考证号重复' : error?.message || '报名失败'
          results.push({ success: false, student_name: student.student_name, reason: message })
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
