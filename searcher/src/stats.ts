import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("Connecting to PostgreSQL database...");
  
  const totalRes = await pool.query("SELECT COUNT(*) FROM songs");
  const total = totalRes.rows[0].count;
  
  const langRes = await pool.query(`
    SELECT language, COUNT(*) as count 
    FROM songs 
    GROUP BY language 
    ORDER BY count DESC
  `);
  
  const recentRes = await pool.query(`
    SELECT title, artist, video_id, language, duration 
    FROM songs 
    ORDER BY id DESC 
    LIMIT 5
  `);

  console.log("\n=================================");
  console.log("   Mulberry Sound DB Statistics  ");
  console.log("=================================");
  console.log(`Total songs in database: ${total}`);
  
  console.log("\nBreakdown by Language:");
  langRes.rows.forEach((row: any) => {
    console.log(`  - ${row.language.padEnd(12)}: ${row.count}`);
  });

  console.log("\nLast 5 Discovered Songs:");
  recentRes.rows.forEach((row: any) => {
    console.log(`  - "${row.title}" by ${row.artist} (${row.duration}) [${row.language}] - https://youtu.be/${row.video_id}`);
  });
  console.log("=================================\n");

  await pool.end();
}

main().catch(err => {
  console.error("Error fetching stats:", err);
  pool.end();
});
