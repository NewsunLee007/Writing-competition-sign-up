import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import contestRoutes from './routes/contest.routes.js';

// 加载环境变量
dotenv.config();

// ES 模块的 __dirname 替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());
app.use(morgan('combined'));

// CORS 配置
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('不允许的跨域请求'));
    }
  },
  credentials: true,
}));

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: '请求过于频繁，请稍后再试。',
});

app.use('/api/', limiter);

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/docs', express.static(path.join(__dirname, '../docs')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/contest', contestRoutes);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API 文档
app.get('/api/docs', (req, res) => {
  res.json({
    name: '瑞安市英语写作大赛 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      registration: '/api/registration',
      download: '/api/download',
      admin: '/api/admin',
    },
  });
});

// 404 处理
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API 端点不存在',
    path: req.originalUrl,
    method: req.method,
  });
});

// 错误处理中间件
app.use((err, req, res, _next) => {
  console.error('服务器错误:', err);

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : '服务器内部错误';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
═══════════════════════════════════════
  瑞安市英语写作大赛报名系统后端
  运行环境: ${process.env.NODE_ENV || 'development'}
  监听端口: ${PORT}
  服务器地址: http://localhost:${PORT}
  API 文档: http://localhost:${PORT}/api/docs
═══════════════════════════════════════
  `);
});

// 优雅关机
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在优雅关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在优雅关闭...');
  process.exit(0);
});

export default app;
