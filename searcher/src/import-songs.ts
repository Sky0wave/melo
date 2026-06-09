import fs from "fs";
import path from "path";
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

// Helper to extract YouTube Video ID
function extractVideoId(str: string): string | null {
  if (!str) return null;
  str = str.trim();
  // Check if it's already an 11-char ID
  if (str.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = str.match(reg);
  return match ? match[1] : null;
}

// Helper to parse duration to format and seconds
function parseDuration(str: string): { fmt: string; seconds: number } {
  if (!str) return { fmt: "03:00", seconds: 180 };
  str = str.trim();
  
  if (/^\d+$/.test(str)) {
    const totalSecs = parseInt(str, 10);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return {
      fmt: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      seconds: totalSecs
    };
  }

  const parts = str.split(":").map(p => parseInt(p, 10));
  if (parts.every(p => !isNaN(p))) {
    if (parts.length === 2) {
      return {
        fmt: `${String(parts[0]).padStart(2, "0")}:${String(parts[1]).padStart(2, "0")}`,
        seconds: parts[0] * 60 + parts[1]
      };
    } else if (parts.length === 3) {
      return {
        fmt: `${parts[0]}:${String(parts[1]).padStart(2, "0")}:${String(parts[2]).padStart(2, "0")}`,
        seconds: parts[0] * 3600 + parts[1] * 60 + parts[2]
      };
    }
  }
  return { fmt: "03:00", seconds: 180 };
}

interface SongRow {
  video_id: string;
  title: string;
  artist: string;
  duration: string;
  duration_seconds: number;
  cover_url: string;
  language: string;
}

async function main() {
  const args = process.argv.slice(2);
  const filePathArg = args.find(arg => !arg.startsWith("-"));
  
  let filePath = filePathArg;
  if (!filePath) {
    // If no argument is provided, let's look for standard exports or prompt
    console.log("Usage: npm run import <path-to-txt-file>");
    console.log("Example: npm run import ../songs.txt");
    
    // Check if there's a default songs.txt in workspace root
    const defaultPath = path.join(process.cwd(), "..", "songs.txt");
    if (fs.existsSync(defaultPath)) {
      console.log(`Found default file at ${defaultPath}, importing from there...`);
      filePath = defaultPath;
    } else {
      process.exit(1);
    }
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found at ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Reading file: ${absolutePath}`);
  const content = fs.readFileSync(absolutePath, "utf-8");
  const lines = content.split(/\r?\n/);
  console.log(`Loaded ${lines.length} lines. Processing...`);

  const songs: SongRow[] = [];
  let skippedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) {
      continue; // Skip comments/empty lines
    }

    // Attempt to parse fields
    // Try delimiters in order: | , \t
    let parts: string[] = [];
    if (line.includes("|")) {
      parts = line.split("|").map(p => p.trim());
    } else if (line.includes("\t")) {
      parts = line.split("\t").map(p => p.trim());
    } else if (line.includes(",")) {
      parts = line.split(",").map(p => p.trim());
    } else {
      parts = [line];
    }

    // Let's identify fields based on index or heuristic
    let videoId: string | null = null;
    let title = "";
    let artist = "";
    let durationFmt = "03:00";
    let durationSeconds = 180;
    let coverUrl = "";
    let language = "unknown";

    if (parts.length >= 3) {
      // Heuristically map columns, or check if we can guess positions
      // Typically: Title, Artist, VideoId/URL, Duration, CoverUrl, Language
      // We will look for VideoId first.
      const urlIndex = parts.findIndex(p => extractVideoId(p) !== null);
      if (urlIndex !== -1) {
        videoId = extractVideoId(parts[urlIndex]);
      }

      // Filter out URL column from remaining columns to map title/artist
      const textParts = parts.filter((_, idx) => idx !== urlIndex);
      
      // Let's search for duration format (e.g. 04:32 or similar)
      const durIndex = textParts.findIndex(p => /^\d+:\d+(:\d+)?$/.test(p) || /^\d+$/.test(p));
      if (durIndex !== -1) {
        const parsedDur = parseDuration(textParts[durIndex]);
        durationFmt = parsedDur.fmt;
        durationSeconds = parsedDur.seconds;
        textParts.splice(durIndex, 1);
      }

      // Let's search for Cover URL (starts with http)
      const imgIndex = textParts.findIndex(p => p.startsWith("http"));
      if (imgIndex !== -1) {
        coverUrl = textParts[imgIndex];
        textParts.splice(imgIndex, 1);
      }

      // Check if any remaining is a short word indicating language
      const langIndex = textParts.findIndex(p => ["hindi", "english", "en", "hi"].includes(p.toLowerCase()));
      if (langIndex !== -1) {
        language = textParts[langIndex].toLowerCase();
        if (language === "hi") language = "hindi";
        if (language === "en") language = "english";
        textParts.splice(langIndex, 1);
      }

      // Leftovers: first is likely title, second is likely artist
      if (textParts.length > 0) title = textParts[0];
      if (textParts.length > 1) artist = textParts[1];
      
      // Fallbacks if mapping was tricky
      if (!artist && title) {
        // If we only have one text part, check if it contains " - " or " by "
        if (title.includes(" - ")) {
          const tParts = title.split(" - ");
          artist = tParts[0].trim();
          title = tParts[1].trim();
        }
      }
    } else if (parts.length === 2) {
      // e.g. Title & Artist | YouTube Link
      const id1 = extractVideoId(parts[0]);
      const id2 = extractVideoId(parts[1]);
      if (id1) {
        videoId = id1;
        title = parts[1];
      } else if (id2) {
        videoId = id2;
        title = parts[0];
      }
      
      if (title.includes(" - ")) {
        const tParts = title.split(" - ");
        artist = tParts[0].trim();
        title = tParts[1].trim();
      }
    } else {
      // Single column: maybe just URL, or full line
      videoId = extractVideoId(line);
      title = line;
    }

    if (!videoId) {
      skippedCount++;
      continue;
    }

    if (!title || title === line) {
      title = `YouTube Song ${videoId}`;
    }
    if (!artist) {
      artist = "YouTube Artist";
    }
    if (!coverUrl) {
      // Default high-quality YouTube thumbnail
      coverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    songs.push({
      video_id: videoId,
      title,
      artist,
      duration: durationFmt,
      duration_seconds: durationSeconds,
      cover_url: coverUrl,
      language
    });
  }

  console.log(`Parsed ${songs.length} valid songs. (Skipped ${skippedCount} lines without valid YouTube IDs).`);

  if (songs.length === 0) {
    console.log("No songs to import.");
    await pool.end();
    return;
  }

  // Insert in batches
  const BATCH_SIZE = 1000;
  let insertedCount = 0;
  let duplicateCount = 0;

  console.log("Starting bulk database import...");

  for (let i = 0; i < songs.length; i += BATCH_SIZE) {
    const batch = songs.slice(i, i + BATCH_SIZE);
    
    // We construct a multi-row INSERT statement with parameter binding
    // INSERT INTO songs (video_id, title, artist, duration, duration_seconds, cover_url, language) VALUES ($1, $2...), ($8, $9...)
    const valuePlaceholders: string[] = [];
    const values: any[] = [];
    
    batch.forEach((song, idx) => {
      const base = idx * 7;
      valuePlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);
      values.push(
        song.video_id,
        song.title,
        song.artist,
        song.duration,
        song.duration_seconds,
        song.cover_url,
        song.language
      );
    });

    const query = `
      INSERT INTO songs (video_id, title, artist, duration, duration_seconds, cover_url, language)
      VALUES ${valuePlaceholders.join(", ")}
      ON CONFLICT (video_id) DO NOTHING
    `;

    try {
      const res = await pool.query(query, values);
      insertedCount += res.rowCount || 0;
      duplicateCount += (batch.length - (res.rowCount || 0));
      
      const pct = Math.min(100, Math.round(((i + batch.length) / songs.length) * 100));
      console.log(`  Progress: ${pct}% (${Math.min(i + batch.length, songs.length)}/${songs.length}) - Loaded ${insertedCount} new, skipped ${duplicateCount} duplicates`);
    } catch (err) {
      console.error(`Error importing batch starting at index ${i}:`, err);
    }
  }

  console.log(`\nImport Summary:`);
  console.log(`  - Total records parsed: ${songs.length}`);
  console.log(`  - Successfully added to DB: ${insertedCount}`);
  console.log(`  - Skipped (already existed): ${duplicateCount}`);

  await pool.end();
}

main().catch(err => {
  console.error("Fatal error during import:", err);
  pool.end();
});
