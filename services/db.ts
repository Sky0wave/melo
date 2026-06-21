import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ==========================================
// TYPESCRIPT TYPES & INTERFACES
// ==========================================

export interface DbUser {
  id: string;
  name: string;
  email: string;
  image_url?: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  youtube_url: string;
  created_at?: string;
  coverUrl?: string;
  durationSeconds?: number;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  cover_image?: string | null;
  created_at: string;
  songs?: Song[];
}

export interface PlaylistSong {
  id: string;
  playlist_id: string;
  song_id: string;
  created_at?: string;
}

export interface LikedSong {
  id: string;
  user_id: string;
  song_id: string;
  created_at: string;
}

export interface RecentlyPlayed {
  id: string;
  user_id: string;
  song_id: string;
  played_at: string;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  theme: 'dark' | 'light' | 'system';
  audio_quality: 'low' | 'medium' | 'high' | 'lossless';
  notifications: boolean;
}

export interface Download {
  id: string;
  user_id: string;
  song_id: string;
  downloaded_at: string;
}

export interface ListeningHistory {
  id: string;
  user_id: string;
  song_id: string;
  duration_seconds: number;
  listened_at: string;
}

export interface Jam {
  id: string;
  room_id: string;
  password?: string;
  creator_id: string;
  current_song_id?: string | null;
  current_song_progress: number;
  current_song_is_playing: boolean;
  created_at: string;
  updated_at: string;
}

export interface JamMessage {
  id: string;
  room_id: string;
  username: string;
  message: string;
  created_at: string;
}

// ==========================================
// DYNAMIC BACKEND RESOLUTION
// ==========================================

let devHost = 'localhost';
let isTunnel = false;
try {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    devHost = hostUri.split(':')[0];
    if (devHost.includes('exp.direct') || devHost.includes('ngrok')) {
      isTunnel = true;
    }
  }
} catch (e) {
  console.warn('[dbService] Failed to read hostUri:', e);
}

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://melo-black.vercel.app';
console.log(`[dbService] Backend API configured at: ${BACKEND_URL}`);

// Robust fetch helper with timeout to prevent hanging calls on native builds
const nativeFetch = global.fetch;
const fetchWithTimeout = async (resource: string | URL | Request, options: RequestInit & { timeout?: number } = {}): Promise<Response> => {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await nativeFetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};
const fetch = fetchWithTimeout;

if (isTunnel && !process.env.EXPO_PUBLIC_BACKEND_URL) {
  console.warn(
    '\n[dbService] ⚠️ WARNING: You are running Expo with a tunnel, but no EXPO_PUBLIC_BACKEND_URL is set.\n' +
    `Connecting to http://${devHost}:3000 will fail because the tunnel only forwards Metro.\n` +
    'To connect the app to the backend:\n' +
    '1. Connect your phone and computer to the same local Wi-Fi and run "npx expo start" (without --tunnel).\n' +
    '2. OR, tunnel the backend port 3000 (e.g. using ngrok) and run: EXPO_PUBLIC_BACKEND_URL=https://your-backend-tunnel.ngrok.io npx expo start --tunnel\n'
  );
}

// ==========================================
// HELPERS
// ==========================================

export function getYoutubeVideoId(url: string, id: string): string {
  if (id && id.startsWith('yt_')) {
    return id.replace(/^(yt_)+/, '');
  }
  if (!url) return id || '';
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
  } catch (e) {}
  return id || '';
}

export function getSongCoverUrl(song?: { id: string; youtube_url?: string; coverUrl?: string } | null): string {
  if (!song) return 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300';
  if (song.coverUrl) return song.coverUrl;
  const videoId = getYoutubeVideoId(song.youtube_url || '', song.id);
  if (videoId && videoId.length === 11) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300';
}

