export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string; // e.g., "04:12"
  durationSeconds: number; // e.g., 252
  genre: string;
  mood: string;
  lyrics: string;
  coverUrl: string;
  audioUrl?: string; // Standard synth-buzzing simulation or actual audio context if needed
  isPremium?: boolean;
  videoId?: string; // YouTube video ID for real playback
  source?: 'preset' | 'youtube' | 'ai'; // Origin of the song data
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songs: Song[];
  isCustom: boolean; // Custom created by user vs premium curated
  coverUrl: string;
  user_id?: number | string;
}

export interface ListeningHabit {
  songId: string;
  songTitle: string;
  artist: string;
  timestamp?: string;
  count: number;
}

export interface PlaybackState {
  currentSongId: string | null;
  isPlaying: boolean;
  progress: number; // in seconds
  username: string;
  lastUpdated: number; // Epoch timestamp
}

export interface UserProfile {
  username: string;
  displayName: string;
  avatarUrl: string;
  tier: "Platinum Tier Member" | "Premium Listener" | "Free Tier Guest";
  listeningHours: string;
  totalArtists: number;
  totalPlaylists: number;
  totalLiveSets: number;
}
