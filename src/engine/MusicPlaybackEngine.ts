import { Song, LoopMode, PlaybackState, EngineEvents } from "./types";
import { EventEmitter } from "./EventEmitter";
import { PlaylistManager } from "./PlaylistManager";
import { AudioPlayer } from "./AudioPlayer";
import { MusicLayerManager } from "./MusicLayerManager";

export class MusicPlaybackEngine extends EventEmitter<EngineEvents> {
  private playlistManager: PlaylistManager;
  private audioPlayer: AudioPlayer;
  private layerManager: MusicLayerManager;

  private isPlaying: boolean = false;
  private currentProgress: number = 0;
  private currentDuration: number = 0;
  private masterVolume: number = 0.8;

  // Active playing mode: 'playlist' or 'layer'
  private activeMode: "none" | "playlist" | "layer" = "none";

  constructor(songs: Song[] = []) {
    super();
    this.audioPlayer = new AudioPlayer();
    this.playlistManager = new PlaylistManager(songs);
    this.layerManager = new MusicLayerManager(this.audioPlayer);

    if (songs.length > 0) {
      this.layerManager.initializeSongs(songs);
    }

    this.setupAudioListeners();
  }

  /**
   * Set up audio player event forwarding and preloading triggers.
   */
  private setupAudioListeners(): void {
    this.audioPlayer.onProgress = (progress, duration) => {
      this.currentProgress = Math.floor(progress);
      this.currentDuration = Math.floor(duration);
      this.emit("progress", this.currentProgress, this.currentDuration);

      // Preload next track when current reaches 80% completion to optimize gapless buffering
      if (this.activeMode === "playlist" && progress >= duration * 0.8) {
        this.triggerPlaylistPreload();
      }
    };

    this.audioPlayer.onEnded = (song) => {
      this.emit("ended", song);

      if (this.activeMode === "playlist") {
        this.next(); // Sequential auto-advance
      }
      // Note: Auto-advance for Layers is managed inside MusicLayerManager
    };

    this.audioPlayer.onError = (err, song) => {
      this.emit("error", err, song);
      
      // Auto-fallback: If a track fails, automatically skip to the next track
      console.warn(`Fallback triggered: playing next song due to error on "${song.title}"`);
      if (this.activeMode === "playlist") {
        setTimeout(() => this.next(), 1000);
      }
    };

    this.audioPlayer.onPreloadComplete = (song) => {
      this.emit("preload-complete", song);
    };

    this.layerManager.onLayerChange = (layerName) => {
      this.emit("layer-changed", layerName);
    };

    this.layerManager.onSongStart = (song) => {
      this.emit("play", song);
    };
  }

  /**
   * Initialize or update the base pool of songs.
   */
  initializeSongs(songs: Song[]): void {
    this.playlistManager.setPlaylist(songs);
    this.layerManager.initializeSongs(songs);
    this.emit("queue-changed", this.getQueue());
  }

  /**
   * Get the active playback state.
   */
  getPlaybackState(): PlaybackState {
    return {
      currentSong: this.getCurrentSong(),
      isPlaying: this.isPlaying,
      progress: this.currentProgress,
      volume: this.masterVolume,
      shuffleEnabled: this.playlistManager.isShuffleEnabled(),
      loopMode: this.playlistManager.getLoopMode(),
      activeLayer: this.layerManager.getActiveLayer()
    };
  }

  getCurrentSong(): Song | null {
    if (this.activeMode === "layer") {
      const pm = this.layerManager.getActivePlaylistManager();
      return pm ? pm.getCurrentSong() : null;
    }
    return this.playlistManager.getCurrentSong();
  }

  getQueue(): Song[] {
    if (this.activeMode === "layer") {
      const pm = this.layerManager.getActivePlaylistManager();
      return pm ? pm.getQueue() : [];
    }
    return this.playlistManager.getQueue();
  }

  getHistory(): Song[] {
    return this.playlistManager.getPlayHistory();
  }

  getActiveMode(): "none" | "playlist" | "layer" {
    return this.activeMode;
  }

  notifyYouTubeProgress(progress: number, duration: number): void {
    if (this.activeMode !== "playlist") return;
    this.currentProgress = Math.floor(progress);
    this.currentDuration = Math.floor(duration);
    this.emit("progress", this.currentProgress, this.currentDuration);
  }

  notifyYouTubeEnded(): void {
    if (this.activeMode !== "playlist") return;
    const current = this.getCurrentSong();
    if (current) {
      this.emit("ended", current);
      this.next();
    }
  }

  // ==========================================
  // PLAYLIST CONTROLS
  // ==========================================

  playPlaylist(songs?: Song[]): void {
    this.stopActiveMode();
    this.activeMode = "playlist";

    if (songs) {
      this.playlistManager.setPlaylist(songs);
      this.emit("queue-changed", this.getQueue());
    }

    const song = this.playlistManager.getCurrentSong();
    if (song) {
      this.triggerPlay(song, false);
    }
  }

  playSong(songId: string): void {
    this.stopActiveMode();
    this.activeMode = "playlist";

    const song = this.playlistManager.playSongById(songId);
    if (song) {
      this.triggerPlay(song, false);
    }
  }

  pause(): void {
    if (this.activeMode === "layer") {
      this.isPlaying = false;
      this.layerManager.pauseLayer();
      this.emit("pause");
      return;
    }

    if (this.isPlaying) {
      this.isPlaying = false;
      this.audioPlayer.pause();
      this.emit("pause");
    }
  }

