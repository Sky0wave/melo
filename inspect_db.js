const { Pool } = require('pg');
require('dotenv').config({ path: '/home/abhishek/mulberry-sound/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in database:", tables.rows.map(r => r.table_name));

    const usersExists = tables.rows.some(r => r.table_name === 'users');
    if (usersExists) {
      const usersCount = await pool.query("SELECT COUNT(*) FROM users");
      console.log("Users count:", usersCount.rows[0].count);
      const sampleUsers = await pool.query("SELECT * FROM users LIMIT 5");
      console.log("Sample users:", sampleUsers.rows);
    } else {
      console.log("users table does not exist!");
    }
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await pool.end();
  }
}

main();
