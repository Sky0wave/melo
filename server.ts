import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import loadedSongs from "./fallback_songs.json";
import dotenv from "dotenv";
import pg from "pg";
import * as cheerio from "cheerio";
import play from "play-dl";

dotenv.config();

// PostgreSQL pool — tuned for Neon serverless (generous timeouts)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  min: 0,
  connectionTimeoutMillis: 20000,  // Neon SSL handshake can take up to 17s on cold start
  idleTimeoutMillis: 30000,
  allowExitOnIdle: true,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

pool.on("error", (err) => {
  console.error("[DB Pool] Unexpected idle client error:", err.message);
});

// Warm up the pool immediately and initialize tables if they don't exist
async function setupDatabase() {
  try {
    await pool.query("SELECT 1");
    console.log("[DB Pool] ✅ Connection warm — checking tables");

    // Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        picture VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] ✅ users table ready");

    // Ensure fallback user with ID 9999 exists for robust error/cold-start recovery
    await pool.query(`
      INSERT INTO users (id, google_id, email, name, picture, role)
      VALUES (9999, 'fallback_id', 'fallback@melo.audio', 'Fallback User', '', 'user')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("[DB Pool] ✅ Fallback user (ID 9999) ready");

    // Create songs table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id SERIAL PRIMARY KEY,
        video_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        artist VARCHAR(300) NOT NULL,
        duration VARCHAR(50) NOT NULL,
        duration_seconds INT NOT NULL,
        cover_url VARCHAR(500),
        language VARCHAR(100)
      );
    `);
    console.log("[DB Pool] ✅ songs table ready");
    
    // Create user_listens table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_listens (
        id SERIAL PRIMARY KEY,
        user_id INT,
        username VARCHAR(255) NOT NULL,
        song_id VARCHAR(255) NOT NULL,
        song_title VARCHAR(500) NOT NULL,
        artist VARCHAR(300) NOT NULL,
        listened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] ✅ user_listens table ready");

    // Ensure username column exists in user_listens table for backwards compatibility
    await pool.query("ALTER TABLE user_listens ADD COLUMN IF NOT EXISTS username VARCHAR(255) DEFAULT 'Google User'");

    // Create search_cache table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_cache (
        id SERIAL PRIMARY KEY,
        query VARCHAR(500) UNIQUE NOT NULL,
        video_ids TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] ✅ search_cache table ready");

    // Create user_liked_songs table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_liked_songs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        song_video_id VARCHAR(255) NOT NULL,
        liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, song_video_id)
      );
    `);
    console.log("[DB Pool] ✅ user_liked_songs table ready");

    // Create user_playlists table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_playlists (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cover_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] ✅ user_playlists table ready");

    // Create user_playlist_songs table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_playlist_songs (
        id SERIAL PRIMARY KEY,
        playlist_id INT NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
        song_video_id VARCHAR(255) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(playlist_id, song_video_id)
      );
    `);
    console.log("[DB Pool] ✅ user_playlist_songs table ready");

    // Create user_search_history table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_search_history (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query VARCHAR(500) NOT NULL,
        searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] ✅ user_search_history table ready");

    // Create jams table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jams (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(10) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        creator_id INT NOT NULL,
        current_song_id VARCHAR(255),
        current_song_progress INT NOT NULL DEFAULT 0,
        current_song_is_playing BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] ✅ jams table ready");

    // Create jam_messages table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jam_messages (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(10) NOT NULL REFERENCES jams(room_id) ON DELETE CASCADE,
        username VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] ✅ jam_messages table ready");
    // Build local spelling dictionary
    refreshLocalDictionary().catch(() => {});
  } catch (e: any) {
    console.warn("[DB Pool] ⚠️ Database setup failed (will retry on first request):", e.message);
  }
}

setupDatabase();

// ── Robust DB cache writer ───────────────────────────────────────────────────
// Used by every search route. Retries once on transient errors, logs clearly.
async function cacheToDb(songs: any[]): Promise<void> {
  const valid = songs
    .filter(s => s.videoId && s.videoId.trim().length > 0)
    .map(s => ({ ...s, videoId: s.videoId.replace(/^(yt_)+/, "") }));
  if (valid.length === 0) return;

  // Deduplicate songs by videoId within the same batch to avoid PostgreSQL cardinality errors
  const uniqueSongs: any[] = [];
  const seenVideoIds = new Set<string>();
  for (const song of valid) {
    if (!seenVideoIds.has(song.videoId)) {
      seenVideoIds.add(song.videoId);
      uniqueSongs.push(song);
    }
  }

  const hindiKw = ["tum","kesariya","dil","pyar","aashiqui","singh","dosanjh","pasoori","arijit",
                   "jubin","sonu","lata","atif","tere","rabba","sanam","bollywood","t-series","zee music"];

  const values: any[] = [];
  const placeholders: string[] = [];
  let pi = 0;
  for (const song of uniqueSongs) {
    const base = pi * 7;
    placeholders.push(`($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7})`);
    const tl = (song.title + " " + (song.artist || "")).toLowerCase();
    const lang = (/[^\x00-\x7F]/.test(song.title) || hindiKw.some(k => tl.includes(k))) ? "hindi" : "english";
    values.push(
      song.videoId,
      (song.title || "Unknown").slice(0, 500),
      (song.artist || "Unknown").slice(0, 300),
      song.duration || "03:00",
      song.durationSeconds || 180,
      (song.coverUrl || `https://img.youtube.com/vi/${song.videoId}/hqdefault.jpg`).slice(0, 500),
      lang
    );
    pi++;
  }

  const sql = `
    INSERT INTO songs (video_id, title, artist, duration, duration_seconds, cover_url, language)
    VALUES ${placeholders.join(",")}
    ON CONFLICT (video_id) DO UPDATE
      SET title=EXCLUDED.title, artist=EXCLUDED.artist,
          duration=EXCLUDED.duration, duration_seconds=EXCLUDED.duration_seconds,
          cover_url=EXCLUDED.cover_url, language=EXCLUDED.language
  `;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await pool.query(sql, values);
      console.log(`[DB Cache] ✅ Upserted ${uniqueSongs.length} songs (attempt ${attempt})`);
      refreshLocalDictionary().catch(() => {});
      return;
    } catch (err: any) {
      console.error(`[DB Cache] ❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
    }
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Serve valid robots.txt for SEO
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nAllow: /\n");
});

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
} catch (e) {
  console.error("Gemini SDK initialization failed:", e);
}

// Robust wrapper with exponential backoff retry for transient model errors (like 503, 429)
async function generateContentWithRetry(
  aiClient: GoogleGenAI,
  options: { model: string; contents: string; config?: any },
  retries = 3,
  delayMs = 500
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await aiClient.models.generateContent(options);
    } catch (error: any) {
      const isTransient =
        error.status === 503 ||
        error.status === 429 ||
        (error.message &&
          (error.message.includes("503") ||
            error.message.includes("429") ||
            error.message.includes("high demand") ||
            error.message.includes("Quota exceeded") ||
            error.message.includes("UNAVAILABLE")));
      if (isTransient && attempt < retries) {
        console.warn(`[Gemini API] Transient error (status: ${error.status || 'unknown'}, attempt ${attempt}/${retries}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }
      throw error;
    }
  }
}