  resume(): void {
    if (this.activeMode === "layer") {
      this.isPlaying = true;
      this.layerManager.resumeLayer();
      this.emit("resume");
      return;
    }

    if (!this.isPlaying) {
      const current = this.getCurrentSong();
      if (current) {
        this.isPlaying = true;
        this.audioPlayer.resume();
        this.emit("resume");
      } else {
        this.playPlaylist();
      }
    }
  }

  stop(): void {
    this.isPlaying = false;
    this.currentProgress = 0;
    this.currentDuration = 0;

    if (this.activeMode === "layer") {
      this.layerManager.stopLayer();
    } else {
      this.audioPlayer.stop(0.5);
    }
    
    this.activeMode = "none";
    this.emit("stop");
  }

  next(): void {
    if (this.activeMode !== "playlist") return;

    const nextSong = this.playlistManager.next();
    if (nextSong) {
      this.triggerPlay(nextSong, true);
    } else {
      this.stop();
    }
  }

  previous(): void {
    if (this.activeMode !== "playlist") return;

    const prevSong = this.playlistManager.previous();
    if (prevSong) {
      this.triggerPlay(prevSong, true);
    }
  }

  skipTo(seconds: number): void {
    if (this.activeMode === "layer") return; // Layer tracks are continuous / non-interactive skips
    
    const song = this.getCurrentSong();
    if (song && this.isPlaying) {
      this.audioPlayer.play(song, seconds, 0.1);
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = volume;
    this.audioPlayer.setVolume(volume, 0.1);
  }

  setEqBands(gains: number[]): void {
    this.audioPlayer.setEqBands(gains);
  }

  setLoopMode(mode: LoopMode): void {
    this.playlistManager.setLoopMode(mode);
    this.emit("state-change");
  }

  setShuffle(enabled: boolean): void {
    this.playlistManager.setShuffle(enabled);
    this.emit("queue-changed", this.getQueue());
    this.emit("state-change");
  }

  // ==========================================
  // DYNAMIC QUEUE MANAGEMENT
  // ==========================================

  addSongToQueue(song: Song): void {
    this.playlistManager.addSong(song);
    this.emit("queue-changed", this.getQueue());
  }

  removeSongFromQueue(songId: string): void {
    const isPlayingCurrent = this.getCurrentSong()?.id === songId;
    const removed = this.playlistManager.removeSong(songId);

    if (removed) {
      this.emit("queue-changed", this.getQueue());
      if (isPlayingCurrent) {
        // If current song was removed, auto skip to next or stop if empty
        const nextSong = this.playlistManager.getCurrentSong();
        if (nextSong) {
          this.audioPlayer.play(nextSong, 0, 0.5);
          this.emit("play", nextSong);
        } else {
          this.stop();
        }
      }
    }
  }

  // ==========================================
  // MUSIC LAYER CONTROLS (GENRES)
  // ==========================================

  playLayer(layerName: string): void {
    this.stopActiveMode();
    this.activeMode = "layer";
    this.isPlaying = true;
    this.layerManager.playLayer(layerName);
  }

  crossFadeLayer(layerName: string): void {
    if (this.activeMode !== "layer") {
      this.playLayer(layerName);
      return;
    }
    this.isPlaying = true;
    this.layerManager.crossFade(layerName);
  }

  pauseLayer(): void {
    this.layerManager.pauseLayer();
    this.isPlaying = false;
    this.emit("pause");
  }

  resumeLayer(): void {
    this.layerManager.resumeLayer();
    this.isPlaying = true;
    this.emit("resume");
  }

  stopLayer(): void {
    this.layerManager.stopLayer();
    this.isPlaying = false;
    this.activeMode = "none";
    this.emit("stop");
  }

  setLayerFadeDuration(seconds: number): void {
    this.layerManager.setFadeDuration(seconds);
  }

  getLayerFadeDuration(): number {
    return this.layerManager.getFadeDuration();
  }

  getLayers(): string[] {
    return this.layerManager.getLayers();
  }

  getActiveLayer(): string | null {
    return this.layerManager.getActiveLayer();
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private triggerPlay(song: Song, useCrossfade: boolean = false): void {
    this.isPlaying = true;
    const isYouTube = song.id.startsWith("yt_") || !!song.videoId;
    if (isYouTube && !song.audioUrl) {
      this.audioPlayer.stop(0.3);
    } else {
      if (useCrossfade) {
        this.audioPlayer.crossFadeTo(song, 1.0);
      } else {
        this.audioPlayer.play(song, 0, 0.5);
      }
    }
    this.emit("play", song);
    this.triggerPlaylistPreload();
  }

  private stopActiveMode(): void {
    this.clearDelayTimers();
    if (this.activeMode === "layer") {
      this.layerManager.stopLayer();
    } else if (this.activeMode === "playlist") {
      this.audioPlayer.stop(0.3);
    }
    this.activeMode = "none";
    this.isPlaying = false;
  }

  private clearDelayTimers(): void {
    // Stops any pending timers
  }

  private triggerPlaylistPreload(): void {
    const queue = this.playlistManager.getQueue();
    if (queue.length <= 1) return;

    const curIdx = this.playlistManager.getCurrentIndex();
    const nextIdx = (curIdx + 1) % queue.length;
    const nextSong = queue[nextIdx];

    if (nextSong) {
      this.emit("preload-start", nextSong);
      this.audioPlayer.preload(nextSong);
    }
  }
}
