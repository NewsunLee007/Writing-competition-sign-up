# 瑞安市英语写作大赛报名系统部署指南

本指南将详细说明如何部署应用到 GitHub、Vercel 和 Neon PostgreSQL。

## 1. 项目架构概述

```
├── frontend/          # React + Vite 前端应用
├── backend/           # Express.js + PostgreSQL 后端 API
├── vercel.json        # Vercel 部署配置
└── .github/workflows/ # GitHub Actions 自动化部署流程
```

## 2. 部署前准备

### 2.1 环境要求

- Node.js 18+ 
- npm 或 yarn
- Git
- GitHub 账户
- Vercel 账户
- Neon PostgreSQL 账户

### 2.2 本地环境设置

1. **克隆项目**：
   ```bash
   git clone <你的仓库地址>
   cd Writing-competition-sign-up
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **环境变量配置**：
   ```bash
   # 复制示例配置文件
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # 编辑配置文件
   # backend/.env - 设置数据库连接、JWT密钥等
   # frontend/.env - 设置API地址等
   ```

## 3. 数据库配置 (Neon PostgreSQL)

### 3.1 创建 Neon 数据库

1. 访问 [Neon.tech](https://neon.tech/) 并注册账号
2. 创建一个新项目
3. 在新项目中创建数据库：
   ```
   数据库名称: ruian_contest
   用户名: 使用默认或自定义
   密码: 设置强密码
   地域: 选择离用户近的地区（如 ap-southeast-1）
   ```

### 3.2 获取连接信息

1. 在 Neon 控制台中，找到你的数据库连接字符串：
   ```
   postgresql://username:password@ep-cool-dew-123456.us-east-2.aws.neon.tech/ruian_contest?sslmode=require
   ```

2. 更新 `backend/.env` 文件：
   ```env
   DATABASE_URL=你的Neon连接字符串
   DB_HOST=ep-cool-dew-123456.us-east-2.aws.neon.tech
   DB_PORT=5432
   DB_NAME=ruian_contest
   DB_USER=你的用户名
   DB_PASSWORD=你的密码
   ```

### 3.3 运行数据库迁移

1. **本地运行迁移**：
   ```bash
   cd backend
   npm run migrate
   ```

2. **验证数据库表**：
   - 登录 Neon SQL 编辑器
   - 运行：`\dt` 查看创建的表

## 4. GitHub 仓库设置

### 4.1 创建新的 GitHub 仓库

1. 在 GitHub 创建新仓库：`ruian-writing-contest`
2. 推送本地代码：
   ```bash
   git init
   git add .
   git commit -m "初始提交: 瑞安市英语写作大赛报名系统"
   git branch -M main
   git remote add origin https://github.com/你的用户名/ruian-writing-contest.git
   git push -u origin main
   ```

### 4.2 设置 GitHub Secrets

进入仓库 Settings → Secrets and variables → Actions，添加：

1. **VERCEL_TOKEN**：
   - 获取：登录 Vercel → Settings → Tokens → Create
   - 权限：选择所有权限
   - 粘贴生成的 token

2. **VERCEL_ORG_ID**：
   - 获取：Vercel API：`curl -H "Authorization: Bearer YOUR_TOKEN" https://api.vercel.com/v2/teams`

3. **VERCEL_PROJECT_ID**：
   - 创建项目后获取

4. **DATABASE_URL**（可选）：你的 Neon 连接字符串

## 5. Vercel 部署

### 5.1 前端部署

1. **登录 Vercel**：https://vercel.com/
2. **导入项目**：从 GitHub 导入你的仓库
3. **项目配置**：
   ```
   项目名称: ruian-writing-contest-frontend
   框架预设: Vite
   根目录: frontend
   构建命令: npm run build --workspace=frontend
   输出目录: frontend/dist
   安装命令: npm install
   ```

4. **环境变量**：
   - `VITE_API_URL`: https://你的域名.vercel.app/api
   - `VITE_ENV`: production

### 5.2 后端部署

1. **在同一个项目中配置后端**：
   ```
   框架预设: Other
   构建命令: npm run build
   输出目录: . （不需要输出）
   安装命令: npm install
   ```

2. **环境变量**（全部添加）：
   - 复制 `backend/.env` 中的所有变量到 Vercel
   - 特别注意：设置 `NODE_ENV=production`

3. **Serverless 函数配置**：
   - Vercel 会自动将 `/api/*` 路由到后端函数
   - 确保 `vercel.json` 配置正确

## 6. 域名配置

### 6.1 自定义域名

1. **在 Vercel 中添加域名**：
   - 项目设置 → Domains
   - 添加你的域名：`writing-contest.ruian.gov.cn` 或自定义域名

2. **DNS 配置**：
   - 在域名注册商添加 CNAME 记录：
     ```
     类型: CNAME
     名称: @ 或 www
     值: cname.vercel-dns.com
     ```

### 6.2 测试域名

```bash
# 健康检查
curl https://your-domain.vercel.app/api/health

# API 文档
https://your-domain.vercel.app/api/docs
```