// Full list of high-fidelity pre-curated songs (Mulberry Originals + New Perspectives + Trending)
const PRESET_SONGS = [
  {
    id: "vivid_obsessions",
    title: "Vivid Obsessions",
    artist: "Elena Cross",
    album: "Obsidian Vibe",
    duration: "03:42",
    durationSeconds: 222,
    genre: "Experimental House",
    mood: "Sophisticated, Moody, High-Gloss",
    lyrics: "In the depth of the obsidian night,\nWe seek the shades of digital light.\nMoving slow through the velvet breeze,\nWhispering secrets to the ancient trees.\n\nOh Vivid Obsessions, keeping me warm,\nGuiding my spirit through the digital storm.\nSilver ripples on a silent lake,\nEvery single breath we take.",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGWAh1VFYsxQ0g-qkNGuQGf-Ng7SUaWAqeUKBUrzObFGk8LREsSS52TQWm16L6PJQGUHBbtO5-fyjwCJiAYeUQuiBtWFnvAPRR-Mw7GlV64-6H9ymHsuAOAXSGTAKrJph6khODQ2v-6nQZvwwXhwuNSo5TkbarQ6nSUF_VOigBsNqgPokeRGsZGOXc6IgrMPJI7yTO7m4jDmsxZl3IEZfI5Rwzg96R7-01Pzxf0ZISu_7XOu40w9muva4OIYlVenxofxFUPu5o5EM"
  },
  {
    id: "midnight_bloom",
    title: "Midnight Bloom",
    artist: "The Quintet",
    album: "The Vault Sessions",
    duration: "04:10",
    durationSeconds: 250,
    genre: "Jazz-Fusion",
    mood: "Ethereal, Smoky, Late-night",
    lyrics: "Under the purple spotlight scene,\nA smoky soundscape, pure and clean.\nThe keys start to wander, the bass starts to groove,\nMidnight bloom makes the shadows move.\n\nIn this high-fidelity room we hide,\nLet the waves of sound take us inside.\nRemastered echoes of a brass design,\nDrinking in the mulberry wine.",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA63bp1UMtapYi6fPhLuMwB2cKTS5VktL8SZVj0TaEGR6gU3BgrnSALCh0BTA9Ap51nhR3P4yDlVKfF5dUcNourcoZo0wWxAVe9R9E6L48viehYWYDe6nNRbyB32Hy3fcy4r0P_hSM5xbTqpg3taHf0cRwkO2Xy1ovWEza_505NPfjBfN8uPqaO-TrU7VlK4KObfJ2AVcDBQfsqJKJLk9_FA2KL1xkzoh3QwPYA9hEBFr862kdgfFVSqnGSbUMEE4RIGaCsSvCbfYg"
  },
  {
    id: "subsonic_waves",
    title: "Subsonic Waves",
    artist: "Aura Digital",
    album: "Electronic Visions",
    duration: "05:12",
    durationSeconds: 312,
    genre: "Ambient Electronic",
    mood: "Deep, Slow, Fluid",
    lyrics: "Deep frequencies, felt not heard,\nMoving past the spoken word.\nSubsonic ripples in the dark,\nIgniting an electric spark.\n\nFeel the weight of the digital tides,\nWhere the soul of the machine abides.\nResonance flowing through your device,\nTransforming simple waves to ice.",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCVvNydBj_g56HeqfdTofcEDY5vWPDz_oI8PLg68HQ-3adjQZ5t1KpuYaT536BpB-PIq6DNHPa6xMfMOzSi-0ow9wVLDCg7ZHWUA2GwPcn0_pSxzhTvmjZjrrYezC3_1T_cyFmJK-51y09J7bwXV45vjFStBEfF2fClNZkS9ulcYE8H-Dv8S01H6Ttf5nZe0B0U2z9z8sZKzCFePi3dAvtaecs7mj8qlvgxc4MzfadB5KnVU6rjREoZG8auMsF1sPtulew62WSWuz4"
  },
  {
    id: "nocturnal_radiance",
    title: "Nocturnal Radiance",
    artist: "AETHERIS",
    album: "Deep Transmissions",
    duration: "05:12",
    durationSeconds: 312,
    genre: "Space Ambient",
    mood: "Mysterious, Majestic, Cosmic",
    lyrics: "Gleaming silver, cosmic streams,\nEchoes of forgotten dreams.\nNocturnal Radiance guide us home,\nThrough the infinite sky we roam.\n\nPure acoustics, stellar sound,\nIn this space we are unbound.\nFloating beyond the gravity field,\nLetting the absolute dark be revealed.",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZB17HlkwoRIoV6mcyhJyW6ePcvosKZxu0gwF_ONaBuyyEQhRrk8a8sxdfgxsRv0vDFWkHr0V5tj4fAK0YQ_FIRFgc_hQqXkVcBxxLPlHz2VxQLkz1GdYMQKZemoSKqrAtekSmNqkdakREq-djoQfCLjbbNgO5R491f3rhWpc_WqjJsC4DzsmVczaNltKQJ6O06q3BHoolUwrpbEg2hqTv15oMgwIRmAFVA89h-r-B2hMV3BvAUNI1PWaLEB-l0o9lpm_sk-4F11g"
  },
  {
    id: "shadow_choreography",
    title: "Shadow Choreography",
    artist: "Luz Vora",
    album: "The Obsidian Room",
    duration: "04:25",
    durationSeconds: 265,
    genre: "Dark Techno",
    mood: "Enigmatic, Intense, Premium",
    lyrics: "Moving in sync, a perfect line,\nSteps aligned to the click of time.\nIn the shadow room we choreograph,\nA silent cry, a modern laugh.\n\nTurn the dial to forty-eight,\nEnter the premium high-grade gate.",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC1FAjjyahWX3x_xtxEfzpXijTXbqfdOMeD0BBgxMiggpyc5CUZz1zf_ow-Xo4wVLR5PoXwN-y-gqS4eYOPZ4txBYwmxMZnmay-1bESzdbvvPjrl4_kGKXYe4Z4VngpHLnO7RGmLdgHxoNTOmdfIteXUO3XpZrmqdSbwK2enhSzbyEMZcdIzmlwtd1A4jnM2N8PlPoV2qxdUjszDHvlwofriUSlplh3dr6JEEhWxX5bY6CN7qjLhUV2IkawsnUaZ_KGwebxCQQ4ESc"
  },
  {
    id: "neon_resurgence",
    title: "Neon Resurgence",
    artist: "Synthetix Collective",
    album: "Electric Pulse",
    duration: "03:58",
    durationSeconds: 238,
    genre: "Synthwave",
    mood: "Energetic, Nostalgic, Glossy",
    lyrics: "Revving up on a laser lane,\nSynthesizers wash away the pain.\nNeon resurgence under warm city stars,\nSpeeding along in luxury cars.\n\nSilver metallic, glossy and sleek,\nHere is the acoustic peak we seek.",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAm0QDFiHjmOfSZ0AdxVNTSs7GLlAxaEOjDs-C8GrivgoYa3NwW9YhqlpHMRuufolPWZlvaxUVWOXhuwBwAVdC1nqXG7wShphuUdJYTPlDlUfdgDKz45Fw66R-S4HVWVUogcm2BlEdbA8yj-FbG5lRpsbmUlltfTV2L0tUcHqMtn00b5ALpFInlNIQMuE1mzAODUvGZD0nTjO44rI41Q5YI1igiA1rVaKzLeraiiHHoPUWLpekenSzcPwAyd98GNVW7xvjhHIdPVGo"
  },
  {
    id: "silk_static",
    title: "Silk & Static",
    artist: "Marlowe",
    album: "Silk Road Remasters",
    duration: "05:12",
    durationSeconds: 312,
    genre: "Acoustic Electronica",
    mood: "Smooth, Textural, Serene",
    lyrics: "Soft silk touches the analog crackle,\nBreaking away from the digital shackle.\nStatic whispering in your left ear,\nBrushed metal chords starting to appear.\n\nEnjoy the physical depth of sound,\nWhere pure acoustics can be found.",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuChTHrEpU0H7RQpLMYRSoSNzxXYPAyczK-zBEtJqVgcitUUf8aEnItOboAxLP9x9T4U42hnj10vDFPNraS9tdzJAh6VIbLJJI9VY1fPr7sEfuNNTusfnaZCocpC0DwRx1e_cFL55RkLm56lOtDtA_urrjBpr6DKDQwwF0Lc0JrdFCd1D9JKWOjbuOOnio0Lw9qqDaT80IHz92KzqP7eMF184GOVrxYByq7OXnu65xjaTiep-FfWMmMRde_Nhc8HWOyX6aQxp3b1Ua8"
  },
  {
    id: "atmospheric_redux",
    title: "Atmospheric Redux",
    artist: "M. Sterling",
    album: "Acoustic Logic",
    duration: "12:00",
    durationSeconds: 720,
    genre: "Deep House / Jazz-Fusion",
    mood: "Immersive, Spacey, Journey",
    lyrics: "A twelve-hour trip into experimental soundscapes.\nNo words exist here, only the soft vibration of organic pads,\ncoupled with silver highlights that glisten in your ears.\nExperience the sheer grandeur of high-fidelity silence.",
    coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDF8ISXacJ8Z4_ZAH29Hq3dsWFbPzfglUIQmxAXu4UwtxznSobGfBUtCagiIAXDIdPf6TlTDJo3FN4k7W_RwwS5Durnr96CTbQq_0FTYoUbK54Vx9uN7jwMUFcNXkVFo5tvuoUbsydpKskCTtA7PkPnI9w7Td64B4h_-vbGvGkgL_tE8g4XpcXTjsSPS5ExR9ttWA9-XaA1U8sBpTJfbTKvNVAPP-zv-gQzFpkiM2bIdCPSA8178bxFGAo6J695Zt5UjVqNpTY8JO8"
  },
  {
    id: "yt_7KIHvuMl4Kk",
    title: "Golden Brown",
    artist: "The Stranglers",
    album: "La Folie",
    duration: "03:27",
    durationSeconds: 207,
    genre: "Rock",
    mood: "Classic",
    lyrics: "Golden brown, texture like sun\nLays me down, with my mind she runs\nThroughout the night\nNo need to fight\nNever a frown with golden brown",
    coverUrl: "https://img.youtube.com/vi/7KIHvuMl4Kk/hqdefault.jpg",
    videoId: "7KIHvuMl4Kk",
    source: "youtube"
  },
  {
    id: "yt_o_1aF54DO60",
    title: "Young and Beautiful",
    artist: "Lana Del Rey",
    album: "The Great Gatsby",
    duration: "03:56",
    durationSeconds: 236,
    genre: "Pop",
    mood: "Melancholic",
    lyrics: "Hot summer nights, mid-July\nWhen you and I were forever wild\nThe crazy days, city lights\nThe way you'd play with me like a child\n\nWill you still love me when I'm no longer young and beautiful?",
    coverUrl: "https://img.youtube.com/vi/o_1aF54DO60/hqdefault.jpg",
    videoId: "o_1aF54DO60",
    source: "youtube"
  },
  {
    id: "yt_8xg3vE8Ie_E",
    title: "Love Story",
    artist: "Taylor Swift",
    album: "Fearless",
    duration: "03:55",
    durationSeconds: 235,
    genre: "Country Pop",
    mood: "Romantic",
    lyrics: "We were both young when I first saw you\nI close my eyes and the flashback starts\nI'm standing there\nOn a balcony in summer air\n\nRomeo, take me somewhere we can be alone\nI'll be waiting, all that's left to do is run",
    coverUrl: "https://img.youtube.com/vi/8xg3vE8Ie_E/hqdefault.jpg",
    videoId: "8xg3vE8Ie_E",
    source: "youtube"
  }
];

// Dynamically load fallback songs from fallback_songs.json
let allFallbackSongs = [...PRESET_SONGS];
try {
  if (Array.isArray(loadedSongs)) {
    // Map properties to match what the frontend expects
    const formatted = loadedSongs.map((row: any) => ({
      id: row.id || `yt_${row.video_id}`,
      title: row.title,
      artist: row.artist,
      album: row.album || (row.language ? `${row.language.toUpperCase()} Library` : "Local Library"),
      duration: row.duration || "03:00",
      durationSeconds: row.duration_seconds || row.durationSeconds || 180,
      genre: row.genre || row.language || "Music",
      mood: row.mood || "Database Fallback",
      lyrics: row.lyrics || "",
      coverUrl: row.cover_url || row.coverUrl || `https://img.youtube.com/vi/${row.video_id}/hqdefault.jpg`,
      videoId: row.video_id || row.videoId || "",
      source: row.source || "youtube"
    }));
    
    // Combine and filter out duplicates
    const seenIds = new Set(PRESET_SONGS.map(s => s.id));
    for (const song of formatted) {
      if (!seenIds.has(song.id)) {
        allFallbackSongs.push(song);
        seenIds.add(song.id);
      }
    }
    console.log(`Loaded ${formatted.length} fallback songs (Total offline: ${allFallbackSongs.length})`);
  }
} catch (err: any) {
  console.error("Failed to load fallback songs:", err.message);
}

// Active synchronization database (stores active listening clients)
interface SyncState {
  currentSongId: string | null;
  isPlaying: boolean;
  progress: number;
  username: string;
  songTitle?: string;
  songArtist?: string;
  songCoverUrl?: string;
  lastUpdated: number;
  roomId?: string | null;
}
const ACTIVE_PLAYBACKS = new Map<string, SyncState>();

// SSE clients listing
let sseClients: any[] = [];

