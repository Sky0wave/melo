// server.ts
import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import pg from "pg";
import * as cheerio from "cheerio";
dotenv.config();
var pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3e3,
  idleTimeoutMillis: 5e3
});
pool.on("error", (err) => {
  console.error("Unexpected database error on idle client:", err);
});
var app = express();
var PORT = 3e3;
app.use(express.json());
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nAllow: /\n");
});
var ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }
} catch (e) {
  console.error("Gemini SDK initialization failed:", e);
}
async function generateContentWithRetry(aiClient, options, retries = 3, delayMs = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await aiClient.models.generateContent(options);
    } catch (error) {
      const isTransient = error.status === 503 || error.status === 429 || error.message && (error.message.includes("503") || error.message.includes("429") || error.message.includes("high demand") || error.message.includes("Quota exceeded") || error.message.includes("UNAVAILABLE"));
      if (isTransient && attempt < retries) {
        console.warn(`[Gemini API] Transient error (status: ${error.status || "unknown"}, attempt ${attempt}/${retries}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }
      throw error;
    }
  }
}
var PRESET_SONGS = [
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
  }
];
var ACTIVE_PLAYBACKS = /* @__PURE__ */ new Map();
var sseClients = [];
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
function broadcastUpdate(type, data) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach((client) => {
    client.res.write(`data: ${payload}

`);
  });
}
app.get("/api/tracks", async (req, res) => {
  try {
    const dbResults = await pool.query("SELECT * FROM songs ORDER BY id DESC LIMIT 100");
    if (dbResults.rows.length > 0) {
      const songs = dbResults.rows.map((row) => ({
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
  res.json(PRESET_SONGS);
});
app.post("/api/sync/update", (req, res) => {
  const { username, currentSongId, isPlaying, progress, songTitle, songArtist, songCoverUrl } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  if (currentSongId && currentSongId.startsWith("yt_") && songTitle) {
    const videoId = currentSongId.replace("yt_", "");
    const titleLower = (songTitle + " " + (songArtist || "")).toLowerCase();
    const hindiKeywords = [
      "tum",
      "hi",
      "ho",
      "kesariya",
      "dil",
      "pyar",
      "aashiqui",
      "singh",
      "dosanjh",
      "pasoori",
      "goli",
      "ki",
      "raasleela",
      "ram-leela",
      "shreya",
      "ghoshal",
      "nehha",
      "kakkar",
      "arijit",
      "jubin",
      "nautiyal",
      "sonu",
      "nigam",
      "lata",
      "mangeshkar",
      "kishore",
      "kumar",
      "atif",
      "aslam",
      "tere",
      "bin",
      "rabba",
      "jeena",
      "sanam",
      "sufi",
      "bollywood",
      "t-series",
      "zee music",
      "tips",
      "lemonade"
    ];
    let lang = "english";
    if (/[^\x00-\x7F]/.test(songTitle) || hindiKeywords.some((kw) => titleLower.includes(kw))) {
      lang = "hindi";
    }
    pool.query(`
      INSERT INTO songs (video_id, title, artist, duration, duration_seconds, cover_url, language)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (video_id) DO NOTHING
    `, [videoId, songTitle, songArtist || "YouTube Artist", "03:00", 180, songCoverUrl || "", lang]).then(() => console.log(`[DB Auto-Cache] Cached played song: "${songTitle}"`)).catch((err) => console.error("Failed to auto-cache played song:", err));
  }
  const updatedState = {
    username,
    currentSongId,
    isPlaying,
    progress,
    songTitle,
    songArtist,
    songCoverUrl,
    lastUpdated: Date.now()
  };
  ACTIVE_PLAYBACKS.set(username, updatedState);
  broadcastUpdate("PLAYBACK_CHANGE", updatedState);
  res.json({ success: true, state: updatedState });
});
app.get("/api/sync/users", (req, res) => {
  res.json(Array.from(ACTIVE_PLAYBACKS.values()));
});
app.get("/api/sync/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const client = { id: Date.now(), res };
  sseClients.push(client);
  res.write(`data: ${JSON.stringify({ type: "INITIAL_USERS", data: Array.from(ACTIVE_PLAYBACKS.values()) })}

`);
  req.on("close", () => {
    sseClients = sseClients.filter((c) => c.id !== client.id);
  });
});
app.post("/api/search", async (req, res) => {
  const { query, mood, artist, genre } = req.body;
  const filterText = [
    query && `Search Query: "${query}"`,
    mood && `Mood: "${mood}"`,
    artist && `Artist: "${artist}"`,
    genre && `Genre: "${genre}"`
  ].filter(Boolean).join(", ");
  if (!filterText) {
    return res.json(PRESET_SONGS);
  }
  const lowercaseQuery = (query || "").toLowerCase();
  const lowercaseMood = (mood || "").toLowerCase();
  const lowercaseArtist = (artist || "").toLowerCase();
  const lowercaseGenre = (genre || "").toLowerCase();
  const matchedPresets = PRESET_SONGS.filter((song) => {
    return lowercaseQuery && (song.title.toLowerCase().includes(lowercaseQuery) || song.artist.toLowerCase().includes(lowercaseQuery) || song.album.toLowerCase().includes(lowercaseQuery)) || lowercaseMood && song.mood.toLowerCase().includes(lowercaseMood) || lowercaseArtist && song.artist.toLowerCase().includes(lowercaseArtist) || lowercaseGenre && song.genre.toLowerCase().includes(lowercaseGenre);
  });
  if (!ai) {
    console.log("No Gemini API Key found. Returning local matches/presets.");
    return res.json(matchedPresets.length > 0 ? matchedPresets : PRESET_SONGS);
  }
  try {
    const prompt = `You are the backend metadata model for Mulberry Sound. 
Given these search filters: ${filterText}.
Create a list of exactly 6 real, actual songs that match the criteria perfectly. Ensure you include:
- Realistic title, artist, and album.
- Actual lyrics (extract or produce high-fidelity full lyrics of at least 8 lines).
- Precise duration in "MM:SS" format and the equivalent durationSeconds.
- Realistic description of the song's specific mood under our "Deep Mulberry" design parameters.
- High-quality cover art: choose an elegant design link or specify a custom high-gloss asset representation. Since we use beautiful curated abstract URLs, generate realistic simulated covers or select matching ones (or fallback color themes).

You must respond ONLY with a clean JSON array of song objects. DO NOT wrap with markdown code blocks except possibly json tags.

JSON Schema format:
[
  {
    "id": "unique-slug-id",
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "duration": "04:12",
    "durationSeconds": 252,
    "genre": "Genre Name",
    "mood": "Mood keywords matching Mulberry Sound Luxury theme",
    "lyrics": "Full stylized lyrics...",
    "coverUrl": "https://images.unsplash.com/photo-... (use elegant abstract music or texture photography)"
  }
]`;
    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
      }
    });
    const parsedResults = JSON.parse(response.text || "[]");
    const combinedResults = [...matchedPresets, ...parsedResults];
    const uniqueIds = /* @__PURE__ */ new Set();
    const finishedList = combinedResults.filter((item) => {
      if (uniqueIds.has(item.id)) return false;
      uniqueIds.add(item.id);
      return true;
    });
    res.json(finishedList.length > 0 ? finishedList : PRESET_SONGS);
  } catch (error) {
    console.error("Gemini song search extraction failed:", error);
    res.json(matchedPresets.length > 0 ? matchedPresets : PRESET_SONGS);
  }
});
async function fetchGeniusLyrics(title, artist) {
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
  } catch (err) {
    console.error("[Genius Scraper] Error fetching lyrics:", err.message);
  }
  return "";
}
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
    console.log(`[Lyrics Request] Fetching Genius lyrics for "${title}" by "${artist || "Unknown"}"`);
    rawGeniusLyrics = await fetchGeniusLyrics(title, artist);
    let prompt = "";
    if (rawGeniusLyrics && rawGeniusLyrics.length > 50) {
      console.log(`[Lyrics Request] Found official Genius lyrics (${rawGeniusLyrics.length} chars). Aligning with timestamps...`);
      prompt = `Here are the official lyrics of the song "${title}" by "${artist || "Unknown Artist"}":
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
      prompt = `You are a lyrics database. Provide the full lyrics with estimated timestamps for the song "${title}" by "${artist || "Unknown Artist"}".
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
      contents: prompt
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
var YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
var ytSearchCache = /* @__PURE__ */ new Map();
var YT_CACHE_TTL = 60 * 60 * 1e3;
function getCachedResult(key) {
  const entry = ytSearchCache.get(key);
  if (entry && Date.now() - entry.timestamp < YT_CACHE_TTL) {
    return entry.data;
  }
  if (entry) ytSearchCache.delete(key);
  return null;
}
function setCachedResult(key, data) {
  ytSearchCache.set(key, { data, timestamp: Date.now() });
}
async function getSpellingCorrection(query) {
  if (!ai || !query || query.trim().length < 3) return "";
  const prompt = `You are a spelling correction engine for a music search engine. Check the following query for obvious typos: "${query}".
If there are typos, spelling mistakes, or grammatical errors, return the corrected version of the query (e.g. correct song title, artist, or term).
If the query is already correct, or you are unsure, return the exact original query.

Rules:
- Return ONLY the corrected or original string, nothing else
- Do NOT wrap in quotes, markdown, or explain anything
- Do NOT add punctuation unless it is part of the corrected term`;
  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash-lite",
      contents: prompt
    });
    const result = (response.text || "").trim();
    if (result.toLowerCase() !== query.toLowerCase()) {
      return result;
    }
  } catch (err) {
    console.error("Spelling correction failed:", err);
  }
  return "";
}
app.post("/api/db/search", async (req, res) => {
  const { query, limit = 100, language } = req.body;
  if (!query || !query.trim()) {
    return res.json({ results: [], didYouMean: "" });
  }
  try {
    const cleanQuery = query.trim();
    const ilikeQuery = `%${cleanQuery}%`;
    let sql = `
      SELECT *, 
             (similarity(title, $1) + similarity(artist, $1)) as rel
      FROM songs
      WHERE (title ILIKE $2 OR artist ILIKE $2 OR title % $1 OR artist % $1)
    `;
    const params = [cleanQuery, ilikeQuery];
    if (language) {
      sql += ` AND language = $3`;
      params.push(language.toLowerCase());
    }
    sql += ` ORDER BY rel DESC, title ASC LIMIT $${params.length + 1}`;
    params.push(limit);
    const [dbResults, didYouMean] = await Promise.all([
      pool.query(sql, params),
      getSpellingCorrection(cleanQuery)
    ]);
    const songs = dbResults.rows.map((row) => ({
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
    console.log(`[DB Search] "${cleanQuery}" \u2192 ${songs.length} results. Spelling suggestion: "${didYouMean}"`);
    res.json({ results: songs, didYouMean });
  } catch (error) {
    console.error("Local DB search query failed, falling back to presets:", error);
    const lowercaseQuery = (query || "").toLowerCase();
    const matchedPresets = PRESET_SONGS.filter((song) => {
      return song.title.toLowerCase().includes(lowercaseQuery) || song.artist.toLowerCase().includes(lowercaseQuery) || song.album.toLowerCase().includes(lowercaseQuery);
    });
    res.json({ results: matchedPresets, didYouMean: "" });
  }
});
app.post("/api/youtube/search", async (req, res) => {
  const { query, maxResults = 50 } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Search query is required" });
  }
  if (!YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY is not configured in .env");
    return res.status(500).json({ error: "YouTube API key not configured" });
  }
  const cacheKey = `yt_search:${query.trim().toLowerCase()}:${maxResults}`;
  const cached = getCachedResult(cacheKey);
  if (cached) {
    console.log(`[YouTube Cache HIT] "${query}"`);
    if (Array.isArray(cached)) {
      return res.json({ results: cached, didYouMean: "" });
    }
    return res.json(cached);
  }
  const didYouMeanPromise = getSpellingCorrection(query.trim());
  try {
    const cleanQuery = query.trim();
    const ilikeQuery = `%${cleanQuery}%`;
    const dbResults = await pool.query(`
      SELECT *, 
             similarity(title, $1) as title_sim,
             similarity(artist, $1) as artist_sim,
             (similarity(title, $1) + similarity(artist, $1)) as rel
      FROM songs
      WHERE (title ILIKE $2 OR artist ILIKE $2 OR title % $1 OR artist % $1)
      ORDER BY rel DESC, title ASC LIMIT $3
    `, [cleanQuery, ilikeQuery, maxResults]);
    const hasStrongMatch = dbResults.rows.some((row) => {
      const titleSim = parseFloat(row.title_sim || "0");
      const artistSim = parseFloat(row.artist_sim || "0");
      const queryLower = cleanQuery.toLowerCase();
      const isWordMatch = row.title.toLowerCase().includes(queryLower) || row.artist.toLowerCase().includes(queryLower);
      return titleSim > 0.3 || artistSim > 0.3 || isWordMatch && queryLower.length > 2;
    });
    if (hasStrongMatch && dbResults.rows.length > 0) {
      console.log(`[Cache-First DB HIT] Serving "${cleanQuery}" from PostgreSQL (Strong Match found, skipping YouTube)`);
      const songs = dbResults.rows.map((row) => ({
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
      const didYouMean = await didYouMeanPromise;
      const responseObj = { results: songs, didYouMean };
      setCachedResult(cacheKey, responseObj);
      return res.json(responseObj);
    }
  } catch (dbErr) {
    console.error("Cache-first database lookup failed, falling back to YouTube:", dbErr);
  }
  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("videoCategoryId", "10");
    searchUrl.searchParams.set("maxResults", String(maxResults));
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
    const ytResponse = await fetch(searchUrl.toString());
    if (!ytResponse.ok) {
      const errorBody = await ytResponse.text();
      console.error("YouTube API error:", ytResponse.status, errorBody);
      return res.status(ytResponse.status).json({ error: "YouTube API request failed", details: errorBody });
    }
    const ytData = await ytResponse.json();
    const videoIds = (ytData.items || []).map((item) => item.id?.videoId).filter(Boolean);
    let durationsMap = {};
    if (videoIds.length > 0) {
      try {
        const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
        detailsUrl.searchParams.set("part", "contentDetails");
        detailsUrl.searchParams.set("id", videoIds.join(","));
        detailsUrl.searchParams.set("key", YOUTUBE_API_KEY);
        const detailsResponse = await fetch(detailsUrl.toString());
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          for (const item of detailsData.items || []) {
            const iso = item.contentDetails?.duration || "PT0S";
            const secs = parseISO8601Duration(iso);
            durationsMap[item.id] = {
              duration: formatDuration(secs),
              durationSeconds: secs
            };
          }
        }
      } catch (dErr) {
        console.warn("Failed to fetch video durations:", dErr);
      }
    }
    const songs = (ytData.items || []).map((item) => {
      const videoId = item.id?.videoId || "";
      const snippet = item.snippet || {};
      const dur = durationsMap[videoId] || { duration: "\u2014", durationSeconds: 300 };
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
    if (songs.length > 0) {
      try {
        const values = [];
        const placeholders = [];
        songs.forEach((song, idx) => {
          const base = idx * 7;
          placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);
          const titleLower = (song.title + " " + song.artist).toLowerCase();
          const hindiKeywords = [
            "tum",
            "hi",
            "ho",
            "kesariya",
            "dil",
            "pyar",
            "aashiqui",
            "singh",
            "dosanjh",
            "pasoori",
            "goli",
            "ki",
            "raasleela",
            "ram-leela",
            "shreya",
            "ghoshal",
            "nehha",
            "kakkar",
            "arijit",
            "jubin",
            "nautiyal",
            "sonu",
            "nigam",
            "lata",
            "mangeshkar",
            "kishore",
            "kumar",
            "atif",
            "aslam",
            "tere",
            "bin",
            "rabba",
            "jeena",
            "sanam",
            "sufi",
            "bollywood",
            "t-series",
            "zee music",
            "tips",
            "lemonade"
          ];
          let lang = "english";
          if (/[^\x00-\x7F]/.test(song.title) || hindiKeywords.some((kw) => titleLower.includes(kw))) {
            lang = "hindi";
          }
          values.push(
            song.videoId,
            song.title,
            song.artist,
            song.duration || "03:00",
            song.durationSeconds || 180,
            song.coverUrl || "",
            lang
          );
        });
        await pool.query(`
          INSERT INTO songs (video_id, title, artist, duration, duration_seconds, cover_url, language)
          VALUES ${placeholders.join(", ")}
          ON CONFLICT (video_id) DO NOTHING
        `, values);
        console.log(`[DB Auto-Cache] Cached ${songs.length} search results from YouTube API to PostgreSQL`);
      } catch (dbErr) {
        console.error("Failed to automatically cache YouTube search results to DB:", dbErr);
      }
    }
    const didYouMean = await didYouMeanPromise;
    const responseObj = { results: songs, didYouMean };
    setCachedResult(cacheKey, responseObj);
    console.log(`[YouTube Search] "${query}" \u2192 ${songs.length} results. Spelling suggestion: "${didYouMean}"`);
    res.json(responseObj);
  } catch (error) {
    console.error("YouTube search proxy failed:", error);
    res.status(500).json({ error: "YouTube search failed" });
  }
});
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
function parseISO8601Duration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}
function formatDuration(secs) {
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor(secs % 3600 / 60);
  const s = secs % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function decodeHTMLEntities(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}
app.post("/api/generate-daily-playlist", async (req, res) => {
  const { history } = req.body;
  const historyDescription = Array.isArray(history) && history.length > 0 ? history.map((item) => `Song: "${item.songTitle}" by "${item.artist}" (Played ${item.count} times)`).join(", ") : "No previous habits; user prefers atmospheric experimental jazz, dark techno, and deep warm spaces.";
  if (!ai) {
    console.log("No Gemini API configuration. Generating default personalized recommendations.");
    return res.json({
      name: "Mulberry Daily Mix",
      description: "A dark tailored cocktail of deep ambient and midnight grooves.",
      songs: PRESET_SONGS.slice(0, 4)
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
      songs: PRESET_SONGS.slice(0, 5)
    });
  }
});
app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "Google credentials (id_token) is required." });
  }
  try {
    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const response = await fetch(tokenInfoUrl);
    if (!response.ok) {
      const errText = await response.text();
      console.error("[Google Auth] tokeninfo verification failed:", errText);
      return res.status(401).json({ error: "Invalid Google credential.", details: errText });
    }
    const payload = await response.json();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || email.split("@")[0];
    const picture = payload.picture || "";
    const aud = payload.aud;
    const projectNumber = "950921906220";
    if (!aud || !aud.includes(projectNumber)) {
      console.warn(`[Google Auth] Audience mismatch: expected client ID to contain project number ${projectNumber}, but got ${aud}`);
      return res.status(403).json({ error: "Unauthorized Google Project token." });
    }
    let user = {
      id: 9999,
      google_id: googleId,
      email,
      name,
      picture,
      role: email === "sky0wave01@gmail.com" || email === "harshit1902008@gmail.com" ? "admin" : "user",
      created_at: /* @__PURE__ */ new Date(),
      last_login: /* @__PURE__ */ new Date()
    };
    try {
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
      console.log(`[Google Auth] User successfully authenticated via DB: ${email} (${user.role})`);
    } catch (dbErr) {
      console.warn(`[Google Auth DB Warning] Database unreachable. Using local user session. Error: ${dbErr.message}`);
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("[Google Auth] Error in authentication pipeline:", error);
    res.status(500).json({ error: "Internal server error during authentication.", message: error.message });
  }
});
app.get("/api/admin/metrics", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }
  try {
    let totalRegisteredUsers = 0;
    let registeredUsers = [];
    let totalSongs = PRESET_SONGS.length;
    try {
      const registeredCountResult = await pool.query("SELECT COUNT(*) FROM users");
      totalRegisteredUsers = parseInt(registeredCountResult.rows[0].count, 10);
      const usersResult = await pool.query("SELECT id, google_id, email, name, picture, role, created_at, last_login FROM users ORDER BY last_login DESC");
      registeredUsers = usersResult.rows;
      const songsCountResult = await pool.query("SELECT COUNT(*) FROM songs");
      totalSongs = parseInt(songsCountResult.rows[0].count, 10);
    } catch (dbErr) {
      console.warn("[Admin Metrics DB Warning] Using offline metrics fallback. Error:", dbErr.message);
      registeredUsers = [
        {
          id: 9999,
          google_id: "mock_google_id",
          email: "sky0wave01@gmail.com",
          name: "Mock Admin User (DB Offline)",
          picture: "",
          role: "admin",
          created_at: /* @__PURE__ */ new Date(),
          last_login: /* @__PURE__ */ new Date()
        }
      ];
      totalRegisteredUsers = registeredUsers.length;
    }
    const activeUsers = Array.from(ACTIVE_PLAYBACKS.values());
    const activeUsersCount = activeUsers.length;
    res.json({
      success: true,
      totalRegisteredUsers,
      registeredUsers,
      totalSongs,
      activeUsersCount,
      activeUsers
    });
  } catch (error) {
    console.error("[Admin Metrics] General error retrieving metrics:", error);
    res.status(500).json({ error: "Internal server error retrieving metrics.", message: error.message });
  }
});
app.post("/api/admin/users/role", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: "userId and role are required." });
  }
  try {
    const dbResult = await pool.query(
      "UPDATE users SET role = $2 WHERE id = $1 RETURNING *",
      [userId, role]
    );
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ success: true, user: dbResult.rows[0] });
  } catch (error) {
    console.error("[Admin Users] Error updating role:", error);
    if (userId === 9999 || String(userId) === "9999") {
      return res.json({ success: true, user: { id: 9999, email: "sky0wave01@gmail.com", name: "Mock Admin User (DB Offline)", role } });
    }
    res.status(500).json({ error: "Internal server error updating role.", message: error.message });
  }
});
app.post("/api/admin/users/delete", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }
  try {
    const dbResult = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [userId]
    );
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ success: true, message: "User deleted successfully.", user: dbResult.rows[0] });
  } catch (error) {
    console.error("[Admin Users] Error deleting user:", error);
    if (userId === 9999 || String(userId) === "9999") {
      return res.json({ success: true, message: "Mock user deleted successfully (DB Offline)." });
    }
    res.status(500).json({ error: "Internal server error deleting user.", message: error.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;
export {
  server_default as default
};
//# sourceMappingURL=index.js.map
