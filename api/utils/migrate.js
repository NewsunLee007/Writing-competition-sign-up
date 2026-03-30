import database from '../config/database.js';

async function createTables() {
  console.log('开始创建数据库表...');

  // 创建 users 表
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(20) UNIQUE,
      full_name VARCHAR(100) NOT NULL,
      school VARCHAR(200),
      grade VARCHAR(20),
      student_id VARCHAR(50),
      gender VARCHAR(10) DEFAULT '未填写',
      birth_date DATE,
      address TEXT,
      avatar_url TEXT,
      
      -- 认证相关字段
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(255) UNIQUE,
      reset_token VARCHAR(255) UNIQUE,
      reset_token_expires TIMESTAMP,
      
      -- 角色和权限
      role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin', 'super_admin')),
      permissions JSONB DEFAULT '[]',
      
      -- 统计信息
      login_count INTEGER DEFAULT 0,
      last_login TIMESTAMP,
      
      -- 审计字段
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP,
      
      -- 索引
      INDEX idx_users_email (email),
      INDEX idx_users_phone (phone),
      INDEX idx_users_school (school),
      INDEX idx_users_grade (grade),
      INDEX idx_users_created_at (created_at DESC)
    );
  `;

  // 创建 registrations 表（报名信息）
  const createRegistrationsTable = `
    CREATE TABLE IF NOT EXISTS registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      
      -- 报名基本信息
      contest_year INTEGER NOT NULL,
      contest_term VARCHAR(20) NOT NULL, -- 如：春季赛、秋季赛
      contest_category VARCHAR(50) NOT NULL, -- 组别：小学组、初中组、高中组
      contest_level VARCHAR(50), -- 级别：A组、B组等
      
      -- 学生信息
      student_full_name VARCHAR(100) NOT NULL,
      student_birth_date DATE NOT NULL,
      student_gender VARCHAR(10) NOT NULL,
      student_id_number VARCHAR(50), -- 身份证/护照号
      student_school VARCHAR(200) NOT NULL,
      student_grade VARCHAR(20) NOT NULL,
      student_class VARCHAR(50),
      student_phone VARCHAR(20),
      student_email VARCHAR(255),
      emergency_contact VARCHAR(100),
      emergency_phone VARCHAR(20),
      
      -- 报名材料
      id_card_front_url TEXT,
      id_card_back_url TEXT,
      student_card_url TEXT,
      photo_url TEXT,
      
      -- 监护人信息
      guardian_name VARCHAR(100),
      guardian_relation VARCHAR(50),
      guardian_phone VARCHAR(20),
      guardian_email VARCHAR(255),
      
      -- 支付信息
      payment_method VARCHAR(50),
      payment_amount DECIMAL(10, 2),
      payment_status VARCHAR(20) DEFAULT 'pending',
      payment_id VARCHAR(255),
      payment_time TIMESTAMP,
      
      -- 状态和进度
      status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewing', 'approved', 'rejected', 'completed')),
      review_notes TEXT,
      reviewer_id UUID REFERENCES users(id),
      reviewed_at TIMESTAMP,
      
      -- 准考证信息
      exam_number VARCHAR(50) UNIQUE,
      exam_date DATE,
      exam_time TIME,
      exam_location TEXT,
      exam_room VARCHAR(50),
      exam_seat VARCHAR(20),
      
      -- 成绩信息
      score DECIMAL(5, 2),
      ranking INTEGER,
      award_level VARCHAR(50),
      certificate_number VARCHAR(100),
      certificate_url TEXT,
      
      -- 提交信息
      submitted_at TIMESTAMP DEFAULT NOW(),
      submitted_ip VARCHAR(45),
      submitted_user_agent TEXT,
      
      -- 审计字段
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP,
      
      -- 索引
      INDEX idx_registrations_user_id (user_id),
      INDEX idx_registrations_contest_year (contest_year),
      INDEX idx_registrations_contest_category (contest_category),
      INDEX idx_registrations_status (status),
      INDEX idx_registrations_exam_number (exam_number),
      INDEX idx_registrations_created_at (created_at DESC),
      INDEX idx_registrations_submitted_at (submitted_at DESC),
      
      -- 约束
      UNIQUE(user_id, contest_year, contest_term)
    );
  `;

  // 创建 downloads 表（下载记录）
  const createDownloadsTable = `
    CREATE TABLE IF NOT EXISTS downloads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
      
      -- 下载信息
      download_type VARCHAR(50) NOT NULL, -- admission_card, certificate, etc.
      file_path TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT,
      file_mime_type VARCHAR(100),
      
      -- 访问信息
      ip_address VARCHAR(45),
      user_agent TEXT,
      country VARCHAR(100),
      region VARCHAR(100),
      city VARCHAR(100),
      
      -- 统计
      download_count INTEGER DEFAULT 1,
      
      -- 审计字段
      first_downloaded_at TIMESTAMP DEFAULT NOW(),
      last_downloaded_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      
      -- 索引
      INDEX idx_downloads_user_id (user_id),
      INDEX idx_downloads_registration_id (registration_id),
      INDEX idx_downloads_download_type (download_type),
      INDEX idx_downloads_first_downloaded_at (first_downloaded_at DESC)
    );
  `;

  // 创建 announcements 表（公告）
  const createAnnouncementsTable = `
    CREATE TABLE IF NOT EXISTS announcements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'general',
      priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      
      -- 可见性控制
      is_published BOOLEAN DEFAULT FALSE,
      publish_at TIMESTAMP,
      expire_at TIMESTAMP,
      
      -- 附件
      attachments JSONB DEFAULT '[]',
      featured_image TEXT,
      
      -- 统计
      view_count INTEGER DEFAULT 0,
      author_id UUID REFERENCES users(id),
      
      -- 审计字段
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP,
      
      -- 索引
      INDEX idx_announcements_category (category),
      INDEX idx_announcements_is_published (is_published),
      INDEX idx_announcements_publish_at (publish_at DESC),
      INDEX idx_announcements_created_at (created_at DESC)
    );
  `;

  // 创建 audit_logs 表（审计日志）
  const createAuditLogsTable = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      
      -- 操作信息
      action_type VARCHAR(50) NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      resource_id VARCHAR(255),
      resource_name VARCHAR(255),
      
      -- 变更数据
      old_data JSONB,
      new_data JSONB,
      changes JSONB,
      
      -- 上下文信息
      ip_address VARCHAR(45),
      user_agent TEXT,
      request_method VARCHAR(10),
      request_url TEXT,
      
      -- 成功/失败
      is_success BOOLEAN DEFAULT TRUE,
      error_message TEXT,
      
      -- 审计字段
      created_at TIMESTAMP DEFAULT NOW(),
      
      -- 索引
      INDEX idx_audit_logs_user_id (user_id),
      INDEX idx_audit_logs_action_type (action_type),
      INDEX idx_audit_logs_resource_type (resource_type),
      INDEX idx_audit_logs_created_at (created_at DESC)
    );
  `;

  // 触发器函数：自动更新 updated_at
  const createUpdateTriggerFunction = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `;

  const tables = [
    { name: 'users', sql: createUsersTable },
    { name: 'registrations', sql: createRegistrationsTable },
    { name: 'downloads', sql: createDownloadsTable },
    { name: 'announcements', sql: createAnnouncementsTable },
    { name: 'audit_logs', sql: createAuditLogsTable },
  ];

  const client = await database.getClient();

  try {
    // 执行触发器函数
    await client.query(createUpdateTriggerFunction);
    console.log('✅ 创建触发器函数');

    // 创建所有表
    for (const table of tables) {
      await client.query(table.sql);
      console.log(`✅ 创建表: ${table.name}`);
    }

    // 为每个表创建触发器
    for (const table of tables) {
      const triggerName = `update_${table.name}_updated_at`;
      const createTrigger = `
        DROP TRIGGER IF EXISTS ${triggerName} ON ${table.name};
        CREATE TRIGGER ${triggerName}
        BEFORE UPDATE ON ${table.name}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `;
      await client.query(createTrigger);
      console.log(`✅ 创建触发器: ${triggerName}`);
    }

    console.log('\n✅ 数据库表创建完成！');
    console.log('可用表列表：');
    for (const table of tables) {
      console.log(`  - ${table.name}`);
    }
    console.log('\n可以开始使用应用程序了。');

  } catch (error) {
    console.error('❌ 创建表时发生错误:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function seedDatabase() {
  console.log('\n开始导入初始数据...');
  const client = await database.getClient();

  try {
    // 创建默认管理员账户
    const adminEmail = 'admin@ruian-writing-contest.com';
    const adminPassword = '$2b$10$YourHashedAdminPassword12345'; // 实际使用时需要替换为真正的哈希密码
    
    const checkAdminQuery = `SELECT id FROM users WHERE email = $1`;
    const existingAdmin = await client.query(checkAdminQuery, [adminEmail]);

    if (!existingAdmin.rows.length) {
      const createAdminQuery = `
        INSERT INTO users (
          email, password_hash, full_name, role, email_verified,
          school, grade, phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, full_name, role
      `;

      const adminData = [
        adminEmail,
        adminPassword,
        '系统管理员',
        'super_admin',
        true,
        '瑞安市教育局',
        '管理员',
        '13800000000'
      ];

      const result = await client.query(createAdminQuery, adminData);
      console.log('✅ 创建管理员账户:', result.rows[0]);
    } else {
      console.log('⚠️  管理员账户已存在，跳过创建');
    }

    // 创建测试公告
    const sampleAnnouncement = `
      INSERT INTO announcements (
        title, content, category, priority, is_published,
        author_id, attachments
      ) VALUES (
        '2025年春季英语写作大赛报名开始',
        '尊敬的各位同学、老师及家长：
        
        2025年春季瑞安市英语写作大赛的报名工作正式启动！本次大赛旨在激发学生学习英语的兴趣，提高英语写作能力，搭建展示才华的舞台。
        
        **比赛时间与地点：**
        - 初赛：2025年4月15日（周六）上午9:00-11:00
        - 决赛：2025年5月20日（周日）上午9:00-11:00
        - 地点：各参赛学校/瑞安市青少年活动中心
        
        **参赛对象：**
        全市中小学生（小学四年级至高中三年级）
        
        **报名方式：**
        1. 登录本报名系统注册账号
        2. 完善个人信息
        3. 在线提交报名申请
        4. 审核通过后下载准考证
        
        **比赛组别：**
        - 小学组（四年级至六年级）
        - 初中组（七年级至九年级）
        - 高中组（十年级至十二年级）
        
        **奖项设置：**
        各组别设立一等奖、二等奖、三等奖及优秀奖若干名，颁发荣誉证书及奖品。
        
        欢迎广大师生踊跃报名参加！
        
        瑞安市英语写作大赛组委会
        2025年3月30日',
        'notice',
        'high',
        true,
        (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
        '[]'::jsonb
      )
      ON CONFLICT DO NOTHING
    `;

    await client.query(sampleAnnouncement);
    console.log('✅ 创建示例公告');

    console.log('✅ 初始数据导入完成！');

  } catch (error) {
    console.error('❌ 导入初始数据时发生错误:', error);
  } finally {
    client.release();
  }
}

// 执行迁移
async function runMigration() {
  try {
    await createTables();
    await seedDatabase();
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

// 如果是直接运行，执行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { createTables, seedDatabase, runMigration };