// Initialize some default simulated active listeners for realism
ACTIVE_PLAYBACKS.set("Julian Thorne", {
  currentSongId: "vivid_obsessions",
  isPlaying: true,
  progress: 162,
  username: "Julian Thorne",
  songTitle: "Vivid Obsessions",
  songArtist: "Elena Cross",
  songCoverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGWAh1VFYsxQ0g-qkNGuQGf-Ng7SUaWAqeUKBUrzObFGk8LREsSS52TQWm16L6PJQGUHBbtO5-fyjwCJiAYeUQuiBtWFnvAPRR-Mw7GlV64-6H9ymHsuAOAXSGTAKrJph6khODQ2v-6nQZvwwXhwuNSo5TkbarQ6nSUF_VOigBsNqgPokeRGsZGOXc6IgrMPJI7yTO7m4jDmsxZl3IEZfI5Rwzg96R7-01Pzxf0ZISu_7XOu40w9muva4OIYlVenxofxFUPu5o5EM",
  lastUpdated: Date.now()
});

ACTIVE_PLAYBACKS.set("Aria Vance", {
  currentSongId: "nocturnal_radiance",
  isPlaying: true,
  progress: 45,
  username: "Aria Vance",
  songTitle: "Nocturnal Radiance",
  songArtist: "AETHERIS",
  songCoverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZB17HlkwoRIoV6mcyhJyW6ePcvosKZxu0gwF_ONaBuyyEQhRrk8a8sxdfgxsRv0vDFWkHr0V5tj4fAK0YQ_FIRFgc_hQqXkVcBxxLPlHz2VxQLkz1GdYMQKZemoSKqrAtekSmNqkdakREq-djoQfCLjbbNgO5R491f3rhWpc_WqjJsC4DzsmVczaNltKQJ6O06q3BHoolUwrpbEg2hqTv15oMgwIRmAFVA89h-r-B2hMV3BvAUNI1PWaLEB-l0o9lpm_sk-4F11g",
  lastUpdated: Date.now()
});

// Helper: Broadcast state updates to all SSE listeners
function broadcastUpdate(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach(client => {
    client.res.write(`data: ${payload}\n\n`);
  });
}

// Ensure the preset database has unique IDs
app.get("/api/tracks", async (req, res) => {
  try {
    const dbResults = await pool.query("SELECT * FROM songs ORDER BY id DESC LIMIT 100");
    if (dbResults.rows.length > 0) {
      const songs = dbResults.rows.map((row: any) => ({
        id: `yt_${row.video_id}`,
        title: row.title,
        artist: row.artist,
        album: row.language ? `${row.language.toUpperCase()} Library` : "Local Library",
        duration: row.duration || "03:00",
        durationSeconds: row.duration_seconds || 180,
        genre: row.language || "Music",
        mood: "Database",
        lyrics: "",
        coverUrl: row.cover_url || `https://img.youtube.com/vi/${row.video_id}/hqdefault.jpg`,
        videoId: row.video_id,
        source: "youtube"
      }));
      return res.json(songs);
    }
  } catch (err) {
    console.error("Failed to fetch tracks from database:", err);
  }
  res.json(allFallbackSongs.slice(0, 100));
});

