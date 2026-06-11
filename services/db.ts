import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase-client';

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
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  cover_image?: string | null;
  created_at: string;
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

// Default Seed Songs (matching UUIDs in database schema)
export const SEED_SONGS: Song[] = [
  { id: 'f5b5f25a-4933-4f0e-be4c-0c1598f828a1', title: 'After Hours', artist: 'The Weeknd', youtube_url: 'https://www.youtube.com/watch?v=ygTZZpVNJ-Y' },
  { id: 'f5b5f25a-4933-4f0e-be4c-0c1598f828a2', title: 'Blinding Lights', artist: 'The Weeknd', youtube_url: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ' },
  { id: 'f5b5f25a-4933-4f0e-be4c-0c1598f828a3', title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', youtube_url: 'https://www.youtube.com/watch?v=34Na4j8AVgA' },
  { id: 'f5b5f25a-4933-4f0e-be4c-0c1598f828a4', title: 'Midnight City', artist: 'M83', youtube_url: 'https://www.youtube.com/watch?v=dX3kSGcoR4k' },
  { id: 'f5b5f25a-4933-4f0e-be4c-0c1598f828a5', title: 'Intro', artist: 'The xx', youtube_url: 'https://www.youtube.com/watch?v=sV4_wYldx7o' },
  { id: 'f5b5f25a-4933-4f0e-be4c-0c1598f828a6', title: 'Sweater Weather', artist: 'The Neighbourhood', youtube_url: 'https://www.youtube.com/watch?v=GCdwKhTtNNw' },
  { id: 'f5b5f25a-4933-4f0e-be4c-0c1598f828a7', title: 'Royals', artist: 'Lorde', youtube_url: 'https://www.youtube.com/watch?v=nlcIKh6s868' },
  { id: 'f5b5f25a-4933-4f0e-be4c-0c1598f828a8', title: 'Perfect Places', artist: 'Lorde', youtube_url: 'https://www.youtube.com/watch?v=H74tC4s8lJ0' }
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
// API DB SERVICE
// ==========================================

export const dbService = {
  // ==========================================
  // AUTHENTICATION & USER PROFILES
  // ==========================================
  async getCurrentUser(): Promise<DbUser | null> {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error || !data) {
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || 'Listener',
          role: (user.user_metadata?.role as 'user' | 'admin') || 'user',
          image_url: user.user_metadata?.image_url || null,
          created_at: user.created_at
        };
      }
      return data as DbUser;
    } else {
      const currentUser = await AsyncStorage.getItem('mock_current_user');
      return currentUser ? JSON.parse(currentUser) : null;
    }
  },

  // ==========================================
  // SHARED SONGS CATALOG
  // ==========================================
  async getSongs(): Promise<Song[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('title', { ascending: true });
      if (error) throw error;
      return data || [];
    } else {
      const songsStr = await AsyncStorage.getItem('mock_shared_songs');
      const songs = songsStr ? JSON.parse(songsStr) : SEED_SONGS;
      if (!songsStr) {
        await AsyncStorage.setItem('mock_shared_songs', JSON.stringify(SEED_SONGS));
      }
      return songs;
    }
  },

  async addSong(title: string, artist: string, youtubeUrl: string): Promise<Song> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('songs')
        .insert([{ title, artist, youtube_url: youtubeUrl }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const songs = await this.getSongs();
      const newSong: Song = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        artist,
        youtube_url: youtubeUrl,
        created_at: new Date().toISOString()
      };
      songs.push(newSong);
      await AsyncStorage.setItem('mock_shared_songs', JSON.stringify(songs));
      return newSong;
    }
  },

  // ==========================================
  // PLAYLISTS (Isolated by User ID)
  // ==========================================
  async getPlaylists(userId: string): Promise<Playlist[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      return await getUserLocal<Playlist[]>(userId, 'playlists', []);
    }
  },

  async createPlaylist(userId: string, name: string, coverImage?: string): Promise<Playlist> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('playlists')
        .insert([{ user_id: userId, name, cover_image: coverImage || null }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const playlists = await getUserLocal<Playlist[]>(userId, 'playlists', []);
      const newPlaylist: Playlist = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        name,
        cover_image: coverImage || null,
        created_at: new Date().toISOString()
      };
      playlists.push(newPlaylist);
      await saveUserLocal(userId, 'playlists', playlists);
      return newPlaylist;
    }
  },

  async deletePlaylist(userId: string, playlistId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      let playlists = await getUserLocal<Playlist[]>(userId, 'playlists', []);
      playlists = playlists.filter(p => p.id !== playlistId);
      await saveUserLocal(userId, 'playlists', playlists);

      // Clean up local playlist songs
      let playlistSongs = await getUserLocal<PlaylistSong[]>(userId, 'playlist_songs', []);
      playlistSongs = playlistSongs.filter(ps => ps.playlist_id !== playlistId);
      await saveUserLocal(userId, 'playlist_songs', playlistSongs);
    }
  },

  // ==========================================
  // PLAYLIST SONGS
  // ==========================================
  async getSongsInPlaylist(userId: string, playlistId: string): Promise<Song[]> {
    if (isSupabaseConfigured) {
      // Fetch details by joining tables under the user's RLS permissions
      const { data, error } = await supabase
        .from('playlist_songs')
        .select('songs (*)')
        .eq('playlist_id', playlistId);
      
      if (error) throw error;
      return (data || []).map((item: any) => item.songs).filter(Boolean);
    } else {
      const playlistSongs = await getUserLocal<PlaylistSong[]>(userId, 'playlist_songs', []);
      const songIds = playlistSongs.filter(ps => ps.playlist_id === playlistId).map(ps => ps.song_id);
      const allSongs = await this.getSongs();
      return allSongs.filter(s => songIds.includes(s.id));
    }
  },

  async addSongToPlaylist(userId: string, playlistId: string, songId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('playlist_songs')
        .insert([{ playlist_id: playlistId, song_id: songId }]);
      if (error) throw error;
    } else {
      const playlistSongs = await getUserLocal<PlaylistSong[]>(userId, 'playlist_songs', []);
      const exists = playlistSongs.some(ps => ps.playlist_id === playlistId && ps.song_id === songId);
      if (!exists) {
        playlistSongs.push({
          id: Math.random().toString(36).substr(2, 9),
          playlist_id: playlistId,
          song_id: songId
        });
        await saveUserLocal(userId, 'playlist_songs', playlistSongs);
      }
    }
  },

  async removeSongFromPlaylist(userId: string, playlistId: string, songId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('song_id', songId);
      if (error) throw error;
    } else {
      let playlistSongs = await getUserLocal<PlaylistSong[]>(userId, 'playlist_songs', []);
      playlistSongs = playlistSongs.filter(ps => !(ps.playlist_id === playlistId && ps.song_id === songId));
      await saveUserLocal(userId, 'playlist_songs', playlistSongs);
    }
  },

  // ==========================================
  // LIKED SONGS (FAVORITES) (Isolated by User ID)
  // ==========================================
  async getFavorites(userId: string): Promise<Song[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('liked_songs')
        .select('songs (*)')
        .eq('user_id', userId);
      
      if (error) throw error;
      return (data || []).map((item: any) => item.songs).filter(Boolean);
    } else {
      const favorites = await getUserLocal<LikedSong[]>(userId, 'liked_songs', []);
      const userFavIds = favorites.map(f => f.song_id);
      const allSongs = await this.getSongs();
      return allSongs.filter(s => userFavIds.includes(s.id));
    }
  },

  async isFavorite(userId: string, songId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('liked_songs')
        .select('id')
        .eq('user_id', userId)
        .eq('song_id', songId)
        .maybeSingle();
      if (error) return false;
      return !!data;
    } else {
      const favorites = await getUserLocal<LikedSong[]>(userId, 'liked_songs', []);
      return favorites.some(f => f.song_id === songId);
    }
  },

  async toggleFavorite(userId: string, songId: string): Promise<boolean> {
    const isFav = await this.isFavorite(userId, songId);
    if (isFav) {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('liked_songs')
          .delete()
          .eq('user_id', userId)
          .eq('song_id', songId);
        if (error) throw error;
      } else {
        let favorites = await getUserLocal<LikedSong[]>(userId, 'liked_songs', []);
        favorites = favorites.filter(f => f.song_id !== songId);
        await saveUserLocal(userId, 'liked_songs', favorites);
      }
      return false;
    } else {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('liked_songs')
          .insert([{ user_id: userId, song_id: songId }]);
        if (error) throw error;
      } else {
        const favorites = await getUserLocal<LikedSong[]>(userId, 'liked_songs', []);
        favorites.push({
          id: Math.random().toString(36).substr(2, 9),
          user_id: userId,
          song_id: songId,
          created_at: new Date().toISOString()
        });
        await saveUserLocal(userId, 'liked_songs', favorites);
      }
      return true;
    }
  },

  // ==========================================
  // RECENTLY PLAYED (Isolated by User ID)
  // ==========================================
  async getRecentlyPlayed(userId: string): Promise<Song[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('recently_played')
        .select('songs (*)')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      const songs = (data || []).map((item: any) => item.songs).filter(Boolean);
      const seenIds = new Set<string>();
      return songs.filter((s: Song) => {
        if (seenIds.has(s.id)) return false;
        seenIds.add(s.id);
        return true;
      });
    } else {
      const history = await getUserLocal<RecentlyPlayed[]>(userId, 'recently_played', []);
      const userHistory = history.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
      
      const allSongs = await this.getSongs();
      const recentSongs: Song[] = [];
      const seenIds = new Set<string>();
      
      for (const record of userHistory) {
        const song = allSongs.find(s => s.id === record.song_id);
        if (song && !seenIds.has(song.id)) {
          seenIds.add(song.id);
          recentSongs.push(song);
          if (recentSongs.length >= 10) break;
        }
      }
      return recentSongs;
    }
  },

  async recordRecentlyPlayed(userId: string, songId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('recently_played')
        .insert([{ user_id: userId, song_id: songId }]);
      if (error) throw error;
    } else {
      const history = await getUserLocal<RecentlyPlayed[]>(userId, 'recently_played', []);
      history.push({
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        song_id: songId,
        played_at: new Date().toISOString()
      });
      await saveUserLocal(userId, 'recently_played', history);
    }
  },

  // ==========================================
  // SEARCH HISTORY (Isolated by User ID)
  // ==========================================
  async getSearchHistory(userId: string): Promise<SearchHistory[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data || [];
    } else {
      return await getUserLocal<SearchHistory[]>(userId, 'search_history', []);
    }
  },

  async addSearchQuery(userId: string, query: string): Promise<void> {
    if (!query.trim()) return;
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('search_history')
        .insert([{ user_id: userId, query: query.trim() }]);
      if (error) throw error;
    } else {
      const history = await getUserLocal<SearchHistory[]>(userId, 'search_history', []);
      // Remove duplicate queries to keep it clean
      const filtered = history.filter(h => h.query.toLowerCase() !== query.trim().toLowerCase());
      filtered.unshift({
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        query: query.trim(),
        created_at: new Date().toISOString()
      });
      await saveUserLocal(userId, 'search_history', filtered.slice(0, 15));
    }
  },

  async clearSearchHistory(userId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      await saveUserLocal(userId, 'search_history', []);
    }
  },

  // ==========================================
  // SETTINGS (Isolated by User ID)
  // ==========================================
  async getSettings(userId: string): Promise<Settings> {
    const defaultSettings: Settings = {
      id: 'default',
      user_id: userId,
      theme: 'dark',
      audio_quality: 'high',
      notifications: true
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error || !data) {
        return defaultSettings;
      }
      return data as Settings;
    } else {
      return await getUserLocal<Settings>(userId, 'settings', defaultSettings);
    }
  },

  async updateSettings(userId: string, updates: Partial<Omit<Settings, 'id' | 'user_id'>>): Promise<Settings> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as Settings;
    } else {
      const current = await this.getSettings(userId);
      const updated = { ...current, ...updates };
      await saveUserLocal(userId, 'settings', updated);
      return updated;
    }
  },

  // ==========================================
  // DOWNLOADS (Isolated by User ID)
  // ==========================================
  async getDownloads(userId: string): Promise<Song[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('downloads')
        .select('songs (*)')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []).map((item: any) => item.songs).filter(Boolean);
    } else {
      const downloads = await getUserLocal<Download[]>(userId, 'downloads', []);
      const songIds = downloads.map(d => d.song_id);
      const allSongs = await this.getSongs();
      return allSongs.filter(s => songIds.includes(s.id));
    }
  },

  async isDownloaded(userId: string, songId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('downloads')
        .select('id')
        .eq('user_id', userId)
        .eq('song_id', songId)
        .maybeSingle();
      if (error) return false;
      return !!data;
    } else {
      const downloads = await getUserLocal<Download[]>(userId, 'downloads', []);
      return downloads.some(d => d.song_id === songId);
    }
  },

  async toggleDownload(userId: string, songId: string): Promise<boolean> {
    const isDown = await this.isDownloaded(userId, songId);
    if (isDown) {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('downloads')
          .delete()
          .eq('user_id', userId)
          .eq('song_id', songId);
        if (error) throw error;
      } else {
        let downloads = await getUserLocal<Download[]>(userId, 'downloads', []);
        downloads = downloads.filter(d => d.song_id !== songId);
        await saveUserLocal(userId, 'downloads', downloads);
      }
      return false;
    } else {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('downloads')
          .insert([{ user_id: userId, song_id: songId }]);
        if (error) throw error;
      } else {
        const downloads = await getUserLocal<Download[]>(userId, 'downloads', []);
        downloads.push({
          id: Math.random().toString(36).substr(2, 9),
          user_id: userId,
          song_id: songId,
          downloaded_at: new Date().toISOString()
        });
        await saveUserLocal(userId, 'downloads', downloads);
      }
      return true;
    }
  },

  // ==========================================
  // LISTENING HISTORY (Isolated by User ID)
  // ==========================================
  async getListeningHistory(userId: string): Promise<Song[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('listening_history')
        .select('songs (*)')
        .eq('user_id', userId)
        .order('listened_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((item: any) => item.songs).filter(Boolean);
    } else {
      const history = await getUserLocal<ListeningHistory[]>(userId, 'listening_history', []);
      const sorted = history.sort((a, b) => new Date(b.listened_at).getTime() - new Date(a.listened_at).getTime());
      const allSongs = await this.getSongs();
      return sorted.map(h => allSongs.find(s => s.id === h.song_id)).filter(Boolean) as Song[];
    }
  },

  async recordListeningEvent(userId: string, songId: string, durationSeconds: number): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('listening_history')
        .insert([{ user_id: userId, song_id: songId, duration_seconds: durationSeconds }]);
      if (error) throw error;
    } else {
      const history = await getUserLocal<ListeningHistory[]>(userId, 'listening_history', []);
      history.push({
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        song_id: songId,
        duration_seconds: durationSeconds,
        listened_at: new Date().toISOString()
      });
      await saveUserLocal(userId, 'listening_history', history);
    }
  },

  // ==========================================
  // ADMIN PANEL APIS (Bypass user_id filters)
  // ==========================================
  async isAdmin(userId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      if (error || !data) return false;
      return data.role === 'admin';
    } else {
      // Mock admin check: users named "Admin" or email admin@melo.co are admin
      const userStr = await AsyncStorage.getItem('mock_current_user');
      if (!userStr) return false;
      const user = JSON.parse(userStr);
      return user.role === 'admin' || user.email === 'admin@melo.co';
    }
  },

  async adminGetAllUsers(): Promise<DbUser[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      // Retrieve registered mock users
      const mockUsersStr = await AsyncStorage.getItem('mock_registered_users');
      return mockUsersStr ? JSON.parse(mockUsersStr) : [];
    }
  },

  async adminGetAllPlaylists(): Promise<Playlist[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      // In mock mode, we would have to collect from all keys starting with melo_user_..._playlists
      const allKeys = await AsyncStorage.getAllKeys();
      const playlistKeys = allKeys.filter(k => k.startsWith('melo_user_') && k.endsWith('_playlists'));
      let allPlaylists: Playlist[] = [];
      for (const key of playlistKeys) {
        const playlistsStr = await AsyncStorage.getItem(key);
        if (playlistsStr) {
          allPlaylists = allPlaylists.concat(JSON.parse(playlistsStr));
        }
      }
      return allPlaylists;
    }
  },

  async adminGetAllListeningHistory(): Promise<ListeningHistory[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('listening_history')
        .select('*')
        .order('listened_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const allKeys = await AsyncStorage.getAllKeys();
      const historyKeys = allKeys.filter(k => k.startsWith('melo_user_') && k.endsWith('_listening_history'));
      let allHistory: ListeningHistory[] = [];
      for (const key of historyKeys) {
        const historyStr = await AsyncStorage.getItem(key);
        if (historyStr) {
          allHistory = allHistory.concat(JSON.parse(historyStr));
        }
      }
      return allHistory;
    }
  }
};