// Default Seed Songs matching web defaults as fallback
export const SEED_SONGS: Song[] = [
  { id: 'vivid_obsessions', title: 'Vivid Obsessions', artist: 'Elena Cross', youtube_url: 'https://www.youtube.com/watch?v=vivid_obsessions', coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGWAh1VFYsxQ0g-qkNGuQGf-Ng7SUaWAqeUKBUrzObFGk8LREsSS52TQWm16L6PJQGUHBbtO5-fyjwCJiAYeUQuiBtWFnvAPRR-Mw7GlV64-6H9ymHsuAOAXSGTAKrJph6khODQ2v-6nQZvwwXhwuNSo5TkbarQ6nSUF_VOigBsNqgPokeRGsZGOXc6IgrMPJI7yTO7m4jDmsxZl3IEZfI5Rwzg96R7-01Pzxf0ZISu_7XOu40w9muva4OIYlVenxofxFUPu5o5EM', durationSeconds: 222 },
  { id: 'midnight_bloom', title: 'Midnight Bloom', artist: 'The Quintet', youtube_url: 'https://www.youtube.com/watch?v=midnight_bloom', coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA63bp1UMtapYi6fPhLuMwB2cKTS5VktL8SZVj0TaEGR6gU3BgrnSALCh0BTA9Ap51nhR3P4yDlVKfF5dUcNourcoZo0wWxAVe9R9E6L48viehYWYDe6nNRbyB32Hy3fcy4r0P_hSM5xbTqpg3taHf0cRwkO2Xy1ovWEza_505NPfjBfN8uPqaO-TrU7VlK4KObfJ2AVcDBQfsqJKJLk9_FA2KL1xkzoh3QwPYA9hEBFr862kdgfFVSqnGSbUMEE4RIGaCsSvCbfYg', durationSeconds: 250 },
  { id: 'subsonic_waves', title: 'Subsonic Waves', artist: 'Aura Digital', youtube_url: 'https://www.youtube.com/watch?v=subsonic_waves', coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVvNydBj_g56HeqfdTofcEDY5vWPDz_oI8PLg68HQ-3adjQZ5t1KpuYaT536BpB-PIq6DNHPa6xMfMOzSi-0ow9wVLDCg7ZHWUA2GwPcn0_pSxzhTvmjZjrrYezC3_1T_cyFmJK-51y09J7bwXV45vjFStBEfF2fClNZkS9ulcYE8H-Dv8S01H6Ttf5nZe0B0U2z9z8sZKzCFePi3dAvtaecs7mj8qlvgxc4MzfadB5KnVU6rjREoZG8auMsF1sPtulew62WSWuz4', durationSeconds: 312 },
  { id: 'nocturnal_radiance', title: 'Nocturnal Radiance', artist: 'AETHERIS', youtube_url: 'https://www.youtube.com/watch?v=nocturnal_radiance', coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZB17HlkwoRIoV6mcyhJyW6ePcvosKZxu0gwF_ONaBuyyEQhRrk8a8sxdfgxsRv0vDFWkHr0V5tj4fAK0YQ_FIRFgc_hQqXkVcBxxLPlHz2VxQLkz1GdYMQKZemoSKqrAtekSmNqkdakREq-djoQfCLjbbNgO5R491f3rhWpc_WqjJsC4DzsmVczaNltKQJ6O06q3BHoolUwrpbEg2hqTv15oMgwIRmAFVA89h-r-B2hMV3BvAUNI1PWaLEB-l0o9lpm_sk-4F11g', durationSeconds: 312 }
];

// ==========================================
// USER-ISOLATED LOCAL STORAGE HELPERS
// ==========================================

async function getUserLocal<T>(userId: string, key: string, defaultValue: T): Promise<T> {
  const userKey = `melo_user_${userId}_${key}`;
  const data = await AsyncStorage.getItem(userKey);
  return data ? JSON.parse(data) : defaultValue;
}

async function saveUserLocal(userId: string, key: string, data: any): Promise<void> {
  const userKey = `melo_user_${userId}_${key}`;
  await AsyncStorage.setItem(userKey, JSON.stringify(data));
}

// ==========================================
// API DB SERVICE CONNECTED TO POSTGRES BACKEND
// ==========================================

export const dbService = {
  // ==========================================
  // AUTHENTICATION & USER PROFILES
  // ==========================================
  async getCurrentUser(): Promise<DbUser | null> {
    const currentUser = await AsyncStorage.getItem('mock_current_user');
    return currentUser ? JSON.parse(currentUser) : null;
  },

  async loginGuest(name?: string, email?: string): Promise<DbUser> {
    const res = await fetch(`${BACKEND_URL}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    if (!res.ok) throw new Error('Guest login failed');
    const data = await res.json();
    if (!data.success || !data.user) throw new Error('Invalid user payload');
    
    const dbUser: DbUser = {
      id: data.user.id.toString(),
      name: data.user.name,
      email: data.user.email,
      role: data.user.role || 'user',
      image_url: data.user.picture,
      created_at: data.user.created_at || new Date().toISOString()
    };
    
    await AsyncStorage.setItem('mock_current_user', JSON.stringify(dbUser));
    return dbUser;
  },

  // ==========================================
  // SHARED SONGS CATALOG
  // ==========================================
  async getSongs(): Promise<Song[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tracks`);
      if (!res.ok) throw new Error();
      const songs = await res.json();
      return songs.map((s: any) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        youtube_url: s.youtube_url || (s.videoId ? `https://www.youtube.com/watch?v=${s.videoId}` : ''),
        coverUrl: s.coverUrl || s.cover_url,
        durationSeconds: s.durationSeconds || s.duration_seconds || 180
      }));
    } catch {
      // Fallback in case of server offline
      return SEED_SONGS;
    }
  },

  async getSongById(songId: string): Promise<Song | null> {
    try {
      const allSongs = await this.getSongs();
      const song = allSongs.find(s => s.id === songId);
      if (song) return song;

      if (songId.startsWith('yt_')) {
        const videoId = songId.replace('yt_', '');
        const res = await fetch(`${BACKEND_URL}/api/youtube/video/${videoId}`);
        if (res.ok) {
          const data = await res.json();
          return {
            id: songId,
            title: data.title,
            artist: data.artist,
            youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
            coverUrl: data.coverUrl,
            durationSeconds: data.durationSeconds
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  async addSong(title: string, artist: string, youtubeUrl: string): Promise<Song> {
    const videoId = getYoutubeVideoId(youtubeUrl, '');
    const coverUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    
    const res = await fetch(`${BACKEND_URL}/api/tracks/cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        title,
        artist,
        coverUrl,
        duration: '03:00',
        durationSeconds: 180,
        genre: 'Streaming'
      })
    });
    
    if (!res.ok) throw new Error('Failed to cache track on backend');
    
    return {
      id: `yt_${videoId}`,
      title,
      artist,
      youtube_url: youtubeUrl,
      coverUrl,
      durationSeconds: 180
    };
  },

  // ==========================================
  // PLAYLISTS (Neon DB persistent)
  // ==========================================
  async getPlaylists(userId: string): Promise<Playlist[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/playlists?userId=${userId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((p: any) => ({
        id: p.id,
        user_id: userId,
        name: p.name,
        cover_image: p.coverUrl || p.cover_image,
        created_at: new Date().toISOString(),
        songs: p.songs?.map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          youtube_url: `https://www.youtube.com/watch?v=${s.videoId}`,
          coverUrl: s.coverUrl,
          durationSeconds: s.durationSeconds
        })) || []
      }));
    } catch {
      return [];
    }
  },

  async createPlaylist(userId: string, name: string, coverImage?: string): Promise<Playlist> {
    const res = await fetch(`${BACKEND_URL}/api/user/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        name,
        description: 'Mobile App Playlist',
        coverUrl: coverImage || null
      })
    });
    if (!res.ok) throw new Error('Failed to create playlist');
    const data = await res.json();
    return {
      id: data.id.toString(),
      user_id: userId,
      name: data.name,
      cover_image: data.cover_url || coverImage || null,
      created_at: new Date().toISOString(),
      songs: []
    };
  },

  async deletePlaylist(userId: string, playlistId: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/api/user/playlists/${playlistId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete playlist');
  },

  // ==========================================
  // PLAYLIST SONGS
  // ==========================================
  async getSongsInPlaylist(userId: string, playlistId: string): Promise<Song[]> {
    const playlists = await this.getPlaylists(userId);
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist?.songs || [];
  },

  async addSongToPlaylist(userId: string, playlistId: string, songId: string): Promise<void> {
    const videoId = getYoutubeVideoId('', songId);
    const allSongs = await this.getSongs();
    const song = allSongs.find(s => s.id === songId);
    
    const res = await fetch(`${BACKEND_URL}/api/user/playlists/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playlistId,
        songVideoId: videoId,
        title: song?.title || 'Track',
        artist: song?.artist || 'Unknown Artist',
        coverUrl: getSongCoverUrl(song),
        duration: '03:00',
        durationSeconds: 180
      })
    });
    if (!res.ok) throw new Error('Failed to add song to playlist');
  },

  async removeSongFromPlaylist(userId: string, playlistId: string, songId: string): Promise<void> {
    const videoId = getYoutubeVideoId('', songId);
    const res = await fetch(`${BACKEND_URL}/api/user/playlists/songs?playlistId=${playlistId}&songVideoId=${videoId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove song from playlist');
  },

  // ==========================================
  // LIKED SONGS (FAVORITES)
  // ==========================================
  async getFavorites(userId: string): Promise<Song[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/likes?userId=${userId}`);
      if (!res.ok) return [];
      const likes: string[] = await res.json();
      
      const allSongs = await this.getSongs();
      return allSongs.filter(s => {
        const videoId = getYoutubeVideoId(s.youtube_url || '', s.id);
        return likes.includes(videoId);
      });
    } catch {
      return [];
    }
  },

  async isFavorite(userId: string, songId: string): Promise<boolean> {
    try {
      const videoId = getYoutubeVideoId('', songId);
      const res = await fetch(`${BACKEND_URL}/api/user/likes?userId=${userId}`);
      if (!res.ok) return false;
      const likes: string[] = await res.json();
      return likes.includes(videoId);
    } catch {
      return false;
    }
  },

  async toggleFavorite(userId: string, songId: string): Promise<boolean> {
    const videoId = getYoutubeVideoId('', songId);
    const isFav = await this.isFavorite(userId, songId);
    if (isFav) {
      const res = await fetch(`${BACKEND_URL}/api/user/likes?userId=${userId}&videoId=${videoId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to unlike song');
      return false;
    } else {
      const res = await fetch(`${BACKEND_URL}/api/user/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, videoId })
      });
      if (!res.ok) throw new Error('Failed to like song');
      return true;
    }
  },

  // ==========================================
  // RECENTLY PLAYED
  // ==========================================
  async getRecentlyPlayed(userId: string): Promise<Song[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/history?userId=${userId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((h: any) => ({
        id: `yt_${h.song_id}`,
        title: h.song_title,
        artist: h.artist,
        youtube_url: `https://www.youtube.com/watch?v=${h.song_id}`,
        coverUrl: `https://img.youtube.com/vi/${h.song_id}/hqdefault.jpg`,
        durationSeconds: 180
      }));
    } catch {
      return [];
    }
  },

  async recordRecentlyPlayed(userId: string, songId: string): Promise<void> {
    try {
      const allSongs = await this.getSongs();
      const song = allSongs.find(s => s.id === songId);
      const title = song?.title || 'Unknown Song';
      const artist = song?.artist || 'Unknown Artist';
      const videoId = getYoutubeVideoId('', songId);
      
      await fetch(`${BACKEND_URL}/api/user/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          songVideoId: videoId,
          title,
          artist
        })
      });
    } catch (err) {
      console.warn('Error recording recently played to server:', err);
    }
  },

  // ==========================================
  // SEARCH HISTORY
  // ==========================================
  async getSearchHistory(userId: string): Promise<SearchHistory[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/search-history?userId=${userId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((item: any) => ({
        id: item.id.toString(),
        user_id: userId,
        query: item.query,
        created_at: item.searched_at
      }));
    } catch {
      return [];
    }
  },

  async addSearchQuery(userId: string, query: string): Promise<void> {
    if (!query.trim()) return;
    try {
      await fetch(`${BACKEND_URL}/api/user/search-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, query: query.trim() })
      });
    } catch (err) {
      console.warn('Error adding search query:', err);
    }
  },

  async clearSearchHistory(userId: string): Promise<void> {
    try {
      await fetch(`${BACKEND_URL}/api/user/search-history?userId=${userId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Error clearing search history:', err);
    }
  },

  // ==========================================
  // SETTINGS (Local AsyncStorage cache)
  // ==========================================
  async getSettings(userId: string): Promise<Settings> {
    const defaultSettings: Settings = {
      id: 'default',
      user_id: userId,
      theme: 'dark',
      audio_quality: 'high',
      notifications: true
    };
    return await getUserLocal<Settings>(userId, 'settings', defaultSettings);
  },

  async updateSettings(userId: string, updates: Partial<Omit<Settings, 'id' | 'user_id'>>): Promise<Settings> {
    const current = await this.getSettings(userId);
    const updated = { ...current, ...updates };
    await saveUserLocal(userId, 'settings', updated);
    return updated;
  },

  // ==========================================
  // DOWNLOADS (Local AsyncStorage cache)
  // ==========================================
  async getDownloads(userId: string): Promise<Song[]> {
    const downloads = await getUserLocal<Download[]>(userId, 'downloads', []);
    const songIds = downloads.map(d => d.song_id);
    const allSongs = await this.getSongs();
    return allSongs.filter(s => songIds.includes(s.id));
  },

  async isDownloaded(userId: string, songId: string): Promise<boolean> {
    const downloads = await getUserLocal<Download[]>(userId, 'downloads', []);
    return downloads.some(d => d.song_id === songId);
  },

  async toggleDownload(userId: string, songId: string): Promise<boolean> {
    const isDown = await this.isDownloaded(userId, songId);
    if (isDown) {
      let downloads = await getUserLocal<Download[]>(userId, 'downloads', []);
      downloads = downloads.filter(d => d.song_id !== songId);
      await saveUserLocal(userId, 'downloads', downloads);
      return false;
    } else {
      const downloads = await getUserLocal<Download[]>(userId, 'downloads', []);
      downloads.push({
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        song_id: songId,
        downloaded_at: new Date().toISOString()
      });
      await saveUserLocal(userId, 'downloads', downloads);
      return true;
    }
  },

  // ==========================================
  // LISTENING HISTORY
  // ==========================================
  async getListeningHistory(userId: string): Promise<Song[]> {
    return await this.getRecentlyPlayed(userId);
  },

  async recordListeningEvent(userId: string, songId: string, durationSeconds: number): Promise<void> {
    await this.recordRecentlyPlayed(userId, songId);
  },

  // ==========================================
  // ADMIN PANEL APIS
  // ==========================================
  async isAdmin(userId: string): Promise<boolean> {
    const userStr = await AsyncStorage.getItem('mock_current_user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    return user.role === 'admin';
  },

  async adminGetAllUsers(): Promise<DbUser[]> {
    return [];
  },

  async adminGetAllPlaylists(): Promise<Playlist[]> {
    return [];
  },

  async adminGetAllListeningHistory(): Promise<ListeningHistory[]> {
    return [];
  },

  // ==========================================
  // JAM ROOM APIS (Neon DB persistent)
  // ==========================================
  async createJam(roomId: string, password: string, creatorId: string): Promise<Jam> {
    const res = await fetch(`${BACKEND_URL}/api/jams/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, creatorId, capacity: 10 })
    });
    if (!res.ok) throw new Error('Failed to create Jam Room on server');
    
    return {
      id: roomId,
      room_id: roomId,
      password,
      creator_id: creatorId,
      current_song_id: null,
      current_song_progress: 0,
      current_song_is_playing: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  async getJam(roomId: string): Promise<Jam | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/jams/${roomId}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.success || !data.jam) return null;
      
      return {
        id: data.jam.room_id,
        room_id: data.jam.room_id,
        creator_id: data.jam.creator_id,
        current_song_id: data.jam.current_song_id,
        current_song_progress: data.jam.current_song_progress,
        current_song_is_playing: data.jam.current_song_is_playing,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch {
      return null;
    }
  },

  async updateJam(roomId: string, updates: Partial<Omit<Jam, 'id' | 'room_id' | 'creator_id'>>): Promise<void> {
    try {
      const payload: any = {};
      if (updates.current_song_id !== undefined) payload.currentSongId = updates.current_song_id;
      if (updates.current_song_progress !== undefined) payload.progress = updates.current_song_progress;
      if (updates.current_song_is_playing !== undefined) payload.isPlaying = updates.current_song_is_playing;
      
      if (updates.current_song_id) {
        const allSongs = await this.getSongs();
        const song = allSongs.find(s => s.id === updates.current_song_id);
        if (song) {
          payload.songTitle = song.title;
          payload.songArtist = song.artist;
          payload.songCoverUrl = getSongCoverUrl(song);
        }
      }
      
      await fetch(`${BACKEND_URL}/api/jams/${roomId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Failed to update Jam room on server:', err);
    }
  },

  async deleteJam(roomId: string): Promise<void> {
    try {
      await fetch(`${BACKEND_URL}/api/jams/${roomId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Failed to delete Jam room on server:', err);
    }
  },

  // ==========================================
  // JAM CHAT APIS
  // ==========================================
  async getJamMessages(roomId: string): Promise<JamMessage[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/jams/${roomId}/messages`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.success && Array.isArray(data.messages) ? data.messages.map((m: any) => ({
        id: m.id ? m.id.toString() : Math.random().toString(36).substring(7),
        room_id: roomId,
        username: m.username,
        message: m.message,
        created_at: m.created_at
      })) : [];
    } catch {
      return [];
    }
  },

  async sendChatMessage(roomId: string, username: string, message: string): Promise<JamMessage | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/jams/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, message })
      });
      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();
      if (data.success && data.message) {
        return {
          id: data.message.id ? data.message.id.toString() : Math.random().toString(36).substring(7),
          room_id: roomId,
          username: data.message.username,
          message: data.message.message,
          created_at: data.message.created_at
        };
      }
      return null;
    } catch (err) {
      console.warn('Failed to send chat message to server:', err);
      return null;
    }
  },

  // ==========================================
  // AI SMART SEARCH (DB first -> YT fallback)
  // ==========================================
  async searchSongs(query: string): Promise<Song[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/smart/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return (data.results || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        youtube_url: s.youtube_url || (s.videoId ? `https://www.youtube.com/watch?v=${s.videoId}` : ''),
        coverUrl: s.coverUrl || s.cover_url,
        durationSeconds: s.durationSeconds || s.duration_seconds || 180
      }));
    } catch {
      // Fuzzy match locally if offline
      const all = await this.getSongs();
      const q = query.toLowerCase().trim();
      return all.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
    }
  }
};
