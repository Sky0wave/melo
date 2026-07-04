// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

// fallback_songs.json
var fallback_songs_default = [
  {
    video_id: "Y3D2U-0tV_E",
    title: "Tum Hi Ho",
    artist: "Arijit Singh",
    duration: "04:22",
    duration_seconds: 262,
    cover_url: "https://img.youtube.com/vi/Y3D2U-0tV_E/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "yH15sVjA2iE",
    title: "Lemonade",
    artist: "Diljit Dosanjh",
    duration: "03:12",
    duration_seconds: 192,
    cover_url: "https://img.youtube.com/vi/yH15sVjA2iE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "e-ORhEE9VVg",
    title: "Blank Space",
    artist: "Taylor Swift",
    duration: "03:51",
    duration_seconds: 231,
    cover_url: "https://img.youtube.com/vi/e-ORhEE9VVg/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "JGwWNGJdvx8",
    title: "Shape of You",
    artist: "Ed Sheeran",
    duration: "03:53",
    duration_seconds: 233,
    cover_url: "https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "BddP6PYo2gs",
    title: "Kesariya",
    artist: "Arijit Singh",
    duration: "04:28",
    duration_seconds: 268,
    cover_url: "https://img.youtube.com/vi/BddP6PYo2gs/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "4NRXx6U8ABQ",
    title: "Blinding Lights",
    artist: "The Weeknd",
    duration: "03:20",
    duration_seconds: 200,
    cover_url: "https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "H5v3kku4y6Q",
    title: "As It Was",
    artist: "Harry Styles",
    duration: "02:47",
    duration_seconds: 167,
    cover_url: "https://img.youtube.com/vi/H5v3kku4y6Q/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "5Eqb_-Sh0bc",
    title: "Pasoori",
    artist: "Ali Sethi",
    duration: "03:44",
    duration_seconds: 224,
    cover_url: "https://img.youtube.com/vi/5Eqb_-Sh0bc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "W2o_HupXq1g",
    title: "Golden Brown",
    artist: "The Stranglers - Topic",
    duration: "03:27",
    duration_seconds: 207,
    cover_url: "https://i.ytimg.com/vi/W2o_HupXq1g/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "kcsGhOmULxQ",
    title: "The Stranglers - Golden Brown (Lyrics)",
    artist: "Songs With Lyrics",
    duration: "04:13",
    duration_seconds: 253,
    cover_url: "https://i.ytimg.com/vi/kcsGhOmULxQ/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "GmxkNB-QihI",
    title: "Golden Brown - The Stranglers (slowed + reverb)",
    artist: "etherealnightcore",
    duration: "04:19",
    duration_seconds: 259,
    cover_url: "https://i.ytimg.com/vi/GmxkNB-QihI/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "O09fZHa5xv8",
    title: "Love Story x Golden Brown (Piano Cover)",
    artist: "pianopaus",
    duration: "02:23",
    duration_seconds: 143,
    cover_url: "https://i.ytimg.com/vi/O09fZHa5xv8/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "7KIHvuMl4Kk",
    title: "The Stranglers - Golden Brown",
    artist: "stranglersofficial",
    duration: "03:27",
    duration_seconds: 207,
    cover_url: "https://i.ytimg.com/vi/7KIHvuMl4Kk/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "AWAsI3U2EaE",
    title: "Golden Brown - The Stranglers",
    artist: "\u039C\u03BF\u03C5\u03C3\u03B9\u03BA\u03AD\u03C2 \u03A0\u03B5\u03C1\u03B9\u03B7\u03B3\u03AE\u03C3\u03B5\u03B9\u03C2",
    duration: "03:33",
    duration_seconds: 213,
    cover_url: "https://i.ytimg.com/vi/AWAsI3U2EaE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "BTnM71u_v2I",
    title: "Golden Brown (Slowed Down Version)",
    artist: "The Stranglers - Topic",
    duration: "04:09",
    duration_seconds: 249,
    cover_url: "https://i.ytimg.com/vi/BTnM71u_v2I/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "PHz9mLbGPo4",
    title: "The Stranglers - Golden Brown (Lyrics)",
    artist: "Cassiopeia",
    duration: "03:26",
    duration_seconds: 206,
    cover_url: "https://i.ytimg.com/vi/PHz9mLbGPo4/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "323PBWvkq3E",
    title: `"It's Soo good\u2728\u{1F525} | 4k EDIT | GOLDEN BROWN (SLOWED VERSION) #edit`,
    artist: "-\u{1D668}\u{1D661}\u{1D664}\u{1D66C}",
    duration: "00:20",
    duration_seconds: 20,
    cover_url: "https://i.ytimg.com/vi/323PBWvkq3E/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Bi-IPvMDS74",
    title: "Golden Brown (Slowed Down Version) | 8D Audio | Use Headphones \u{1F3A7}",
    artist: "8D Music's",
    duration: "04:12",
    duration_seconds: 252,
    cover_url: "https://i.ytimg.com/vi/Bi-IPvMDS74/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "s-8dO0Gkvp0",
    title: "\u{1D416}\u{1D407}\u{1D408}\u{1D413}\u{1D404} \u{1D405}\u{1D400}\u{1D40D}\u{1D413}\u{1D400}\u{1D412}\u{1D418} \u{1D406}\u{1D40E}\u{1D40B}\u{1D403}\u{1D404}\u{1D40D} \u{1D401}\u{1D411}\u{1D40E}\u{1D416}\u{1D40D} - \u{1D412}\u{1D40B}\u{1D40E}\u{1D416}\u{1D404}\u{1D403}",
    artist: "Kurisu Jan",
    duration: "02:52",
    duration_seconds: 172,
    cover_url: "https://i.ytimg.com/vi/s-8dO0Gkvp0/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "yxjNBYa3S8g",
    title: "The Stranglers - Golden Brown (slowed) (Lyrics)",
    artist: "Cassiopeia",
    duration: "04:05",
    duration_seconds: 245,
    cover_url: "https://i.ytimg.com/vi/yxjNBYa3S8g/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "o_1aF54DO60",
    title: "Lana Del Rey - Young and Beautiful",
    artist: "LanaDelReyVEVO",
    duration: "03:59",
    duration_seconds: 239,
    cover_url: "https://i.ytimg.com/vi/o_1aF54DO60/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "TdrL3QxjyVw",
    title: "Lana Del Rey - Summertime Sadness (Official Music Video)",
    artist: "LanaDelReyVEVO",
    duration: "04:26",
    duration_seconds: 266,
    cover_url: "https://i.ytimg.com/vi/TdrL3QxjyVw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "T5xcnjAG8pE",
    title: "Lana Del Rey - Brooklyn Baby (Official Audio)",
    artist: "LanaDelReyVEVO",
    duration: "05:54",
    duration_seconds: 354,
    cover_url: "https://i.ytimg.com/vi/T5xcnjAG8pE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "UMMZWMbdv2w",
    title: "Lana Del Rey - Cinnamon Girl (Lyrics)",
    artist: "7clouds",
    duration: "04:57",
    duration_seconds: 297,
    cover_url: "https://i.ytimg.com/vi/UMMZWMbdv2w/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "_MWEapW4PaE",
    title: "Lana Del Rey - Young And Beautiful (Lyrics)",
    artist: "Unique Sound",
    duration: "03:57",
    duration_seconds: 237,
    cover_url: "https://i.ytimg.com/vi/_MWEapW4PaE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "F4ELqraXx-U",
    title: "Lana Del Rey - White Mustang (Official Music Video)",
    artist: "LanaDelReyVEVO",
    duration: "04:42",
    duration_seconds: 282,
    cover_url: "https://i.ytimg.com/vi/F4ELqraXx-U/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "DCYmJDO2_IE",
    title: "Cinnamon Girl",
    artist: "Lana Del Rey - Topic",
    duration: "05:01",
    duration_seconds: 301,
    cover_url: "https://i.ytimg.com/vi/DCYmJDO2_IE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "sEetXo3R-aM",
    title: "Diet Mountain Dew",
    artist: "Lana Del Rey - Topic",
    duration: "03:43",
    duration_seconds: 223,
    cover_url: "https://i.ytimg.com/vi/sEetXo3R-aM/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "vBHild0PiTE",
    title: "Lana Del Rey - Chemtrails Over The Country Club (Official Music Video)",
    artist: "LanaDelReyVEVO",
    duration: "05:41",
    duration_seconds: 341,
    cover_url: "https://i.ytimg.com/vi/vBHild0PiTE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "zQO7J483Dng",
    title: "Lana Del Rey - Summertime Sadness (Lyrics)",
    artist: "Unique Sound",
    duration: "04:25",
    duration_seconds: 265,
    cover_url: "https://i.ytimg.com/vi/zQO7J483Dng/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "Bag1gUxuU0g",
    title: "Lana Del Rey - Born To Die",
    artist: "LanaDelReyVEVO",
    duration: "04:47",
    duration_seconds: 287,
    cover_url: "https://i.ytimg.com/vi/Bag1gUxuU0g/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "MiAoetOXKcY",
    title: "Lana Del Rey - Say Yes To Heaven (Official Audio)",
    artist: "LanaDelReyVEVO",
    duration: "03:30",
    duration_seconds: 210,
    cover_url: "https://i.ytimg.com/vi/MiAoetOXKcY/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "Vr64tTiaPUM",
    title: "Lana Del Rey \u2013 From Myth to Modern Icon",
    artist: "Music Euphoria",
    duration: "1:10:15",
    duration_seconds: 4215,
    cover_url: "https://i.ytimg.com/vi/Vr64tTiaPUM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "79c2pSvz8IE",
    title: "Lana Del Rey - Young and Beautiful (Lyrics)",
    artist: "7clouds",
    duration: "03:57",
    duration_seconds: 237,
    cover_url: "https://i.ytimg.com/vi/79c2pSvz8IE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "6ipqQlQrQH0",
    title: "Lana Del Rey - White Mustang (Lyrics)",
    artist: "Digital Mount",
    duration: "02:45",
    duration_seconds: 165,
    cover_url: "https://i.ytimg.com/vi/6ipqQlQrQH0/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "jpUsQlnbJSc",
    title: "Lana Del Rey Greatest Hits Playlist P1",
    artist: "SH Playlists",
    duration: "29:29",
    duration_seconds: 1769,
    cover_url: "https://i.ytimg.com/vi/jpUsQlnbJSc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "oKxuiw3iMBE",
    title: "Lana Del Rey - West Coast",
    artist: "LanaDelReyVEVO",
    duration: "04:26",
    duration_seconds: 266,
    cover_url: "https://i.ytimg.com/vi/oKxuiw3iMBE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "8xg3vE8Ie_E",
    title: "Taylor Swift - Love Story",
    artist: "Taylor Swift",
    duration: "03:57",
    duration_seconds: 237,
    cover_url: "https://i.ytimg.com/vi/8xg3vE8Ie_E/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "DF3XjEhJ40Y",
    title: "Indila - Love Story (Official Music Video)",
    artist: "IndilaVEVO",
    duration: "04:45",
    duration_seconds: 285,
    cover_url: "https://i.ytimg.com/vi/DF3XjEhJ40Y/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "iEjuh82I3ms",
    title: "Fairy free a Demon who was impressed for 350 thousand year\u{1F496}Fairy love story\u{1F496}fairy fell in love with.",
    artist: "Just Romance\u0926\u0947\u0916\u0928\u093E",
    duration: "06:52",
    duration_seconds: 412,
    cover_url: "https://i.ytimg.com/vi/iEjuh82I3ms/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "tRFLs_-54gE",
    title: "Taylor Swift - Love Story (Lyrics) romeo save me",
    artist: "Alternate",
    duration: "03:55",
    duration_seconds: 235,
    cover_url: "https://i.ytimg.com/vi/tRFLs_-54gE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "WikAeXGsmHY",
    title: "Indila - Love Story (Lyrics)",
    artist: "7clouds",
    duration: "05:17",
    duration_seconds: 317,
    cover_url: "https://i.ytimg.com/vi/WikAeXGsmHY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "yfWgXcrNQIw",
    title: "Taylor Swift - Love Story (Live from New York City)",
    artist: "Taylor Swift",
    duration: "04:04",
    duration_seconds: 244,
    cover_url: "https://i.ytimg.com/vi/yfWgXcrNQIw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "Zfsmj5zpZ9w",
    title: "Yaad Aa Rahi Hai (I) | Amit Kumar, Lata Mangeshkar | Love Story 1981 Songs | Kumar Gaurav",
    artist: "Goldmines Gaane Sune Ansune",
    duration: "05:56",
    duration_seconds: 356,
    cover_url: "https://i.ytimg.com/vi/Zfsmj5zpZ9w/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "y5zJ0prBgqM",
    title: "I'm Handsome Official Trailer | Emotional Love Story | Father & Son Bond | Telugu Movies 2026",
    artist: "K Music Telugu",
    duration: "02:57",
    duration_seconds: 177,
    cover_url: "https://i.ytimg.com/vi/y5zJ0prBgqM/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "ZuyZlTeJNPs",
    title: "Jane Wale Laut Kar Aaya Kyon Nahi | Heart Broken Love Story | Hindi Sad Songs | New Sad Songs 2022",
    artist: "RED GLANCE MUSIC",
    duration: "05:55",
    duration_seconds: 355,
    cover_url: "https://i.ytimg.com/vi/ZuyZlTeJNPs/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "esHZIRuIGXc",
    title: "Indila - Love Story | EASY Piano Tutorial",
    artist: "Pianotopia",
    duration: "02:23",
    duration_seconds: 143,
    cover_url: "https://i.ytimg.com/vi/esHZIRuIGXc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "yKngz_P_yRs",
    title: "Love Story 1981 | Full Video Songs Jukebox | Kumar Gaurav, Vijeyta Pandit, Rajendra Kumar",
    artist: "Goldmines Gaane Sune Ansune",
    duration: "27:41",
    duration_seconds: 1661,
    cover_url: "https://i.ytimg.com/vi/yKngz_P_yRs/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "aMfYoU9M5gQ",
    title: "indila - love story (english lyrics) aesthetic edit #indila #lovestory",
    artist: "INCO EDITZ",
    duration: "00:26",
    duration_seconds: 26,
    cover_url: "https://i.ytimg.com/vi/aMfYoU9M5gQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "_mwqXnTEHSc",
    title: "A.R. Rahman - Tere Bina | Lyrical Song | Aishwarya Rai | Abhishek Bachchan | Guru | Gulzar",
    artist: "Sony Music India",
    duration: "05:09",
    duration_seconds: 309,
    cover_url: "https://i.ytimg.com/vi/_mwqXnTEHSc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "tQHAwV9B8hQ",
    title: "World's most beautiful recitation of Surah Ar-Rahman (\u0633\u0648\u0631\u0629 \u0627\u0644\u0631\u062D\u0645\u0646)  | Zikrullah TV",
    artist: "Zikrullah TV",
    duration: "13:53",
    duration_seconds: 833,
    cover_url: "https://i.ytimg.com/vi/tQHAwV9B8hQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "IGti1RTS1wc",
    title: "Deewaana Deewaana (Full Video): Tere Ishk Mein | Dhanush, Kriti | AR Rahman | Aanand LR | Bhushan K",
    artist: "T-Series",
    duration: "05:33",
    duration_seconds: 333,
    cover_url: "https://i.ytimg.com/vi/IGti1RTS1wc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Y_dGio-KbT4",
    title: "AR Rahman 90s Hindi Hit Songs Audio Jukebox | Hindi Song | 90s Love Songs | Evergreen Bollywood Hits",
    artist: "Tips Official",
    duration: "1:27:47",
    duration_seconds: 5267,
    cover_url: "https://i.ytimg.com/vi/Y_dGio-KbT4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "en-PeicTzH8",
    title: "Top 10 A.R. Rahman Tamil Melodies \u{1F3A7}| Enna Solla Pogirai | Kaattrae En Vaasal | Nadhiyae Nadhiyae |",
    artist: "2000s Tamil Hits",
    duration: "58:04",
    duration_seconds: 3484,
    cover_url: "https://i.ytimg.com/vi/en-PeicTzH8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "9V9TAQZzBKQ",
    title: "Nahin Saamne Tu Alag Baat Hai | Aishwarya Rai | A.R Rahman | Sukhwinder Singh | Hariharan | Taal",
    artist: "90's Gaane",
    duration: "03:41",
    duration_seconds: 221,
    cover_url: "https://i.ytimg.com/vi/9V9TAQZzBKQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "pYDbGCEUN40",
    title: "Yeh Haseen Vadiyan - Lyric Video | Arvind, Madhoo | S.P. Balasubrahmanyam, K.S.Chithra | A.R. Rahman",
    artist: "Sony Music India",
    duration: "05:18",
    duration_seconds: 318,
    cover_url: "https://i.ytimg.com/vi/pYDbGCEUN40/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "KbWbK2qRe7U",
    title: "Mustafa Mustafa - A.R. Rahman Live in Chennai",
    artist: "BToS Productions",
    duration: "04:56",
    duration_seconds: 296,
    cover_url: "https://i.ytimg.com/vi/KbWbK2qRe7U/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "S1aQhVUy_9g",
    title: "A.R Rahman Maahi Ve Full Song (Audio) Highway | Alia Bhatt, Randeep Hooda | Imtiaz Ali",
    artist: "T-Series",
    duration: "04:01",
    duration_seconds: 241,
    cover_url: "https://i.ytimg.com/vi/S1aQhVUy_9g/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "9JDSGhhiOwI",
    title: "Tere Bina - Full Video | A. R. Rahman | Aishwarya Rai | Abhishek Bachchan | Guru",
    artist: "Sony Music India",
    duration: "04:49",
    duration_seconds: 289,
    cover_url: "https://i.ytimg.com/vi/9JDSGhhiOwI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "M7ebX_7ay6o",
    title: "Urvashi Urvashi - A.R. Rahman Live in Chennai",
    artist: "BToS Productions",
    duration: "05:55",
    duration_seconds: 355,
    cover_url: "https://i.ytimg.com/vi/M7ebX_7ay6o/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "5jkHfItTvnE",
    title: "AR Rahman 90s Hindi Hit Songs Audio Jukebox | Hindi Song | 90s Love Songs | Evergreen Bollywood Hits",
    artist: "Hasu Mia",
    duration: "1:27:47",
    duration_seconds: 5267,
    cover_url: "https://i.ytimg.com/vi/5jkHfItTvnE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "LMnJp_dSdnw",
    title: "DARKHAAST Full Video Song |  SHIVAAY | Arijit Singh & Sunidhi Chauhan | Ajay Devgn | T-Series",
    artist: "T-Series",
    duration: "07:12",
    duration_seconds: 432,
    cover_url: "https://i.ytimg.com/vi/LMnJp_dSdnw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "dIVpJEKYNq4",
    title: "Arijit Singh - Darkhaast (Lyrics) Ft. Sunidhi Chauhan | Shivaay",
    artist: "Indian Harmony",
    duration: "06:15",
    duration_seconds: 375,
    cover_url: "https://i.ytimg.com/vi/dIVpJEKYNq4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "e8TvhwwWBdY",
    title: "Darkhaast (Lyrics) - Arijit Singh, Sunidhi Chauhan |Shivaay|",
    artist: "D-Muze India ",
    duration: "06:15",
    duration_seconds: 375,
    cover_url: "https://i.ytimg.com/vi/e8TvhwwWBdY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Fondsy0Dnv8",
    title: "Darkhaast - Arijit Singh x Sunidhi Chauhan (Lyrics) | Shivaay | Romantic Song | Lyricify",
    artist: "Lyricify",
    duration: "06:15",
    duration_seconds: 375,
    cover_url: "https://i.ytimg.com/vi/Fondsy0Dnv8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "pWviDbs1MIQ",
    title: "DARKHAAST (Lyrics) | Shivaay | Arjit Singh & Sunidhi Chauhan | Ajay Devgn | P&P Music",
    artist: "P&P Music ",
    duration: "06:15",
    duration_seconds: 375,
    cover_url: "https://i.ytimg.com/vi/pWviDbs1MIQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "OV78V4j3CAc",
    title: "Darkhaast - Mithoon ft. Arijit Singh & Sunidhi Chauhan (Lyrics)",
    artist: "Lyric Metro ",
    duration: "06:15",
    duration_seconds: 375,
    cover_url: "https://i.ytimg.com/vi/OV78V4j3CAc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "xCGUuHBLRfg",
    title: "DARKHAAST Lyrical  Video Song |  SHIVAAY | Arijit Singh & Sunidhi Chauhan | Ajay Devgn | T-Series",
    artist: "T-Series",
    duration: "06:23",
    duration_seconds: 383,
    cover_url: "https://i.ytimg.com/vi/xCGUuHBLRfg/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "fPii4kwD7Zc",
    title: "DARKHAAST Full Audio Song ||  SHIVAAY ||  Arijit Singh & Sunidhi Chauhan | Ajay Devgn | T-Series",
    artist: "T-Series",
    duration: "06:15",
    duration_seconds: 375,
    cover_url: "https://i.ytimg.com/vi/fPii4kwD7Zc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "7eEysaev0kw",
    title: "Darkhaast",
    artist: "Arijit Singh - Topic",
    duration: "06:15",
    duration_seconds: 375,
    cover_url: "https://i.ytimg.com/vi/7eEysaev0kw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "uIZMKRzxH5E",
    title: "DARKHAAST Video Song |  SHIVAAY | Arijit Singh & Sunidhi Chauhan | Ajay Devgn | T-Series",
    artist: "T-Series",
    duration: "03:31",
    duration_seconds: 211,
    cover_url: "https://i.ytimg.com/vi/uIZMKRzxH5E/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "ygGiUAoVMEA",
    title: "Arijit Singh | Darkhaast (Lyrics) | Ft. Sunidhi Chauhan | Shivaay |",
    artist: "MUSICBEATS",
    duration: "06:14",
    duration_seconds: 374,
    cover_url: "https://i.ytimg.com/vi/ygGiUAoVMEA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "qDNy9nZs_QU",
    title: "DARKHAAST 8K Video Song | Ajay Devgn | SHIVAAY | Arijit Singh | Sunidhi Chauhan | T-Series",
    artist: "T-Series",
    duration: "07:12",
    duration_seconds: 432,
    cover_url: "https://i.ytimg.com/vi/qDNy9nZs_QU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "1Mqg-yYzsKQ",
    title: "Darkhaast (slowed + reverb)",
    artist: "Pradabae",
    duration: "07:06",
    duration_seconds: 426,
    cover_url: "https://i.ytimg.com/vi/1Mqg-yYzsKQ/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "VuzsPkBMhIE",
    title: "Darkhaast Video Song || Prakriti Kakar || T-Series Acoustics",
    artist: "T-Series",
    duration: "03:30",
    duration_seconds: 210,
    cover_url: "https://i.ytimg.com/vi/VuzsPkBMhIE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "rrrbQFG8TkE",
    title: "DARKHAAST Lofi Mix | DJ YOGII | SHIVAAY | Arijit S, Sunidhi C | Ajay Devgn | Lofi Bollywood Songs",
    artist: "T-Series",
    duration: "05:36",
    duration_seconds: 336,
    cover_url: "https://i.ytimg.com/vi/rrrbQFG8TkE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "prWbM-XysfA",
    title: "Darkhaast [Slowed+Reverb] | Arijit Singh | Lofi | Revibe",
    artist: "REVIBE",
    duration: "06:56",
    duration_seconds: 416,
    cover_url: "https://i.ytimg.com/vi/prWbM-XysfA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "EIertkhDt2c",
    title: "Darkhaast (Slowed + Reverb) | Arijit Singh, Sunidhi Chauhan | Shivaay | SR Lofi",
    artist: "SR Lofi",
    duration: "06:57",
    duration_seconds: 417,
    cover_url: "https://i.ytimg.com/vi/EIertkhDt2c/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "7yRHL3c2yHg",
    title: "Darkhaast (Without Music Vocals Only) | Arijit Singh, Sunidhi Chauhan | Now Vocals",
    artist: "NOW VOCALS",
    duration: "05:31",
    duration_seconds: 331,
    cover_url: "https://i.ytimg.com/vi/7yRHL3c2yHg/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Tk-qpgwRCFs",
    title: "Darkhaast ~ slowed + reverb ~ @heartstrings12",
    artist: "Heartstrings\u2661",
    duration: "07:21",
    duration_seconds: 441,
    cover_url: "https://i.ytimg.com/vi/Tk-qpgwRCFs/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "li3qMp58Wlg",
    title: "Darkhast hai ye \u{1F497}\u{1F60C} #lyricvideo #arijitsingh #darkhast #ajaydevgan",
    artist: "\u0262\u1D0B \u1D07\u1D05\u026A\u1D1B\u1D22",
    duration: "00:19",
    duration_seconds: 19,
    cover_url: "https://i.ytimg.com/vi/li3qMp58Wlg/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "uWbcdQJSSfI",
    title: "Darkhaast X Safarnama (Mashup): Ajay Devgn X Ranbir Kapoor | Arijit Singh, Lucky Ali | IAMPRATHEEK",
    artist: "T-Series",
    duration: "04:23",
    duration_seconds: 263,
    cover_url: "https://i.ytimg.com/vi/uWbcdQJSSfI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "lPPKxLpRtIw",
    title: "Ke-Darkhast-Hai-Ye song lyrics Edit // WhatsApp status lyrics videos #lyrics #slowedreverb #status",
    artist: "lyrics videos",
    duration: "00:19",
    duration_seconds: 19,
    cover_url: "https://i.ytimg.com/vi/lPPKxLpRtIw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "Viz1-XiVO8Q",
    title: "Darkhast - Piano Cover by Ron",
    artist: "Ron",
    duration: "02:07",
    duration_seconds: 127,
    cover_url: "https://i.ytimg.com/vi/Viz1-XiVO8Q/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "hLkYjekb9Nw",
    title: "Darkhaast [8D AUDIO] Arijit Singh , Sunidhi Chauhan | Shivaay",
    artist: "8D MUSIX",
    duration: "06:15",
    duration_seconds: 375,
    cover_url: "https://i.ytimg.com/vi/hLkYjekb9Nw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "tAx2c_JF6q4",
    title: "INTENTIONS?||DARKHAST||#foryou #viral #song #trendingshorts #shortsfeed",
    artist: "\u03B1detee_editz",
    duration: "00:25",
    duration_seconds: 25,
    cover_url: "https://i.ytimg.com/vi/tAx2c_JF6q4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "w8gBLRsHXFk",
    title: "Darkhaast song #shots #reel #shortsvideoviral #instagram #dancestyle #instagram #bolleywoodsong",
    artist: "Shorts 22",
    duration: "00:31",
    duration_seconds: 31,
    cover_url: "https://i.ytimg.com/vi/w8gBLRsHXFk/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "vE6xHY2dHJM",
    title: "Arijit singh - Darkhaast \u2665 ( slowed + relaxing )",
    artist: "I am prince pokhrel",
    duration: "07:21",
    duration_seconds: 441,
    cover_url: "https://i.ytimg.com/vi/vE6xHY2dHJM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "7RhrspWqJrA",
    title: "Darkhaast (Slowed + Reverb) - Arijit Singh & Sunidhi Chauhan",
    artist: "yourfeel",
    duration: "06:55",
    duration_seconds: 415,
    cover_url: "https://i.ytimg.com/vi/7RhrspWqJrA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "rgt9-x8zKVU",
    title: "Ke Arman Hain Yeh \u2022 Tu Meri Bahoon Mein Duniya Bhula De Diye \u2022 Dharkhwast \u2022 Arijit Singh \u2022 Lyrics",
    artist: "RF OFFICIAL",
    duration: "00:16",
    duration_seconds: 16,
    cover_url: "https://i.ytimg.com/vi/rgt9-x8zKVU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "OxDT8ItUNb4",
    title: "Darkhaast Lyrics | Sunidhi Chauhan | Arijit Singh | #shorts",
    artist: "Lyrically Hits",
    duration: "01:00",
    duration_seconds: 60,
    cover_url: "https://i.ytimg.com/vi/OxDT8ItUNb4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "4fQ3f179QgA",
    title: "darkhaast (spedup)",
    artist: "\u{1D64E}\u{1D656}\u{1D667}\u{1D656}\u{1D65D}\u{1D647}\u{1D66D}",
    duration: "05:41",
    duration_seconds: 341,
    cover_url: "https://i.ytimg.com/vi/4fQ3f179QgA/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "096ki2Yja0M",
    title: "Making of DARKHAAST Video Song  |  SHIVAAY | Arijit Singh & Sunidhi Chauhan | Ajay Devgn | T-Series",
    artist: "T-Series",
    duration: "04:15",
    duration_seconds: 255,
    cover_url: "https://i.ytimg.com/vi/096ki2Yja0M/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "rT4rRAlt238",
    title: "Darkhast Hai Ye \u{1F90D}\u{1F940} | Arijit Singh | Shivaay Song | Emotional Hindi Song #shorts #ytshorts #lyrics",
    artist: "SPACE-X EDITOR ",
    duration: "00:18",
    duration_seconds: 18,
    cover_url: "https://i.ytimg.com/vi/rT4rRAlt238/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "m2bri7RIyso",
    title: "Darkhaast [Slowed+Reverb] | Arijit Singh | Sunidhi Chauhan | DownTown Music",
    artist: "ProRadiant Gaming ",
    duration: "07:32",
    duration_seconds: 452,
    cover_url: "https://i.ytimg.com/vi/m2bri7RIyso/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "6O7bWw1oBx0",
    title: "Darkhast\u{1F497}| Darkhast song| Arijit singh| #darkhast #arijitsingh #viralreels #love #romanticsong",
    artist: "pranit che vlog!",
    duration: "00:18",
    duration_seconds: 18,
    cover_url: "https://i.ytimg.com/vi/6O7bWw1oBx0/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "YXnQi-ewJGA",
    title: "Darkhast || guitar cover || by Arunima sharma",
    artist: "Arunima sharma ",
    duration: "00:54",
    duration_seconds: 54,
    cover_url: "https://i.ytimg.com/vi/YXnQi-ewJGA/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "-AE21S2RTQA",
    title: "darkhast love song, viruska love #bollywoodsongs #virushka #arijitsingh #viratkohli #anushkasharma \u{1F60D}",
    artist: "music to my ears \u{1F3B5}",
    duration: "00:15",
    duration_seconds: 15,
    cover_url: "https://i.ytimg.com/vi/-AE21S2RTQA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "oi4OwPwyylI",
    title: "Ki Darkhast Hai Yeh Jo Aayi Raat Hai Yeh |Darkhaast|Aesthetic Lyrics #shorts #Aestheticlyrics #music",
    artist: "Aesthetlyrcx",
    duration: "00:20",
    duration_seconds: 20,
    cover_url: "https://i.ytimg.com/vi/oi4OwPwyylI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "nuBCxeTz6cE",
    title: "Darkhaast song #reel #shots #danceform #bolleywoodsong #hindisong #instagram #dancestyle",
    artist: "Shorts 22",
    duration: "00:31",
    duration_seconds: 31,
    cover_url: "https://i.ytimg.com/vi/nuBCxeTz6cE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "kfx0lGLHm1o",
    title: "Darkhast \u2764\uFE0F | Arijit Singh | New Romantic Song 2026 | Full Song | Heart Touching Love Song",
    artist: "Sahidkhaan",
    duration: "03:49",
    duration_seconds: 229,
    cover_url: "https://i.ytimg.com/vi/kfx0lGLHm1o/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "89eSjADOdFI",
    title: "Sunidhi Chauhan Live | Darkhast hai ye song from movie Shivaye",
    artist: "Sheetal Mahajan | Live Concerts In Sydney",
    duration: "03:03",
    duration_seconds: 183,
    cover_url: "https://i.ytimg.com/vi/89eSjADOdFI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "wgFvXEPbA6w",
    title: "|| Darkhaast Song \u2728 || Arijit Singh ||Aesthetic Status || Lyrics ||",
    artist: "Avi ",
    duration: "00:37",
    duration_seconds: 37,
    cover_url: "https://i.ytimg.com/vi/wgFvXEPbA6w/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "piUHBTXsoiY",
    title: "Raabta",
    artist: "Arijit Singh - Topic",
    duration: "04:04",
    duration_seconds: 244,
    cover_url: "https://i.ytimg.com/vi/piUHBTXsoiY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "QZdjLPEWaDo",
    title: "Sunidhi Chauhan Live | Darkhaast | Alive India In Concert",
    artist: "Alive India In Concert",
    duration: "00:51",
    duration_seconds: 51,
    cover_url: "https://i.ytimg.com/vi/QZdjLPEWaDo/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "HAW9c1pwLVk",
    title: "Darkhast\u2764\uFE0F\u200D\u{1FA79} #lyrics #song #shorts",
    artist: "LyricsNest ",
    duration: "00:22",
    duration_seconds: 22,
    cover_url: "https://i.ytimg.com/vi/HAW9c1pwLVk/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "daDyCxXVQbc",
    title: "Arjit Singh - Darkhast \u{1F465} | Lyrics | Status | THE LO-FI'S",
    artist: "THE LO-FI'S ",
    duration: "00:35",
    duration_seconds: 35,
    cover_url: "https://i.ytimg.com/vi/daDyCxXVQbc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "6TkbOZFvgiA",
    title: "Darkhast || Guitar Chords Lesson || Arijit Singh #guitarchords #darkhast #arijitsingh #music #shorts",
    artist: "Vivek Bhardwaj Music",
    duration: "00:53",
    duration_seconds: 53,
    cover_url: "https://i.ytimg.com/vi/6TkbOZFvgiA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "JB99fybmxag",
    title: "Darkhast 4k Full Screen Status||Shivaay Songs|Ajay Devagan|4k Full Hd Status",
    artist: "Mayur edits",
    duration: "00:38",
    duration_seconds: 38,
    cover_url: "https://i.ytimg.com/vi/JB99fybmxag/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "-X_iUGbZhwc",
    title: "Darkhast - Lofi - Black Screen Status #arijit_singh #bk_editzzz #shots #viralshorts",
    artist: "BH EDITZZZ",
    duration: "00:29",
    duration_seconds: 29,
    cover_url: "https://i.ytimg.com/vi/-X_iUGbZhwc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "qoMrL9ubwrg",
    title: "Kalank Title Track - Lyrical | Alia Bhatt , Varun Dhawan | Arijit Singh | Pritam| Amitabh",
    artist: "Bollywood Chartbusters",
    duration: "05:14",
    duration_seconds: 314,
    cover_url: "https://i.ytimg.com/vi/qoMrL9ubwrg/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "7dO_MS9tZ5E",
    title: "Dekha Ek Khwab Song | Silsila | Amitabh Bachchan, Rekha | Kishore Kumar, Lata Mangeshkar, Shiv-Hari",
    artist: "YRF",
    duration: "04:27",
    duration_seconds: 267,
    cover_url: "https://i.ytimg.com/vi/7dO_MS9tZ5E/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "A8wDakVTNGk",
    title: "Apne Pyar Ke Sapne Sach Huye 4K Song - Lata Mangeshkar - Kishore Kumar - Amitabh Bachchan - Rakhee",
    artist: "SuperHit Gaane",
    duration: "05:17",
    duration_seconds: 317,
    cover_url: "https://i.ytimg.com/vi/A8wDakVTNGk/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "-Px0efU00uQ",
    title: "O Mere Dil Ke Chain | Rajesh Khanna, Tanuja | Mere Jeevan Saathi (1972) | R.D Burman | Kishore Kumar",
    artist: "Shemaroo Filmi Gaane",
    duration: "04:28",
    duration_seconds: 268,
    cover_url: "https://i.ytimg.com/vi/-Px0efU00uQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "fuY2BGi2hAM",
    title: "Saiyaara (1980) Ft. Kishore Kumar full song (Old version) Old is Gold with a New Voice!",
    artist: "Qamworld",
    duration: "03:51",
    duration_seconds: 231,
    cover_url: "https://i.ytimg.com/vi/fuY2BGi2hAM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "kJRE0uMc55U",
    title: "Kishore Kumar Special | \u0986\u09A7\u09C1\u09A8\u09BF\u0995 \u09AC\u09BE\u0982\u09B2\u09BE \u0997\u09BE\u09A8 | #sangeetmahal #kishorekumarsongs ",
    artist: "Sangeet Mahal",
    duration: "24:58",
    duration_seconds: 1498,
    cover_url: "https://i.ytimg.com/vi/kJRE0uMc55U/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "UlWAjd9bcKw",
    title: "Kishore Kumar : Mere Sapno Ki Rani Kab Aayegi Tu | Rajesh Khanna | Sharmila Tagore",
    artist: "Dard Bhare Songs",
    duration: "07:11",
    duration_seconds: 431,
    cover_url: "https://i.ytimg.com/vi/UlWAjd9bcKw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "pL87j6NNwNM",
    title: "Saiyaara (1980) Ft. Kishore Kumar full song (Old version) Old is Gold with a New Voice!",
    artist: "Rakesh Sutradhar",
    duration: "03:51",
    duration_seconds: 231,
    cover_url: "https://i.ytimg.com/vi/pL87j6NNwNM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "WQnCp2o30B8",
    title: "Kishore Kumar Nonstop Song \u2764\uFE0F | Kishore Kumar Old Song | O Mere Dil Ke | Jindagi Ka Safar |",
    artist: "Vrinda",
    duration: "21:55",
    duration_seconds: 1315,
    cover_url: "https://i.ytimg.com/vi/WQnCp2o30B8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "l3Q_zHd3kCA",
    title: "Best Of Kishore Kumar - Audio Jukebox | O Mere Dil Ke Chain | Mere Mehboob Qayamat Hogi |O Saathi Re",
    artist: "Old Hindi Songs",
    duration: "2:07:44",
    duration_seconds: 7664,
    cover_url: "https://i.ytimg.com/vi/l3Q_zHd3kCA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "S0WPSYFm7iE",
    title: "Mere Samne Wali Khidki Mein - Padosan - Saira Banu, Sunil Dutt & Kishore Kumar - Old Hindi Songs",
    artist: "Rajshri",
    duration: "02:53",
    duration_seconds: 173,
    cover_url: "https://i.ytimg.com/vi/S0WPSYFm7iE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "yHypwnOx8ts",
    title: "Kishore Kumar: Meri Bheegi Bheegi Si | Evergreen Hindi Song | Golden Hit | Dard Geet | Anamika",
    artist: "Dard Bhare Songs",
    duration: "06:37",
    duration_seconds: 397,
    cover_url: "https://i.ytimg.com/vi/yHypwnOx8ts/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "kd2j0J6nnn0",
    title: "Kishore Kumar Superhit Songs | Best Of Kishore Kumar | Ek Ajnabee Haseena Se | Dekha Ek Khwab",
    artist: "Old Hindi Songs",
    duration: "33:51",
    duration_seconds: 2031,
    cover_url: "https://i.ytimg.com/vi/kd2j0J6nnn0/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "_w14bUcxl1c",
    title: "O Mere Dil Ke Chain | Full Lyrics Video | Kishore Kumar | Rajesh Khanna | Eternal Romantic Classic",
    artist: "Name_Less",
    duration: "04:34",
    duration_seconds: 274,
    cover_url: "https://i.ytimg.com/vi/_w14bUcxl1c/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "FIj10mJsgQQ",
    title: "Dekha Ek Khwab Song | Silsila | Amitabh Bachchan, Rekha | Kishore Kumar, Lata Mangeshkar | Shiv-Hari",
    artist: "YRF Music",
    duration: "04:27",
    duration_seconds: 267,
    cover_url: "https://i.ytimg.com/vi/FIj10mJsgQQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "KKO9Ai5h080",
    title: "RAJESH KHANNA Hit Songs | Kishore Kumar | R.D. Burman | Purane Gaane",
    artist: "Romantic Gaane",
    duration: "1:40:47",
    duration_seconds: 6047,
    cover_url: "https://i.ytimg.com/vi/KKO9Ai5h080/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "JTOXKc5mUGU",
    title: "Ik Raasta Hai Zindagi | Full Song | Kaala Patthar | Shashi Kapoor | Kishore Kumar, Lata Mangeshkar",
    artist: "YRF",
    duration: "04:26",
    duration_seconds: 266,
    cover_url: "https://i.ytimg.com/vi/JTOXKc5mUGU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "oSkbkxlMurA",
    title: "Lata Mangeshkar and Kishore Kumar Hits | Tere Bina Zindagi Se | Dekha Ek Khwab | Old Hindi Songs",
    artist: "Old Hindi Songs",
    duration: "1:16:48",
    duration_seconds: 4608,
    cover_url: "https://i.ytimg.com/vi/oSkbkxlMurA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "zMGYCKr5trw",
    title: "Yeh Ratein Yeh Mausam | Dilli Ka Thug (1958) | Nutan | Asha Bhosle | Kishore Kumar Hit Songs",
    artist: "Kishore Kumar Hit Songs",
    duration: "03:15",
    duration_seconds: 195,
    cover_url: "https://i.ytimg.com/vi/zMGYCKr5trw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "mZRJfQluJTM",
    title: "Phoolon Ke Rang Se with lyrics | \u092B\u0942\u0932\u094B\u0902 \u0915\u0947 \u0930\u0902\u0917 \u0938\u0947 \u0915\u0947 \u092C\u094B\u0932 | Kishore Kumar",
    artist: "Saregama Music",
    duration: "05:26",
    duration_seconds: 326,
    cover_url: "https://i.ytimg.com/vi/mZRJfQluJTM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "CeO-2xTCDTU",
    title: "Best Of Kishore Kumar | Ek Ladki Bheegi Bhagi Si | Mere Mehboob Qayamat Hogi | Old Hindi Songs",
    artist: "Old Hindi Songs",
    duration: "1:30:05",
    duration_seconds: 5405,
    cover_url: "https://i.ytimg.com/vi/CeO-2xTCDTU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "8drSZlOo3Uo",
    title: "Chehra Hai Ya Chand Khila Hai | Saagar (1985) | Rishi Kapoor | Dimple Kapadia | R.D.Burman",
    artist: "NH Bollywood Songs ",
    duration: "04:38",
    duration_seconds: 278,
    cover_url: "https://i.ytimg.com/vi/8drSZlOo3Uo/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "bwWprAAOyy8",
    title: "Kishore Kumar Hit Songs \u0964 Old Songs \u0964 Pal Pal Dil Ke Paas \u0964 Chu Kar Mere Manko \u0964\u0964",
    artist: "Versatile - Melody TM",
    duration: "28:42",
    duration_seconds: 1722,
    cover_url: "https://i.ytimg.com/vi/bwWprAAOyy8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "I_7bOY_t-GY",
    title: "Chingari Koi Bhadke 4K Video - Hindi Dard Bhare Songs | Rajesh Khanna | Kishore Kumar",
    artist: "Dard Bhare Songs",
    duration: "08:47",
    duration_seconds: 527,
    cover_url: "https://i.ytimg.com/vi/I_7bOY_t-GY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Vabo2KVaEwA",
    title: "Pal Pal Dil Ke Paas (Lyrics) | Blackmail | Kishore Kumar | Dharmendra & Rakhee | Lyrical Music",
    artist: "Lyrical Music",
    duration: "05:23",
    duration_seconds: 323,
    cover_url: "https://i.ytimg.com/vi/Vabo2KVaEwA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "kDPNcxHGkmY",
    title: "Kishore Kumar : Musafir Hoon Yaaron | Jeetendra | Old Hindi Song",
    artist: "Dard Bhare Songs",
    duration: "07:53",
    duration_seconds: 473,
    cover_url: "https://i.ytimg.com/vi/kDPNcxHGkmY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "bVdqybfTKGA",
    title: "Dhoop Mein Nikla Na Karo (Lyrical Video) | Asha Bhosle | Kishore Kumar",
    artist: "Universal Music India",
    duration: "04:42",
    duration_seconds: 282,
    cover_url: "https://i.ytimg.com/vi/bVdqybfTKGA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "g6RT1Sy8Tso",
    title: "Panna Ki Tamanna Hai",
    artist: "Kishore Kumar - Topic",
    duration: "05:48",
    duration_seconds: 348,
    cover_url: "https://i.ytimg.com/vi/g6RT1Sy8Tso/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "-qMdbL15rvk",
    title: "Kishore Kumar: Pyar Deewana Hota Hai Mastana Hota Hai | Dard Geet Bollywood | 70s Ols Song",
    artist: "Dard Bhare Songs",
    duration: "07:42",
    duration_seconds: 462,
    cover_url: "https://i.ytimg.com/vi/-qMdbL15rvk/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "vFBYfwsp2Y8",
    title: "Kishore Kumar And Rajesh Khanna Hit Songs | Chingari Koi Bhadke | Kuchh To Log Kahenge | Yeh Kya Hua",
    artist: "Old Hindi Songs",
    duration: "54:24",
    duration_seconds: 3264,
    cover_url: "https://i.ytimg.com/vi/vFBYfwsp2Y8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "iaaBqrQrtUM",
    title: "Dil Kya Kare Jab Kisi Ko (Lyric Video) - Julie | Kishore Kumar",
    artist: "Universal Music India",
    duration: "06:46",
    duration_seconds: 406,
    cover_url: "https://i.ytimg.com/vi/iaaBqrQrtUM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "8ZpnhVoCYKw",
    title: "30 Minutes of Kishore Kumar Hits | Evergreen Bollywood Classics |  #oldisgoldsongs  #fyp\u30B7\u309Aviral",
    artist: "TweetsForLife",
    duration: "25:15",
    duration_seconds: 1515,
    cover_url: "https://i.ytimg.com/vi/8ZpnhVoCYKw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "QwLQ4_gkvsE",
    title: "Pal Pal Dil Ke Paas (Official Lyric Video)| Kishore Kumar | Dharmendra,Rakhee,Shatrughan | Blackmail",
    artist: "Universal Music India",
    duration: "05:00",
    duration_seconds: 300,
    cover_url: "https://i.ytimg.com/vi/QwLQ4_gkvsE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "9dcBy2uXL7E",
    title: "Tere Jaisa Yaar Kahan | Kishore Kumar | Yaarana 1981 Songs | Amitabh Bachchan",
    artist: "Goldmines Gaane Sune Ansune",
    duration: "03:35",
    duration_seconds: 215,
    cover_url: "https://i.ytimg.com/vi/9dcBy2uXL7E/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "UNjhqT_hlbg",
    title: "Chala Jata Hoon (HD) | Mere Jeevan Saathi (1972) | Rajesh Khanna, Tanuja | Kishore Kumar | RD Burman",
    artist: "Karaoke Hindi Songs",
    duration: "04:26",
    duration_seconds: 266,
    cover_url: "https://i.ytimg.com/vi/UNjhqT_hlbg/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "E0PBNCDACCU",
    title: "Kiska Rasta Dekhe  (Official Lyric Video) | Kishore Kumar | Dev Anand,Hema Malini,Raakhee | Joshila",
    artist: "Universal Music India",
    duration: "04:14",
    duration_seconds: 254,
    cover_url: "https://i.ytimg.com/vi/E0PBNCDACCU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "-yCALEGbzhU",
    title: "Yeh Vaada Raha (Lyrical Video) | R. D. Burman | Kishore Kumar | Asha Bhosle | Rishi Kapoor",
    artist: "Universal Music India",
    duration: "06:01",
    duration_seconds: 361,
    cover_url: "https://i.ytimg.com/vi/-yCALEGbzhU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "t2v3GDhEZno",
    title: "Pal Pal Dil Ke Paas | Kishore Kumar | Remastered",
    artist: "Purani Gaano Ki Yadein ",
    duration: "04:52",
    duration_seconds: 292,
    cover_url: "https://i.ytimg.com/vi/t2v3GDhEZno/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "nZBN-2QEdHo",
    title: "Chalte Chalte Mere Ye Geet Yaad Rakhna - Kishore Kumar [Remastered]",
    artist: "Tanvir Hossain",
    duration: "05:07",
    duration_seconds: 307,
    cover_url: "https://i.ytimg.com/vi/nZBN-2QEdHo/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "bLxLaVS4ZXQ",
    title: "Yeh Vaada Raha (Lyrical Video) | R. D. Burman | Kishore Kumar | Asha Bhosle | Rishi Kapoor",
    artist: "Universal Music India",
    duration: "06:50",
    duration_seconds: 410,
    cover_url: "https://i.ytimg.com/vi/bLxLaVS4ZXQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "HpLIPK48a-c",
    title: "Saagar Jaisi Aankhon Wali (Lyrical Video) | Kishore Kumar | R. D. Burman | Revibe | Hindi Songs",
    artist: "Universal Music India",
    duration: "05:03",
    duration_seconds: 303,
    cover_url: "https://i.ytimg.com/vi/HpLIPK48a-c/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "eVnG_Rqfgg4",
    title: "Neele Neele Ambar Par - Male Version Lyric Video - Kalaakaar | Sridevi | Kishore Kumar",
    artist: "SonyMusicIndiaVEVO",
    duration: "03:55",
    duration_seconds: 235,
    cover_url: "https://i.ytimg.com/vi/eVnG_Rqfgg4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "5VexNID24A4",
    title: "Kishore Kumar Hit Songs | Mere Sapnon Ki Rani | Roop Tera Mastana | Chala Jata Hoon | Dream Girl",
    artist: "Saregama Music",
    duration: "1:59:05",
    duration_seconds: 7145,
    cover_url: "https://i.ytimg.com/vi/5VexNID24A4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "MQ7CQF1SuM8",
    title: "Mone Pore Sei Sob Din | Kishore Kumar | Salil Chowdhury | Antarghat (Swarnatrisha) | Lyrical Video",
    artist: "INRECO BENGALI",
    duration: "05:05",
    duration_seconds: 305,
    cover_url: "https://i.ytimg.com/vi/MQ7CQF1SuM8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "lbfWsIpXsCA",
    title: "Yeh Shaam Mastani 4K | Kishore Kumar | Rajesh Khanna | Kati Patang | Classic Bollywood 4K Video Song",
    artist: "SuperHit Gaane",
    duration: "04:05",
    duration_seconds: 245,
    cover_url: "https://i.ytimg.com/vi/lbfWsIpXsCA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "wbUzEpHKGII",
    title: "Top 5 Iconic Songs Of Kishore Kumar #kishorekumar #top5 #oldisgold #popular #bollywoodsongs",
    artist: "SKD Lyrics ",
    duration: "00:45",
    duration_seconds: 45,
    cover_url: "https://i.ytimg.com/vi/wbUzEpHKGII/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "kR8rsh1AqRs",
    title: "Dil Aisa Kisi Ne Mera Toda 4K Song | Amanush | Kishore Kumar | Sharmila Tagore | Uttam Kumar",
    artist: "SuperHit Gaane",
    duration: "05:07",
    duration_seconds: 307,
    cover_url: "https://i.ytimg.com/vi/kR8rsh1AqRs/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "c_my5B15ENU",
    title: "Romantic Kishore Kumar Hits | Aap Ki Ankhon Mein Kuch | Ek Ajnabee Haseena Se | Old Hindi Hits",
    artist: "Saregama Carvaan",
    duration: "48:19",
    duration_seconds: 2899,
    cover_url: "https://i.ytimg.com/vi/c_my5B15ENU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "iaLmf7L-B24",
    title: "Oh Hansini Video Song | \u0913 \u0939\u0902\u0938\u093F\u0928\u0940 | Kishore Kumar | Zehreela Insaan | R. D Burman | Old Hindi Songs",
    artist: "SuperHit Gaane",
    duration: "04:37",
    duration_seconds: 277,
    cover_url: "https://i.ytimg.com/vi/iaLmf7L-B24/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "jTZOZSVJ3gQ",
    title: "Yeh Raatein Yeh Mausam Nadi Ka Kinara : Kishore Kumar | Asha Bhosle | Nutan | Old Hindi Song",
    artist: "Dard Bhare Songs",
    duration: "05:33",
    duration_seconds: 333,
    cover_url: "https://i.ytimg.com/vi/jTZOZSVJ3gQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Dq-7QTrN8ws",
    title: "Jeevan Ke Din Chhote Sahi | Bade Dilwala (1983) | Kishore Kumar, Lata Mangeshkar",
    artist: "NH Hindi Songs",
    duration: "08:00",
    duration_seconds: 480,
    cover_url: "https://i.ytimg.com/vi/Dq-7QTrN8ws/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "L0CGOmWQMUo",
    title: "AR Rahman 90's Hit Songs @AR Rahman Evergreen Songs Tamil@ AR Rahman 90s hits",
    artist: "ISAI  TAMIZHA 7244",
    duration: "56:39",
    duration_seconds: 3399,
    cover_url: "https://i.ytimg.com/vi/L0CGOmWQMUo/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "AGsn2ycFRqI",
    title: "A.R. Rahman - Tum Tak (Lyric Video) | Raanjhanaa | A. R. Rahman | Dhanush | Sonam Kapoor | Javed Ali",
    artist: "Sony Music India",
    duration: "05:04",
    duration_seconds: 304,
    cover_url: "https://i.ytimg.com/vi/AGsn2ycFRqI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "UzD58bmzUT8",
    title: "A.R. Rahman & Mani Ratnam Tamil Hits Songs Jukebox | Evergreen Tamil Songs",
    artist: "Sony Music South",
    duration: "1:15:54",
    duration_seconds: 4554,
    cover_url: "https://i.ytimg.com/vi/UzD58bmzUT8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "T94PHkuydcw",
    title: "ROCKSTAR: Kun Faya Kun (Full Video Song) | Ranbir Kapoor | A.R. Rahman, Javed Ali, Mohit Chauhan",
    artist: "T-Series",
    duration: "06:21",
    duration_seconds: 381,
    cover_url: "https://i.ytimg.com/vi/T94PHkuydcw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Qhwafoo7Pnc",
    title: "Aawaara Angaara (Full Video): Tere Ishk Mein | Dhanush, Kriti | AR Rahman,Faheem|Aanand LR|Bhushan K",
    artist: "T-Series",
    duration: "05:13",
    duration_seconds: 313,
    cover_url: "https://i.ytimg.com/vi/Qhwafoo7Pnc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "w-uBtXpgEGI",
    title: "Ishq Mastana | Main Vaapas Aaunga |@ARRahman| Imtiaz Ali, Irshad Kamil, Mohit Chauhan, Nargis, Pooja",
    artist: "Tips Official",
    duration: "04:03",
    duration_seconds: 243,
    cover_url: "https://i.ytimg.com/vi/w-uBtXpgEGI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "6oxkWWfiVHs",
    title: "A. R. Rahman Meets Berklee - Epic Medley (12 of 16)",
    artist: "Berklee College of Music",
    duration: "10:23",
    duration_seconds: 623,
    cover_url: "https://i.ytimg.com/vi/6oxkWWfiVHs/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "ti3ra-SnTyA",
    title: "Vintage AR Rahman Melodies - Audio Jukebox | Vaalu Kanuladaanaa, Roja Roja | Yemi Cheyamanduve",
    artist: "Saregama Telugu",
    duration: "1:46:47",
    duration_seconds: 6407,
    cover_url: "https://i.ytimg.com/vi/ti3ra-SnTyA/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "YbCF6OqTWug",
    title: "Muththa Mazhai - Chinmayi Performance | Thug Life | Kamal Haasan | Mani Ratnam | STR | AR Rahman",
    artist: "Saregama Tamil",
    duration: "04:00",
    duration_seconds: 240,
    cover_url: "https://i.ytimg.com/vi/YbCF6OqTWug/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "JAd9f7V11n4",
    title: "Best Of A.R. Rahman | Enna Sona | Raanjhanaa | Tere Bina | Barso Re | Hosanna | Top 10 Hit Songs",
    artist: "Sony Music India",
    duration: "44:07",
    duration_seconds: 2647,
    cover_url: "https://i.ytimg.com/vi/JAd9f7V11n4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "RW--t4tDSj4",
    title: "Thayya Thayya HD Song | Uyire Movie | Shahrukh khan | A R Rahman | Mani Ratnam | Track Musics",
    artist: "Track Musics India",
    duration: "07:02",
    duration_seconds: 422,
    cover_url: "https://i.ytimg.com/vi/RW--t4tDSj4/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "m1v3VwDy-0Y",
    title: "Moonwalk - Yethu Video Song | AR Rahman | Prabhudeva | Manoj NS | Yogi Babu | Aju Varghese | Satz",
    artist: "Lahari Music",
    duration: "03:54",
    duration_seconds: 234,
    cover_url: "https://i.ytimg.com/vi/m1v3VwDy-0Y/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "uA2d7HZkqO4",
    title: "Full Video: Kannae Kanmaniye | Tere Ishk Mein | Dhanush,Kriti | AR Rahman | Aanand L Rai | Bhushan K",
    artist: "T-Series Tamil",
    duration: "05:33",
    duration_seconds: 333,
    cover_url: "https://i.ytimg.com/vi/uA2d7HZkqO4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "dfNdRsNSFx4",
    title: "A.R. Rahman - Hosanna Best Video|Ekk Deewana Tha|Amy Jackson|Prateik Babar|Leon|Suzanne",
    artist: "SonyMusicIndiaVEVO",
    duration: "05:15",
    duration_seconds: 315,
    cover_url: "https://i.ytimg.com/vi/dfNdRsNSFx4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "60DZiYHkc18",
    title: "Muqabala - A.R. Rahman Live in Chennai",
    artist: "BToS Productions",
    duration: "04:41",
    duration_seconds: 281,
    cover_url: "https://i.ytimg.com/vi/60DZiYHkc18/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "_f8dMFzYRCE",
    title: "Guru (Tamil) - Aaruyirae Video | A.R. Rahman",
    artist: "SonyMusicSouthVEVO",
    duration: "04:46",
    duration_seconds: 286,
    cover_url: "https://i.ytimg.com/vi/_f8dMFzYRCE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "waTwDgK2tkk",
    title: "Tu Hi Re (Music Video) | A. R. Rahman | Bombay Movie | Hariharan, Kavita K | Bollywood Hindi Song",
    artist: "Universal Music India",
    duration: "07:05",
    duration_seconds: 425,
    cover_url: "https://i.ytimg.com/vi/waTwDgK2tkk/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "oDHuTKY7T0k",
    title: "Surah Rahman with Urdu Translation | Beautiful Quran Tilawat by Qari Abdul Basit | \u0633\u0648\u0631\u06C3 \u0627\u0644\u0631\u062D\u0645\u0646 | 131",
    artist: "Muhammad Ali",
    duration: "23:01",
    duration_seconds: 1381,
    cover_url: "https://i.ytimg.com/vi/oDHuTKY7T0k/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "ugFirDxbdho",
    title: "Hosanna - 8K/4K Music Video | Prateik Babbar, Amy J | AR Rahman | Leon, Suzanne | Ekk Deewana Tha",
    artist: "Sony Music India",
    duration: "05:09",
    duration_seconds: 309,
    cover_url: "https://i.ytimg.com/vi/ugFirDxbdho/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "_9geEbZIAJM",
    title: "O Humdum Suniyo Re Song, Saathiya | Vivek Oberoi | A R Rahman, Gulzar, KK, Shaan, Kunal, Pravin Mani",
    artist: "YRF",
    duration: "02:42",
    duration_seconds: 162,
    cover_url: "https://i.ytimg.com/vi/_9geEbZIAJM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "rP2s4JAkpIg",
    title: "Top 10 A.R. Rahman Hindi Songs on YouTube ( Singer ) | @CINEVISE",
    artist: "CINEVISE",
    duration: "00:59",
    duration_seconds: 59,
    cover_url: "https://i.ytimg.com/vi/rP2s4JAkpIg/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Y6WV7v4zuNM",
    title: "Vande Mataram - A.R. Rahman| Maa Tujhe Salaam| Independence Day Song",
    artist: "SonyMusicIndiaVEVO",
    duration: "06:19",
    duration_seconds: 379,
    cover_url: "https://i.ytimg.com/vi/Y6WV7v4zuNM/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "-I8WpNNboaw",
    title: "Andamaina Premarani Video Song | Premikudu Movie | Prabhu Deva, Nagma | A. R. Rahman | Telugu Songs",
    artist: "Aditya Music",
    duration: "05:06",
    duration_seconds: 306,
    cover_url: "https://i.ytimg.com/vi/-I8WpNNboaw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "rKpZTSpksRE",
    title: "Ay Hairathe - Audio Lyrical | A.R. Rahman | Aishwarya Rai | Abhishek Bachchan | Alka Yagnik | Guru",
    artist: "Sony Music India",
    duration: "06:07",
    duration_seconds: 367,
    cover_url: "https://i.ytimg.com/vi/rKpZTSpksRE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "G8GTk8LuiNY",
    title: "Tere Bina / Aaruyirae | Live | A. R. Rahman | Chinmayi Sripada | Instagram Reels Viral Version |",
    artist: "Aman Bhakodia ",
    duration: "05:16",
    duration_seconds: 316,
    cover_url: "https://i.ytimg.com/vi/G8GTk8LuiNY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Azhtn4ptHQI",
    title: "Rang De Basanti - 4K Music Video  | A. R. Rahman | Aamir Khan | Soha | Daler Mehndi & Chitra",
    artist: "Sony Music India",
    duration: "05:43",
    duration_seconds: 343,
    cover_url: "https://i.ytimg.com/vi/Azhtn4ptHQI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "D5ekQIH3vT8",
    title: "A R REHMAN Classic Evergreen Hindi Songs \u2764\uFE0F New Jukebox Songs AR RAHMAN \u{1F940} #arrahman #song #hindi",
    artist: "musicyog",
    duration: "51:24",
    duration_seconds: 3084,
    cover_url: "https://i.ytimg.com/vi/D5ekQIH3vT8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "MD9CORbY8lc",
    title: "Poovukkul Official Lyrical Video | Jeans | A.R.Rahman | Prashanth | Vairamuthu | AishwaryaRai",
    artist: "New Music India",
    duration: "06:51",
    duration_seconds: 411,
    cover_url: "https://i.ytimg.com/vi/MD9CORbY8lc/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "5kZ5o-oM0RI",
    title: "Yeh Haseen Vadiyan - Roja |A.R. Rahman |S.P. Balasubrahmanyam |K.S.Chithra |Madhoo |Arvind",
    artist: "SonyMusicIndiaVEVO",
    duration: "05:16",
    duration_seconds: 316,
    cover_url: "https://i.ytimg.com/vi/5kZ5o-oM0RI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "c3ax45qboXI",
    title: "Kannae Kanmaniye 8K | Tere Ishk Mein | Dhanush,Kriti | AR Rahman | Aanand L Rai | Bhushan K",
    artist: "T-Series Tamil",
    duration: "05:39",
    duration_seconds: 339,
    cover_url: "https://i.ytimg.com/vi/c3ax45qboXI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "GUbZOyORBhU",
    title: "Roja | Moonlight Choir Band | A R Rahman | Sharad Samudre |",
    artist: "Sharad Samudre",
    duration: "03:23",
    duration_seconds: 203,
    cover_url: "https://i.ytimg.com/vi/GUbZOyORBhU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "sNGwuOR3PQQ",
    title: "Deewaana Deewaana 8K Full Video: Tere Ishk Mein | Dhanush, Kriti | AR Rahman | Aanand LR | Bhushan K",
    artist: "T-Series",
    duration: "05:39",
    duration_seconds: 339,
    cover_url: "https://i.ytimg.com/vi/sNGwuOR3PQQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "ssC6VM6GQ-4",
    title: "The Music from Bombay | LIVE ORCHESTRA | A.R. RAHMAN | AIO",
    artist: "Australian Indian Orchestra",
    duration: "13:16",
    duration_seconds: 796,
    cover_url: "https://i.ytimg.com/vi/ssC6VM6GQ-4/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "x2J1qbndOmU",
    title: "Aaya Re Toofan | Chhaava | Vicky K, Rashmika M | A. R. Rahman, Vaishali S., Irshad Kamil, Kshitij P.",
    artist: "Sony Music India",
    duration: "02:17",
    duration_seconds: 137,
    cover_url: "https://i.ytimg.com/vi/x2J1qbndOmU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "XgcIBtO4bQQ",
    title: "Macarena Video Song | Prabhudeva | A R Rahman | Moonwalk 2026",
    artist: "Lahari Music",
    duration: "04:07",
    duration_seconds: 247,
    cover_url: "https://i.ytimg.com/vi/XgcIBtO4bQQ/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "4wpCzY1LfdM",
    title: "Yemi Cheyamanduve - Audio Song | Priyuraalu Pilichindi | A.R. Rahman | Shankar Mahadevan",
    artist: "Telugu Classic Songs",
    duration: "06:13",
    duration_seconds: 373,
    cover_url: "https://i.ytimg.com/vi/4wpCzY1LfdM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "k_DKi6IshkQ",
    title: "Raavanan - Usure Pogudhey 8K/4K Video Song | A.R. Rahman | Vikram, Aishwarya Rai",
    artist: "Sony Music South",
    duration: "05:51",
    duration_seconds: 351,
    cover_url: "https://i.ytimg.com/vi/k_DKi6IshkQ/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "_BzjZqUL1fM",
    title: "Aayutha Ezhuthu - Yaakkai Thiri  Video | A.R. Rahman | Suriya",
    artist: "Sony Music South",
    duration: "04:14",
    duration_seconds: 254,
    cover_url: "https://i.ytimg.com/vi/_BzjZqUL1fM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "K0ibBPhiaG0",
    title: "Ed Sheeran - Castle On The Hill [Official Music Video]",
    artist: "Ed Sheeran",
    duration: "04:48",
    duration_seconds: 288,
    cover_url: "https://i.ytimg.com/vi/K0ibBPhiaG0/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "P2Q5VZlVOro",
    title: "Ed Sheeran - Castle On The Hill (Billboard Music Awards 2017)",
    artist: "Atlantic Records",
    duration: "04:52",
    duration_seconds: 292,
    cover_url: "https://i.ytimg.com/vi/P2Q5VZlVOro/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "LUgpPmj6nR8",
    title: "Navjot Ahuja - Khat (Official Audio) ",
    artist: "Navjot Ahuja",
    duration: "04:57",
    duration_seconds: 297,
    cover_url: "https://i.ytimg.com/vi/LUgpPmj6nR8/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "-l15bnXnqAk",
    title: "IndiasGreat# Lata   Mangeshker\u{1F64F}#Short#shortsviral",
    artist: "Abid Hussain 421vlog",
    duration: "00:23",
    duration_seconds: 23,
    cover_url: "https://i.ytimg.com/vi/-l15bnXnqAk/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "wJZWw3lZCWU",
    title: "Mere Hathon Mein | Lata Mangeshkar Live Hyderabad Concert | Chandni | Sridevi , Rishi Kapoor",
    artist: "Anandghan",
    duration: "06:10",
    duration_seconds: 370,
    cover_url: "https://i.ytimg.com/vi/wJZWw3lZCWU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Tf7-ArsQGHE",
    title: "Vande Matram | Lata Mangeshkar Live In Hyderabad Concert",
    artist: "Anandghan",
    duration: "03:19",
    duration_seconds: 199,
    cover_url: "https://i.ytimg.com/vi/Tf7-ArsQGHE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "XMAH7T_PBnU",
    title: "Lata Mangeshkar Songs - Mora Roop Rang Mora Ang Ang 4K | Qatl 1986 Songs",
    artist: "SuperHit Gaane",
    duration: "05:35",
    duration_seconds: 335,
    cover_url: "https://i.ytimg.com/vi/XMAH7T_PBnU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "qDSkxeIdpxs",
    title: "\u09B2\u09A4\u09BE \u09AE\u0999\u09CD\u0997\u09C7\u09B6\u0995\u09B0 | Bangla Old Movie Songs | Lata Mangeshkar | Bangla Adhunik gaan | Bangla Superhit gaan",
    artist: "sudhamoy karmakar",
    duration: "1:15:09",
    duration_seconds: 4509,
    cover_url: "https://i.ytimg.com/vi/qDSkxeIdpxs/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "4a0QM4UE9Xw",
    title: "\u0932\u0924\u093E \u092E\u0902\u0917\u0947\u0936\u0915\u0930 \u0936\u094D\u0930\u0926\u094D\u0927\u093E\u0902\u091C\u0932\u093F \u0906\u0932\u094D\u0939\u093E \u0938\u0902\u091C\u094B \u092C\u0918\u0947\u0932 Lata mangeshker Shraddhanjali Alha Sanjo Baghel",
    artist: "Sanjo Baghel official",
    duration: "13:18",
    duration_seconds: 798,
    cover_url: "https://i.ytimg.com/vi/4a0QM4UE9Xw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "wczKS6_mQSY",
    title: "DARD SE MERA DAAMAN BHARDE JAGJIT SINGH AND LATA MANGESHKER ALBUM SAJDA",
    artist: "Fahad Afzal",
    duration: "05:48",
    duration_seconds: 348,
    cover_url: "https://i.ytimg.com/vi/wczKS6_mQSY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "NYIEL2j_Onc",
    title: "DIL MAIN AB DARD-E-MOHABBAT KE JAGJIT SINGH AND LATA MANGESHKER ALBUM SAJDA",
    artist: "Fahad Afzal",
    duration: "06:09",
    duration_seconds: 369,
    cover_url: "https://i.ytimg.com/vi/NYIEL2j_Onc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "rWdNeYLFIms",
    title: "YE DAAMAN AB NA CHHOOTAY GAA  LATA MANGESHKER  FILM  BAHAARON KI  MANZIL  1968",
    artist: "Ismail GoldVoice",
    duration: "03:40",
    duration_seconds: 220,
    cover_url: "https://i.ytimg.com/vi/rWdNeYLFIms/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "djwto3MaQ-Q",
    title: "AANKH SE DOOR NA HO JAGJIT SINGH AND LATA MANGESHKER ALBUM SAJDA",
    artist: "Fahad Afzal",
    duration: "06:15",
    duration_seconds: 375,
    cover_url: "https://i.ytimg.com/vi/djwto3MaQ-Q/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "XcDkBYnSwQQ",
    title: "O DEKHO JI DEKHO JI JEET HAMARI HAI  SINGER  LATA MANGESHKER & KISHORE KUMARE  FILM  NAUJAWAAN  1951",
    artist: "Ismail GoldVoice",
    duration: "03:23",
    duration_seconds: 203,
    cover_url: "https://i.ytimg.com/vi/XcDkBYnSwQQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "OD5Wgc4O11Y",
    title: "#Ye dil aur unki nigahon ke saaye# Original by Lata Mangeshker # Cover by Dr.Sudha Singh #",
    artist: "Sadabahar Nagme",
    duration: "06:17",
    duration_seconds: 377,
    cover_url: "https://i.ytimg.com/vi/OD5Wgc4O11Y/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "qoULVKfmRbM",
    title: "ALLAH JANTA HAI  JAGJIT SINGH AND LATA MANGESHKER ALBUM SAJDA",
    artist: "Fahad Afzal",
    duration: "05:40",
    duration_seconds: 340,
    cover_url: "https://i.ytimg.com/vi/qoULVKfmRbM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "kJqNfWAUuys",
    title: "Neelgagan ki Chaown Mei | Lata Mangeshker | Amrapali | Dr Renu Garg Bansal ",
    artist: "Dr Renu Garg Bansal",
    duration: "04:28",
    duration_seconds: 268,
    cover_url: "https://i.ytimg.com/vi/kJqNfWAUuys/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "vEzEMegyTaI",
    title: "Meri Aawaz Hi Pahechan Hai ...LATA MANGESHKER#",
    artist: "tina Khan",
    duration: "00:13",
    duration_seconds: 13,
    cover_url: "https://i.ytimg.com/vi/vEzEMegyTaI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "EVc2sPB2qX4",
    title: "\u0938\u094D\u0935\u0930 \u0915\u094B\u0915\u093F\u0932\u093E \u0932\u0924\u093E \u092E\u0902\u0917\u0947\u0936\u0915\u0930 \u0915\u093E \u0939\u0941\u0906 \u0928\u093F\u0927\u0928 | Lata Mangeshkar Shorts | lata mangeshker Status | #shorts",
    artist: "Aman Gupta",
    duration: "00:13",
    duration_seconds: 13,
    cover_url: "https://i.ytimg.com/vi/EVc2sPB2qX4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "SmGgNjWTfqQ",
    title: "GHAM KA KHAZANA JAGJIT SINGH AND LATA MANGESHKER ALBUM SAJDA",
    artist: "Fahad Afzal",
    duration: "05:02",
    duration_seconds: 302,
    cover_url: "https://i.ytimg.com/vi/SmGgNjWTfqQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "tHM3lVUhqO8",
    title: "Lata mangeshker, old indian songs  #Biwi no.1#sureelay geet",
    artist: "A Studio",
    duration: "01:39",
    duration_seconds: 99,
    cover_url: "https://i.ytimg.com/vi/tHM3lVUhqO8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "tNZKpoqhGBI",
    title: "\u0932\u0924\u093E \u092E\u0902\u0917\u0947\u0936\u0915\u0930 \u0915\u0947 \u0905\u0928\u092E\u094B\u0932 \u0917\u0940\u0924 | Hits Songs of Lata Mangeshker #shorts #shortsfeed #bollywood #ytshorts",
    artist: "Family Music Extra",
    duration: "00:57",
    duration_seconds: 57,
    cover_url: "https://i.ytimg.com/vi/tNZKpoqhGBI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "YTh2BgaDZy8",
    title: "\u0915\u0948\u0938\u0947 \u0906\u090F\u0917\u0940 \u092C\u093E\u0930\u093E\u0924 \u0915\u0948\u0938\u0947 \u0939\u094B\u0902\u0917\u0947 \u092A\u0940\u0932\u0947  | lata mangeshker song | #shorts  #new #viralvideo #latamangeshkar",
    artist: "VC Sanatani ",
    duration: "00:13",
    duration_seconds: 13,
    cover_url: "https://i.ytimg.com/vi/YTh2BgaDZy8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "ucGztbInZ1w",
    title: "TERE JALWE AB MUJHE JAGJIT SINGH AND LATA MANGESHKER ALBUM SAJDA",
    artist: "Fahad Afzal",
    duration: "05:52",
    duration_seconds: 352,
    cover_url: "https://i.ytimg.com/vi/ucGztbInZ1w/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "9s90xbmUbIw",
    title: "Movie-Asli Naqli(1962)//Song-Tera Mera Pyar Amar.. //Singer- Lata Mangeshker",
    artist: "Archana Ke Tarane",
    duration: "00:25",
    duration_seconds: 25,
    cover_url: "https://i.ytimg.com/vi/9s90xbmUbIw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Z_axjmy20q4",
    title: "Sawan Ka mahina | Lata Mangeshker & Mukesh | old song | #song #music #oldsong #bollywood #love",
    artist: "MUSIC_SITE",
    duration: "00:34",
    duration_seconds: 34,
    cover_url: "https://i.ytimg.com/vi/Z_axjmy20q4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "UTJQxHTtylM",
    title: "sun sahiba sun #Ram teri ganga maili ho gyi #lata Mangeshker #classicalmusic #shorts#youtubeshorts",
    artist: "Bollywood classical songs",
    duration: "00:40",
    duration_seconds: 40,
    cover_url: "https://i.ytimg.com/vi/UTJQxHTtylM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "khaF7cj0WL4",
    title: "Lata Mangeshker ji\u{1F389}#bollywood \u{1F3B5} #ytshort \u{1F4AB}",
    artist: "PK official Evergreen Songs",
    duration: "00:43",
    duration_seconds: 43,
    cover_url: "https://i.ytimg.com/vi/khaF7cj0WL4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "qABC5-ZQPz8",
    title: "\u0938\u094D\u0935\u0930 \u0915\u094B\u0915\u093F\u0932\u093E \u0932\u0924\u093E \u092E\u0902\u0917\u0947\u0936\u0915\u0930 \u0915\u093E \u0939\u0941\u0906 \u0928\u093F\u0927\u0928 | Lata Mangeshkar Shorts | lata mangeshker Status |",
    artist: "Lie Creativity",
    duration: "00:29",
    duration_seconds: 29,
    cover_url: "https://i.ytimg.com/vi/qABC5-ZQPz8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "fmbNRI7WQkA",
    title: "Prem Rog\u2764\uFE0FRishi Kapoor,Padmini kolhapure,Lata Mangeshker#",
    artist: "tina Khan",
    duration: "00:16",
    duration_seconds: 16,
    cover_url: "https://i.ytimg.com/vi/fmbNRI7WQkA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "7DxJy0p6FxE",
    title: "Best songs of Lata mangeshker| latamangeshker songs|old is gold",
    artist: "Music Series",
    duration: "17:51",
    duration_seconds: 1071,
    cover_url: "https://i.ytimg.com/vi/7DxJy0p6FxE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "ikDQxyAtzj8",
    title: "Aap Ki Nazron Ne Samjha - Lata Mangeshker - Saregama - Saregama Songs - Music Mania 3.0",
    artist: "Music Mania 3.0",
    duration: "03:43",
    duration_seconds: 223,
    cover_url: "https://i.ytimg.com/vi/ikDQxyAtzj8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "TOgavOYAP-o",
    title: "PAAUN CHHOOLENE DO PHOOLON  SINGER  LATA MANGESHKER & MOHAMMAD RAFI  FILM  TAAJ MAHAL  1963",
    artist: "Ismail GoldVoice",
    duration: "03:22",
    duration_seconds: 202,
    cover_url: "https://i.ytimg.com/vi/TOgavOYAP-o/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "0IUBa4zQ4AA",
    title: "Lata Mangeshker ji \u{1F389}#bollywood Hits \u{1F3B5} #ytshort \u{1F498}\u{1F4AF}",
    artist: "PK official Evergreen Songs",
    duration: "00:40",
    duration_seconds: 40,
    cover_url: "https://i.ytimg.com/vi/0IUBa4zQ4AA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "XOlXydAGzjE",
    title: "\u0938\u094D\u0935\u0930 \u0915\u094B\u0915\u093F\u0932\u093E \u0932\u0924\u093E \u092E\u0902\u0917\u0947\u0936\u0915\u0930 \u0915\u093E \u0939\u0941\u0906 \u0928\u093F\u0927\u0928 | Lata Mangeshkar Shorts | lata mangeshker Status",
    artist: "Mayank gupta video",
    duration: "00:16",
    duration_seconds: 16,
    cover_url: "https://i.ytimg.com/vi/XOlXydAGzjE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "cXx7kVgDNoc",
    title: "ZARA MUD KE TO DEKHO SAAJNA  SINGER  LATA MANGESHKER & TALAT MEHMOOD  FILM  MEENAAR  1954",
    artist: "Ismail GoldVoice",
    duration: "03:29",
    duration_seconds: 209,
    cover_url: "https://i.ytimg.com/vi/cXx7kVgDNoc/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "bhH_fZGE7l0",
    title: "Ae Mere Watan Ke Logon with lyrics | Lata Mangeshker | Live in Concert | Lata Mangeshker Songs",
    artist: "Manoranjan Tv",
    duration: "00:31",
    duration_seconds: 31,
    cover_url: "https://i.ytimg.com/vi/bhH_fZGE7l0/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "__ZLwED_iFE",
    title: "Lata mangeshker ji \u2728\uFE0F#bollywood \u{1F3B5} #ytshort \u{1F4AB}",
    artist: "PK official Evergreen Songs",
    duration: "00:42",
    duration_seconds: 42,
    cover_url: "https://i.ytimg.com/vi/__ZLwED_iFE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "4KT_1OHNApw",
    title: "Tere Liye |Lata Mangeshker |Rip Status|Lata Mangeshker Status| #latamangeshkar #rip #tereliye",
    artist: "BROKEN HEART",
    duration: "00:36",
    duration_seconds: 36,
    cover_url: "https://i.ytimg.com/vi/4KT_1OHNApw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "54nlMCBIYgM",
    title: "Chale Hi Jana Hai | Bahon Mein Chale Aao |Lata Mangeshker#youtubeshorts#oldisgoldsongs#shortsviral",
    artist: "pooja singh official",
    duration: "00:15",
    duration_seconds: 15,
    cover_url: "https://i.ytimg.com/vi/54nlMCBIYgM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "fkS9Ygu8Fn8",
    title: "SAAJAN KI OUT LEKE HAATON MEIN  SINGER  MOHAMMAD RAFI & LATA MANGESHKER  FILM  ZEVRAAT  1949",
    artist: "Ismail GoldVoice",
    duration: "03:07",
    duration_seconds: 187,
    cover_url: "https://i.ytimg.com/vi/fkS9Ygu8Fn8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "9xcX8-fDhPk",
    title: "Aaja Aai Bahar Dil Hai Bekarar-4K I Lata Mangeshker I Sadhna, Shammi Kapoor I Rajkumar I Hit Songs",
    artist: "Mahakte Gaane",
    duration: "05:42",
    duration_seconds: 342,
    cover_url: "https://i.ytimg.com/vi/9xcX8-fDhPk/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "03OiKcHAaKI",
    title: "LATA MANGESHKER#trendingshorts#lovestatus#ytshortsvideo#hindisong#latamangeshkar#music#reels#reelsvi",
    artist: "Meradard \u{1D5F5}\u{1D606}\u{1D5F1}",
    duration: "00:16",
    duration_seconds: 16,
    cover_url: "https://i.ytimg.com/vi/03OiKcHAaKI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "fsOpdJ1Gci8",
    title: "MOHEY BHOOL GAYE SANVARIYA BHOOL GAYE  SINGER  LATA MANGESHKER  FILM  BAIJU BAAVRA  1952",
    artist: "Ismail GoldVoice",
    duration: "03:38",
    duration_seconds: 218,
    cover_url: "https://i.ytimg.com/vi/fsOpdJ1Gci8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "IiUlxR886cM",
    title: "DHEERE DHEERE CHADH GAYA NADI MEIN  SINGER  LATA MANGESHKER & HEMANT KUMARE  FILM  AAGHOSH  1953",
    artist: "Ismail GoldVoice",
    duration: "03:19",
    duration_seconds: 199,
    cover_url: "https://i.ytimg.com/vi/IiUlxR886cM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "cY1n0NXeW_g",
    title: "Lata mangeshker \u{1F495}#bollywood songs \u{1F3B5} #ytshort",
    artist: "PK official Evergreen Songs",
    duration: "00:40",
    duration_seconds: 40,
    cover_url: "https://i.ytimg.com/vi/cY1n0NXeW_g/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "glkLtTwp0bM",
    title: "Lata mangeshker \u2728\uFE0Fb #bollywood songs #ytshort",
    artist: "PK official Evergreen Songs",
    duration: "00:36",
    duration_seconds: 36,
    cover_url: "https://i.ytimg.com/vi/glkLtTwp0bM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "Jx3Rf219svg",
    title: "Jane kyu log mohabbat kiya krte hai song # Lata Mangeshker #shortsvideo #youtubeshorts",
    artist: "S Husain all types Music",
    duration: "00:15",
    duration_seconds: 15,
    cover_url: "https://i.ytimg.com/vi/Jx3Rf219svg/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "3EC-s5zBs54",
    title: "DHUWAN BANA KE FIZA MAIN JAGJIT SINGH AND LATA MANGESHKER ALBUM SAJDA",
    artist: "Fahad Afzal",
    duration: "06:54",
    duration_seconds: 414,
    cover_url: "https://i.ytimg.com/vi/3EC-s5zBs54/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "KTAjIfBTpxQ",
    title: "Lagaja gale-   Lata mangeshker classic song",
    artist: "Varsha Joshi - Indian Bollywood Singer in USA",
    duration: "02:05",
    duration_seconds: 125,
    cover_url: "https://i.ytimg.com/vi/KTAjIfBTpxQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "fXhVkM2NQG0",
    title: "Nigahen Kyu Bhatkati Hai || Lata Mangeshker || Baharon Ki Manzil ( 1968 )\u{1F49D}",
    artist: "Yoga & Beyond With Anju ",
    duration: "03:53",
    duration_seconds: 233,
    cover_url: "https://i.ytimg.com/vi/fXhVkM2NQG0/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "94ffYSf5QOs",
    title: "Jiska mujhe tha Intezaar song lyrics | lata Mangeshker | kishor kumar |",
    artist: "What to Watch",
    duration: "04:09",
    duration_seconds: 249,
    cover_url: "https://i.ytimg.com/vi/94ffYSf5QOs/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "xx3GszpW1fg",
    title: "Fir Bhi ye Raaj Jaan Jati | By Lata Mangeshker ji",
    artist: "Back to the 90s'",
    duration: "00:19",
    duration_seconds: 19,
    cover_url: "https://i.ytimg.com/vi/xx3GszpW1fg/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "LV_wiOhO40Q",
    title: "Dooron Dooron (Official Video) - Paresh Pahuja Feat. Harleen Sethi | Shiv | Meghdeep | Vaibhav",
    artist: "Paresh Pahuja",
    duration: "04:07",
    duration_seconds: 247,
    cover_url: "https://i.ytimg.com/vi/LV_wiOhO40Q/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "y_GVDbfaiwQ",
    title: "Dooron Dooron (Lyrical Video) - Unplugged | Paresh Pahuja | Shiv Tandan | T-Series",
    artist: "T-Series",
    duration: "05:47",
    duration_seconds: 347,
    cover_url: "https://i.ytimg.com/vi/y_GVDbfaiwQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "9T-Zbxg9X_4",
    title: "Paresh Pahuja - Dooron Dooron (Live from The Voice Notes Concert)",
    artist: "Paresh Pahuja",
    duration: "06:07",
    duration_seconds: 367,
    cover_url: "https://i.ytimg.com/vi/9T-Zbxg9X_4/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "J1gkaSA5jb8",
    title: "Dooron Dooron - (lyrics) Paresh Pahuja | feat. Harleen Sethi | Shiv Tandan,Meghdeep Bose,Vaibhav Raj",
    artist: "RytHM",
    duration: "04:00",
    duration_seconds: 240,
    cover_url: "https://i.ytimg.com/vi/J1gkaSA5jb8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "NIhf2GZ2TEM",
    title: "Dooron Dooron (Lyrics/English Translation)- Paresh Pahuja | Shiv Tandan | Punjabi Song",
    artist: "Indic Lyrics",
    duration: "03:40",
    duration_seconds: 220,
    cover_url: "https://i.ytimg.com/vi/NIhf2GZ2TEM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "4F7wcgwpp_U",
    title: "Dooron Dooron (Official Video) - Unplugged | Paresh Pahuja | Shiv Tandan | T-Series",
    artist: "T-Series",
    duration: "06:07",
    duration_seconds: 367,
    cover_url: "https://i.ytimg.com/vi/4F7wcgwpp_U/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "9hIrukUAU9s",
    title: "Dooron Dooron (Lyrics) - paresh Pahuja | Sochoon ke milni te bolaanga ki",
    artist: "vibes & vanilla",
    duration: "04:00",
    duration_seconds: 240,
    cover_url: "https://i.ytimg.com/vi/9hIrukUAU9s/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "IFcVbkSueM8",
    title: "Dooron Dooron (Lyrical Video)- Unplugged IParesh Pahuja | Shiv Tandan | Beat lyrics",
    artist: "Beat lyrics",
    duration: "03:17",
    duration_seconds: 197,
    cover_url: "https://i.ytimg.com/vi/IFcVbkSueM8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "sSPyMJu3xYw",
    title: "Dooron Dooron - paresh Pahuja (Lyrics) | Lyrical Bam Hindi ",
    artist: "LYRICAL BAM HINDI",
    duration: "03:10",
    duration_seconds: 190,
    cover_url: "https://i.ytimg.com/vi/sSPyMJu3xYw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "_9xxr6Gv-RI",
    title: "Dooron Dooron Lyrics | Paresh Pahuja ft. Harleen Sethi | Full Song | Golden Lyrics",
    artist: "Piko Lyrics",
    duration: "04:03",
    duration_seconds: 243,
    cover_url: "https://i.ytimg.com/vi/_9xxr6Gv-RI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "-6aHZvbAjow",
    title: "Dooron Dooron (Female Version)",
    artist: "Jibon Krishna Das - Topic",
    duration: "04:04",
    duration_seconds: 244,
    cover_url: "https://i.ytimg.com/vi/-6aHZvbAjow/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "whfiTwSFZYs",
    title: "Dooron dooron - Paresh Pahuja live",
    artist: "Song Boxxx",
    duration: "03:56",
    duration_seconds: 236,
    cover_url: "https://i.ytimg.com/vi/whfiTwSFZYs/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "sSQ5PAP9eto",
    title: "Dooron Dooron | Paresh Pahuja |  Lyrics Status #shorts",
    artist: "Biksz vibes",
    duration: "00:19",
    duration_seconds: 19,
    cover_url: "https://i.ytimg.com/vi/sSQ5PAP9eto/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "YngU6GDGHzI",
    title: "Dooron Dooron | Paresh Pahuja X Fellow Singer",
    artist: "Fellow Singer",
    duration: "00:42",
    duration_seconds: 42,
    cover_url: "https://i.ytimg.com/vi/YngU6GDGHzI/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "Vcvm5_gxPe8",
    title: "Dooron Dooron - (Lyrics) | Paresh Pahuja |Harleen Sethi, | Shiv Tandan | Meghdeep Bose ",
    artist: "Musicgenree",
    duration: "04:06",
    duration_seconds: 246,
    cover_url: "https://i.ytimg.com/vi/Vcvm5_gxPe8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "HUX6uRCTMYw",
    title: "Dooron Dooron | Ek Adhuri Mohabbat#song ",
    artist: "AR GAIMIMG",
    duration: "04:02",
    duration_seconds: 242,
    cover_url: "https://i.ytimg.com/vi/HUX6uRCTMYw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "QbTQKO6iUUE",
    title: "Vekhegi mainu te sochegi kya tu?\u2764\uFE0F Dooron Dooron Live - Paresh Pahuja",
    artist: "Paresh Pahuja",
    duration: "01:01",
    duration_seconds: 61,
    cover_url: "https://i.ytimg.com/vi/QbTQKO6iUUE/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "cWsMHkvEqys",
    title: "Paresh Pahuja's - Dooron Dooron - Unplugged\u{1F97A}",
    artist: "T-Series",
    duration: "00:30",
    duration_seconds: 30,
    cover_url: "https://i.ytimg.com/vi/cWsMHkvEqys/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "I8LGrSkiVP8",
    title: "Dooron Doroon Song (Lyrics) - Paresh Pahuja",
    artist: "Lyrical Bablu",
    duration: "00:46",
    duration_seconds: 46,
    cover_url: "https://i.ytimg.com/vi/I8LGrSkiVP8/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "hj7NSBYYMCY",
    title: "Dooron Dooron - (lyrics) Paresh Pahuja | feat. Harleen Sethi | Shiv Tandan, Meghdeep Bose, Vaibhav",
    artist: "Love_song_4HD",
    duration: "03:39",
    duration_seconds: 219,
    cover_url: "https://i.ytimg.com/vi/hj7NSBYYMCY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "q7xuWUI89QI",
    title: "TRY WITH YOUR OWN VOICE ( DOORON DOORON )",
    artist: "Lyrics_ Vishu___",
    duration: "00:59",
    duration_seconds: 59,
    cover_url: "https://i.ytimg.com/vi/q7xuWUI89QI/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "79DxIiMVANY",
    title: "Dooron Dooron (Female Version) | Cover | Paresh Pahuja | Romantic Punjabi Song | Tute Dil Ke Tale",
    artist: "Nishaad Art ",
    duration: "03:59",
    duration_seconds: 239,
    cover_url: "https://i.ytimg.com/vi/79DxIiMVANY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "YCwv_bKmBKo",
    title: "Finding Her x Dooron Dooron - Mashup (Full Version) | Kushagra | Paresh Pahuja",
    artist: "Vibevik Music",
    duration: "03:40",
    duration_seconds: 220,
    cover_url: "https://i.ytimg.com/vi/YCwv_bKmBKo/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "Q5PLUNAJURI",
    title: "Sochun ke milni te bolanga ki? Paresh Pahuja\u2019s Dooron Dooron #pareshpahujasongs #DooronDooron",
    artist: "Paresh Pahuja",
    duration: "00:48",
    duration_seconds: 48,
    cover_url: "https://i.ytimg.com/vi/Q5PLUNAJURI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "HQeyNApJ__c",
    title: "Dooron Dooron - Paresh Pahuja (Karaoke with Lyrics)",
    artist: "KaraokeSaga",
    duration: "03:54",
    duration_seconds: 234,
    cover_url: "https://i.ytimg.com/vi/HQeyNApJ__c/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "1DYOCDVUMHw",
    title: "Dooron Dooron (Lyrics) - Paresh Pahuja",
    artist: "D-Muze India ",
    duration: "03:36",
    duration_seconds: 216,
    cover_url: "https://i.ytimg.com/vi/1DYOCDVUMHw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "7-EI4q7rfdY",
    title: "Dooron Dooron (8D AUDIO) - Paresh Pahuja Feat. Harleen Sethi | Shiv | Meghdeep | Vaibhav",
    artist: "8D Active Music",
    duration: "04:05",
    duration_seconds: 245,
    cover_url: "https://i.ytimg.com/vi/7-EI4q7rfdY/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "DyKGPcCal3Q",
    title: "KHAT x DOORON DOORON ( Mezcla Mashup ) | Road Trip Mashup | Latest Hindi Songs",
    artist: "Mezcla",
    duration: "04:35",
    duration_seconds: 275,
    cover_url: "https://i.ytimg.com/vi/DyKGPcCal3Q/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "9fmekTL2Be0",
    title: "Paresh Pahuja - Dooron Dooron Acoustic (Live from Spoken Fest, Mumbai)",
    artist: "Paresh Pahuja",
    duration: "06:03",
    duration_seconds: 363,
    cover_url: "https://i.ytimg.com/vi/9fmekTL2Be0/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "zVOIQ2YsEaI",
    title: "Dooron Dooron - Paresh Pahuja",
    artist: "STARSHINE",
    duration: "04:03",
    duration_seconds: 243,
    cover_url: "https://i.ytimg.com/vi/zVOIQ2YsEaI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "QsY2-71ibBs",
    title: "Dooron Dooron - Paresh Pahuja | Slowed Reverb | Lofi | Bass Bhaiya | #slowed_reverb #lofi",
    artist: "Bass Bhaiya",
    duration: "04:46",
    duration_seconds: 286,
    cover_url: "https://i.ytimg.com/vi/QsY2-71ibBs/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "KD6lZ8cUVho",
    title: "Isq de galliyach khoya ae dil ve | Dooron Dooron | - (lyrical) Paresh Pahuja | feat. Harleen Sethi |",
    artist: "Vibyric",
    duration: "04:00",
    duration_seconds: 240,
    cover_url: "https://i.ytimg.com/vi/KD6lZ8cUVho/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "YL83w8onTck",
    title: "Dooron Dooron - Paresh Pahuja (Lyrics)",
    artist: "Lyric Metro ",
    duration: "03:37",
    duration_seconds: 217,
    cover_url: "https://i.ytimg.com/vi/YL83w8onTck/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "4SXJ489rSuU",
    title: "Dooron Dooron \u{1FAE0} | Paresh Pahuja | #ytshorts #love #youtubeshorts #song #lyrics #trendingnow #fyp",
    artist: "Lyrizo_Ayan ",
    duration: "00:17",
    duration_seconds: 17,
    cover_url: "https://i.ytimg.com/vi/4SXJ489rSuU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "42-Cf0rcR5k",
    title: "Dooron Dooron (Lyrics) | New Hindi Song 2026 | Lyricify",
    artist: "Lyricify",
    duration: "04:00",
    duration_seconds: 240,
    cover_url: "https://i.ytimg.com/vi/42-Cf0rcR5k/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "HY6mMpC_dec",
    title: "Dooron Dooron ||Money || #youtubeshorts #couple #love #shorts",
    artist: "Aesthetic_editor",
    duration: "00:34",
    duration_seconds: 34,
    cover_url: "https://i.ytimg.com/vi/HY6mMpC_dec/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "6BrdP8C1Oz8",
    title: "Sochu Ki Milnate bolanga ki \u{1F90C} || dooron dooron || lyrics || #lyrics #editing #shorts",
    artist: "Editor Abhiii",
    duration: "00:18",
    duration_seconds: 18,
    cover_url: "https://i.ytimg.com/vi/6BrdP8C1Oz8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "kwiG9TEU_2E",
    title: "\u{1F3B6}Paresh Pahuja\u2019s Dooron Dooron \u2014 subscribe @dreamlofi_   #musicvideo #indiansinger #youtubemusic",
    artist: "Dreamyy lo-fi",
    duration: "00:34",
    duration_seconds: 34,
    cover_url: "https://i.ytimg.com/vi/kwiG9TEU_2E/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "vBgwxkNv1eQ",
    title: "Dooron Dooron (Slowed + Reverb) | Paresh Pahuja | Shiv Tandan | SSR Lofi",
    artist: "SSR Lofi",
    duration: "04:06",
    duration_seconds: 246,
    cover_url: "https://i.ytimg.com/vi/vBgwxkNv1eQ/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "ALa47qzoN9M",
    title: "Dooron-Dooron lyrics (sochu ke milni te bolanga ki) | paresh pahuja, shiv Tandan",
    artist: "mayuri's_lyrics",
    duration: "00:46",
    duration_seconds: 46,
    cover_url: "https://i.ytimg.com/vi/ALa47qzoN9M/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "v2Xuz3azjLk",
    title: "Dooron dooron | Punjabi song | Status #aesthetic #viral #viralvideo #fyp #talhaanjum",
    artist: "GOSSIP MUSIC",
    duration: "00:16",
    duration_seconds: 16,
    cover_url: "https://i.ytimg.com/vi/v2Xuz3azjLk/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "N7bI76Fj_fU",
    title: "Dooron Dooron \u2013 Paresh Pahuja (Lofi Flip) | Aesthetic Lyrics",
    artist: "Aesthetlyrcx",
    duration: "04:00",
    duration_seconds: 240,
    cover_url: "https://i.ytimg.com/vi/N7bI76Fj_fU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "MNfm-kdDP4Y",
    title: "Finding Her X Dooron Dooron X Perfect | #mashup #findingher #doorondooron #music #mashupsongs",
    artist: "Ahmad Butt",
    duration: "00:52",
    duration_seconds: 52,
    cover_url: "https://i.ytimg.com/vi/MNfm-kdDP4Y/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "-VGd8SeB6IM",
    title: "Paresh Pahuja Stuns With Soulful Live Performance of Dooron Dooron \u2764\uFE0F",
    artist: "RadioandMusic",
    duration: "01:01",
    duration_seconds: 61,
    cover_url: "https://i.ytimg.com/vi/-VGd8SeB6IM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "wwcVvPUO9PE",
    title: "Dooron Dooron - Afro beat Version | Paresh Pahuja",
    artist: "RaaginiMusic",
    duration: "05:50",
    duration_seconds: 350,
    cover_url: "https://i.ytimg.com/vi/wwcVvPUO9PE/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "td-jFn00Pzg",
    title: "Dooron dooron \u{1F54A}\uFE0F || #shorts#trending#explore #viralvideos#writer #feed #edit #fyp\u30B7",
    artist: "Your feelings",
    duration: "00:19",
    duration_seconds: 19,
    cover_url: "https://i.ytimg.com/vi/td-jFn00Pzg/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "-4xUr6WMPL4",
    title: "Dooron Dooron \u2013 English  Lyrics Translation | Punjabi song _Paresh Pahuja _Full Lyrics",
    artist: "Lyricsworldbollywood",
    duration: "03:32",
    duration_seconds: 212,
    cover_url: "https://i.ytimg.com/vi/-4xUr6WMPL4/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "vxIv2F-MH-8",
    title: "|Dooron dooron | Anushka gautam | guitar cover |",
    artist: "Anushka Gautam",
    duration: "01:29",
    duration_seconds: 89,
    cover_url: "https://i.ytimg.com/vi/vxIv2F-MH-8/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "MAHUpbzVnPU",
    title: "Dooron Dooron Guitar Lesson\u2764\uFE0F | Easy Chords #shorts",
    artist: "Guitar With Aman",
    duration: "00:54",
    duration_seconds: 54,
    cover_url: "https://i.ytimg.com/vi/MAHUpbzVnPU/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "hg07MIiQ9xc",
    title: "Paresh_Pahuja_-_Dooron_Dooron__Live_from_The_Voice_Notes_Concert_(256k)",
    artist: "omparkash keer 009",
    duration: "06:10",
    duration_seconds: 370,
    cover_url: "https://i.ytimg.com/vi/hg07MIiQ9xc/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "4adZ7AguVcw",
    title: "yung kai - blue (Lyrics)",
    artist: "Creative Chaos",
    duration: "03:35",
    duration_seconds: 215,
    cover_url: "https://i.ytimg.com/vi/4adZ7AguVcw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "Sd3ES9XYPyA",
    title: "#Video | \u092C\u0941\u0932\u0942 \u092C\u0941\u0932\u0942 \u0913\u095D\u0928\u0940 | #Pramod Premi Yadav | #Nikita Bhardwaj | Blue Blue Odhani | #Bhojpuri Song",
    artist: "Byby Dhamaka",
    duration: "07:52",
    duration_seconds: 472,
    cover_url: "https://i.ytimg.com/vi/Sd3ES9XYPyA/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "V9PVRfjEBTI",
    title: "Billie Eilish - BIRDS OF A FEATHER (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "03:51",
    duration_seconds: 231,
    cover_url: "https://i.ytimg.com/vi/V9PVRfjEBTI/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "V1Pl8CzNzCw",
    title: "Billie Eilish, Khalid - lovely",
    artist: "BillieEilishVEVO",
    duration: "03:21",
    duration_seconds: 201,
    cover_url: "https://i.ytimg.com/vi/V1Pl8CzNzCw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "l08Zw-RY__Q",
    title: "Billie Eilish - WILDFLOWER (Official Lyric Video)",
    artist: "BillieEilishVEVO",
    duration: "04:22",
    duration_seconds: 262,
    cover_url: "https://i.ytimg.com/vi/l08Zw-RY__Q/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "S2dRcipMCpw",
    title: "Billie Eilish - Lost Cause (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "03:49",
    duration_seconds: 229,
    cover_url: "https://i.ytimg.com/vi/S2dRcipMCpw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "vJ3sm4C_1eI",
    title: "Billie Eilish Over The Years \u{1F979}\u2764\uFE0F",
    artist: "Billie Eilish Terrain",
    duration: "00:18",
    duration_seconds: 18,
    cover_url: "https://i.ytimg.com/vi/vJ3sm4C_1eI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "DyDfgMOUjCI",
    title: "Billie Eilish - bad guy",
    artist: "BillieEilishVEVO",
    duration: "03:26",
    duration_seconds: 206,
    cover_url: "https://i.ytimg.com/vi/DyDfgMOUjCI/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "pbMwTqkKSps",
    title: "Billie Eilish - when the party's over",
    artist: "BillieEilishVEVO",
    duration: "03:14",
    duration_seconds: 194,
    cover_url: "https://i.ytimg.com/vi/pbMwTqkKSps/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "8VLXHyHRXjc",
    title: "Billie Eilish - lovely (Lyrics) ft. Khalid",
    artist: "7clouds",
    duration: "03:20",
    duration_seconds: 200,
    cover_url: "https://i.ytimg.com/vi/8VLXHyHRXjc/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "2hPvak3pxR8",
    title: "The Pain We Share: XXXTENTACION & Billie Eilish | Heartfelt Edit \u{1F494} #xxxtentacion #billieeilish #llj",
    artist: "Audio Sause",
    duration: "00:23",
    duration_seconds: 23,
    cover_url: "https://i.ytimg.com/vi/2hPvak3pxR8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "ZlvfYmfefSI",
    title: "Billie Eilish - NOT MY RESPONSIBILITY - a short film",
    artist: "Billie Eilish",
    duration: "03:42",
    duration_seconds: 222,
    cover_url: "https://i.ytimg.com/vi/ZlvfYmfefSI/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "4vYOwhll1fs",
    title: "Armani White - BILLIE EILISH.",
    artist: "ArmaniWhiteVEVO",
    duration: "01:42",
    duration_seconds: 102,
    cover_url: "https://i.ytimg.com/vi/4vYOwhll1fs/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "xAWDqdpOlu8",
    title: "Billie Eilish \u2013 WILDFLOWER (Live Performance from Amazon Music\u2019s Songline)",
    artist: "Billie Eilish",
    duration: "04:48",
    duration_seconds: 288,
    cover_url: "https://i.ytimg.com/vi/xAWDqdpOlu8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "viimfQi_pUw",
    title: "Billie Eilish - ocean eyes (Official Music Video)",
    artist: "Billie Eilish",
    duration: "03:21",
    duration_seconds: 201,
    cover_url: "https://i.ytimg.com/vi/viimfQi_pUw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "HJxnfitOmqA",
    title: "Billie Eilish - The 30th (Lyrics) #billieeilish #30th #lyrics #music",
    artist: "Lyrics_well",
    duration: "00:29",
    duration_seconds: 29,
    cover_url: "https://i.ytimg.com/vi/HJxnfitOmqA/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "VJEwGo927jo",
    title: "Billie Eilish Superb Intro \u{1F525}\u263A\uFE0F #billieeilish",
    artist: "DJ Madhuwa",
    duration: "00:16",
    duration_seconds: 16,
    cover_url: "https://i.ytimg.com/vi/VJEwGo927jo/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "5GJWxDKyk3A",
    title: "Billie Eilish - Happier Than Ever (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "05:16",
    duration_seconds: 316,
    cover_url: "https://i.ytimg.com/vi/5GJWxDKyk3A/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "hJeNfNtbUeY",
    title: "Billie Eilish - WILDFLOWER (Live From The iHeartRadio Music Awards, 2025)",
    artist: "BillieEilishVEVO",
    duration: "04:27",
    duration_seconds: 267,
    cover_url: "https://i.ytimg.com/vi/hJeNfNtbUeY/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "cW8VLC9nnTo",
    title: "Billie Eilish - What Was I Made For? (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "04:09",
    duration_seconds: 249,
    cover_url: "https://i.ytimg.com/vi/cW8VLC9nnTo/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "RUQl6YcMalg",
    title: "Billie Eilish - Therefore I Am (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "04:59",
    duration_seconds: 299,
    cover_url: "https://i.ytimg.com/vi/RUQl6YcMalg/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "-PZsSWwc9xA",
    title: "Billie Eilish - all the good girls go to hell",
    artist: "BillieEilishVEVO",
    duration: "03:42",
    duration_seconds: 222,
    cover_url: "https://i.ytimg.com/vi/-PZsSWwc9xA/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "gBRi6aZJGj4",
    title: "Billie Eilish - Bellyache (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "03:31",
    duration_seconds: 211,
    cover_url: "https://i.ytimg.com/vi/gBRi6aZJGj4/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "8ObJEXpmZ10",
    title: "@BillieEilish  - WILDFLOWER (Lyrics)",
    artist: "Dan Music",
    duration: "04:22",
    duration_seconds: 262,
    cover_url: "https://i.ytimg.com/vi/8ObJEXpmZ10/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "BboMpayJomw",
    title: "Billie Eilish - No Time To Die",
    artist: "BillieEilishVEVO",
    duration: "04:00",
    duration_seconds: 240,
    cover_url: "https://i.ytimg.com/vi/BboMpayJomw/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "H_hgw-V-wBI",
    title: "Billie Eilish - Happier Than Ever (64th GRAMMY Awards Performance)",
    artist: "BillieEilishVEVO",
    duration: "05:12",
    duration_seconds: 312,
    cover_url: "https://i.ytimg.com/vi/H_hgw-V-wBI/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "OORBa32WFcM",
    title: "Billie Eilish - NDA (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "03:37",
    duration_seconds: 217,
    cover_url: "https://i.ytimg.com/vi/OORBa32WFcM/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "Ah0Ys50CqO8",
    title: "Billie Eilish - you should see me in a crown (Vertical Video)",
    artist: "Billie Eilish",
    duration: "03:01",
    duration_seconds: 181,
    cover_url: "https://i.ytimg.com/vi/Ah0Ys50CqO8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "geKxhmZL8ao",
    title: "Billie Eilish - BIRDS OF A FEATHER",
    artist: "LatinHype",
    duration: "03:31",
    duration_seconds: 211,
    cover_url: "https://i.ytimg.com/vi/geKxhmZL8ao/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "EgBJmlPo8Xw",
    title: "Billie Eilish - everything i wanted",
    artist: "BillieEilishVEVO",
    duration: "04:48",
    duration_seconds: 288,
    cover_url: "https://i.ytimg.com/vi/EgBJmlPo8Xw/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "WyrZYGmoaFM",
    title: "Billie Eilish - The 30th (Live From Singapore\u2019s Cloud Forest)",
    artist: "BillieEilishVEVO",
    duration: "03:28",
    duration_seconds: 208,
    cover_url: "https://i.ytimg.com/vi/WyrZYGmoaFM/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "_JGGLJMpVks",
    title: "Billie Eilish - TV (Official Lyric Video)",
    artist: "Billie Eilish",
    duration: "04:42",
    duration_seconds: 282,
    cover_url: "https://i.ytimg.com/vi/_JGGLJMpVks/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "am5FI9DkO80",
    title: "Billie Eilish - L\u2019AMOUR DE MA VIE (Official Lyric Video)",
    artist: "BillieEilishVEVO",
    duration: "05:35",
    duration_seconds: 335,
    cover_url: "https://i.ytimg.com/vi/am5FI9DkO80/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "huGd4efgdPA",
    title: "Charli xcx - Guess featuring billie eilish (official video)",
    artist: "Charli xcx",
    duration: "02:41",
    duration_seconds: 161,
    cover_url: "https://i.ytimg.com/vi/huGd4efgdPA/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "_IjWFq1c5M4",
    title: "Billie Eilish - BLUE (Official Lyric Video)",
    artist: "BillieEilishVEVO",
    duration: "05:44",
    duration_seconds: 344,
    cover_url: "https://i.ytimg.com/vi/_IjWFq1c5M4/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "fzeWc3zh01g",
    title: "Billie Eilish - Your Power (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "04:23",
    duration_seconds: 263,
    cover_url: "https://i.ytimg.com/vi/fzeWc3zh01g/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "BY_XwvKogC8",
    title: "Billie Eilish - CHIHIRO (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "05:24",
    duration_seconds: 324,
    cover_url: "https://i.ytimg.com/vi/BY_XwvKogC8/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "MB3VkzPdgLA",
    title: "Billie Eilish - LUNCH (Official Music Video)",
    artist: "BillieEilishVEVO",
    duration: "03:23",
    duration_seconds: 203,
    cover_url: "https://i.ytimg.com/vi/MB3VkzPdgLA/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "HQitbbtPZz8",
    title: "Billie Eilish - Ocean Eyes (Lyrics)",
    artist: "7clouds",
    duration: "03:16",
    duration_seconds: 196,
    cover_url: "https://i.ytimg.com/vi/HQitbbtPZz8/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "IXIqv8rwoHU",
    title: "Bruno Mars & Billie Eilish - Growing Old With You ( Official Lyric Video ) ",
    artist: "trending ai song",
    duration: "04:52",
    duration_seconds: 292,
    cover_url: "https://i.ytimg.com/vi/IXIqv8rwoHU/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "aisAPO3CVoI",
    title: "Billie Eilish - bad guy [ LIVE ]",
    artist: "FASCINIOL\xC2NDIA",
    duration: "03:31",
    duration_seconds: 211,
    cover_url: "https://i.ytimg.com/vi/aisAPO3CVoI/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "KyJEF0AZ2NU",
    title: "Billie Eilish - The 30th (Lyrics)",
    artist: "Dan Music",
    duration: "03:29",
    duration_seconds: 209,
    cover_url: "https://i.ytimg.com/vi/KyJEF0AZ2NU/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "EbtwFqXJeME",
    title: "Billie Eilish - BIRDS OF A FEATHER (Elijah The Boy Remix)",
    artist: "ELIJAH THE BOY",
    duration: "03:39",
    duration_seconds: 219,
    cover_url: "https://i.ytimg.com/vi/EbtwFqXJeME/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "-tn2S3kJlyU",
    title: "Billie Eilish - idontwannabeyouanymore (Official Vertical Video)",
    artist: "BillieEilishVEVO",
    duration: "03:25",
    duration_seconds: 205,
    cover_url: "https://i.ytimg.com/vi/-tn2S3kJlyU/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "hG4lT4fxj8M",
    title: "Billie Eilish - Ocean Eyes (Dance Performance Video)",
    artist: "BillieEilishVEVO",
    duration: "03:21",
    duration_seconds: 201,
    cover_url: "https://i.ytimg.com/vi/hG4lT4fxj8M/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "aZqCFE_9U9o",
    title: "Billie Eilish - THE GREATEST (Live from The Late Show with Stephen Colbert, 2024)",
    artist: "BillieEilishVEVO",
    duration: "05:15",
    duration_seconds: 315,
    cover_url: "https://i.ytimg.com/vi/aZqCFE_9U9o/hqdefault.jpg",
    language: "hindi"
  },
  {
    video_id: "fOAIrUZbOwo",
    title: "Billie Eilish: Tiny Desk Concert",
    artist: "NPR Music",
    duration: "22:19",
    duration_seconds: 1339,
    cover_url: "https://i.ytimg.com/vi/fOAIrUZbOwo/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "m_uBbDkiAIA",
    title: "Billie Eilish - BIRDS OF A FEATHER (Live from The LA28 Olympic Handover)",
    artist: "Billie Eilish",
    duration: "03:41",
    duration_seconds: 221,
    cover_url: "https://i.ytimg.com/vi/m_uBbDkiAIA/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "Dm9Zf1WYQ_A",
    title: "Billie Eilish - my future",
    artist: "BillieEilishVEVO",
    duration: "03:50",
    duration_seconds: 230,
    cover_url: "https://i.ytimg.com/vi/Dm9Zf1WYQ_A/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "d5gf9dXbPi0",
    title: "Billie Eilish - BIRDS OF A FEATHER (Official Lyric Video)",
    artist: "BillieEilishVEVO",
    duration: "03:32",
    duration_seconds: 212,
    cover_url: "https://i.ytimg.com/vi/d5gf9dXbPi0/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "HUHC9tYz8ik",
    title: "Billie Eilish - bury a friend",
    artist: "BillieEilishVEVO",
    duration: "03:33",
    duration_seconds: 213,
    cover_url: "https://i.ytimg.com/vi/HUHC9tYz8ik/hqdefault.jpg",
    language: "english"
  },
  {
    video_id: "-e7wiyNO2us",
    title: "Billie Eilish - ilomilo (Official Audio)",
    artist: "BillieEilishVEVO",
    duration: "02:37",
    duration_seconds: 157,
    cover_url: "https://i.ytimg.com/vi/-e7wiyNO2us/hqdefault.jpg",
    language: "english"
  }
];

