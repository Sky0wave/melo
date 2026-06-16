const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_4voCarAhJU5c@ep-plain-river-aqgzx5dh.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'songs'
    `);
    console.log("Columns in songs table:", columns.rows);

    const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.conrelid = 'songs'::regclass
    `);
    console.log("Constraints on songs table:", constraints.rows);
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await pool.end();
  }
}

main();