// Cache a single played song permanently into PostgreSQL
// Called by frontend whenever a YouTube song is played
app.post("/api/tracks/cache", async (req, res) => {
  let { videoId, title, artist, duration, durationSeconds, coverUrl, genre } = req.body;
  
  if (!videoId || !title) {
    return res.status(400).json({ error: "videoId and title are required" });
  }

  // Fetch real duration and metadata from YouTube API if it is defaulted or missing
  if ((!durationSeconds || durationSeconds === 180 || duration === "03:00") && YOUTUBE_API_KEY && videoId) {
    try {
      const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      detailsUrl.searchParams.set("part", "contentDetails,snippet");
      detailsUrl.searchParams.set("id", videoId);
      detailsUrl.searchParams.set("key", YOUTUBE_API_KEY);
      const detRes = await fetch(detailsUrl.toString());
      if (detRes.ok) {
        const detData = await detRes.json();
        const item = detData.items?.[0];
        if (item) {
          const secs = parseISO8601Duration(item.contentDetails?.duration || "PT0S");
          if (secs > 0) {
            durationSeconds = secs;
            duration = formatDuration(secs);
          }
          if (item.snippet) {
            if (!title || title === "Unknown" || title === "Unknown Title") {
              title = decodeHTMLEntities(item.snippet.title);
            }
            if (!artist || artist === "Unknown" || artist === "YouTube Artist" || artist === "Unknown Artist") {
              artist = decodeHTMLEntities(item.snippet.channelTitle);
            }
            if (!coverUrl) {
              coverUrl = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "";
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Cache API] Failed to fetch live duration from YouTube:", err);
    }
  }

  // Detect language heuristically
  const titleLower = (title + " " + (artist || "")).toLowerCase();
  const hindiKeywords = [
    "tum", "hi", "ho", "kesariya", "dil", "pyar", "aashiqui", "singh", "dosanjh", "pasoori",
    "goli", "ki", "raasleela", "ram-leela", "shreya", "ghoshal", "nehha", "kakkar", "arijit",
    "jubin", "nautiyal", "sonu", "nigam", "lata", "mangeshkar", "kishore", "kumar", "atif", "aslam",
    "tere", "bin", "rabba", "jeena", "sanam", "sufi", "bollywood", "t-series", "zee music", "tips"
  ];
  let lang = genre || "english";
  if (lang === "YouTube Music" || lang === "Music" || lang === "Streaming") {
    lang = /[^\x00-\x7F]/.test(title) || hindiKeywords.some(kw => titleLower.includes(kw))
      ? "hindi"
      : "english";
  }

  try {
    await cacheToDb([{
      videoId,
      title,
      artist: artist || "YouTube Artist",
      duration: duration || "03:00",
      durationSeconds: durationSeconds || 180,
      coverUrl: coverUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      genre: lang
    }]);
    res.json({ success: true });
  } catch (dbErr: any) {
    console.warn(`[DB Cache] Skipping cache for "${title}":`, dbErr.message);
    res.json({ success: false, cached: false, reason: "db_offline" });
  }
});

// Record a song listen event
app.post("/api/listens", async (req, res) => {
  const { userId, username, songId, songTitle, artist } = req.body;
  if (!username || !songId || !songTitle || !artist) {
    return res.status(400).json({ error: "Missing required listen fields." });
  }

  const numericUserId = userId && userId !== 9999 ? (typeof userId === "string" ? parseInt(userId, 10) : userId) : null;
  const cleanSongId = songId.replace(/^(yt_)+/, "");

  try {
    await pool.query(`
      INSERT INTO user_listens (user_id, username, song_id, song_title, artist, listened_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [numericUserId, username, cleanSongId, songTitle, artist]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Listen Tracker] Error saving listen:", err.message);
    res.status(500).json({ error: "Failed to record listen.", message: err.message });
  }
});

// Real-time Update API: receive player updates from individual users and broadcast them
app.post("/api/sync/update", (req, res) => {
  const { username, currentSongId, isPlaying, progress, songTitle, songArtist, songCoverUrl, roomId } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  // Auto-cache played song to Neon if it's from YouTube
  if (currentSongId && currentSongId.startsWith("yt_") && songTitle) {
    const videoId = currentSongId.replace(/^(yt_)+/, "");
    cacheToDb([{ videoId, title: songTitle, artist: songArtist || "YouTube Artist", coverUrl: songCoverUrl || "" }])
      .catch(err => console.error("[Sync] Auto-cache failed:", err.message));
  }

  const updatedState: SyncState = {
    username,
    currentSongId,
    isPlaying,
    progress,
    songTitle,
    songArtist,
    songCoverUrl,
    roomId,
    lastUpdated: Date.now()
  };

  ACTIVE_PLAYBACKS.set(username, updatedState);
  broadcastUpdate("PLAYBACK_CHANGE", updatedState);

  res.json({ success: true, state: updatedState });
});

// Return list of all active users
app.get("/api/sync/users", (req, res) => {
  res.json(Array.from(ACTIVE_PLAYBACKS.values()));
});

// Create a new Jam Room
app.post("/api/jams/create", async (req, res) => {
  const { password, creatorId, capacity } = req.body;
  if (!password || !creatorId) {
    return res.status(400).json({ error: "Password and creatorId are required" });
  }

  // Parse capacity limit, enforcing range [2, 10]
  let maxUsers = 10;
  if (typeof capacity === "number") {
    maxUsers = Math.max(2, Math.min(10, capacity));
  }

  try {
    // Generate random 8 digit room ID
    let roomId = "";
    let isUnique = false;
    while (!isUnique) {
      roomId = Math.floor(10000000 + Math.random() * 90000000).toString();
      const check = await pool.query("SELECT 1 FROM jams WHERE room_id = $1", [roomId]);
      if (check.rows.length === 0) {
        isUnique = true;
      }
    }

    await pool.query(
      `INSERT INTO jams (room_id, password, creator_id, max_users) VALUES ($1, $2, $3, $4)`,
      [roomId, password, creatorId, maxUsers]
    );

    console.log(`[Jam Room] Created room ${roomId} by creator ${creatorId} with capacity ${maxUsers}`);
    res.json({ success: true, roomId });
  } catch (err: any) {
    console.error("[Jam Room] Create failed:", err.message);
    res.status(500).json({ error: "Failed to create Jam Room", message: err.message });
  }
});

// Join an existing Jam Room
app.post("/api/jams/join", async (req, res) => {
  const { roomId, password, username } = req.body;
  if (!roomId || !password) {
    return res.status(400).json({ error: "Room ID and Password are required" });
  }

  try {
    const check = await pool.query("SELECT * FROM jams WHERE room_id = $1", [roomId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    const jam = check.rows[0];
    if (jam.password !== password) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Check capacity limit
    const maxUsers = jam.max_users || 10;
    let activeCount = 0;
    for (const [uname, state] of ACTIVE_PLAYBACKS.entries()) {
      if (state.roomId === roomId && uname !== username) {
        activeCount++;
      }
    }

    if (activeCount >= maxUsers) {
      return res.status(403).json({ error: `Room is full. Maximum capacity is ${maxUsers} users.` });
    }

    res.json({
      success: true,
      jam: {
        room_id: jam.room_id,
        creator_id: jam.creator_id,
        current_song_id: jam.current_song_id,
        current_song_progress: jam.current_song_progress,
        current_song_is_playing: jam.current_song_is_playing
      }
    });
  } catch (err: any) {
    console.error("[Jam Room] Join failed:", err.message);
    res.status(500).json({ error: "Failed to join Jam Room", message: err.message });
  }
});

// Update Jam Room playback state
app.post("/api/jams/:roomId/update", async (req, res) => {
  const { roomId } = req.params;
  const { currentSongId, isPlaying, progress, songTitle, songArtist, songCoverUrl } = req.body;

  try {
    const check = await pool.query("SELECT * FROM jams WHERE room_id = $1", [roomId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await pool.query(
      `UPDATE jams SET 
        current_song_id = $1, 
        current_song_is_playing = $2, 
        current_song_progress = $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $4`,
      [currentSongId, isPlaying, progress, roomId]
    );

    const updatedState = {
      room_id: roomId,
      current_song_id: currentSongId,
      current_song_is_playing: isPlaying,
      current_song_progress: progress,
      songTitle,
      songArtist,
      songCoverUrl
    };

    broadcastUpdate("JAM_UPDATE", updatedState);

    res.json({ success: true, jam: updatedState });
  } catch (err: any) {
    console.error("[Jam Room] Update failed:", err.message);
    res.status(500).json({ error: "Failed to update Jam Room state", message: err.message });
  }
});

// Get Jam Room State
app.get("/api/jams/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    const check = await pool.query("SELECT * FROM jams WHERE room_id = $1", [roomId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    const jam = check.rows[0];
    res.json({
      success: true,
      jam: {
        room_id: jam.room_id,
        creator_id: jam.creator_id,
        current_song_id: jam.current_song_id,
        current_song_progress: jam.current_song_progress,
        current_song_is_playing: jam.current_song_is_playing
      }
    });
  } catch (err: any) {
    console.error("[Jam Room] Get failed:", err.message);
    res.status(500).json({ error: "Failed to load Jam Room", message: err.message });
  }
});

// Delete Jam Room
app.delete("/api/jams/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    await pool.query("DELETE FROM jams WHERE room_id = $1", [roomId]);
    await pool.query("DELETE FROM jam_messages WHERE room_id = $1", [roomId]);
    broadcastUpdate("JAM_DELETE", { room_id: roomId });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Jam Room] Delete failed:", err.message);
    res.status(500).json({ error: "Failed to delete Jam Room", message: err.message });
  }
});

// Get Jam Room Chat Messages
app.get("/api/jams/:roomId/messages", async (req, res) => {
  const { roomId } = req.params;
  try {
    const dbResult = await pool.query(
      "SELECT * FROM jam_messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT 100",
      [roomId]
    );
    res.json({ success: true, messages: dbResult.rows });
  } catch (err: any) {
    console.error("[Jam Chat] Failed to fetch messages:", err.message);
    res.json({ success: true, messages: [] });
  }
});

// Post Jam Room Chat Message
app.post("/api/jams/:roomId/messages", async (req, res) => {
  const { roomId } = req.params;
  const { username, message } = req.body;
  
  if (!username || !message || !message.trim()) {
    return res.status(400).json({ error: "username and message are required" });
  }

  const cleanMessage = message.trim();
  const msgObj = {
    room_id: roomId,
    username,
    message: cleanMessage,
    created_at: new Date().toISOString()
  };

  try {
    const dbResult = await pool.query(
      "INSERT INTO jam_messages (room_id, username, message) VALUES ($1, $2, $3) RETURNING *",
      [roomId, username, cleanMessage]
    );
    const savedMsg = dbResult.rows[0];
    broadcastUpdate("JAM_MESSAGE", savedMsg);
    res.json({ success: true, message: savedMsg });
  } catch (err: any) {
    console.warn("[Jam Chat] DB Save failed, broadcasting in memory:", err.message);
    broadcastUpdate("JAM_MESSAGE", msgObj);
    res.json({ success: true, message: msgObj });
  }
});

// SSE endpoint for live real-time streams
app.get("/api/sync/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const client = { id: Date.now(), res };
  sseClients.push(client);

  // Send initial load of active listeners
  res.write(`data: ${JSON.stringify({ type: "INITIAL_USERS", data: Array.from(ACTIVE_PLAYBACKS.values()) })}\n\n`);

  req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== client.id);
  });
});

// Dynamic AI Song Search: uses Gemini to query any song in the world
// NOTE: /api/search (legacy Gemini search) has been removed.
// All searches now use /api/smart/search: DB-first → YouTube fallback → auto-cache.

// Helper to fetch and scrape lyrics from Genius API
async function fetchGeniusLyrics(title: string, artist: string): Promise<string> {
  const token = process.env.GENIUS_ACCESS_TOKEN || "xmvRV1yiBYz5xQTMevfcGl-_udqykklpcupf0qDZHdfBeG0BcXJ4LSk8E9kQFuUI";
  const query = `${title} ${artist || ""}`.trim();
  
  try {
    const searchRes = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!searchRes.ok) {
      console.warn(`[Genius Search] Failed: ${searchRes.status}`);
      return "";
    }
    
    const searchData = await searchRes.json();
    const hit = searchData.response?.hits[0]?.result;
    if (!hit) {
      console.log(`[Genius Search] No match found for "${query}"`);
      return "";
    }
    
    const songUrl = hit.url;
    console.log(`[Genius Scraper] Scraping lyrics page: ${songUrl}`);
    
    const htmlRes = await fetch(songUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });
    
    if (!htmlRes.ok) {
      console.warn(`[Genius HTML] Failed to fetch lyrics page: ${htmlRes.status}`);
      return "";
    }
    
    const html = await htmlRes.text();
    const $ = cheerio.load(html);
    let rawLyrics = "";
    
    $('[data-lyrics-container="true"]').each((i, elem) => {
      $(elem).find("br").replaceWith("\n");
      rawLyrics += $(elem).text() + "\n\n";
    });
    
    return rawLyrics.trim();
  } catch (err: any) {
    console.error("[Genius Scraper] Error fetching lyrics:", err.message);
  }
  return "";
}

// ── Lyrics API (Genius-powered with Gemini Alignment) ─────────────────────────

app.post("/api/lyrics", async (req, res) => {
  const { title, artist, durationSeconds } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Song title is required" });
  }

  if (!ai) {
    return res.json({ lyrics: "" });
  }

  let rawGeniusLyrics = "";
  try {
    const secs = durationSeconds || 180;
    const minsPart = Math.floor(secs / 60);
    const secsPart = secs % 60;
    const durationStr = `${String(minsPart).padStart(2, "0")}:${String(secsPart).padStart(2, "0")}`;

    // 1. Fetch raw lyrics from Genius first
    console.log(`[Lyrics Request] Fetching Genius lyrics for "${title}" by "${artist || 'Unknown'}"`);
    rawGeniusLyrics = await fetchGeniusLyrics(title, artist);
    
    let prompt = "";
    if (rawGeniusLyrics && rawGeniusLyrics.length > 50) {
      console.log(`[Lyrics Request] Found official Genius lyrics (${rawGeniusLyrics.length} chars). Aligning with timestamps...`);
      prompt = `Here are the official lyrics of the song "${title}" by "${artist || 'Unknown Artist'}":
---
${rawGeniusLyrics}
---

The song's total duration is ${durationStr} (${secs} seconds).
Your task is to:
1. Clean up the lyrics: remove any contributor credits, intro explanations, headers, ads, or metadata. Keep the actual lyrics and verse labels (like [Verse 1], [Chorus], etc.).
2. Generate strictly increasing timestamps in LRC format (e.g. \`[mm:ss]\`) for each line of the lyrics, spaced out evenly to align with the song's total duration of ${secs} seconds.

Rules:
- The first timestamp must start after the intro (e.g., around \`[00:10]\` or \`[00:15]\`).
- The last timestamp must not exceed the total duration of ${secs} seconds.
- Return ONLY the timestamped lyrics. Do not wrap in markdown or explain anything.`;
    } else {
      console.log(`[Lyrics Request] Genius lyrics not found. Falling back to Gemini generation...`);
      prompt = `You are a lyrics database. Provide the full lyrics with estimated timestamps for the song "${title}" by "${artist || 'Unknown Artist'}".
The song's total duration is ${durationStr} (${secs} seconds).

Note: The song title might be a YouTube video title and contain extra metadata, noise, or movie titles (e.g., "Movie Name - Song Name" or "Song Name [Official Video]"). Please clean it up, extract the actual song, and search for its lyrics.

Rules:
- For each line of lyrics, estimate its timestamp and prefix the line with the timestamp in "[mm:ss]" format (e.g. "[00:12] Line content").
- Ensure the timestamps start at [00:00] and are strictly increasing.
- The timestamps MUST fit strictly within the song's total duration of ${durationStr}. The last lyric line should be estimated near the end of the song (e.g. around 10-20 seconds before the end).
- Estimate the timestamps realistically based on a standard song structure (e.g., intro for first 15-20 seconds, verses spaced out, choruses, etc.).
- Return ONLY the timestamped lyrics text, nothing else. Do not include section headers like [Chorus] or [Verse] unless they have timestamps too.
- If you cannot find the lyrics, return an empty string ""`;
    }

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const lyrics = (response.text || "").trim();
    res.json({ lyrics });
  } catch (error) {
    console.error("Lyrics generation failed:", error);
    if (rawGeniusLyrics && rawGeniusLyrics.length > 50) {
      console.log("[Lyrics Request] Gemini alignment failed, falling back to raw Genius lyrics.");
      return res.json({ lyrics: rawGeniusLyrics });
    }
    res.json({ lyrics: "" });
  }
});

// ── YouTube Data API v3 Integration ─────────────────────────────────────────

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

// Simple in-memory cache for YouTube search results (1-hour TTL)
interface CacheEntry {
  data: any;
  timestamp: number;
}
const ytSearchCache = new Map<string, CacheEntry>();
const YT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedResult(key: string): any | null {
  const entry = ytSearchCache.get(key);
  if (entry && Date.now() - entry.timestamp < YT_CACHE_TTL) {
    return entry.data;
  }
  if (entry) ytSearchCache.delete(key);
  return null;
}

function setCachedResult(key: string, data: any): void {
  ytSearchCache.set(key, { data, timestamp: Date.now() });
}

function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

let localDictionary: string[] = [];
async function refreshLocalDictionary(): Promise<void> {
  try {
    const result = await pool.query("SELECT DISTINCT title, artist FROM songs");
    const dict = new Set<string>();
    result.rows.forEach(row => {
      if (row.title) dict.add(row.title.trim());
      if (row.artist) dict.add(row.artist.trim());
    });
    if (Array.isArray(allFallbackSongs)) {
      allFallbackSongs.forEach(s => {
        if (s.title) dict.add(s.title.trim());
        if (s.artist) dict.add(s.artist.trim());
      });
    }
    localDictionary = Array.from(dict);
  } catch (err: any) {
    console.warn("[Spelling Dict] DB query failed, using offline fallback:", err.message);
    const dict = new Set<string>();
    if (Array.isArray(allFallbackSongs)) {
      allFallbackSongs.forEach(s => {
        if (s.title) dict.add(s.title.trim());
        if (s.artist) dict.add(s.artist.trim());
      });
    }
    localDictionary = Array.from(dict);
  }
}

// AI-powered spelling correction helper with local Levenshtein fallback
async function getSpellingCorrection(query: string): Promise<string> {
  if (!query || query.trim().length < 3) return "";
  const cleanQ = query.trim().toLowerCase();

  // Try Gemini first if key exists and isn't reported as leaked
  if (ai && process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("leaked")) {
    try {
      const prompt = `You are a spelling correction engine for a music search engine. Check the following query for obvious typos: "${query}".
If there are typos, spelling mistakes, or grammatical errors, return the corrected version of the query (e.g. correct song title, artist, or term).
If the query is already correct, or you are unsure, return the exact original query.

Rules:
- Return ONLY the corrected or original string, nothing else
- Do NOT wrap in quotes, markdown, or explain anything
- Do NOT add punctuation unless it is part of the corrected term`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash-lite",
        contents: prompt,
      });
      const result = (response.text || "").trim();
      if (result.toLowerCase() !== cleanQ) {
        return result;
      }
    } catch (err: any) {
      console.warn("[Spelling correction] Gemini failed/denied, falling back to local Levenshtein:", err.message || err);
    }
  }

  // Local Levenshtein distance fallback
  if (localDictionary.length === 0) {
    await refreshLocalDictionary();
  }

  let bestMatch = "";
  let bestDistance = 999;

  for (const term of localDictionary) {
    const termLower = term.toLowerCase();
    if (termLower === cleanQ) return "";

    const distance = getLevenshteinDistance(cleanQ, termLower);
    const maxAllowedDistance = Math.min(3, Math.floor(termLower.length / 3));

    if (distance <= maxAllowedDistance && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = term;
    }
  }

  if (bestMatch && bestDistance > 0) {
    return bestMatch;
  }

  return "";
}

// Local Database search endpoint — queries local PostgreSQL database
// NOTE: /api/db/search and /api/youtube/search have been removed.
// Use /api/smart/search — it searches DB first, falls back to YouTube if
// not cached, writes all results to Neon, and returns DB results next time.

// ── Smart Search: DB-first → YouTube fallback → auto-cache ───────────────────
// Flow:
//   1. Search Neon DB (fuzzy). Results found → return immediately (⚡ cached).
//   2. DB miss → call YouTube API, return results, then async-cache to Neon.
//   3. Next search for the same song → Step 1 returns it instantly from DB.
app.post("/api/smart/search", async (req, res) => {
  const { query, limit = 20 } = req.body;

  if (!query || !query.trim()) {
    return res.json({ results: [], source: "none", didYouMean: "" });
  }

  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();

  // Start spelling correction in parallel
  const spellingPromise = getSpellingCorrection(cleanQuery).catch(err => {
    console.warn("[Smart Search] Spelling correction error:", err);
    return "";
  });
  const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);

  // We want to return at least 10 items.
  const finalLimit = Math.max(10, limit);

  // We will collect songs from:
  // 1. search_cache (exact query hit)
  // 2. DB songs ILIKE matching
  // 3. YouTube search (if we have fewer than 10 results, or to fetch/update "real" songs)

  let dbSongs: any[] = [];
  let sourceUsed = "database";

  // Step A: Check query cache
  try {
    const cacheResult = await pool.query("SELECT video_ids FROM search_cache WHERE query = $1", [cacheKey]);
    if (cacheResult.rows.length > 0) {
      const videoIds = cacheResult.rows[0].video_ids;
      if (videoIds && videoIds.length > 0) {
        const songsResult = await pool.query(
          "SELECT * FROM songs WHERE video_id = ANY($1)",
          [videoIds]
        );
        const songMap = new Map(songsResult.rows.map(row => [row.video_id, row]));
        const cachedSongs = videoIds
          .map((vid: string) => songMap.get(vid))
          .filter(Boolean)
          .map((row: any) => ({
            id: `yt_${row.video_id}`,
            title: row.title,
            artist: row.artist,
            album: row.language ? `${row.language.toUpperCase()} Library` : "Cached",
            duration: row.duration || "03:00",
            durationSeconds: row.duration_seconds || 180,
            genre: row.language || "Music",
            mood: "Cached",
            lyrics: "",
            coverUrl: row.cover_url || `https://img.youtube.com/vi/${row.video_id}/hqdefault.jpg`,
            videoId: row.video_id,
            source: "youtube"
          }));
        dbSongs = [...dbSongs, ...cachedSongs];
      }
    }
  } catch (cacheErr: any) {
    console.warn(`[Smart Search] Query cache lookup failed:`, cacheErr.message);
  }

  // Step B: Search Neon DB by title/artist keywords if query cache returned fewer than finalLimit
  if (words.length > 0) {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      words.forEach((word, idx) => {
        conditions.push(`(title ILIKE $${idx + 1} OR artist ILIKE $${idx + 1})`);
        values.push(`%${word}%`);
      });

      const limitParamIndex = words.length + 1;
      values.push(finalLimit * 2); // fetch slightly more to allow filtering

      const sql = `
        SELECT * FROM songs
        WHERE ${conditions.join(" AND ")}
        LIMIT $${limitParamIndex}
      `;

      const dbResult = await pool.query(sql, values);
      if (dbResult.rows.length > 0) {
        const matchedDBSongs = dbResult.rows.map((row: any) => ({
          id: `yt_${row.video_id}`,
          title: row.title,
          artist: row.artist,
          album: row.language ? `${row.language.toUpperCase()} Library` : "Cached",
          duration: row.duration || "03:00",
          durationSeconds: row.duration_seconds || 180,
          genre: row.language || "Music",
          mood: "Cached",
          lyrics: "",
          coverUrl: row.cover_url || `https://img.youtube.com/vi/${row.video_id}/hqdefault.jpg`,
          videoId: row.video_id,
          source: "youtube"
        }));
        dbSongs = [...dbSongs, ...matchedDBSongs];
      }
    } catch (dbErr: any) {
      console.error(`[Smart Search] DB ILIKE query failed: ${dbErr?.message}`);
    }
  }

  // Deduplicate dbSongs by videoId
  const dbSongMap = new Map();
  dbSongs.forEach(s => {
    if (s.videoId) dbSongMap.set(s.videoId, s);
  });
  dbSongs = Array.from(dbSongMap.values());

  // Prioritize exact query matches in titles or artists
  const lowerQuery = cleanQuery.toLowerCase();
  dbSongs.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aArtist = a.artist.toLowerCase();
    const bArtist = b.artist.toLowerCase();
    const aFullMatch = aTitle.includes(lowerQuery) || aArtist.includes(lowerQuery);
    const bFullMatch = bTitle.includes(lowerQuery) || bArtist.includes(lowerQuery);
    if (aFullMatch && !bFullMatch) return -1;
    if (!aFullMatch && bFullMatch) return 1;
    return a.title.localeCompare(b.title);
  });

  // Filter dbSongs into long songs (duration >= 90s) and short songs (< 90s)
  const longDbSongs = dbSongs.filter(s => s.durationSeconds >= 90);
  const shortDbSongs = dbSongs.filter(s => s.durationSeconds < 90);

  let finalSongs = [...longDbSongs];

  // If we have fewer than 10 long songs from the DB, we MUST query YouTube live to fetch additional real songs!
  if (finalSongs.length < 10 && YOUTUBE_API_KEY) {
    try {
      sourceUsed = "youtube";
      console.log(`[Smart Search] Only ${finalSongs.length} long cached songs in DB. Fetching live from YouTube for "${cleanQuery}"...`);
      
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("q", cleanQuery);
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("videoCategoryId", "10"); // Music category
      searchUrl.searchParams.set("maxResults", String(Math.max(25, finalLimit * 2)));
      searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

      const ytResponse = await fetch(searchUrl.toString());
      if (ytResponse.ok) {
        const ytData = await ytResponse.json();
        const videoIds = (ytData.items || []).map((item: any) => item.id?.videoId).filter(Boolean);
        
        let durationsMap: Record<string, { duration: string; durationSeconds: number }> = {};
        if (videoIds.length > 0) {
          try {
            const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
            detailsUrl.searchParams.set("part", "contentDetails");
            detailsUrl.searchParams.set("id", videoIds.join(","));
            detailsUrl.searchParams.set("key", YOUTUBE_API_KEY);
            const detRes = await fetch(detailsUrl.toString());
            if (detRes.ok) {
              for (const item of ((await detRes.json()).items || [])) {
                const secs = parseISO8601Duration(item.contentDetails?.duration || "PT0S");
                durationsMap[item.id] = { duration: formatDuration(secs), durationSeconds: secs };
              }
            }
          } catch (dErr) {
            console.warn("[Smart Search] YouTube video details duration fetch failed:", dErr);
          }
        }

        const ytSongs = (ytData.items || []).map((item: any) => {
          const videoId = item.id?.videoId || "";
          const snippet = item.snippet || {};
          const dur = durationsMap[videoId] || { duration: "—", durationSeconds: 300 };
          return {
            id: `yt_${videoId}`,
            title: decodeHTMLEntities(snippet.title || "Unknown Title"),
            artist: decodeHTMLEntities(snippet.channelTitle || "Unknown Artist"),
            album: "YouTube",
            duration: dur.duration,
            durationSeconds: dur.durationSeconds,
            genre: "YouTube Music",
            mood: "Streaming",
            lyrics: "",
            coverUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "",
            videoId,
            source: "youtube"
          };
        });

        // Filter YT songs into long (>= 90s) and short (< 90s)
        const longYtSongs = ytSongs.filter((s: any) => s.durationSeconds >= 90);
        const shortYtSongs = ytSongs.filter((s: any) => s.durationSeconds < 90);

        // Cache all valid YouTube songs fetched to database
        const validSongs = ytSongs.filter((s: any) => s.videoId && s.videoId.trim().length > 0);
        if (validSongs.length > 0) {
          // Push to in-memory fallback list
          const seenFallbackIds = new Set(allFallbackSongs.map(s => s.id));
          for (const song of validSongs) {
            if (!seenFallbackIds.has(song.id)) {
              allFallbackSongs.push(song);
              seenFallbackIds.add(song.id);
            }
          }
          await cacheToDb(validSongs);
        }

        // Merge long YouTube songs
        const seenVideoIds = new Set(finalSongs.map(s => s.videoId));
        for (const song of longYtSongs) {
          if (!seenVideoIds.has(song.videoId)) {
            finalSongs.push(song);
            seenVideoIds.add(song.videoId);
          }
        }

        // If we still have less than finalLimit results, we can append short songs (prioritizing longer ones)
        if (finalSongs.length < finalLimit) {
          const remainingShortSongs = [...shortDbSongs, ...shortYtSongs];
          // Deduplicate
          const uniqueShorts = remainingShortSongs.filter(s => !seenVideoIds.has(s.videoId));
          // Sort by duration descending
          uniqueShorts.sort((a, b) => b.durationSeconds - a.durationSeconds);
          
          for (const song of uniqueShorts) {
            if (finalSongs.length >= finalLimit) break;
            finalSongs.push(song);
            seenVideoIds.add(song.videoId);
          }
        }
      }
    } catch (ytErr: any) {
      console.error("[Smart Search] YouTube API integration failed:", ytErr?.message);
    }
  }

  // If still less than 10 results and we have fallback songs, search them
  if (finalSongs.length < 10) {
    sourceUsed = "fallback";
    const q = cleanQuery.toLowerCase();
    const matchedFallbacks = allFallbackSongs.filter(s =>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
    const seenVideoIds = new Set(finalSongs.map(s => s.videoId));
    
    // Sort fallbacks: long first, then short
    const longFallbacks = matchedFallbacks.filter(s => (s.durationSeconds || 0) >= 90);
    const shortFallbacks = matchedFallbacks.filter(s => (s.durationSeconds || 0) < 90);
    shortFallbacks.sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0));

    for (const song of [...longFallbacks, ...shortFallbacks]) {
      const vidId = song.videoId || song.id?.replace(/^(yt_)+/, "");
      if (vidId && !seenVideoIds.has(vidId)) {
        finalSongs.push({
          ...song,
          videoId: vidId,
          source: "youtube"
        });
        seenVideoIds.add(vidId);
      }
    }
  }

  // Final trim to finalLimit
  const results = finalSongs.slice(0, finalLimit);

  // Write top results association back to search_cache to speed up subsequent queries
  const finalVideoIds = results.map(s => s.videoId).filter(Boolean);
  if (finalVideoIds.length > 0) {
    try {
      await pool.query(`
        INSERT INTO search_cache (query, video_ids)
        VALUES ($1, $2)
        ON CONFLICT (query) DO UPDATE
        SET video_ids = EXCLUDED.video_ids, created_at = CURRENT_TIMESTAMP
      `, [cacheKey, finalVideoIds]);
    } catch (cacheWriteErr: any) {
      console.warn(`[Smart Search] Failed to write query cache for final search results:`, cacheWriteErr.message);
    }
  }

  const didYouMean = await spellingPromise;
  console.log(`[Smart Search] Completed: "${cleanQuery}" → returning ${results.length} songs (source: ${sourceUsed}, didYouMean: "${didYouMean}")`);
  return res.json({ results, source: sourceUsed, didYouMean });
});

