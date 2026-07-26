import mysql from 'mysql2/promise';

const globalForDb = globalThis as unknown as {
  dbPool: mysql.Pool | undefined;
};

const poolConfig: mysql.PoolOptions = process.env.DATABASE_URL
  ? { uri: process.env.DATABASE_URL }
  : {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.MYSQL_PASSORD || 'password',
      database: process.env.MYSQL_DATABASE || 'hackathon_expenses',
    };

export const pool =
  globalForDb.dbPool ??
  mysql.createPool(poolConfig);

if (process.env.NODE_ENV !== 'production') globalForDb.dbPool = pool;

// Helper to run query with params easily
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}
