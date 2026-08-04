import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, getSongCoverUrl } from './db';
import { getAudioSourceForSong } from '@/context/player-context';

let FileSystem: any = null;
if (Platform.OS !== 'web') {
  try {
    FileSystem = require('expo-file-system');
  } catch (e) {
    console.warn('[DownloadService] expo-file-system module not loaded:', e);
  }
}

export interface DownloadedTrack extends Song {
  localUri: string;
  localCoverUri?: string;
  downloadedAt: string;
}

const getDownloadsKey = (userId: string) => `melo_user_${userId}_offline_downloads`;
const DOWNLOAD_DIR = FileSystem ? `${FileSystem.documentDirectory}downloads/` : '';

export const downloadService = {
  /**
   * Ensures the downloads folder exists on native storage
   */
  async ensureDownloadDir(): Promise<void> {
    if (Platform.OS === 'web' || !FileSystem) return;
    try {
      const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
      }
    } catch (err) {
      console.error('[DownloadService] Failed to create download directory:', err);
    }
  },

  /**
   * Returns list of all downloaded tracks for the user
   */
  async getDownloadedSongs(userId: string): Promise<DownloadedTrack[]> {
    try {
      const raw = await AsyncStorage.getItem(getDownloadsKey(userId));
      if (!raw) return [];
      const downloads: DownloadedTrack[] = JSON.parse(raw);

      // On native, filter out any missing files
      if (Platform.OS !== 'web' && FileSystem) {
        const validDownloads: DownloadedTrack[] = [];
        for (const track of downloads) {
          if (track.localUri) {
            const info = await FileSystem.getInfoAsync(track.localUri);
            if (info.exists) {
              validDownloads.push(track);
            }
          }
        }
        return validDownloads;
      }

      return downloads;
    } catch (e) {
      console.error('[DownloadService] Error reading downloaded songs:', e);
      return [];
    }
  },

  /**
   * Check if a specific song is downloaded and available offline
   */
  async isDownloaded(userId: string, songId: string): Promise<boolean> {
    const downloads = await this.getDownloadedSongs(userId);
    return downloads.some(d => d.id === songId);
  },

  /**
   * Returns the local file URI if downloaded, or null
   */
  async getLocalAudioUri(userId: string, songId: string): Promise<string | null> {
    const downloads = await this.getDownloadedSongs(userId);
    const track = downloads.find(d => d.id === songId);
    if (!track || !track.localUri) return null;

    if (Platform.OS !== 'web' && FileSystem) {
      const info = await FileSystem.getInfoAsync(track.localUri);
      if (info.exists) {
        return track.localUri;
      }
    }
    return track.localUri || null;
  },

  /**
   * Download a song file to disk for offline listening
   */
  async downloadSong(
    song: Song,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<DownloadedTrack> {
    await this.ensureDownloadDir();

    const streamUrl = getAudioSourceForSong(song);
    const safeId = song.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localAudioUri = `${DOWNLOAD_DIR}${safeId}.mp3`;

    let finalLocalUri = streamUrl;

    if (Platform.OS !== 'web' && FileSystem) {
      // Create download task
      const callback = (downloadProgress: any) => {
        if (downloadProgress.totalBytesExpectedToWrite > 0 && onProgress) {
          const pct = Math.round(
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
          );
          onProgress(pct);
        }
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        streamUrl,
        localAudioUri,
        {},
        callback
      );

      const result = await downloadResumable.downloadAsync();
      if (result && result.uri) {
        finalLocalUri = result.uri;
      } else {
        finalLocalUri = localAudioUri;
      }
    } else {
      if (onProgress) onProgress(100);
    }

    const downloadedTrack: DownloadedTrack = {
      ...song,
      localUri: finalLocalUri,
      coverUrl: getSongCoverUrl(song),
      downloadedAt: new Date().toISOString(),
    };

    const existing = await this.getDownloadedSongs(userId);
    const updated = [downloadedTrack, ...existing.filter(d => d.id !== song.id)];
    await AsyncStorage.setItem(getDownloadsKey(userId), JSON.stringify(updated));

    console.log(`[DownloadService] Successfully downloaded "${song.title}" for offline playback.`);
    return downloadedTrack;
  },

  /**
   * Delete a downloaded song from device disk and store
   */
  async removeDownloadedSong(userId: string, songId: string): Promise<void> {
    try {
      const downloads = await this.getDownloadedSongs(userId);
      const track = downloads.find(d => d.id === songId);

      if (track && track.localUri && Platform.OS !== 'web' && FileSystem) {
        try {
          await FileSystem.deleteAsync(track.localUri, { idempotent: true });
        } catch (e) {
          console.warn('[DownloadService] Failed deleting local file:', e);
        }
      }

      const updated = downloads.filter(d => d.id !== songId);
      await AsyncStorage.setItem(getDownloadsKey(userId), JSON.stringify(updated));
      console.log(`[DownloadService] Removed song ${songId} from offline downloads.`);
    } catch (e) {
      console.error('[DownloadService] Error removing downloaded song:', e);
    }
  }
};