// ── DB Status Debug Endpoint ───────────────────────────────────────────────────
// Hit /api/debug/db-status from the browser to instantly see if Neon is reachable
// and how many songs/users are currently cached.
app.get("/api/debug/db-status", async (_req, res) => {
  try {
    const start = Date.now();
    const [songs, users] = await Promise.all([
      pool.query("SELECT COUNT(*) AS c FROM songs"),
      pool.query("SELECT COUNT(*) AS c FROM users")
    ]);
    const latency = Date.now() - start;
    res.json({
      status: "connected",
      latencyMs: latency,
      songs: parseInt(songs.rows[0].c, 10),
      users: parseInt(users.rows[0].c, 10),
      inMemorySongs: allFallbackSongs.length,
      pool: { totalCount: pool.totalCount, idleCount: pool.idleCount, waitingCount: pool.waitingCount }
    });
  } catch (err: any) {
    res.status(503).json({ status: "error", error: err.message });
  }
});

// YouTube video details endpoint — gets accurate duration for a single video

app.get("/api/youtube/video/:videoId", async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: "YouTube API key not configured" });
  }

  const cacheKey = `yt_video:${videoId}`;
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", YOUTUBE_API_KEY);

    const ytResponse = await fetch(url.toString());
    if (!ytResponse.ok) {
      return res.status(ytResponse.status).json({ error: "YouTube API request failed" });
    }

    const ytData = await ytResponse.json();
    const item = (ytData.items || [])[0];

    if (!item) {
      return res.status(404).json({ error: "Video not found" });
    }

    const iso = item.contentDetails?.duration || "PT0S";
    const secs = parseISO8601Duration(iso);
    const snippet = item.snippet || {};

    const result = {
      videoId,
      title: decodeHTMLEntities(snippet.title || ""),
      artist: decodeHTMLEntities(snippet.channelTitle || ""),
      duration: formatDuration(secs),
      durationSeconds: secs,
      coverUrl: snippet.thumbnails?.high?.url || "",
      description: snippet.description || ""
    };

    setCachedResult(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error("YouTube video details failed:", error);
    res.status(500).json({ error: "Failed to fetch video details" });
  }
});

