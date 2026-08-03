import mysql from 'mysql2/promise';
import crypto from 'crypto';

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

// Helper to encrypt (hash) passwords securely using native SHA-256
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Auto-verify and create tables in background
async function initializeDatabase() {
  try {
    // 1. Create sessions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS FIN_active_sessions (
        username VARCHAR(255) PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2. Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS FIN_users (
        email VARCHAR(255) PRIMARY KEY,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      )
    `);

    // 3. Seed default credentials if empty
    const [rows]: any = await pool.execute('SELECT COUNT(*) as cnt FROM FIN_users');
    if (rows[0] && rows[0].cnt === 0) {
      console.log('Seeding default encrypted credentials into FIN_users...');
      const seedUsers = [
        { email: 'numa@kvgce.ac.in', password: '@Zoya2134', role: 'treasurer' },
        { email: 'ziyana@kvgce.ac.in', password: '@Ziya2134', role: 'treasurer' },
        { email: 'arshad@kvgce.ac.in', password: '@Arshad44', role: 'admin' },
      ];
      for (const u of seedUsers) {
        const hash = hashPassword(u.password);
        await pool.execute(
          'INSERT INTO FIN_users (email, password_hash, role) VALUES (?, ?, ?)',
          [u.email, hash, u.role]
        );
      }
      console.log('Database credentials seeded successfully.');
    }
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

initializeDatabase();

// Helper to run query with params easily
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}
