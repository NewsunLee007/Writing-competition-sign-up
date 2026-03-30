import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import contestRoutes from '../backend/src/routes/contest.routes.js';

const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/contest', contestRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Ruian Writing Contest API is running',
    timestamp: new Date().toISOString(),
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Vercel Serverless Function 导出
export default app;