app.get("/api/stream/:videoId", async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`[Stream API] Resolving audio stream for YouTube Video ID: ${videoId}`);
    
    const stream = await play.stream(videoUrl, {
      quality: 0
    });

    if (stream && (stream as any).url) {
      console.log(`[Stream API] Successfully resolved stream URL. Redirecting client...`);
      return res.redirect((stream as any).url);
    } else {
      throw new Error("No stream URL returned from play-dl");
    }
  } catch (error: any) {
    console.error("[Stream API] Failed to resolve stream:", error);
    res.status(500).json({ error: "Failed to resolve stream: " + error.message });
  }
});

// Helper: Parse ISO 8601 duration (PT1H2M30S) to seconds
function parseISO8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Helper: Format seconds to MM:SS or H:MM:SS
function formatDuration(secs: number): string {
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Helper: Decode HTML entities from YouTube API responses
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// Personalized Daily Playlist Generator based on recent user listening habits
app.post("/api/generate-daily-playlist", async (req, res) => {
  const { history } = req.body; // Array of ListeningHabit objects

  const historyDescription = Array.isArray(history) && history.length > 0
    ? history.map(item => `Song: "${item.songTitle}" by "${item.artist}" (Played ${item.count} times)`).join(", ")
    : "No previous habits; user prefers atmospheric experimental jazz, dark techno, and deep warm spaces.";

  if (!ai) {
    console.log("No Gemini API configuration. Generating default personalized recommendations.");
    return res.json({
      name: "Mulberry Daily Mix",
      description: "A dark tailored cocktail of deep ambient and midnight grooves.",
      songs: allFallbackSongs.slice(0, 4)
    });
  }

  try {
    const prompt = `Based on the user's recent listening habits: [ ${historyDescription} ], 
create a highly personalized "Mulberry Daily Playlist".
The output must have a custom title (e.g., "Obsidian Resonance Daily", "Atmospheric Velvet Daily Mix"),
a refined editorial description emphasizing our luxurious high-gloss mood,
and a list of exactly 5 songs personalized to their tastes (can generate fantastic original songs with full, deep, emotional lyrics).

You must respond ONLY in a clean JSON format matching this schema:
{
  "name": "Custom Dynamic Playlist Name",
  "description": "Premium curated visual/sound cocktail...",
  "songs": [
    {
      "id": "personalized-unique-id",
      "title": "Track Title",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": "03:45",
      "durationSeconds": 225,
      "genre": "Genre Name",
      "mood": "Specific emotional description",
      "lyrics": "Beautiful expressive lyrics...",
      "coverUrl": "https://images.unsplash.com/photo-... (choose a dark luxury or fluid abstract background)"
    }
  ]
}`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            songs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  album: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  durationSeconds: { type: Type.INTEGER },
                  genre: { type: Type.STRING },
                  mood: { type: Type.STRING },
                  lyrics: { type: Type.STRING },
                  coverUrl: { type: Type.STRING }
                },
                required: ["id", "title", "artist", "album", "duration", "durationSeconds", "genre", "mood", "lyrics", "coverUrl"]
              }
            }
          },
          required: ["name", "description", "songs"]
        }
      }
    });

    const parsedPlaylist = JSON.parse(response.text || "{}");
    res.json(parsedPlaylist);
  } catch (error) {
    console.error("Personalized daily playlist generation failed:", error);
    res.json({
      name: "Mulberry Daily Mix - Velvet Twilight",
      description: "A dark tailored cocktail of deep ambient and midnight grooves, styled for contemplative listenership.",
      songs: allFallbackSongs.slice(0, 5)
    });
  }
});

// ── Google Auth & Admin API endpoints ─────────────────────────

