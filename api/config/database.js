import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

class Database {
  constructor() {
    if (!Database.instance) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // 连接池事件监听
      this.pool.on('connect', () => {
        console.log('数据库连接建立');
      });

      this.pool.on('error', (err) => {
        console.error('数据库连接池错误:', err);
      });

      // 测试连接
      this.testConnection();

      Database.instance = this;
    }

    return Database.instance;
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('✅ 数据库连接测试成功');
      
      // 检查表是否存在
      const result = await client.query(
        "SELECT to_regclass('public.users') as users_exists, to_regclass('public.registrations') as registrations_exists"
      );
      
      console.log('表状态检查:', result.rows[0]);
      
      client.release();
      return true;
    } catch (error) {
      console.error('❌ 数据库连接测试失败:', error.message);
      console.log('提示: 请确保 DATABASE_URL 环境变量已正确设置');
      console.log('提示: 如果使用 Neon，请检查数据库访问权限和连接字符串');
      return false;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('执行查询:', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('查询错误:', {
        text,
        params,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async getClient() {
    const client = await this.pool.connect();
    
    // 代理 query 方法以记录日志
    const query = client.query.bind(client);
    const release = client.release.bind(client);
    
    const start = Date.now();
    client.query = async (text, params) => {
      try {
        const result = await query(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('客户端查询:', { text, duration, rows: result.rowCount });
        }
        
        return result;
      } catch (error) {
        console.error('客户端查询错误:', {
          text,
          params,
          error: error.message,
        });
        throw error;
      }
    };
    
    client.release = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('客户端释放');
      }
      release();
    };
    
    return client;
  }

  async transaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

const database = new Database();
Object.freeze(database);

export default database;