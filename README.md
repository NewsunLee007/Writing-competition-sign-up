# 瑞安市英语写作大赛报名网站

一个现代化的在线报名系统，支持电脑和手机访问。

## 功能特性

1. **用户注册与登录**
   - 使用邮箱注册
   - 手机号验证
   - 密码找回功能

2. **报名登记**
   - 学生基本信息填写
   - 上传证件照片
   - 选择参赛组别
   - 在线支付（可选扩展）

3. **信息管理**
   - 查看报名状态
   - 下载准考证
   - 修改个人信息
   - 查看比赛结果

4. **后台管理**
   - 参赛者信息统计
   - 准考证批量生成
   - 成绩管理
   - 数据导出

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式框架
- React Router 路由管理
- Axios HTTP客户端

### 后端
- Node.js + Express
- PostgreSQL 数据库 (Neon)
- JWT 身份验证
- GitHub Actions 自动化部署
- Vercel 托管

## 项目结构

```
.
├── frontend/          # 前端React应用
├── backend/           # 后端Node.js服务
├── package.json       # 根目录依赖管理
└── README.md          # 项目说明
```

## 开发环境设置

1. 安装依赖：
```bash
npm install
```

2. 设置环境变量：
```bash
# 复制示例配置文件
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. 启动开发服务器：
```bash
npm run dev
```

## 部署指南

### 前端部署 (Vercel)
1. 将项目推送到GitHub仓库
2. 在Vercel中导入项目
3. 配置构建命令：`npm run build --workspace=frontend`
4. 设置输出目录：`frontend/dist`
5. 配置环境变量

### 后端部署 (Vercel Function)
1. 配置Vercel项目中的serverless函数
2. 设置数据库连接字符串
3. 配置API路由

### 数据库 (Neon)
1. 在Neon创建PostgreSQL数据库
2. 获取连接字符串
3. 运行数据库迁移脚本

## 使用说明

### 学生用户
1. 访问网站首页
2. 注册账号并登录
3. 填写报名信息
4. 提交报名申请
5. 下载准考证

### 管理员
1. 登录管理后台
2. 查看报名统计
3. 管理参赛者信息
4. 生成准考证
5. 导出数据

## 联系方式

如有问题或建议，请联系项目维护者。

## 许可证

MIT License