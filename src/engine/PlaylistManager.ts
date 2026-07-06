import { Song, LoopMode } from "./types";

export class PlaylistManager {
  private originalSongs: Song[] = [];
  private shuffledSongs: Song[] = [];
  private currentIndex: number = -1;
  private shuffleEnabled: boolean = false;
  private loopMode: LoopMode = "playlist";

  // Navigation history stacks (history of songs played)
  private historyStack: Song[] = [];
  private futureStack: Song[] = [];

  constructor(songs: Song[] = []) {
    if (songs.length > 0) {
      this.setPlaylist(songs);
    }
  }

  /**
   * Set a new playlist. Preserves the currently playing song if it exists in the new playlist.
   */
  setPlaylist(songs: Song[]): void {
    const currentSong = this.getCurrentSong();
    this.originalSongs = [...songs];

    if (songs.length === 0) {
      this.shuffledSongs = [];
      this.currentIndex = -1;
      this.historyStack = [];
      this.futureStack = [];
      return;
    }

    if (this.shuffleEnabled) {
      // Rebuild the shuffle queue but preserve the current playing song
      if (currentSong && songs.some(s => s.id === currentSong.id)) {
        const remaining = songs.filter(s => s.id !== currentSong.id);
        const shuffledRemaining = this.shuffleFisherYates(remaining);
        this.shuffledSongs = [currentSong, ...shuffledRemaining];
        this.currentIndex = 0;
      } else {
        // Generate a new shuffle queue
        this.shuffledSongs = this.shuffleFisherYates(songs);
        this.currentIndex = 0;
      }
    } else {
      // Shuffling is off: align current index with the original songs order
      if (currentSong) {
        const idx = songs.findIndex(s => s.id === currentSong.id);
        if (idx !== -1) {
          this.currentIndex = idx;
        } else {
          this.currentIndex = 0;
        }
      } else {
        this.currentIndex = 0;
      }
    }

    // Clean up history stacks to only contain valid songs in the new playlist
    const validIds = new Set(songs.map(s => s.id));
    this.historyStack = this.historyStack.filter(s => validIds.has(s.id));
    this.futureStack = this.futureStack.filter(s => validIds.has(s.id));
  }

  /**
   * Add a song to the playlist dynamically.
   */
  addSong(song: Song): void {
    if (this.originalSongs.some(s => s.id === song.id)) {
      return; // Already exists
    }
    this.originalSongs.push(song);

    if (this.shuffleEnabled) {
      // Insert song randomly into the remaining unplayed portion of the shuffled playlist
      if (this.shuffledSongs.length === 0) {
        this.shuffledSongs.push(song);
        this.currentIndex = 0;
      } else {
        const remainingStartIndex = this.currentIndex + 1;
        if (remainingStartIndex >= this.shuffledSongs.length) {
          this.shuffledSongs.push(song);
        } else {
          const insertIdx = remainingStartIndex + Math.floor(Math.random() * (this.shuffledSongs.length - this.currentIndex));
          this.shuffledSongs.splice(insertIdx, 0, song);
        }
      }
    }
  }

  /**
   * Remove a song from the playlist dynamically.
   */
  removeSong(songId: string): Song | null {
    const origIdx = this.originalSongs.findIndex(s => s.id === songId);
    if (origIdx === -1) return null;

    const removedSong = this.originalSongs[origIdx];
    this.originalSongs.splice(origIdx, 1);

    // Clean up history stacks
    this.historyStack = this.historyStack.filter(s => s.id !== songId);
    this.futureStack = this.futureStack.filter(s => s.id !== songId);

    const activeQueue = this.shuffleEnabled ? this.shuffledSongs : this.originalSongs;
    const activeIdx = activeQueue.findIndex(s => s.id === songId);

    if (activeIdx !== -1) {
      if (this.shuffleEnabled) {
        this.shuffledSongs.splice(activeIdx, 1);
      }

      if (activeIdx === this.currentIndex) {
        // Currently playing song was removed: adjust index and skip to next
        if (activeQueue.length === 0) {
          this.currentIndex = -1;
        } else {
          // Keep current index, which now points to the next item
          if (this.currentIndex >= activeQueue.length) {
            this.currentIndex = this.loopMode === "playlist" ? 0 : activeQueue.length - 1;
          }
        }
        return removedSong;
      } else if (activeIdx < this.currentIndex) {
        // Shift index down by 1 since an item before current was removed
        this.currentIndex--;
      }
    }

    return null; // Song removed but it wasn't the active one
  }

  /**
   * Get the active queue of songs.
   */
  getQueue(): Song[] {
    return this.shuffleEnabled ? this.shuffledSongs : this.originalSongs;
  }

  /**
   * Get the current track.
   */
  getCurrentSong(): Song | null {
    const queue = this.getQueue();
    if (this.currentIndex >= 0 && this.currentIndex < queue.length) {
      return queue[this.currentIndex];
    }
    return null;
  }

