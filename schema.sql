-- Database Schema for Mulberry Sound
-- Run: docker exec -i mulberry-postgres psql -U mulberry -d mulberry_sound < schema.sql

-- Enable pg_trgm extension for fast search (fuzzy matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(20) UNIQUE NOT NULL,      -- YouTube Video ID
    title VARCHAR(500) NOT NULL,
    artist VARCHAR(300) NOT NULL,
    duration VARCHAR(20) NOT NULL,             -- format "MM:SS"
    duration_seconds INT NOT NULL DEFAULT 0,
    cover_url VARCHAR(500),                    -- Thumbnail URL
    language VARCHAR(20) DEFAULT 'unknown'     -- 'hindi' | 'english' | 'unknown'
);

-- Trigram index for fuzzy searches (very fast on title & artist)
CREATE INDEX IF NOT EXISTS idx_songs_title_trgm ON songs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_artist_trgm ON songs USING gin (artist gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_video_id ON songs (video_id);

-- Users table for authentication and admin metrics
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture VARCHAR(500),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