## 7. 自动化工作流

### 7.1 GitHub Actions 配置

你的 `.github/workflows/deploy.yml` 已经配置好：

- 主分支推送时自动部署
- 运行测试和lint
- 自动构建
- 发布到 Vercel
- Discord 通知（可选）

### 7.2 手动触发部署

如果需要手动部署：

```bash
# Vercel CLI 部署
npm install -g vercel
vercel --prod
```

## 8. 部署后检查

### 8.1 健康检查

1. **前端应用**：
   - 访问你的域名
   - 检查页面加载
   - 测试导航

2. **API 服务**：
   ```bash
   # 健康检查
   curl https://your-domain.vercel.app/api/health
   
   # API 端点
   curl https://your-domain.vercel.app/api/auth/health
   curl https://your-domain.vercel.app/api/registration/stats/overview
   ```

3. **数据库连接**：
   - 登录 Vercel 控制台
   - 查看函数日志
   - 确认数据库连接正常

### 8.2 功能测试清单

- [ ] 用户注册
- [ ] 邮箱验证
- [ ] 用户登录
- [ ] 报名表单提交
- [ ] 文件上传
- [ ] 准考证下载
- [ ] 管理员登录
- [ ] 报名审核
- [ ] 成绩录入

## 9. 故障排除

### 9.1 常见问题

1. **数据库连接失败**：
   - 检查 Neon 数据库状态
   - 验证连接字符串
   - 检查 IP 白名单（Neon 可能需要添加 Vercel IP）

2. **前端无法加载**：
   - 检查 Vercel 构建日志
   - 验证环境变量
   - 清除浏览器缓存

3. **API 404 错误**：
   - 检查 `vercel.json` 路由配置
   - 确认函数部署成功

4. **文件上传失败**：
   - 检查上传目录权限
   - 验证文件大小限制
   - 检查 CORS 配置

### 9.2 日志查看

1. **Vercel 日志**：
   - 项目 → Functions → 选择函数 → Logs

2. **Neon 查询日志**：
   - Neon 控制台 → Queries

3. **GitHub Actions 日志**：
   - 仓库 → Actions → 选择工作流

## 10. 监控和维护

### 10.1 监控工具

1. **Vercel Analytics**：
   - 查看网站访问量
   - 监控性能指标

2. **Neon 监控**：
   - 数据库连接数
   - 查询性能

3. **Sentry**（可选）：
   - 错误追踪和监控

### 10.2 备份策略

1. **数据库备份**：
   - Neon 提供自动备份
   - 设置定期导出：`pg_dump`

2. **代码备份**：
   - GitHub 作为主仓库
   - 定期本地备份

3. **文件备份**：
   - Vercel 存储的文件
   - 定期下载到本地

### 10.3 更新和升级

1. **依赖更新**：
   ```bash
   npm outdated
   npm update
   ```

2. **数据库迁移**：
   - 创建新的迁移文件
   - 测试后运行迁移

3. **部署新版本**：
   ```bash
   git tag v1.0.0
   git push origin --tags
   ```

## 11. 安全配置

### 11.1 SSL/TLS

Vercel 自动提供 HTTPS：
- 强制 HTTPS 重定向
- HSTS 头（已配置在 `helmet` 中间件）

### 11.2 敏感信息保护

1. **环境变量**：
   - 不在代码中硬编码
   - 使用 Vercel Secrets

2. **JWT 密钥**：
   - 生产环境使用强密钥
   - 定期更换

3. **API 密钥**：
   - 最小权限原则
   - 定期轮换

### 11.3 防护措施

1. **速率限制**：防止暴力破解
2. **CORS**：限制允许的域名
3. **输入验证**：防止 SQL 注入和 XSS
4. **文件上传限制**：白名单文件类型

## 12. 性能优化

### 12.1 前端优化

1. **代码分割**：
   - Vite 自动处理
   - 路由懒加载

2. **缓存策略**：
   - Vercel 边缘缓存
   - Service Worker（PWA）

3. **图片优化**：
   - 使用 WebP 格式
   - 懒加载

### 12.2 后端优化

1. **数据库索引**：
   - 已经在模型中定义
   - 监控慢查询

2. **缓存层**：
   - 考虑添加 Redis（如果需要）

3. **连接池**：
   - PostgreSQL 连接池已配置

## 13. 技术支持

### 13.1 联系方式

- **技术问题**：GitHub Issues
- **紧急问题**：Discord/Telegram 群组
- **业务问题**：项目负责人

### 13.2 文档链接

- [前端文档](./frontend/README.md)
- [后端文档](./backend/README.md)
- [API 文档](https://your-domain.vercel.app/api/docs)

---

## 部署成功标志

✅ 域名可访问
✅ HTTPS 正常工作
✅ API 响应正常
✅ 数据库连接正常
✅ 文件上传正常
✅ 邮件发送正常（如配置）
✅ 监控工具正常
✅ 备份策略就绪

项目现在已准备好接受用户报名！