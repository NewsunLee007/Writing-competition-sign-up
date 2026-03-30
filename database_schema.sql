-- 瑞安市英语写作大赛报名系统数据库结构
-- 创建时间: 2026-03-30

-- 1. 创建学区/学校表（用于名额控制和代码管理）
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,      -- 学区代码: TX, AY, FY等
    name VARCHAR(100) NOT NULL,             -- 学区名称
    quota INTEGER NOT NULL,                 -- 名额限制
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入学区数据
INSERT INTO districts (code, name, quota) VALUES
('TX', '塘下学区', 25),
('AY', '安阳学区', 20),
('FY', '飞云学区', 18),
('XC', '莘塍学区', 12),
('MY', '马屿学区', 10),
('GL', '高楼学区', 5),
('HL', '湖岭学区', 5),
('TS', '陶山学区', 5),
('SY', '瑞安市实验中学', 15),
('XY', '安阳新纪元', 10),
('AG', '安高', 8),
('RX', '瑞祥实验学校', 8),
('JY', '集云实验学校', 6),
('YM', '毓蒙中学', 6),
('GC', '广场中学', 4),
('RZ', '瑞中附初', 4),
('ZJ', '紫荆书院', 1);

-- 2. 创建报名表
CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,  -- 准考证号: 20260412+学区代码+序号
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
CREATE VIEW district_stats AS
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
