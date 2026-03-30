import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// 使用 Neon Serverless Driver - 直接导出 neon 函数
const sql = neon(process.env.DATABASE_URL);

// 测试数据库连接
export const testConnection = async () => {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('✅ 数据库连接成功:', result[0].now);
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
};

export default sql;
