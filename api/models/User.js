import bcrypt from 'bcrypt';
import database from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class User {
  static async create(userData) {
    const {
      email,
      password,
      phone,
      full_name,
      school,
      grade,
      student_id,
      gender = '未填写',
      birth_date = null,
      address = '',
    } = userData;

    // 验证邮箱是否已存在
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new Error('邮箱已被注册');
    }

    // 验证手机号是否已存在
    if (phone) {
      const existingPhone = await this.findByPhone(phone);
      if (existingPhone) {
        throw new Error('手机号已被注册');
      }
    }

    // 哈希密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 生成验证令牌
    const verificationToken = uuidv4();

    const query = `
      INSERT INTO users (
        email, password_hash, phone, full_name, school, grade,
        student_id, gender, birth_date, address, verification_token,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      email,
      passwordHash,
      phone,
      full_name,
      school,
      grade,
      student_id,
      gender,
      birth_date,
      address,
      verificationToken,
    ];

    const result = await database.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL';
    const result = await database.query(query, [email]);
    return result.rows[0];
  }

  static async findByPhone(phone) {
    const query = 'SELECT * FROM users WHERE phone = $1 AND deleted_at IS NULL';
    const result = await database.query(query, [phone]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL';
    const result = await database.query(query, [id]);
    return result.rows[0];
  }

  static async verifyCredentials(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('用户不存在');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('密码错误');
    }

    return user;
  }

  static async update(id, updates) {
    const allowedFields = [
      'full_name', 'phone', 'school', 'grade', 'student_id',
      'gender', 'birth_date', 'address', 'avatar_url',
    ];

    // 过滤允许更新的字段
    const updateFields = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields[key] = updates[key];
      }
    });

    // 如果没有要更新的字段，直接返回
    if (Object.keys(updateFields).length === 0) {
      return this.findById(id);
    }

    // 构建 SET 子句
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(updateFields)];

    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, values);
    return result.rows[0];
  }

  static async updatePassword(id, oldPassword, newPassword) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('旧密码错误');
    }

    // 哈希新密码
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    const query = `
      UPDATE users 
      SET password_hash = $2, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, email, full_name
    `;

    const result = await database.query(query, [id, newPasswordHash]);
    return result.rows[0];
  }

  static async verifyEmail(token) {
    const query = `
      UPDATE users 
      SET email_verified = true, verification_token = NULL, updated_at = NOW()
      WHERE verification_token = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, [token]);
    return result.rows[0];
  }

  static async requestPasswordReset(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('用户不存在');
    }

    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1小时后过期

    const query = `
      UPDATE users 
      SET reset_token = $2, reset_token_expires = $3, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, email, full_name, reset_token
    `;

    const result = await database.query(query, [user.id, resetToken, resetTokenExpires]);
    return result.rows[0];
  }

  static async resetPassword(token, newPassword) {
    const query = `
      SELECT * FROM users 
      WHERE reset_token = $1 AND reset_token_expires > NOW() AND deleted_at IS NULL
    `;

    const user = await database.query(query, [token]);
    if (!user.rows[0]) {
      throw new Error('重置令牌无效或已过期');
    }

    // 哈希新密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    const updateQuery = `
      UPDATE users 
      SET password_hash = $2, reset_token = NULL, reset_token_expires = NULL, 
          updated_at = NOW()
      WHERE reset_token = $1
      RETURNING id, email, full_name
    `;

    const result = await database.query(updateQuery, [token, passwordHash]);
    return result.rows[0];
  }

  static async updateLastLogin(id) {
    const query = `
      UPDATE users 
      SET last_login = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, last_login
    `;

    const result = await database.query(query, [id]);
    return result.rows[0];
  }

  static async findAdminUsers() {
    const query = `
      SELECT id, email, full_name, role, created_at, last_login
      FROM users 
      WHERE role = 'admin' AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    const result = await database.query(query);
    return result.rows;
  }

  static async countByFilters(filters = {}) {
    let conditions = ['deleted_at IS NULL'];
    const values = [];

    if (filters.school) {
      values.push(`%${filters.school}%`);
      conditions.push(`school ILIKE $${values.length}`);
    }

    if (filters.grade) {
      values.push(filters.grade);
      conditions.push(`grade = $${values.length}`);
    }

    if (filters.startDate) {
      values.push(filters.startDate);
      conditions.push(`created_at >= $${values.length}`);
    }

    if (filters.endDate) {
      values.push(filters.endDate);
      conditions.push(`created_at <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT COUNT(*) as total_count
      FROM users 
      ${whereClause}
    `;

    const result = await database.query(query, values);
    return parseInt(result.rows[0].total_count);
  }

  static async softDelete(id) {
    const query = `
      UPDATE users 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, email, deleted_at
    `;

    const result = await database.query(query, [id]);
    return result.rows[0];
  }
}

export default User;