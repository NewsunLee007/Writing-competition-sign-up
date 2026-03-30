# 瑞安市英语写作大赛报名系统 - 部署指南

## 🚀 快速部署到Vercel

### 方法一:一键部署(推荐)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/NewsunLee007/Writing-competition-sign-up)

### 方法二:手动部署

#### 1. 克隆仓库
```bash
git clone https://github.com/NewsunLee007/Writing-competition-sign-up.git
cd Writing-competition-sign-up
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 配置环境变量

在Vercel项目中设置以下环境变量:

**前端环境变量:**
- `VITE_API_URL` = `https://your-domain.vercel.app/api`

**后端环境变量:**
- `DATABASE_URL` = `your-neon-postgresql-connection-string`
- `JWT_SECRET` = `your-secret-key`
- `NODE_ENV` = `production`

#### 4. 部署到Vercel
```bash
vercel --prod
```

## 📊 数据库配置

### Neon PostgreSQL设置

1. 访问 [Neon](https://neon.tech) 创建免费账号
2. 创建新项目 `writing-contest`
3. 在项目中创建数据库 `writing_contest`
4. 复制连接字符串并设置为环境变量 `DATABASE_URL`

### 数据库表结构

数据库表会自动从 `database_schema.sql` 创建:

- `districts` - 学区信息表(17个学区)
- `registrations` - 报名信息表
- `district_stats` - 学区统计视图

## 🔧 本地开发

### 启动前端
```bash
cd frontend
npm install
npm run dev
```

### 启动后端
```bash
cd backend
npm install
npm run dev
```

### 环境变量配置

创建 `backend/.env` 文件:
```env
DATABASE_URL=your-neon-connection-string
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=8000
```

创建 `frontend/.env` 文件:
```env
VITE_API_URL=http://localhost:8000/api
```

## 📋 系统功能

### ✅ 已完成功能

- ✅ 首页展示活动信息
- ✅ 批量报名登记
- ✅ 自动生成准考证号
- ✅ 学区名额管理
- ✅ 准考证搜索(准考证号/姓名/学校)
- ✅ PDF准考证下载
- ✅ 响应式设计(手机/平板/电脑)
- ✅ 数据库集成(Neon PostgreSQL)
- ✅ RESTful API

### 🚧 待开发功能

- 📱 微信小程序版本
- 📊 管理后台
- 📈 数据统计和报表
- 📧 邮件通知
- 💳 在线支付

## 🎨 技术栈

### 前端
- React 18
- TypeScript
- Vite 5
- TailwindCSS 3.3
- React Router 6
- React Hook Form
- Zod (表单验证)
- Lucide Icons
- jsPDF (PDF生成)

### 后端
- Express.js
- @neondatabase/serverless
- express-validator
- JWT认证
- Helmet安全中间件

### 数据库
- PostgreSQL (Neon)
- 17个学区数据
- 报名数据表

### 部署
- Vercel (前端+后端)
- GitHub Actions (CI/CD)
- Neon PostgreSQL (数据库)

## 📞 技术支持

- 项目地址: [GitHub](https://github.com/NewsunLee007/Writing-competition-sign-up)
- 问题反馈: [Issues](https://github.com/NewsunLee007/Writing-competition-sign-up/issues)
- 开发团队: AI for learning工作室

## 📄 许可证

本项目仅用于瑞安市教育局组织的英语写作大赛报名使用。

---

**© 2026 瑞安市英语写作大赛组委会**
