import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

// Manual .env loading helper
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split(/\r?\n/).forEach((line) => {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) return;
        
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = match[2] || '';
          // Remove surrounding quotes if they exist
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      });
      console.log('Loaded .env successfully.');
    }
  } catch (err) {
    console.error('Error loading .env file:', err);
  }
}

async function run() {
  loadEnv();

  console.log('Connecting to MySQL database...');
  let connection;
  try {
    const connectionConfig = process.env.DATABASE_URL
      ? process.env.DATABASE_URL
      : {
          host: process.env.MYSQL_HOST || 'localhost',
          port: parseInt(process.env.MYSQL_PORT || '3306'),
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || process.env.MYSQL_PASSORD || 'password',
          database: process.env.MYSQL_DATABASE || 'hackathon_expenses',
        };
    connection = await mysql.createConnection(connectionConfig as any);
  } catch (err: any) {
    console.error('Database connection failed:', err.message);
    console.log('\nMake sure to configure the MySQL credentials in the .env file.\n');
    process.exit(1);
  }

  try {
    console.log('Dropping old tables if they exist...');
    await connection.query('DROP TABLE IF EXISTS FIN_expenses');
    await connection.query('DROP TABLE IF EXISTS FIN_activity_logs');
    await connection.query('DROP TABLE IF EXISTS FIN_settings');

    console.log('Creating "FIN_expenses" table...');
    await connection.query(`
      CREATE TABLE FIN_expenses (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        amount DOUBLE NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        paidBy VARCHAR(255) NOT NULL,
        date DATETIME NOT NULL,
        notes TEXT,
        billImageUrl VARCHAR(1000) DEFAULT NULL,
        createdBy VARCHAR(100) NOT NULL DEFAULT 'seed',
        updatedBy VARCHAR(100) DEFAULT NULL,
        paymentSource VARCHAR(50) NOT NULL DEFAULT 'Other',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating "FIN_activity_logs" table...');
    await connection.query(`
      CREATE TABLE FIN_activity_logs (
        id VARCHAR(36) PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        username VARCHAR(100) NOT NULL,
        details TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating "FIN_settings" table...');
    await connection.query(`
      CREATE TABLE FIN_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL
      )
    `);

    console.log('Table structure verified.');

    console.log('Seeding settings...');
    await connection.query(`
      INSERT INTO FIN_settings (setting_key, setting_value)
      VALUES 
        ('sponsor_budget', '0.00'),
        ('sponsor_name', 'Sphere Hive Co.')
    `);

    console.log('Skipping sample expense seeding (database starting empty)...');

    console.log('Database initialized and seeded successfully!');
  } catch (err: any) {
    console.error('Setup script failed:', err.message);
  } finally {
    await connection.end();
  }
}

run();