// Guest auth fallback endpoint for local development
app.post("/api/auth/guest", async (req, res) => {
  try {
    const email = req.body.email || "guest@melo.audio";
    const name = req.body.name || "Guest Listener";
    const googleId = req.body.googleId || (req.body.email ? `guest_${req.body.email.replace(/[^a-zA-Z0-9]/g, "_")}` : "guest_id");
    const picture = req.body.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";

    let user;
    let dbSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const existingUserResult = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );

        if (existingUserResult.rows.length > 0) {
          user = existingUserResult.rows[0];
        } else {
          const dbResult = await pool.query(`
            INSERT INTO users (google_id, email, name, picture, role, last_login)
            VALUES ($1, $2, $3, $4, 'admin', CURRENT_TIMESTAMP)
            RETURNING *;
          `, [googleId, email, name, picture]);
          user = dbResult.rows[0];
        }
        dbSuccess = true;
        break;
      } catch (dbErr: any) {
        console.warn(`[Guest Auth DB Attempt ${attempt} Warning] DB query failed:`, dbErr.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s before retrying
        }
      }
    }

    if (!dbSuccess) {
      console.warn("[Guest Auth Fallback] Database unreachable after retries, using in-memory guest user.");
      user = {
        id: 9999,
        google_id: googleId,
        email: email,
        name: name,
        picture: picture,
        role: "admin",
        created_at: new Date(),
        last_login: new Date()
      };
    }
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Google auth callback endpoint
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "Google credentials (id_token) is required." });
  }

  try {
    // 1. Verify credential via Google's tokeninfo API
    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const response = await fetch(tokenInfoUrl);
    
    if (!response.ok) {
      const errText = await response.text();
      console.error("[Google Auth] tokeninfo verification failed:", errText);
      return res.status(401).json({ error: "Invalid Google credential.", details: errText });
    }

    const payload: any = await response.json();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || email.split("@")[0];
    const picture = payload.picture || "";
    const aud = payload.aud; // Audience of the token

    // 2. Validate audience contains the project number 950921906220
    const projectNumber = "950921906220";
    if (!aud || !aud.includes(projectNumber)) {
      console.warn(`[Google Auth] Audience mismatch: expected client ID to contain project number ${projectNumber}, but got ${aud}`);
      return res.status(403).json({ error: "Unauthorized Google Project token." });
    }

    // 3. Upsert user in database with graceful fallback and retry logic
    let user = {
      id: 9999,
      google_id: googleId,
      email: email,
      name: name,
      picture: picture,
      role: email === "sky0wave01@gmail.com" || email === "harshit1902008@gmail.com" ? "admin" : "user",
      created_at: new Date(),
      last_login: new Date()
    };

    let dbSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // 1. Try to find the user by email first to avoid unique constraint conflict on email
        const existingUserResult = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );

        if (existingUserResult.rows.length > 0) {
          // User exists with this email, update their google_id, name, picture, and last_login
          const dbResult = await pool.query(`
            UPDATE users
            SET google_id = $1, name = $2, picture = $3, last_login = CURRENT_TIMESTAMP
            WHERE email = $4
            RETURNING *;
          `, [googleId, name, picture, email]);
          if (dbResult.rows.length > 0) {
            user = dbResult.rows[0];
          }
        } else {
          // User does not exist, insert them
          const dbResult = await pool.query(`
            INSERT INTO users (google_id, email, name, picture, last_login)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (google_id) DO UPDATE
            SET email = $2, name = $3, picture = $4, last_login = CURRENT_TIMESTAMP
            RETURNING *;
          `, [googleId, email, name, picture]);
          if (dbResult.rows.length > 0) {
            user = dbResult.rows[0];
          }
        }
        dbSuccess = true;
        console.log(`[Google Auth] User successfully authenticated via DB: ${email} (${user.role})`);
        break;
      } catch (dbErr: any) {
        console.warn(`[Google Auth DB Attempt ${attempt} Warning] DB query failed:`, dbErr.message);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!dbSuccess) {
      console.warn("[Google Auth Fallback] Database unreachable after retries. Using local user session.");
    }
    
    res.json({ success: true, user });
  } catch (error: any) {
    console.error("[Google Auth] Error in authentication pipeline:", error);
    res.status(500).json({ error: "Internal server error during authentication.", message: error.message });
  }
});

// Admin metrics endpoint
app.get("/api/admin/metrics", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  
  // Accept "mulbeery" and "mulberry" to handle spelling variations robustly
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }

  try {
    let totalRegisteredUsers = 0;
    let registeredUsers: any[] = [];
    let totalSongs = allFallbackSongs.length;
    let userListensDaily: any[] = [];
    let userListensRecent: any[] = [];

    try {
      // 1. Get total registered users count
      const registeredCountResult = await pool.query("SELECT COUNT(*) FROM users");
      totalRegisteredUsers = parseInt(registeredCountResult.rows[0].count, 10);

      // 2. Get registered users list with today's listens and total listens count joined
      const usersResult = await pool.query(`
        SELECT 
          u.id, 
          u.google_id, 
          u.email, 
          u.name, 
          u.picture, 
          u.role, 
          u.created_at, 
          u.last_login,
          COALESCE(ul_today.today_count, 0)::INT AS listens_today,
          COALESCE(ul_all.total_count, 0)::INT AS listens_total
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*)::INT AS today_count
          FROM user_listens
          WHERE listened_at >= CURRENT_DATE
          GROUP BY user_id
        ) ul_today ON u.id = ul_today.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*)::INT AS total_count
          FROM user_listens
          GROUP BY user_id
        ) ul_all ON u.id = ul_all.user_id
        ORDER BY u.last_login DESC
      `);
      registeredUsers = usersResult.rows;

      // 3. Get total cached songs count
      const songsCountResult = await pool.query("SELECT COUNT(*) FROM songs");
      totalSongs = parseInt(songsCountResult.rows[0].count, 10);

      // 4. Get 7-day daily song counts per user
      const dailyListensResult = await pool.query(`
        SELECT 
          username,
          TO_CHAR(listened_at, 'YYYY-MM-DD') AS date,
          COUNT(*)::INT AS count
        FROM user_listens
        WHERE listened_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY username, TO_CHAR(listened_at, 'YYYY-MM-DD')
        ORDER BY username, date DESC
      `);
      userListensDaily = dailyListensResult.rows;

      // 5. Get 7-day recent songs listened to per user
      const recentListensResult = await pool.query(`
        SELECT 
          username,
          song_title,
          artist,
          TO_CHAR(listened_at, 'YYYY-MM-DD HH24:MI:SS') AS timestamp
        FROM user_listens
        WHERE listened_at >= CURRENT_DATE - INTERVAL '6 days'
        ORDER BY listened_at DESC
        LIMIT 100
      `);
      userListensRecent = recentListensResult.rows;
    } catch (dbErr: any) {
      console.warn("[Admin Metrics DB Warning] Using offline metrics fallback. Error:", dbErr.message);
      registeredUsers = [
        {
          id: 9999,
          google_id: "mock_google_id",
          email: "sky0wave01@gmail.com",
          name: "Mock Admin User (DB Offline)",
          picture: "",
          role: "admin",
          created_at: new Date(),
          last_login: new Date(),
          listens_today: 13,
          listens_total: 154
        }
      ];
      totalRegisteredUsers = registeredUsers.length;
      userListensDaily = [
        { username: "Aria Vance", date: new Date().toISOString().split('T')[0], count: 8 },
        { username: "Julian Thorne", date: new Date().toISOString().split('T')[0], count: 5 }
      ];
      userListensRecent = [
        { username: "Aria Vance", song_title: "Kesariya", artist: "Arijit Singh", timestamp: new Date().toISOString().replace('T', ' ').split('.')[0] },
        { username: "Julian Thorne", song_title: "Midnight City", artist: "M83", timestamp: new Date().toISOString().replace('T', ' ').split('.')[0] }
      ];
    }

    // 6. Get active online users from ACTIVE_PLAYBACKS Map
    const activeUsers = Array.from(ACTIVE_PLAYBACKS.values());
    const activeUsersCount = activeUsers.length;

    res.json({
      success: true,
      totalRegisteredUsers,
      registeredUsers,
      totalSongs,
      activeUsersCount,
      activeUsers,
      userListensDaily,
      userListensRecent
    });
  } catch (error: any) {
    console.error("[Admin Metrics] General error retrieving metrics:", error);
    res.status(500).json({ error: "Internal server error retrieving metrics.", message: error.message });
  }
});

// Admin update user role endpoint
app.post("/api/admin/users/role", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }

  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: "userId and role are required." });
  }

  const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
  if (isNaN(numericUserId)) {
    return res.status(400).json({ error: "userId must be a valid number." });
  }

    try {
      const dbResult = await pool.query(
        "UPDATE users SET role = $2 WHERE id = $1 RETURNING *",
        [numericUserId, role]
      );

      if (dbResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found." });
      }

      res.json({ success: true, user: dbResult.rows[0] });
    } catch (error: any) {
      console.error("[Admin Users] Error updating role:", error);
      if (numericUserId === 9999 || String(numericUserId) === "9999") {
        return res.json({ success: true, user: { id: 9999, email: "sky0wave01@gmail.com", name: "Mock Admin User (DB Offline)", role } });
      }
      res.status(500).json({ error: "Internal server error updating role.", message: error.message });
    }
});

// Admin delete user endpoint
app.post("/api/admin/users/delete", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
  if (isNaN(numericUserId)) {
    return res.status(400).json({ error: "userId must be a valid number." });
  }

    try {
      const dbResult = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING *",
        [numericUserId]
      );

      if (dbResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found." });
      }

      res.json({ success: true, message: "User deleted successfully.", user: dbResult.rows[0] });
    } catch (error: any) {
      console.error("[Admin Users] Error deleting user:", error);
      if (numericUserId === 9999 || String(numericUserId) === "9999") {
        return res.json({ success: true, message: "Mock user deleted successfully (DB Offline)." });
      }
      res.status(500).json({ error: "Internal server error deleting user.", message: error.message });
    }
});

// Admin list cached songs
app.get("/api/admin/songs", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }

  const { query, limit = 50, offset = 0 } = req.query;
  const limitNum = parseInt(limit as string, 10) || 50;
  const offsetNum = parseInt(offset as string, 10) || 0;

  try {
    let dbResult;
    let totalCount = 0;
    if (query && String(query).trim()) {
      const q = `%${String(query).trim()}%`;
      dbResult = await pool.query(
        "SELECT * FROM songs WHERE title ILIKE $1 OR artist ILIKE $1 ORDER BY id DESC LIMIT $2 OFFSET $3",
        [q, limitNum, offsetNum]
      );
      const countRes = await pool.query(
        "SELECT COUNT(*) FROM songs WHERE title ILIKE $1 OR artist ILIKE $1",
        [q]
      );
      totalCount = parseInt(countRes.rows[0].count, 10);
    } else {
      dbResult = await pool.query("SELECT * FROM songs ORDER BY id DESC LIMIT $1 OFFSET $2", [limitNum, offsetNum]);
      const countRes = await pool.query("SELECT COUNT(*) FROM songs");
      totalCount = parseInt(countRes.rows[0].count, 10);
    }

    res.json({ success: true, songs: dbResult.rows, totalCount });
  } catch (error: any) {
    console.error("[Admin Songs] Error fetching songs:", error);
    res.status(500).json({ error: "Failed to fetch songs.", message: error.message });
  }
});

// Admin delete cached song
app.delete("/api/admin/songs/:videoId", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }

  const { videoId } = req.params;
  try {
    const dbResult = await pool.query("DELETE FROM songs WHERE video_id = $1 RETURNING *", [videoId]);
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: "Song not found in database." });
    }
    res.json({ success: true, message: "Song successfully deleted from database.", song: dbResult.rows[0] });
  } catch (error: any) {
    console.error("[Admin Songs] Error deleting song:", error);
    res.status(500).json({ error: "Failed to delete song.", message: error.message });
  }
});

