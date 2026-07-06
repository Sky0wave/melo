import { Song, LoopMode } from "./types";
import { PlaylistManager } from "./PlaylistManager";
import { AudioPlayer } from "./AudioPlayer";

export class MusicLayerManager {
  private layers: Record<string, PlaylistManager> = {};
  private activeLayerName: string | null = null;
  private audioPlayer: AudioPlayer;
  private delayTimerId: any = null;
  private isPlaying: boolean = false;
  private fadeTime: number = 1.2; // 0.8 to 1.5s fade

  // Callback to notify parent engine when state changes
  public onLayerChange: (layerName: string | null) => void = () => {};
  public onSongStart: (song: Song) => void = () => {};

  constructor(audioPlayer: AudioPlayer) {
    this.audioPlayer = audioPlayer;
    
    // Wire up audio player callbacks
    this.audioPlayer.onEnded = (song) => {
      this.handleSongEnded(song);
    };
  }

  /**
   * Initialize genre queues from a base pool of songs.
   */
  initializeSongs(songs: Song[]): void {
    const groupedSongs: Record<string, Song[]> = {};

    // Group songs by genre/category
    songs.forEach(song => {
      const genre = (song.genre || "calm").toLowerCase();
      let category = "calm"; // Default
      
      if (genre.includes("adventure")) category = "adventure";
      else if (genre.includes("battle")) category = "battle";
      else if (genre.includes("mystery")) category = "mystery";
      else if (genre.includes("emotional")) category = "emotional";
      else if (genre.includes("calm")) category = "calm";
      else {
        // Fallback or dynamic genre grouping
        category = genre;
      }

      if (!groupedSongs[category]) {
        groupedSongs[category] = [];
      }
      groupedSongs[category].push(song);
    });

    // Create a PlaylistManager for each category
    Object.keys(groupedSongs).forEach(category => {
      this.layers[category] = new PlaylistManager(groupedSongs[category]);
      // Enable shuffle for layers to keep playback interesting and non-repetitive
      this.layers[category].setShuffle(true);
      this.layers[category].setLoopMode("playlist");
    });
  }

  getLayers(): string[] {
    return Object.keys(this.layers);
  }

  getActiveLayer(): string | null {
    return this.activeLayerName;
  }

  getActivePlaylistManager(): PlaylistManager | null {
    if (!this.activeLayerName) return null;
    return this.layers[this.activeLayerName] || null;
  }

  /**
   * Activate and play a music layer.
   */
  playLayer(layerName: string): void {
    const targetLayer = layerName.toLowerCase();
    if (!this.layers[targetLayer]) {
      console.warn(`Layer "${layerName}" does not exist. Initializing empty queue for it.`);
      this.layers[targetLayer] = new PlaylistManager([]);
    }

    this.clearDelayTimer();
    this.isPlaying = true;

    // If already playing this layer, do nothing
    if (this.activeLayerName === targetLayer) {
      const current = this.layers[targetLayer].getCurrentSong();
      if (current) {
        this.audioPlayer.play(current, 0, this.fadeTime);
      }
      return;
    }

    this.activeLayerName = targetLayer;
    this.onLayerChange(this.activeLayerName);

    const pm = this.layers[targetLayer];
    const songToPlay = pm.getCurrentSong();

    if (songToPlay) {
      this.audioPlayer.play(songToPlay, 0, this.fadeTime);
      this.onSongStart(songToPlay);
      
      // Async preload the next song in the layer queue immediately
      this.preloadNextTrack(pm);
    }
  }

  /**
   * Crossfade from current layer to another layer.
   */
  crossFade(layerName: string): void {
    const targetLayer = layerName.toLowerCase();
    if (!this.layers[targetLayer]) return;

    this.clearDelayTimer();
    this.isPlaying = true;

    if (this.activeLayerName === targetLayer) return;

    this.activeLayerName = targetLayer;
    this.onLayerChange(this.activeLayerName);

    const pm = this.layers[targetLayer];
    const songToPlay = pm.getCurrentSong();

    if (songToPlay) {
      // Execute smooth Web Audio crossfade
      this.audioPlayer.crossFadeTo(songToPlay, this.fadeTime);
      this.onSongStart(songToPlay);
      this.preloadNextTrack(pm);
    }
  }

  /**
   * Pause the active layer.
   */
  pauseLayer(): void {
    this.isPlaying = false;
    this.audioPlayer.pause();
  }

  /**
   * Resume the active layer.
   */
  resumeLayer(): void {
    this.isPlaying = true;
    this.audioPlayer.resume();
  }

  /**
   * Stop the active layer with fade-out.
   */
  stopLayer(): void {
    this.isPlaying = false;
    this.clearDelayTimer();
    this.audioPlayer.stop(this.fadeTime);
    this.activeLayerName = null;
    this.onLayerChange(null);
  }

  /**
   * Set volume for layer playback.
   */
  setVolume(volume: number): void {
    this.audioPlayer.setVolume(volume, 0.1);
  }

  /**
   * Set the fade-in / fade-out duration (0.8s to 1.5s).
   */
  setFadeDuration(secs: number): void {
    this.fadeTime = Math.max(0.8, Math.min(1.5, secs));
  }

  getFadeDuration(): number {
    return this.fadeTime;
  }

  private clearDelayTimer(): void {
    if (this.delayTimerId) {
      clearTimeout(this.delayTimerId);
      this.delayTimerId = null;
    }
  }

  /**
   * Preload the next track in the queue.
   */
  private preloadNextTrack(pm: PlaylistManager): void {
    // Look ahead in the playlist queue
    const current = pm.getCurrentSong();
    if (!current) return;

    // Simulate next track peek without moving the actual index
    const queue = pm.getQueue();
    if (queue.length <= 1) return;

    const curIdx = pm.getCurrentIndex();
    const nextIdx = (curIdx + 1) % queue.length;
    const nextSong = queue[nextIdx];

    if (nextSong) {
      this.audioPlayer.preload(nextSong);
    }
  }

  /**
   * Handle active track ending: wait 2 seconds, then trigger next track.
   */
  private handleSongEnded(endedSong: Song): void {
    if (!this.isPlaying || !this.activeLayerName) return;

    const pm = this.layers[this.activeLayerName];
    if (!pm) return;

    // Advance queue index
    const nextSong = pm.next();

    if (!nextSong) {
      // Playlist ended (if loopMode was none)
      this.isPlaying = false;
      return;
    }

    // Preload this next song immediately during the 2-second silence interval so it is cached and gapless
    this.audioPlayer.preload(nextSong);

    // Wait exactly 2 seconds before playing
    this.clearDelayTimer();
    this.delayTimerId = setTimeout(() => {
      if (this.isPlaying && this.activeLayerName) {
        this.audioPlayer.play(nextSong, 0, this.fadeTime);
        this.onSongStart(nextSong);
        
        // Preload the track after this one
        this.preloadNextTrack(pm);
      }
    }, 2000);
  }
}