// server.ts
import dotenv from "dotenv";
import pg from "pg";
import * as cheerio from "cheerio";
import play from "play-dl";
dotenv.config();
var pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  min: 0,
  connectionTimeoutMillis: 2e4,
  // Neon SSL handshake can take up to 17s on cold start
  idleTimeoutMillis: 3e4,
  allowExitOnIdle: true,
  ssl: process.env.DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : false
});
pool.on("error", (err) => {
  console.error("[DB Pool] Unexpected idle client error:", err.message);
});
async function setupDatabase() {
  try {
    await pool.query("SELECT 1");
    console.log("[DB Pool] \u2705 Connection warm \u2014 checking tables");
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
    console.log("[DB Pool] \u2705 users table ready");
    await pool.query(`
      INSERT INTO users (id, google_id, email, name, picture, role)
      VALUES (9999, 'fallback_id', 'fallback@melo.audio', 'Fallback User', '', 'user')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("[DB Pool] \u2705 Fallback user (ID 9999) ready");
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
    console.log("[DB Pool] \u2705 songs table ready");
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
    console.log("[DB Pool] \u2705 user_listens table ready");
    await pool.query("ALTER TABLE user_listens ADD COLUMN IF NOT EXISTS username VARCHAR(255) DEFAULT 'Google User'");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_cache (
        id SERIAL PRIMARY KEY,
        query VARCHAR(500) UNIQUE NOT NULL,
        video_ids TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] \u2705 search_cache table ready");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_liked_songs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        song_video_id VARCHAR(255) NOT NULL,
        liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, song_video_id)
      );
    `);
    console.log("[DB Pool] \u2705 user_liked_songs table ready");
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
    console.log("[DB Pool] \u2705 user_playlists table ready");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_playlist_songs (
        id SERIAL PRIMARY KEY,
        playlist_id INT NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
        song_video_id VARCHAR(255) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(playlist_id, song_video_id)
      );
    `);
    console.log("[DB Pool] \u2705 user_playlist_songs table ready");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_search_history (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query VARCHAR(500) NOT NULL,
        searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] \u2705 user_search_history table ready");
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
    console.log("[DB Pool] \u2705 jams table ready");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jam_messages (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(10) NOT NULL REFERENCES jams(room_id) ON DELETE CASCADE,
        username VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[DB Pool] \u2705 jam_messages table ready");
  } catch (e) {
    console.warn("[DB Pool] \u26A0\uFE0F Database setup failed (will retry on first request):", e.message);
  }
}
setupDatabase();
async function cacheToDb(songs) {
  const valid = songs.filter((s) => s.videoId && s.videoId.trim().length > 0).map((s) => ({ ...s, videoId: s.videoId.replace(/^(yt_)+/, "") }));
  if (valid.length === 0) return;
  const uniqueSongs = [];
  const seenVideoIds = /* @__PURE__ */ new Set();
  for (const song of valid) {
    if (!seenVideoIds.has(song.videoId)) {
      seenVideoIds.add(song.videoId);
      uniqueSongs.push(song);
    }
  }
  const hindiKw = [
    "tum",
    "kesariya",
    "dil",
    "pyar",
    "aashiqui",
    "singh",
    "dosanjh",
    "pasoori",
    "arijit",
    "jubin",
    "sonu",
    "lata",
    "atif",
    "tere",
    "rabba",
    "sanam",
    "bollywood",
    "t-series",
    "zee music"
  ];
  const values = [];
  const placeholders = [];
  let pi = 0;
  for (const song of uniqueSongs) {
    const base = pi * 7;
    placeholders.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7})`);
    const tl = (song.title + " " + (song.artist || "")).toLowerCase();
    const lang = /[^\x00-\x7F]/.test(song.title) || hindiKw.some((k) => tl.includes(k)) ? "hindi" : "english";
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
      console.log(`[DB Cache] \u2705 Upserted ${uniqueSongs.length} songs (attempt ${attempt})`);
      return;
    } catch (err) {
      console.error(`[DB Cache] \u274C Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1e3));
    }
  }
}
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
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
var allFallbackSongs = [...PRESET_SONGS];
try {
  if (Array.isArray(fallback_songs_default)) {
    const formatted = fallback_songs_default.map((row) => ({
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
    const seenIds = new Set(PRESET_SONGS.map((s) => s.id));
    for (const song of formatted) {
      if (!seenIds.has(song.id)) {
        allFallbackSongs.push(song);
        seenIds.add(song.id);
      }
    }
    console.log(`Loaded ${formatted.length} fallback songs (Total offline: ${allFallbackSongs.length})`);
  }
} catch (err) {
  console.error("Failed to load fallback songs:", err.message);
}
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
  res.json(allFallbackSongs.slice(0, 100));
});
app.post("/api/tracks/cache", async (req, res) => {
  const { videoId, title, artist, duration, durationSeconds, coverUrl, genre } = req.body;
  if (!videoId || !title) {
    return res.status(400).json({ error: "videoId and title are required" });
  }
  const titleLower = (title + " " + (artist || "")).toLowerCase();
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
    "tips"
  ];
  let lang = genre || "english";
  if (lang === "YouTube Music" || lang === "Music" || lang === "Streaming") {
    lang = /[^\x00-\x7F]/.test(title) || hindiKeywords.some((kw) => titleLower.includes(kw)) ? "hindi" : "english";
  }
  try {
    await cacheToDb([{
      videoId,
      title,
      artist: artist || "YouTube Artist",
      duration: duration || "03:00",
      durationSeconds: durationSeconds || 180,
      coverUrl: coverUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      genre
    }]);
    res.json({ success: true });
  } catch (dbErr) {
    console.warn(`[DB Cache] Skipping cache for "${title}":`, dbErr.message);
    res.json({ success: false, cached: false, reason: "db_offline" });
  }
});
app.post("/api/listens", async (req, res) => {
  const { userId, username, songId, songTitle, artist } = req.body;
  if (!username || !songId || !songTitle || !artist) {
    return res.status(400).json({ error: "Missing required listen fields." });
  }
  const numericUserId = userId && userId !== 9999 ? typeof userId === "string" ? parseInt(userId, 10) : userId : null;
  const cleanSongId = songId.replace(/^(yt_)+/, "");
  try {
    await pool.query(`
      INSERT INTO user_listens (user_id, username, song_id, song_title, artist, listened_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [numericUserId, username, cleanSongId, songTitle, artist]);
    res.json({ success: true });
  } catch (err) {
    console.error("[Listen Tracker] Error saving listen:", err.message);
    res.status(500).json({ error: "Failed to record listen.", message: err.message });
  }
});
app.post("/api/sync/update", (req, res) => {
  const { username, currentSongId, isPlaying, progress, songTitle, songArtist, songCoverUrl, roomId } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  if (currentSongId && currentSongId.startsWith("yt_") && songTitle) {
    const videoId = currentSongId.replace(/^(yt_)+/, "");
    cacheToDb([{ videoId, title: songTitle, artist: songArtist || "YouTube Artist", coverUrl: songCoverUrl || "" }]).catch((err) => console.error("[Sync] Auto-cache failed:", err.message));
  }
  const updatedState = {
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
app.get("/api/sync/users", (req, res) => {
  res.json(Array.from(ACTIVE_PLAYBACKS.values()));
});
app.post("/api/jams/create", async (req, res) => {
  const { password, creatorId, capacity } = req.body;
  if (!password || !creatorId) {
    return res.status(400).json({ error: "Password and creatorId are required" });
  }
  let maxUsers = 10;
  if (typeof capacity === "number") {
    maxUsers = Math.max(2, Math.min(10, capacity));
  }
  try {
    let roomId = "";
    let isUnique = false;
    while (!isUnique) {
      roomId = Math.floor(1e7 + Math.random() * 9e7).toString();
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
  } catch (err) {
    console.error("[Jam Room] Create failed:", err.message);
    res.status(500).json({ error: "Failed to create Jam Room", message: err.message });
  }
});
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
  } catch (err) {
    console.error("[Jam Room] Join failed:", err.message);
    res.status(500).json({ error: "Failed to join Jam Room", message: err.message });
  }
});
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
  } catch (err) {
    console.error("[Jam Room] Update failed:", err.message);
    res.status(500).json({ error: "Failed to update Jam Room state", message: err.message });
  }
});
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
  } catch (err) {
    console.error("[Jam Room] Get failed:", err.message);
    res.status(500).json({ error: "Failed to load Jam Room", message: err.message });
  }
});
app.delete("/api/jams/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    await pool.query("DELETE FROM jams WHERE room_id = $1", [roomId]);
    await pool.query("DELETE FROM jam_messages WHERE room_id = $1", [roomId]);
    broadcastUpdate("JAM_DELETE", { room_id: roomId });
    res.json({ success: true });
  } catch (err) {
    console.error("[Jam Room] Delete failed:", err.message);
    res.status(500).json({ error: "Failed to delete Jam Room", message: err.message });
  }
});
app.get("/api/jams/:roomId/messages", async (req, res) => {
  const { roomId } = req.params;
  try {
    const dbResult = await pool.query(
      "SELECT * FROM jam_messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT 100",
      [roomId]
    );
    res.json({ success: true, messages: dbResult.rows });
  } catch (err) {
    console.error("[Jam Chat] Failed to fetch messages:", err.message);
    res.json({ success: true, messages: [] });
  }
});
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
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    const dbResult = await pool.query(
      "INSERT INTO jam_messages (room_id, username, message) VALUES ($1, $2, $3) RETURNING *",
      [roomId, username, cleanMessage]
    );
    const savedMsg = dbResult.rows[0];
    broadcastUpdate("JAM_MESSAGE", savedMsg);
    res.json({ success: true, message: savedMsg });
  } catch (err) {
    console.warn("[Jam Chat] DB Save failed, broadcasting in memory:", err.message);
    broadcastUpdate("JAM_MESSAGE", msgObj);
    res.json({ success: true, message: msgObj });
  }
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
app.post("/api/smart/search", async (req, res) => {
  const { query, limit = 20 } = req.body;
  if (!query || !query.trim()) {
    return res.json({ results: [], source: "none", didYouMean: "" });
  }
  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();
  const words = cleanQuery.split(/\s+/).filter((w) => w.length > 0);
  try {
    const cacheResult = await pool.query("SELECT video_ids FROM search_cache WHERE query = $1", [cacheKey]);
    if (cacheResult.rows.length > 0) {
      const videoIds = cacheResult.rows[0].video_ids;
      if (videoIds && videoIds.length > 0) {
        const songsResult = await pool.query(
          "SELECT * FROM songs WHERE video_id = ANY($1)",
          [videoIds]
        );
        const songMap = new Map(songsResult.rows.map((row) => [row.video_id, row]));
        const songs = videoIds.map((vid) => songMap.get(vid)).filter(Boolean).map((row) => ({
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
        if (songs.length > 0) {
          console.log(`[Smart Search] \u26A1 QUERY CACHE HIT: "${cacheKey}" \u2192 ${songs.length} results`);
          return res.json({ results: songs, source: "database", didYouMean: "" });
        }
      }
    }
  } catch (cacheErr) {
    console.warn(`[Smart Search] \u26A0\uFE0F Query cache lookup failed for "${cleanQuery}":`, cacheErr.message);
  }
  if (words.length > 0) {
    try {
      const conditions = [];
      const values = [];
      words.forEach((word, idx) => {
        conditions.push(`(title ILIKE $${idx + 1} OR artist ILIKE $${idx + 1})`);
        values.push(`%${word}%`);
      });
      const limitParamIndex = words.length + 1;
      values.push(limit);
      const sql = `
        SELECT * FROM songs
        WHERE ${conditions.join(" AND ")}
        LIMIT $${limitParamIndex}
      `;
      const dbResult = await pool.query(sql, values);
      if (dbResult.rows.length > 0) {
        let rows = [...dbResult.rows];
        const lowerQuery = cleanQuery.toLowerCase();
        rows.sort((a, b) => {
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          const aArtist = a.artist.toLowerCase();
          const bArtist = b.artist.toLowerCase();
          const aFullMatch = aTitle.includes(lowerQuery) || aArtist.includes(lowerQuery);
          const bFullMatch = bTitle.includes(lowerQuery) || bArtist.includes(lowerQuery);
          if (aFullMatch && !bFullMatch) return -1;
          if (!aFullMatch && bFullMatch) return 1;
          if (aTitle === lowerQuery) return -1;
          if (bTitle === lowerQuery) return 1;
          return a.title.localeCompare(b.title);
        });
        const songs = rows.map((row) => ({
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
        const videoIdsToCache = songs.map((s) => s.videoId);
        if (videoIdsToCache.length > 0) {
          pool.query(`
            INSERT INTO search_cache (query, video_ids)
            VALUES ($1, $2)
            ON CONFLICT (query) DO UPDATE
            SET video_ids = EXCLUDED.video_ids, created_at = CURRENT_TIMESTAMP
          `, [cacheKey, videoIdsToCache]).catch((err) => {
            console.warn("[Smart Search] Failed to write query cache for DB hit:", err.message);
          });
        }
        console.log(`[Smart Search] \u26A1 DB HIT: "${cleanQuery}" \u2192 ${songs.length} cached results`);
        return res.json({ results: songs, source: "database", didYouMean: "" });
      }
    } catch (dbErr) {
      console.error(`[Smart Search] \u274C DB ILIKE query failed for "${cleanQuery}": ${dbErr?.message}`);
    }
  }
  if (!YOUTUBE_API_KEY) {
    const q = cleanQuery.toLowerCase();
    const fallbacks = allFallbackSongs.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)).slice(0, limit);
    console.log(`[Smart Search] No YT key. In-memory fallback: ${fallbacks.length} results`);
    return res.json({ results: fallbacks, source: "fallback", didYouMean: "" });
  }
  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", cleanQuery);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("videoCategoryId", "10");
    searchUrl.searchParams.set("maxResults", String(limit));
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
    const ytResponse = await fetch(searchUrl.toString());
    if (!ytResponse.ok) {
      throw new Error(`YouTube API ${ytResponse.status}: ${await ytResponse.text()}`);
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
        const detRes = await fetch(detailsUrl.toString());
        if (detRes.ok) {
          for (const item of (await detRes.json()).items || []) {
            const secs = parseISO8601Duration(item.contentDetails?.duration || "PT0S");
            durationsMap[item.id] = { duration: formatDuration(secs), durationSeconds: secs };
          }
        }
      } catch (dErr) {
        console.warn("[Smart Search] Duration fetch failed:", dErr);
      }
    }
    const ytSongs = (ytData.items || []).map((item) => {
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
    const validSongs = ytSongs.filter((s) => s.videoId && s.videoId.trim().length > 0);
    if (validSongs.length > 0) {
      const seenIds = new Set(allFallbackSongs.map((s) => s.id));
      for (const song of validSongs) {
        if (!seenIds.has(song.id)) {
          allFallbackSongs.push(song);
          seenIds.add(song.id);
        }
      }
      await cacheToDb(validSongs);
      const videoIdsToCache = validSongs.map((s) => s.videoId);
      try {
        await pool.query(`
          INSERT INTO search_cache (query, video_ids)
          VALUES ($1, $2)
          ON CONFLICT (query) DO UPDATE
          SET video_ids = EXCLUDED.video_ids, created_at = CURRENT_TIMESTAMP
        `, [cacheKey, videoIdsToCache]);
        console.log(`[Smart Search] \u{1F4BE} Query cache saved: "${cacheKey}" -> [${videoIdsToCache.join(",")}]`);
      } catch (cacheWriteErr) {
        console.warn(`[Smart Search] Failed to write query cache for YouTube fetch:`, cacheWriteErr.message);
      }
    }
    console.log(`[Smart Search] \u{1F534} YouTube LIVE: "${cleanQuery}" \u2192 ${ytSongs.length} results \u2014 cached to Neon`);
    return res.json({ results: ytSongs, source: "youtube", didYouMean: "" });
  } catch (ytErr) {
    console.error("[Smart Search] YouTube API failed:", ytErr?.message);
    const q = cleanQuery.toLowerCase();
    const fallbacks = allFallbackSongs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    ).slice(0, limit);
    return res.json({ results: fallbacks, source: "fallback", didYouMean: "" });
  }
});
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
  } catch (err) {
    res.status(503).json({ status: "error", error: err.message });
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
    if (stream && stream.url) {
      console.log(`[Stream API] Successfully resolved stream URL. Redirecting client...`);
      return res.redirect(stream.url);
    } else {
      throw new Error("No stream URL returned from play-dl");
    }
  } catch (error) {
    console.error("[Stream API] Failed to resolve stream:", error);
    res.status(500).json({ error: "Failed to resolve stream: " + error.message });
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
      } catch (dbErr) {
        console.warn(`[Guest Auth DB Attempt ${attempt} Warning] DB query failed:`, dbErr.message);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 2e3));
        }
      }
    }
    if (!dbSuccess) {
      console.warn("[Guest Auth Fallback] Database unreachable after retries, using in-memory guest user.");
      user = {
        id: 9999,
        google_id: googleId,
        email,
        name,
        picture,
        role: "admin",
        created_at: /* @__PURE__ */ new Date(),
        last_login: /* @__PURE__ */ new Date()
      };
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    let dbSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const existingUserResult = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );
        if (existingUserResult.rows.length > 0) {
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
      } catch (dbErr) {
        console.warn(`[Google Auth DB Attempt ${attempt} Warning] DB query failed:`, dbErr.message);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 2e3));
        }
      }
    }
    if (!dbSuccess) {
      console.warn("[Google Auth Fallback] Database unreachable after retries. Using local user session.");
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
    let totalSongs = allFallbackSongs.length;
    let userListensDaily = [];
    let userListensRecent = [];
    try {
      const registeredCountResult = await pool.query("SELECT COUNT(*) FROM users");
      totalRegisteredUsers = parseInt(registeredCountResult.rows[0].count, 10);
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
      const songsCountResult = await pool.query("SELECT COUNT(*) FROM songs");
      totalSongs = parseInt(songsCountResult.rows[0].count, 10);
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
          last_login: /* @__PURE__ */ new Date(),
          listens_today: 13,
          listens_total: 154
        }
      ];
      totalRegisteredUsers = registeredUsers.length;
      userListensDaily = [
        { username: "Aria Vance", date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0], count: 8 },
        { username: "Julian Thorne", date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0], count: 5 }
      ];
      userListensRecent = [
        { username: "Aria Vance", song_title: "Kesariya", artist: "Arijit Singh", timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").split(".")[0] },
        { username: "Julian Thorne", song_title: "Midnight City", artist: "M83", timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").split(".")[0] }
      ];
    }
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
  } catch (error) {
    console.error("[Admin Users] Error updating role:", error);
    if (numericUserId === 9999 || String(numericUserId) === "9999") {
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
  } catch (error) {
    console.error("[Admin Users] Error deleting user:", error);
    if (numericUserId === 9999 || String(numericUserId) === "9999") {
      return res.json({ success: true, message: "Mock user deleted successfully (DB Offline)." });
    }
    res.status(500).json({ error: "Internal server error deleting user.", message: error.message });
  }
});
app.get("/api/admin/songs", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }
  const { query, limit = 50, offset = 0 } = req.query;
  const limitNum = parseInt(limit, 10) || 50;
  const offsetNum = parseInt(offset, 10) || 0;
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
  } catch (error) {
    console.error("[Admin Songs] Error fetching songs:", error);
    res.status(500).json({ error: "Failed to fetch songs.", message: error.message });
  }
});
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
  } catch (error) {
    console.error("[Admin Songs] Error deleting song:", error);
    res.status(500).json({ error: "Failed to delete song.", message: error.message });
  }
});
app.get("/api/admin/search-cache", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }
  try {
    const dbResult = await pool.query("SELECT * FROM search_cache ORDER BY created_at DESC LIMIT 100");
    res.json({ success: true, cache: dbResult.rows });
  } catch (error) {
    console.error("[Admin Cache] Error fetching search cache:", error);
    res.status(500).json({ error: "Failed to fetch search cache.", message: error.message });
  }
});
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
  } catch (error) {
    console.error("[Admin Cache] Error deleting search cache item:", error);
    res.status(500).json({ error: "Failed to delete cache item.", message: error.message });
  }
});
app.delete("/api/admin/search-cache", async (req, res) => {
  const adminPasswordHeader = req.headers["x-admin-password"];
  if (adminPasswordHeader !== "mulbeery" && adminPasswordHeader !== "mulberry") {
    return res.status(401).json({ error: "Unauthorized. Invalid admin password." });
  }
  try {
    await pool.query("DELETE FROM search_cache");
    res.json({ success: true, message: "Search cache successfully cleared." });
  } catch (error) {
    console.error("[Admin Cache] Error clearing search cache:", error);
    res.status(500).json({ error: "Failed to clear search cache.", message: error.message });
  }
});
app.get("/api/user/likes", async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const { rows } = await pool.query(
      "SELECT song_video_id FROM user_liked_songs WHERE user_id = $1 ORDER BY liked_at DESC",
      [userId]
    );
    res.json(rows.map((r) => r.song_video_id));
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/user/likes", async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  const { videoId } = req.query;
  if (isNaN(userId) || !videoId) return res.status(400).json({ error: "Missing fields" });
  try {
    const cleanVideoId = videoId.replace(/^(yt_)+/, "");
    await pool.query(
      "DELETE FROM user_liked_songs WHERE user_id = $1 AND song_video_id = $2",
      [userId, cleanVideoId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/user/history", async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const { rows } = await pool.query(
      "SELECT song_id, song_title, artist, listened_at FROM user_listens WHERE user_id = $1 ORDER BY listened_at DESC LIMIT 50",
      [userId]
    );
    res.json(rows);
  } catch (err) {
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
    const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [parseInt(userId, 10)]);
    const username = userRes.rows[0]?.name || "Google User";
    await pool.query(
      `INSERT INTO user_listens (user_id, username, song_id, song_title, artist, listened_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [parseInt(userId, 10), username, cleanSongId, title, artist]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("[History Tracker] Error saving history:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/user/search-history", async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const { rows } = await pool.query(
      "SELECT id, query, searched_at FROM user_search_history WHERE user_id = $1 ORDER BY searched_at DESC LIMIT 20",
      [userId]
    );
    res.json(rows);
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/user/search-history", async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  const id = req.query.id ? parseInt(req.query.id, 10) : null;
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    if (id) {
      await pool.query("DELETE FROM user_search_history WHERE user_id = $1 AND id = $2", [userId, id]);
    } else {
      await pool.query("DELETE FROM user_search_history WHERE user_id = $1", [userId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/user/playlists", async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const { rows } = await pool.query(
      `SELECT p.id::text, p.name, p.description, p.cover_url,
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
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || "Dynamic high-fidelity music collection.",
      isCustom: true,
      songs: r.songs,
      coverUrl: r.cover_url || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300"
    })));
  } catch (err) {
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
      songVideoIds: songsRes.rows.map((r) => r.song_video_id)
    });
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/user/playlists/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid playlist ID" });
  try {
    await pool.query("DELETE FROM user_playlists WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/user/playlists/songs", async (req, res) => {
  const { playlistId, songVideoId, title, artist, coverUrl, duration, durationSeconds } = req.body;
  if (!playlistId || !songVideoId) return res.status(400).json({ error: "Missing fields" });
  try {
    const cleanSongId = songVideoId.replace(/^(yt_)+/, "");
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/user/playlists/songs", async (req, res) => {
  const playlistId = parseInt(req.query.playlistId, 10);
  const songVideoId = req.query.songVideoId;
  if (isNaN(playlistId) || !songVideoId) return res.status(400).json({ error: "Missing fields" });
  try {
    const cleanSongId = songVideoId.replace(/^(yt_)+/, "");
    await pool.query(
      "DELETE FROM user_playlist_songs WHERE playlist_id = $1 AND song_video_id = $2",
      [playlistId, cleanSongId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
      // Custom so we can route /admin and / independently
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
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
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1y",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
      }
    }));
    app.get("/admin*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "admin.html"));
    });
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
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