// Admin list search cache
app.get("/api/admin/search-cache", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }

  try {
    const dbResult = await pool.query("SELECT * FROM search_cache ORDER BY created_at DESC LIMIT 100");
    res.json({ success: true, cache: dbResult.rows });
  } catch (error: any) {
    console.error("[Admin Cache] Error fetching search cache:", error);
    res.status(500).json({ error: "Failed to fetch search cache.", message: error.message });
  }
});

// Admin delete single search cache item
app.delete("/api/admin/search-cache/:id", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }

  const { id } = req.params;
  try {
    const dbResult = await pool.query("DELETE FROM search_cache WHERE id = $1 RETURNING *", [id]);
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: "Cache item not found." });
    }
    res.json({ success: true, message: "Search cache item deleted.", item: dbResult.rows[0] });
  } catch (error: any) {
    console.error("[Admin Cache] Error deleting search cache item:", error);
    res.status(500).json({ error: "Failed to delete cache item.", message: error.message });
  }
});

// Admin clear all search cache
app.delete("/api/admin/search-cache", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }

  try {
    await pool.query("DELETE FROM search_cache");
    res.json({ success: true, message: "Search cache successfully cleared." });
  } catch (error: any) {
    console.error("[Admin Cache] Error clearing search cache:", error);
    res.status(500).json({ error: "Failed to clear search cache.", message: error.message });
  }
});

// ── USER FAVORITES (LIKED SONGS) ──
app.get("/api/user/likes", async (req, res) => {
  const userId = parseInt(req.query.userId as string, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const { rows } = await pool.query(
      "SELECT song_video_id FROM user_liked_songs WHERE user_id = $1 ORDER BY liked_at DESC",
      [userId]
    );
    res.json(rows.map(r => r.song_video_id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user/likes", async (req, res) => {
  const { userId, videoId } = req.body;
  if (!userId || !videoId) return res.status(400).json({ error: "Missing fields" });
  try {
    const cleanVideoId = videoId.replace(/^(yt_)+/, "");
    await pool.query(
      "INSERT INTO user_liked_songs (user_id, song_video_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [parseInt(userId, 10), cleanVideoId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/user/likes", async (req, res) => {
  const userId = parseInt(req.query.userId as string, 10);
  const { videoId } = req.query;
  if (isNaN(userId) || !videoId) return res.status(400).json({ error: "Missing fields" });
  try {
    const cleanVideoId = (videoId as string).replace(/^(yt_)+/, "");
    await pool.query(
      "DELETE FROM user_liked_songs WHERE user_id = $1 AND song_video_id = $2",
      [userId, cleanVideoId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── USER LISTEN HISTORY (RECENTLY PLAYED) ──
app.get("/api/user/history", async (req, res) => {
  const userId = parseInt(req.query.userId as string, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const { rows } = await pool.query(
      "SELECT song_id, song_title, artist, listened_at FROM user_listens WHERE user_id = $1 ORDER BY listened_at DESC LIMIT 50",
      [userId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user/history", async (req, res) => {
  const { userId, songVideoId, title, artist } = req.body;
  if (!userId || !songVideoId || !title || !artist) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const cleanSongId = songVideoId.replace(/^(yt_)+/, "");
    // Retrieve username if available
    const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [parseInt(userId, 10)]);
    const username = userRes.rows[0]?.name || "Google User";

    await pool.query(
      `INSERT INTO user_listens (user_id, username, song_id, song_title, artist, listened_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [parseInt(userId, 10), username, cleanSongId, title, artist]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error("[History Tracker] Error saving history:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── USER SEARCH HISTORY ──
app.get("/api/user/search-history", async (req, res) => {
  const userId = parseInt(req.query.userId as string, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const { rows } = await pool.query(
      "SELECT id, query, searched_at FROM user_search_history WHERE user_id = $1 ORDER BY searched_at DESC LIMIT 20",
      [userId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user/search-history", async (req, res) => {
  const { userId, query } = req.body;
  if (!userId || !query) return res.status(400).json({ error: "Missing fields" });
  try {
    await pool.query(
      "INSERT INTO user_search_history (user_id, query) VALUES ($1, $2)",
      [parseInt(userId, 10), query.trim()]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/user/search-history", async (req, res) => {
  const userId = parseInt(req.query.userId as string, 10);
  const id = req.query.id ? parseInt(req.query.id as string, 10) : null;
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    if (id) {
      await pool.query("DELETE FROM user_search_history WHERE user_id = $1 AND id = $2", [userId, id]);
    } else {
      await pool.query("DELETE FROM user_search_history WHERE user_id = $1", [userId]);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── USER PLAYLISTS ──
app.get("/api/user/playlists", async (req, res) => {
  const userId = parseInt(req.query.userId as string, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const { rows } = await pool.query(
      `SELECT p.id::text, p.name, p.description, p.cover_url, p.user_id::text AS user_id,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', 'yt_' || s.video_id,
                    'videoId', s.video_id,
                    'title', s.title,
                    'artist', s.artist,
                    'duration', s.duration,
                    'durationSeconds', s.duration_seconds,
                    'coverUrl', s.cover_url,
                    'album', 'Library Cache',
                    'genre', COALESCE(s.language, 'unknown'),
                    'mood', 'Premium'
                  )
                ) FILTER (WHERE s.video_id IS NOT NULL), '[]'
              ) AS songs
       FROM user_playlists p
       LEFT JOIN user_playlist_songs ups ON ups.playlist_id = p.id
       LEFT JOIN songs s ON s.video_id = ups.song_video_id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.id DESC`,
      [userId]
    );
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || "Dynamic high-fidelity music collection.",
      isCustom: true,
      user_id: r.user_id,
      songs: r.songs,
      coverUrl: r.cover_url || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300"
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user/playlists/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid playlist ID" });
  try {
    const playlistRes = await pool.query("SELECT * FROM user_playlists WHERE id = $1", [id]);
    if (playlistRes.rows.length === 0) return res.status(404).json({ error: "Playlist not found" });
    const songsRes = await pool.query("SELECT song_video_id FROM user_playlist_songs WHERE playlist_id = $1 ORDER BY added_at ASC", [id]);
    res.json({
      playlist: playlistRes.rows[0],
      songVideoIds: songsRes.rows.map(r => r.song_video_id)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/playlists/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid playlist ID" });
  try {
    const { rows } = await pool.query(
      `SELECT p.id::text, p.name, p.description, p.cover_url, p.user_id::text AS user_id,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', 'yt_' || s.video_id,
                    'videoId', s.video_id,
                    'title', s.title,
                    'artist', s.artist,
                    'duration', s.duration,
                    'durationSeconds', s.duration_seconds,
                    'coverUrl', s.cover_url,
                    'album', 'Library Cache',
                    'genre', COALESCE(s.language, 'unknown'),
                    'mood', 'Premium'
                  )
                ) FILTER (WHERE s.video_id IS NOT NULL), '[]'
              ) AS songs
       FROM user_playlists p
       LEFT JOIN user_playlist_songs ups ON ups.playlist_id = p.id
       LEFT JOIN songs s ON s.video_id = ups.song_video_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Playlist not found" });
    const r = rows[0];
    res.json({
      id: r.id,
      name: r.name,
      description: r.description || "Dynamic high-fidelity music collection.",
      isCustom: true,
      user_id: r.user_id,
      songs: r.songs,
      coverUrl: r.cover_url || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user/playlists", async (req, res) => {
  const { userId, name, description, coverUrl } = req.body;
  if (!userId || !name) return res.status(400).json({ error: "Missing fields" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO user_playlists (user_id, name, description, cover_url) VALUES ($1, $2, $3, $4) RETURNING *",
      [parseInt(userId, 10), name, description || null, coverUrl || null]
    );
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/user/playlists/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid playlist ID" });
  const userIdStr = req.query.userId as string;
  try {
    if (userIdStr) {
      const userId = parseInt(userIdStr, 10);
      if (!isNaN(userId)) {
        await pool.query("DELETE FROM user_playlists WHERE id = $1 AND user_id = $2", [id, userId]);
        return res.json({ success: true });
      }
    }
    await pool.query("DELETE FROM user_playlists WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user/playlists/songs", async (req, res) => {
  const { playlistId, songVideoId, title, artist, coverUrl, duration, durationSeconds } = req.body;
  if (!playlistId || !songVideoId) return res.status(400).json({ error: "Missing fields" });
  try {
    const cleanSongId = songVideoId.replace(/^(yt_)+/, "");
    // Cache the song details if provided
    if (title) {
      await cacheToDb([{
        videoId: cleanSongId,
        title,
        artist: artist || "Unknown Artist",
        coverUrl: coverUrl || `https://img.youtube.com/vi/${cleanSongId}/hqdefault.jpg`,
        duration: duration || "03:00",
        durationSeconds: durationSeconds || 180
      }]);
    }
    await pool.query(
      "INSERT INTO user_playlist_songs (playlist_id, song_video_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [parseInt(playlistId, 10), cleanSongId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/user/playlists/songs", async (req, res) => {
  const playlistId = parseInt(req.query.playlistId as string, 10);
  const songVideoId = req.query.songVideoId as string;
  if (isNaN(playlistId) || !songVideoId) return res.status(400).json({ error: "Missing fields" });
  try {
    const cleanSongId = songVideoId.replace(/^(yt_)+/, "");
    await pool.query(
      "DELETE FROM user_playlist_songs WHERE playlist_id = $1 AND song_video_id = $2",
      [playlistId, cleanSongId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Serve Vite or static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Custom so we can route /admin and / independently
    });
    app.use(vite.middlewares);

    // Serve HTML files dynamically in development using Vite transformations
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      // Skip API requests
      if (url.startsWith("/api") || url.includes(".")) {
        return next();
      }
      try {
        let template, html;
        if (url.startsWith("/admin")) {
          template = fs.readFileSync(path.resolve(process.cwd(), "admin.html"), "utf-8");
          html = await vite.transformIndexHtml(url, template);
        } else {
          template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
          html = await vite.transformIndexHtml(url, template);
        }
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Cache assets aggressively but prevent HTML caching to ensure users fetch the latest built CSS/JS index reference hashes
    app.use(express.static(distPath, {
      maxAge: '1y',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('/admin*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'admin.html'));
    });
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
