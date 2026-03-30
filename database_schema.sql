-- 瑞安市英语写作大赛报名系统数据库结构
-- 创建时间: 2026-03-30

-- 1. 创建学区/学校表（用于名额控制和代码管理）
CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,      -- 学区代码: TX, AY, FY等
    name VARCHAR(100) NOT NULL,             -- 学区名称
    quota INTEGER NOT NULL,                 -- 名额限制
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入/更新学区数据（存在则更新名额与名称）
INSERT INTO districts (code, name, quota) VALUES
('TX', '塘下学区', 25),
('AY', '安阳学区', 20),
('FY', '飞云学区', 18),
('XC', '莘塍学区', 12),
('MY', '马屿学区', 10),
('GL', '高楼学区', 5),
('HL', '湖岭学区', 5),
('TS', '陶山学区', 5),
('SY', '安阳实验', 15),
('XY', '新纪元', 10),
('AG', '安高初中', 8),
('RX', '瑞祥实验', 8),
('JY', '集云学校', 6),
('YM', '毓蒙中学', 6),
('GC', '广场中学', 4),
('RZ', '瑞中附初', 6),
('ZJ', '紫荆书院', 1);
-- 如已存在则更新
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'TX') THEN
    UPDATE districts SET name='塘下学区', quota=25 WHERE code='TX';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'AY') THEN
    UPDATE districts SET name='安阳学区', quota=20 WHERE code='AY';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'FY') THEN
    UPDATE districts SET name='飞云学区', quota=18 WHERE code='FY';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'XC') THEN
    UPDATE districts SET name='莘塍学区', quota=12 WHERE code='XC';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'MY') THEN
    UPDATE districts SET name='马屿学区', quota=10 WHERE code='MY';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'GL') THEN
    UPDATE districts SET name='高楼学区', quota=5 WHERE code='GL';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'HL') THEN
    UPDATE districts SET name='湖岭学区', quota=5 WHERE code='HL';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'TS') THEN
    UPDATE districts SET name='陶山学区', quota=5 WHERE code='TS';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'SY') THEN
    UPDATE districts SET name='安阳实验', quota=15 WHERE code='SY';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'XY') THEN
    UPDATE districts SET name='新纪元', quota=10 WHERE code='XY';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'AG') THEN
    UPDATE districts SET name='安高初中', quota=8 WHERE code='AG';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'RX') THEN
    UPDATE districts SET name='瑞祥实验', quota=8 WHERE code='RX';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'JY') THEN
    UPDATE districts SET name='集云学校', quota=6 WHERE code='JY';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'YM') THEN
    UPDATE districts SET name='毓蒙中学', quota=6 WHERE code='YM';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'GC') THEN
    UPDATE districts SET name='广场中学', quota=4 WHERE code='GC';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'RZ') THEN
    UPDATE districts SET name='瑞中附初', quota=6 WHERE code='RZ';
  END IF;
  IF EXISTS (SELECT 1 FROM districts WHERE code = 'ZJ') THEN
    UPDATE districts SET name='紫荆书院', quota=1 WHERE code='ZJ';
  END IF;
END $$;

-- 2. 创建报名表
CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,  -- 准考证号: 年份2位 + 考场号2位 + 座位号2位
    district_code VARCHAR(10) NOT NULL,         -- 学区代码
    student_name VARCHAR(50) NOT NULL,          -- 学生姓名
    school VARCHAR(100) NOT NULL,               -- 学校名称
    teacher_name VARCHAR(50),                   -- 指导教师
    leader_name VARCHAR(50) NOT NULL,           -- 带队教师姓名
    leader_phone VARCHAR(20) NOT NULL,          -- 带队教师联系号码
    registration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 报名时间
    
    -- 外键关联
    CONSTRAINT fk_district 
        FOREIGN KEY (district_code) 
        REFERENCES districts(code)
);

-- 3. 创建索引（提高查询性能）
CREATE INDEX idx_registrations_district ON registrations(district_code);
CREATE INDEX idx_registrations_ticket ON registrations(ticket_number);
CREATE INDEX idx_registrations_student ON registrations(student_name);
CREATE INDEX idx_registrations_school ON registrations(school);

-- 4. 创建视图：统计各学区报名情况
CREATE OR REPLACE VIEW district_stats AS
SELECT 
    d.code,
    d.name,
    d.quota,
    COUNT(r.id) as registered_count,
    d.quota - COUNT(r.id) as remaining_quota
FROM districts d
LEFT JOIN registrations r ON d.code = r.district_code
GROUP BY d.code, d.name, d.quota
ORDER BY d.quota DESC, d.code;

-- 验证：查看表信息
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public';
