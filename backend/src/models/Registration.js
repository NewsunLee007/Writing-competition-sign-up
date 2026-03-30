import database from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Registration {
  static async create(registrationData) {
    const {
      user_id,
      contest_year,
      contest_term,
      contest_category,
      contest_level,
      student_full_name,
      student_birth_date,
      student_gender,
      student_id_number,
      student_school,
      student_grade,
      student_class,
      student_phone,
      student_email,
      emergency_contact,
      emergency_phone,
      guardian_name,
      guardian_relation,
      guardian_phone,
      guardian_email,
    } = registrationData;

    // 检查用户是否已报名同届比赛
    const existingRegistration = await this.findByUserAndContest(user_id, contest_year, contest_term);
    if (existingRegistration) {
      throw new Error('您已经报名本届比赛');
    }

    // 生成准考证号
    const examNumber = this.generateExamNumber(contest_year, contest_category);

    const query = `
      INSERT INTO registrations (
        id, user_id, contest_year, contest_term, contest_category, contest_level,
        student_full_name, student_birth_date, student_gender, student_id_number,
        student_school, student_grade, student_class, student_phone, student_email,
        emergency_contact, emergency_phone, guardian_name, guardian_relation,
        guardian_phone, guardian_email, exam_number, status,
        submitted_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, 'submitted',
        NOW(), NOW(), NOW()
      ) RETURNING *
    `;

    const values = [
      uuidv4(),
      user_id,
      contest_year,
      contest_term,
      contest_category,
      contest_level,
      student_full_name,
      student_birth_date,
      student_gender,
      student_id_number,
      student_school,
      student_grade,
      student_class,
      student_phone,
      student_email,
      emergency_contact,
      emergency_phone,
      guardian_name,
      guardian_relation,
      guardian_phone,
      guardian_email,
      examNumber,
    ];

    const result = await database.query(query, values);
    return result.rows[0];
  }

  static async findByUserAndContest(userId, contestYear, contestTerm) {
    const query = `
      SELECT * FROM registrations 
      WHERE user_id = $1 AND contest_year = $2 AND contest_term = $3 AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `;

    const result = await database.query(query, [userId, contestYear, contestTerm]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT r.*, u.email, u.full_name as user_full_name
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = $1 AND r.deleted_at IS NULL
    `;

    const result = await database.query(query, [id]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = `
      SELECT r.*, u.email, u.full_name as user_full_name
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = $1 AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
    `;

    const result = await database.query(query, [userId]);
    return result.rows;
  }

  static async getExamCardData(userId, registrationId) {
    const query = `
      SELECT 
        r.exam_number,
        r.student_full_name,
        r.student_gender,
        r.student_school,
        r.student_grade,
        r.student_class,
        r.contest_category,
        r.contest_level,
        r.exam_date,
        r.exam_time,
        r.exam_location,
        r.exam_room,
        r.exam_seat,
        u.phone,
        u.email
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = $1 AND r.id = $2 AND r.deleted_at IS NULL
    `;

    const result = await database.query(query, [userId, registrationId]);
    return result.rows[0];
  }

  static async update(registrationId, updates, userId = null) {
    // 如果提供了userId，检查权限
    if (userId) {
      const registration = await this.findById(registrationId);
      if (!registration) {
        throw new Error('报名信息不存在');
      }
      if (registration.user_id !== userId) {
        throw new Error('无权修改此报名信息');
      }
    }

    // 只允许更新草稿状态的报名
    const allowedUpdates = ['draft', 'submitted'].includes(updates.status) ? updates : {};
    
    const allowedFields = [
      'contest_category', 'contest_level', 'student_class', 'student_phone',
      'student_email', 'emergency_contact', 'emergency_phone', 'guardian_name',
      'guardian_relation', 'guardian_phone', 'guardian_email',
      'id_card_front_url', 'id_card_back_url', 'student_card_url', 'photo_url',
      'status',
    ];

    const updateFields = {};
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedFields.includes(key) && allowedUpdates[key] !== undefined) {
        updateFields[key] = allowedUpdates[key];
      }
    });

    if (Object.keys(updateFields).length === 0) {
      return this.findById(registrationId);
    }

    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [registrationId, ...Object.values(updateFields)];

    const query = `
      UPDATE registrations 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, values);
    return result.rows[0];
  }

  static async updateExamInfo(registrationId, examInfo) {
    const allowedFields = [
      'exam_date', 'exam_time', 'exam_location', 'exam_room', 'exam_seat',
    ];

    const updateFields = {};
    Object.keys(examInfo).forEach(key => {
      if (allowedFields.includes(key) && examInfo[key] !== undefined) {
        updateFields[key] = examInfo[key];
      }
    });

    if (Object.keys(updateFields).length === 0) {
      throw new Error('没有有效的考试信息需要更新');
    }

    // 检查报名信息是否存在且已审核通过
    const registration = await this.findById(registrationId);
    if (!registration) {
      throw new Error('报名信息不存在');
    }

    if (registration.status !== 'approved') {
      throw new Error('只有已审核通过的报名才能设置考场信息');
    }

    // 确保准考证号已生成
    let examNumber = registration.exam_number;
    if (!examNumber) {
      examNumber = this.generateExamNumber(
        registration.contest_year,
        registration.contest_category
      );
      updateFields.exam_number = examNumber;
    }

    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [registrationId, ...Object.values(updateFields)];

    const query = `
      UPDATE registrations 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, values);
    return result.rows[0];
  }

  static async updateStatus(registrationId, status, reviewNotes = null, reviewerId = null) {
    const allowedStatuses = ['reviewing', 'approved', 'rejected'];
    
    if (!allowedStatuses.includes(status)) {
      throw new Error('无效的状态更新');
    }

    const query = `
      UPDATE registrations 
      SET 
        status = $2,
        review_notes = $3,
        reviewer_id = $4,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, [
      registrationId,
      status,
      reviewNotes,
      reviewerId,
    ]);

    if (status === 'approved' && !result.rows[0].exam_number) {
      // 自动生成准考证号
      const registration = result.rows[0];
      const examNumber = this.generateExamNumber(
        registration.contest_year,
        registration.contest_category
      );

      await database.query(
        'UPDATE registrations SET exam_number = $2 WHERE id = $1',
        [registrationId, examNumber]
      );

      result.rows[0].exam_number = examNumber;
    }

    return result.rows[0];
  }

  static async updateScore(registrationId, score, ranking = null, awardLevel = null) {
    // 验证分数范围
    if (score < 0 || score > 100) {
      throw new Error('分数必须在0-100之间');
    }

    // 检查报名状态
    const registration = await this.findById(registrationId);
    if (!registration) {
      throw new Error('报名信息不存在');
    }

    if (registration.status !== 'approved') {
      throw new Error('只有已审核通过的报名才能录入成绩');
    }

    const query = `
      UPDATE registrations 
      SET 
        score = $2,
        ranking = $3,
        award_level = $4,
        updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, [
      registrationId,
      score,
      ranking,
      awardLevel,
    ]);

    return result.rows[0];
  }

  static async delete(registrationId, userId) {
    // 检查权限
    const registration = await this.findById(registrationId);
    if (!registration) {
      throw new Error('报名信息不存在');
    }

    if (registration.user_id !== userId) {
      throw new Error('无权删除此报名信息');
    }

    const query = `
      UPDATE registrations 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, student_full_name, deleted_at
    `;

    const result = await database.query(query, [registrationId]);
    return result.rows[0];
  }

  static async getStats(filters = {}) {
    let conditions = ['deleted_at IS NULL'];
    const values = [];

    if (filters.contest_year) {
      values.push(filters.contest_year);
      conditions.push(`contest_year = $${values.length}`);
    }

    if (filters.contest_term) {
      values.push(filters.contest_term);
      conditions.push(`contest_term = $${values.length}`);
    }

    if (filters.contest_category) {
      values.push(filters.contest_category);
      conditions.push(`contest_category = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_count,
        COUNT(CASE WHEN status = 'reviewing' THEN 1 END) as reviewing_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as scored_count,
        AVG(score) as average_score,
        MIN(score) as min_score,
        MAX(score) as max_score
      FROM registrations 
      ${whereClause}
    `;

    const categoryQuery = `
      SELECT 
        contest_category,
        COUNT(*) as count
      FROM registrations 
      ${whereClause}
      GROUP BY contest_category
      ORDER BY count DESC
    `;

    const [statsResult, categoryResult] = await Promise.all([
      database.query(statsQuery, values),
      database.query(categoryQuery, values),
    ]);

    return {
      overview: statsResult.rows[0],
      byCategory: categoryResult.rows,
    };
  }

  static generateExamNumber(contestYear, contestCategory) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // 生成准考证号格式：年份 + 类型代码 + 随机数 + 时间戳后4位
    const categoryCode = {
      '小学组': 'P',
      '初中组': 'M',
      '高中组': 'H',
    }[contestCategory] || 'X';

    return `${contestYear}${categoryCode}${random}${timestamp.toString().slice(-4)}`;
  }

  static async search(params) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      ...filters
    } = params;

    let conditions = ['r.deleted_at IS NULL'];
    const values = [];

    // 动态构建条件
    const filterMapping = {
      student_school: 'r.student_school ILIKE',
      student_grade: 'r.student_grade =',
      contest_category: 'r.contest_category =',
      contest_year: 'r.contest_year =',
      contest_term: 'r.contest_term =',
      status: 'r.status =',
      exam_number: 'r.exam_number =',
      student_full_name: 'r.student_full_name ILIKE',
      user_email: 'u.email ILIKE',
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && filterMapping[key]) {
        if (key.includes('ILIKE')) {
          values.push(`%${value}%`);
        } else {
          values.push(value);
        }
        conditions.push(`${filterMapping[key]} $${values.length}`);
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        r.*,
        u.email as user_email,
        u.phone as user_phone,
        u.full_name as user_full_name
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.${sortBy} ${sortOrder}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      ${whereClause}
    `;

    const [results, countResult] = await Promise.all([
      database.query(query, [...values, limit, offset]),
      database.query(countQuery, values),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return {
      data: results.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

export default Registration;