  /**
   * Toggle shuffle mode.
   */
  setShuffle(enabled: boolean): void {
    if (this.shuffleEnabled === enabled) return;
    this.shuffleEnabled = enabled;

    const currentSong = this.getCurrentSong();

    if (enabled) {
      // Shuffle ON: generate fresh Fisher-Yates queue, placing current song first
      if (this.originalSongs.length > 0) {
        if (currentSong) {
          const remaining = this.originalSongs.filter(s => s.id !== currentSong.id);
          const shuffledRemaining = this.shuffleFisherYates(remaining);
          this.shuffledSongs = [currentSong, ...shuffledRemaining];
          this.currentIndex = 0;
        } else {
          // Choose one random song as the first track
          const randomStartIdx = Math.floor(Math.random() * this.originalSongs.length);
          const startSong = this.originalSongs[randomStartIdx];
          const remaining = this.originalSongs.filter((_, idx) => idx !== randomStartIdx);
          const shuffledRemaining = this.shuffleFisherYates(remaining);
          this.shuffledSongs = [startSong, ...shuffledRemaining];
          this.currentIndex = 0;
        }
      } else {
        this.shuffledSongs = [];
        this.currentIndex = -1;
      }
    } else {
      // Shuffle OFF: restore original order, point current index to the active song
      if (currentSong) {
        const idx = this.originalSongs.findIndex(s => s.id === currentSong.id);
        this.currentIndex = idx !== -1 ? idx : 0;
      } else {
        this.currentIndex = this.originalSongs.length > 0 ? 0 : -1;
      }
    }

    // Keep history intact
    this.futureStack = [];
  }

  /**
   * Set the loop mode.
   */
  setLoopMode(mode: LoopMode): void {
    this.loopMode = mode;
  }

  getLoopMode(): LoopMode {
    return this.loopMode;
  }

  isShuffleEnabled(): boolean {
    return this.shuffleEnabled;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getPlayHistory(): Song[] {
    return [...this.historyStack];
  }

  /**
   * Play a specific song by ID in the current queue.
   */
  playSongById(songId: string): Song | null {
    const queue = this.getQueue();
    const idx = queue.findIndex(s => s.id === songId);
    if (idx === -1) return null;

    const prevSong = this.getCurrentSong();
    if (prevSong && prevSong.id !== songId) {
      this.historyStack.push(prevSong);
      this.futureStack = [];
    }

    this.currentIndex = idx;
    return queue[idx];
  }

  /**
   * Move to the next track.
   * Returns the new current song, or null if playlist ended.
   */
  next(): Song | null {
    const queue = this.getQueue();
    if (queue.length === 0) return null;

    const currentSong = this.getCurrentSong();

    // Loop One check
    if (this.loopMode === "one" && currentSong) {
      return currentSong;
    }

    // If we have items in our future navigation stack (from pressing "Previous")
    if (this.futureStack.length > 0) {
      if (currentSong) {
        this.historyStack.push(currentSong);
      }
      const nextSong = this.futureStack.pop()!;
      const idx = queue.findIndex(s => s.id === nextSong.id);
      this.currentIndex = idx !== -1 ? idx : this.currentIndex;
      return nextSong;
    }

    if (currentSong) {
      this.historyStack.push(currentSong);
    }

    this.currentIndex++;

    // End of playlist check
    if (this.currentIndex >= queue.length) {
      if (this.loopMode === "playlist") {
        if (this.shuffleEnabled) {
          // Reshuffle and start fresh cycle, avoiding repeating the last song consecutively
          const lastSong = queue[queue.length - 1];
          let reshuffled: Song[];
          let attempts = 0;
          do {
            reshuffled = this.shuffleFisherYates(this.originalSongs);
            attempts++;
          } while (reshuffled[0].id === lastSong?.id && this.originalSongs.length > 1 && attempts < 10);

          if (reshuffled[0].id === lastSong?.id && this.originalSongs.length > 1) {
            // Swap first and second tracks to resolve consecutive repeat
            const tmp = reshuffled[0];
            reshuffled[0] = reshuffled[1];
            reshuffled[1] = tmp;
          }

          this.shuffledSongs = reshuffled;
        }
        this.currentIndex = 0;
      } else {
        // No loop: stick to last song or stop
        this.currentIndex = queue.length; // Out of bounds, engine will stop
        return null;
      }
    }

    return this.getCurrentSong();
  }

  /**
   * Move to the previous track.
   */
  previous(): Song | null {
    const queue = this.getQueue();
    if (queue.length === 0) return null;

    const currentSong = this.getCurrentSong();

    // Loop One check
    if (this.loopMode === "one" && currentSong) {
      return currentSong;
    }

    // If we have history, pop the last played song
    if (this.historyStack.length > 0) {
      if (currentSong) {
        this.futureStack.push(currentSong);
      }
      const prevSong = this.historyStack.pop()!;
      const idx = queue.findIndex(s => s.id === prevSong.id);
      this.currentIndex = idx !== -1 ? idx : this.currentIndex;
      return prevSong;
    }

    // Fallback: wrap index backwards if no explicit history stack is present
    if (currentSong) {
      this.futureStack.push(currentSong);
    }
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.loopMode === "playlist" ? queue.length - 1 : 0;
    }

    return this.getCurrentSong();
  }

  /**
   * Fisher-Yates shuffle algorithm in O(n) complexity.
   */
  private shuffleFisherYates(array: Song[]): Song[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }
}
