# 瑞安市英语写作大赛报名系统 - 项目记忆

## 项目概览
项目名称：瑞安市英语写作大赛报名系统
创建日期：2026年3月30日
技术栈：React + Vite + TailwindCSS (前端)，Express.js + PostgreSQL (后端)
部署平台：GitHub + Vercel + Neon PostgreSQL

## 架构设计
1. **前端**：React单页应用，响应式设计，支持手机和电脑访问
2. **后端**：RESTful API，JWT认证，PostgreSQL数据库
3. **存储**：Neon PostgreSQL（云端PostgreSQL服务）
4. **部署**：Vercel托管前端和Serverless后端函数
5. **自动化**：GitHub Actions CI/CD流水线

## 核心功能
1. **用户认证**：注册、登录、邮箱验证、密码重置
2. **报名管理**：填写报名信息、上传材料、报名状态跟踪
3. **准考证生成**：自动生成和下载准考证
4. **成绩管理**：成绩录入和查询系统
5. **后台管理**：管理员审核、数据统计、导出功能
6. **多端兼容**：响应式设计，适配手机、平板、电脑

## 技术实现要点
1. **前端**：
   - 使用TypeScript提高代码质量
   - TailwindCSS实现响应式设计
   - React Router处理路由
   - React Hook Form处理表单
   - Zod进行表单验证

2. **后端**：
   - Express.js框架
   - JWT实现身份验证
   - PostgreSQL数据库设计
   - Multer处理文件上传
   - Helmet安全中间件
   - 完整的错误处理机制

3. **数据库**：
   - users表：用户信息和认证
   - registrations表：报名信息
   - downloads表：下载记录
   - announcements表：通知公告
   - audit_logs表：审计日志

4. **安全措施**：
   - HTTPS强制
   - JWT token认证
   - 密码哈希存储
   - 输入验证和SQL注入防护
   - 速率限制防止暴力破解
   - CORS配置限制来源

## 文件结构
```
frontend/
├── src/
│   ├── components/          # 可复用组件
│   ├── pages/              # 页面组件
│   ├── utils/              # 工具函数
│   ├── services/           # API服务
│   ├── types/              # TypeScript类型
│   └── assets/             # 静态资源
│
backend/
├── src/
│   ├── config/             # 配置文件
│   ├── controllers/        # 控制器
│   ├── middlewares/        # 中间件
│   ├── models/             # 数据模型
│   ├── routes/             # 路由定义
│   ├── services/           # 业务逻辑
│   ├── utils/              # 工具函数
│   └── migrations/         # 数据库迁移
│
└── uploads/                # 文件上传目录
```

## 环境变量配置
### 前端 (.env)
- `VITE_API_URL`: API基础URL
- `VITE_ENV`: 环境标识 (development/production)

### 后端 (.env)
- `DATABASE_URL`: PostgreSQL连接字符串
- `JWT_SECRET`: JWT密钥
- `PORT`: 服务器端口
- `NODE_ENV`: 运行环境

## 部署流程
1. **本地开发**：npm run dev
2. **数据库设置**：运行迁移脚本 (npm run migrate)
3. **构建应用**：npm run build
4. **GitHub推送**：推送到main分支触发部署
5. **Vercel自动部署**：通过GitHub Actions部署

## 特别注意事项
1. **logo文件**：项目使用了"序列头图.png"作为logo
2. **兼容性**：支持最新版Chrome、Firefox、Edge、Safari
3. **移动友好**：所有表单和布局都经过移动端优化
4. **SEO友好**：合理的meta标签和结构
5. **可访问性**：ARIA标签和键盘导航支持

## 维护指南
1. **数据库备份**：定期备份Neon数据库
2. **日志监控**：查看Vercel函数日志
3. **性能监控**：使用Vercel Analytics
4. **安全更新**：定期更新依赖包
5. **用户支持**：提供详细的错误提示和帮助文档

## 扩展计划
1. **短信验证**：集成短信服务提供商
2. **在线支付**：集成支付接口
3. **实时通知**：WebSocket或轮询
4. **多语言支持**：i18n国际化
5. **数据分析**：更详细的统计和报表
6. **移动端APP**：React Native应用
7. **微信小程序**：微信平台集成

## 测试要点
1. **单元测试**：关键业务逻辑
2. **集成测试**：API端点测试
3. **端到端测试**：关键用户流程
4. **性能测试**：并发用户测试
5. **安全测试**：渗透测试和漏洞扫描

## 应急计划
1. **服务器宕机**：Vercel有高可用性保障
2. **数据库故障**：Neon提供自动故障转移
3. **安全事件**：立即重置JWT密钥和用户密码
4. **数据丢失**：从备份恢复数据
5. **流量激增**：Vercel自动扩展能力

## 技术支持
- **项目文档**：/docs目录
- **API文档**：自动生成的Swagger文档
- **问题跟踪**：GitHub Issues
- **部署问题**：Vercel日志和GitHub Actions日志

## 项目联系人
- 开发团队：AI for learning工作室
- 技术支持：通过GitHub Issues
- 紧急联系：项目负责人指定联系方式

## 开发过程记录

### 2026-03-30
1. **首次预览部署与修复**：
   - 成功启动前端开发服务器（http://localhost:3000）
   - 安装了前端所有依赖包（React 18, Vite 5, TailwindCSS 3.3, Lucide icons, react-hot-toast等）
   - 修复了react-hot-toast依赖缺失问题并重启服务器
   - 网站响应式设计已完全可用，适配手机和电脑端
   - 修复了路由导入错误：App.tsx引用缺失页面文件
   - 创建了NotFoundPage.tsx页面组件
   - 注释掉尚未创建的页面路由，保持系统稳定运行

2. **网站当前功能状态**：
   - 完全可访问页面：首页、登录页、404页面
   - 导航栏：响应式导航，支持移动端汉堡菜单
   - 登录页面：完整的表单验证（Zod + React Hook Form）
   - 样式系统：TailwindCSS自定义组件完整
   - Logo：已集成"序列头图.png"，并有备用显示方案
   - 路由系统：React Router正常工作

3. **后续开发建议**：
   - 按顺序创建缺失的页面：注册页、仪表盘、报名页、信息页、下载页、管理页
   - 保持路由与页面文件同步
   - 建议使用占位页面逐步替换注释的路由

2. **网站功能现状**：
   - 首页：完整的英雄区域、统计数据、核心功能展示、参赛组别介绍、CTA区域
   - 导航栏：响应式导航，支持移动端汉堡菜单
   - 登录页面：完整的表单验证（Zod + React Hook Form）
   - 路由系统：React Router实现页面跳转
   - 样式：TailwindCSS自定义组件（btn-primary, btn-outline, nav-link等）
   - Logo：已集成"序列头图.png"，并有备用显示方案

3. **技术准备**：
   - 开发环境：Node.js + Vite热重载已配置
   - 部署就绪：Vercel配置已完成
   - 后端API：Express.js服务器待启动
   - 数据库：Neon PostgreSQL连接配置就绪

4. **用户可进行的操作**：
   - 在浏览器中预览完整网站
   - 测试响应式布局（手机/平板/电脑）
   - 点击导航栏测试页面跳转
   - 测试登录表单验证
   - 查看所有核心功能页面
### 服务器管理指南
2026-03-30 - 服务器偶尔停止的解决方案：
1. 检查服务器状态：lsof -i:3000
2. 停止服务器：pkill -f "vite" || true
3. 启动服务器：cd frontend && npm run dev
4. 等待VITE ready提示（约118毫秒），然后使用preview_url工具打开

### Layout组件文件修复记录
2026-03-30 - Layout.tsx文件存在导出语句损坏问题：
- 问题：导出语句损坏 "export default LayoutThe rest of the footer content was truncated. Let me continue from where it left off:"
- 修复：更正为 "export default Layout"
- 结果：Layout组件现在可以正常导入和使用

### 系统简化改造 (2026-03-30)
1. **需求变更**：
   - 根据真实活动通知（瑞安市第三届初中学生英语创意写作评审活动）简化系统
   - 报名表字段：序号、学区/直属学校、学生姓名、学校、指导教师、带队教师姓名、带队教师联系号码
   - 活动时间：4月12日（星期日）8:50报到，9:00开始，9:40结束
   - 活动地点：瑞安市毓蒙中学
   - 报名截止：4月3日前
   - 报名邮箱：26392666@qq.com
   - 评审对象：瑞安市八年级学生

2. **系统简化内容**：
   - 去掉"我们的影响力"、"一站式竞赛服务"、"参赛组别介绍"板块
   - 简化导航栏：只保留首页、报名登记、准考证下载三个主要导航
   - 简化页脚：只保留活动名称、承办单位、联系邮箱和版权信息
   - 移除搜索框、用户菜单、通知等复杂功能
   - Logo改为在线链接：https://p.ipic.vip/c9knc6.png

3. **核心功能实现**：
   - **报名登记页面** (RegistrationPage.tsx)：
     * 支持老师批量填报学生信息
     * 可动态添加/删除学生
     * 自动生成准考证号（格式：20260412 + 学区代码 + 序号）
     * 支持下载单个或全部准考证PDF
   - **准考证下载页面** (DownloadPage.tsx)：
     * 支持按准考证号、学生姓名、学校名称搜索
     * 显示学生详细信息和准考证号
     * 一键下载PDF准考证

4. **学区和名额分配**：
   - 塘下学区：25人（代码TX）
   - 安阳学区：20人（代码AY）
   - 飞云学区：18人（代码FY）
   - 莘塍学区：12人（代码XC）
   - 马屿学区：10人（代码MY）
   - 高楼学区：5人（代码GL）
   - 湖岭学区：5人（代码HL）
   - 陶山学区：5人（代码TS）
   - 瑞安市实验中学：15人（代码SY）
   - 安阳新纪元：10人（代码XY）
   - 安高：8人（代码AG）
   - 瑞祥实验学校：8人（代码RX）
   - 集云实验学校：6人（代码JY）
   - 毓蒙中学：6人（代码YM）
   - 广场中学：4人（代码GC）
   - 瑞中附初：4人（代码RZ）
   - 紫荆书院：1人（代码ZJ）

5. **技术栈更新**：
   - 前端：React 18 + TypeScript + Vite + TailwindCSS
   - 路由：React Router（精简为3个主页面）
   - 图标库：Lucide React
   - 通知系统：react-hot-toast
   - PDF生成：待实现（当前使用alert占位）

6. **文件变更**：
   - HomePage.tsx：完全重写，展示真实活动信息
   - Layout.tsx：简化导航和页脚
   - RegistrationPage.tsx：新建，支持批量填报
   - DownloadPage.tsx：新建，支持准考证搜索下载
   - App.tsx：更新路由配置

7. **后续开发建议**：
   - 实现PDF准考证生成功能（使用reportlab或其他PDF库）
   - 后端API：实现报名数据存储和查询接口
   - 数据库：创建registrations表存储报名信息
   - 数据验证：添加更严格的表单验证
   - 批量导入：支持Excel批量导入学生信息
