import { Song } from "./types";

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentVolume: number = 0.8;
  
  // Active playing track components
  private activeSong: Song | null = null;
  private activeGain: GainNode | null = null;
  private activeBufferSource: AudioBufferSourceNode | null = null;
  private activeSynthNodes: { oscillators: OscillatorNode[]; gainNodes: GainNode[]; intervalId?: any } | null = null;
  private activeStartTime: number = 0;
  private activePauseTime: number = 0;
  private progressIntervalId: any = null;
  
  // Next preloaded track components (for gapless/crossfading)
  private preloadedSong: Song | null = null;
  private preloadedBuffer: AudioBuffer | null = null;
  private preloadingSong: Song | null = null;

  // Caching decoded AudioBuffers to prevent redundant network fetches
  private bufferCache = new Map<string, AudioBuffer>();
  private maxCacheSize = 20;

  // Equalizer filter nodes and default gains
  private eqFilters: BiquadFilterNode[] = [];
  private initialEqGains: number[] = [0, 0, 0, 0, 0];

  // Event callbacks registered by parent engine
  public onProgress: (progress: number, duration: number) => void = () => {};
  public onEnded: (song: Song) => void = () => {};
  public onError: (error: Error, song: Song) => void = () => {};
  public onPreloadComplete: (song: Song) => void = () => {};

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  private initAudio(): void {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);

      // Initialize 5 EQ filters: 60Hz, 230Hz, 910Hz, 4000Hz, 14000Hz
      const frequencies = [60, 230, 910, 4000, 14000];
      this.eqFilters = frequencies.map((freq, idx) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.type = idx === 0 ? "lowshelf" : idx === 4 ? "highshelf" : "peaking";
        filter.frequency.value = freq;
        filter.gain.value = this.initialEqGains[idx] || 0;
        return filter;
      });

      // Chain: masterGain -> eqFilters[0] -> ... -> eqFilters[4] -> destination
      let lastNode: AudioNode = this.masterGain;
      this.eqFilters.forEach(filter => {
        lastNode.connect(filter);
        lastNode = filter;
      });
      lastNode.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API is not supported in this environment:", e);
    }
  }

  /**
   * Set EQ band gains dynamically
   */
  setEqBands(gains: number[]): void {
    this.initialEqGains = gains;
    this.initAudio();
    if (this.eqFilters.length === gains.length && this.ctx) {
      gains.forEach((gain, idx) => {
        const filter = this.eqFilters[idx];
        if (filter) {
          filter.gain.setValueAtTime(gain, this.ctx!.currentTime);
        }
      });
    }
  }

  /**
   * Set the master volume (0.0 to 1.0)
   */
  setVolume(volume: number, fadeDuration: number = 0.1): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.initAudio();
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues?.(t);
      this.masterGain.gain.linearRampToValueAtTime(this.currentVolume, t + fadeDuration);
    }
  }

  getVolume(): number {
    return this.currentVolume;
  }

  /**
   * Preload a song asynchronously.
   */
  async preload(song: Song): Promise<void> {
    this.initAudio();
    if (!this.ctx) return;

    if (this.preloadingSong?.id === song.id || this.preloadedSong?.id === song.id) {
      return; // Already preloading or preloaded
    }

    this.preloadingSong = song;

    try {
      if (song.audioUrl) {
        let buffer: AudioBuffer;
        if (this.bufferCache.has(song.audioUrl)) {
          buffer = this.bufferCache.get(song.audioUrl)!;
        } else {
          const response = await fetch(song.audioUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          buffer = await this.ctx.decodeAudioData(arrayBuffer);
          
          // Manage cache size
          if (this.bufferCache.size >= this.maxCacheSize) {
            const firstKey = this.bufferCache.keys().next().value;
            if (firstKey) this.bufferCache.delete(firstKey);
          }
          this.bufferCache.set(song.audioUrl, buffer);
        }
        
        this.preloadedBuffer = buffer;
        this.preloadedSong = song;
        this.onPreloadComplete(song);
      } else {
        // Procedural synth has no download latency, complete preload immediately
        this.preloadedBuffer = null;
        this.preloadedSong = song;
        this.onPreloadComplete(song);
      }
    } catch (err) {
      console.warn(`Preloading failed for ${song.title}, falling back to procedural synth:`, err);
      // Fallback: preload successfully with null buffer, marking it to use synth
      this.preloadedBuffer = null;
      this.preloadedSong = song;
      this.onPreloadComplete(song);
    } finally {
      this.preloadingSong = null;
    }
  }

  /**
   * Play a song with optional crossfading/fade-in.
   */
  async play(song: Song, startOffset: number = 0, fadeInDuration: number = 0.5): Promise<void> {
    this.initAudio();
    if (!this.ctx) return;

    // Resume AudioContext if suspended
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    // Stop current track (fade-out)
    this.cleanupActiveTrack(fadeInDuration);

    this.activeSong = song;
    this.activeStartTime = this.ctx.currentTime - startOffset;
    this.activePauseTime = 0;

    // Create localized track gain node
    const trackGain = this.ctx.createGain();
    trackGain.gain.setValueAtTime(0, this.ctx.currentTime);
    trackGain.connect(this.masterGain!);
    this.activeGain = trackGain;

    // Trigger fade-in
    trackGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + fadeInDuration);

    // Play preloaded buffer or synthesize procedural loops
    const isPreloaded = this.preloadedSong?.id === song.id;
    const bufferToPlay = isPreloaded ? this.preloadedBuffer : null;

    if (song.audioUrl && (bufferToPlay || !isPreloaded)) {
      try {
        let buffer = bufferToPlay;
        if (!buffer) {
          // If not preloaded, fetch and decode on the fly
          const response = await fetch(song.audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          buffer = await this.ctx.decodeAudioData(arrayBuffer);
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(trackGain);
        source.start(0, startOffset);
        
        this.activeBufferSource = source;

        // Listen for track ending
        source.onended = () => {
          if (this.activeSong?.id === song.id) {
            this.handleTrackEnding();
          }
        };
      } catch (err) {
        this.onError(err as Error, song);
        console.warn(`Error playing track ${song.title}, falling back to procedural synthesizer...`);
        this.startProceduralSynth(song, trackGain, startOffset);
      }
    } else {
      // Play procedural synth directly
      this.startProceduralSynth(song, trackGain, startOffset);
    }

    // Start progress tracking loop
    this.startProgressTicker(song, startOffset);

    // Preload next track placeholder if not done
    this.clearPreloadCacheForSong(song.id);
  }

  /**
   * Pause playback by suspending the AudioContext.
   */
  async pause(): Promise<void> {
    this.initAudio();
    if (this.ctx && this.ctx.state === "running") {
      this.activePauseTime = this.ctx.currentTime;
      await this.ctx.suspend();
      this.stopProgressTicker();
    }
  }

  /**
   * Resume playback by resuming the AudioContext.
   */
  async resume(): Promise<void> {
    this.initAudio();
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
      if (this.activeSong) {
        this.activeStartTime += (this.ctx.currentTime - this.activePauseTime);
        this.startProgressTicker(this.activeSong, this.ctx.currentTime - this.activeStartTime);
      }
    }
  }

  /**
   * Stop active track completely.
   */
  stop(fadeDuration: number = 0.5): void {
    this.cleanupActiveTrack(fadeDuration);
    this.stopProgressTicker();
    this.activeSong = null;
  }

  /**
   * Crossfade from the current track to a new track.
   */
  async crossFadeTo(song: Song, crossfadeDuration: number = 1.2): Promise<void> {
    this.initAudio();
    if (!this.ctx) return;

    if (!this.activeSong) {
      await this.play(song, 0, crossfadeDuration);
      return;
    }

    // 1. Fade out active track
    const oldSong = this.activeSong;
    const oldGain = this.activeGain;
    const oldSource = this.activeBufferSource;
    const oldSynth = this.activeSynthNodes;
    const oldProgressInterval = this.progressIntervalId;

    if (oldGain) {
      const t = this.ctx.currentTime;
      oldGain.gain.cancelScheduledValues?.(t);
      oldGain.gain.setValueAtTime(oldGain.gain.value, t);
      oldGain.gain.linearRampToValueAtTime(0.0001, t + crossfadeDuration);

      // Schedule cleanup for the old track nodes
      setTimeout(() => {
        try {
          if (oldSource) {
            oldSource.stop();
            oldSource.disconnect();
          }
          if (oldSynth) {
            clearInterval(oldSynth.intervalId);
            oldSynth.oscillators.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch {} });
            oldSynth.gainNodes.forEach(g => g.disconnect());
          }
          oldGain.disconnect();
        } catch (_) {}
      }, crossfadeDuration * 1000 + 100);
    }

    // 2. Clear progress ticker
    clearInterval(oldProgressInterval);

    // 3. Initialize and play the new track (fade-in)
    this.activeSong = song;
    this.activeStartTime = this.ctx.currentTime;
    this.activePauseTime = 0;

    const newGain = this.ctx.createGain();
    newGain.gain.setValueAtTime(0, this.ctx.currentTime);
    newGain.connect(this.masterGain!);
    this.activeGain = newGain;

    newGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + crossfadeDuration);

    const isPreloaded = this.preloadedSong?.id === song.id;
    const bufferToPlay = isPreloaded ? this.preloadedBuffer : null;

    if (song.audioUrl && (bufferToPlay || !isPreloaded)) {
      try {
        let buffer = bufferToPlay;
        if (!buffer) {
          const response = await fetch(song.audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          buffer = await this.ctx.decodeAudioData(arrayBuffer);
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(newGain);
        source.start(0);
        
        this.activeBufferSource = source;
        source.onended = () => {
          if (this.activeSong?.id === song.id) {
            this.handleTrackEnding();
          }
        };
      } catch (err) {
        this.onError(err as Error, song);
        this.startProceduralSynth(song, newGain, 0);
      }
    } else {
      this.startProceduralSynth(song, newGain, 0);
    }

    this.startProgressTicker(song, 0);
    this.clearPreloadCacheForSong(song.id);
  }

  /**
   * Helper to clean up active nodes.
   */
  private cleanupActiveTrack(fadeDuration: number = 0.1): void {
    if (!this.ctx) return;
    
    const sourceToCleanup = this.activeBufferSource;
    const gainToCleanup = this.activeGain;
    const synthToCleanup = this.activeSynthNodes;

    this.activeBufferSource = null;
    this.activeGain = null;
    this.activeSynthNodes = null;

    if (gainToCleanup) {
      const t = this.ctx.currentTime;
      gainToCleanup.gain.cancelScheduledValues?.(t);
      gainToCleanup.gain.setValueAtTime(gainToCleanup.gain.value, t);
      gainToCleanup.gain.linearRampToValueAtTime(0.0001, t + fadeDuration);

      setTimeout(() => {
        try {
          if (sourceToCleanup) {
            sourceToCleanup.stop();
            sourceToCleanup.disconnect();
          }
          if (synthToCleanup) {
            clearInterval(synthToCleanup.intervalId);
            synthToCleanup.oscillators.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch {} });
            synthToCleanup.gainNodes.forEach(g => g.disconnect());
          }
          gainToCleanup.disconnect();
        } catch (_) {}
      }, fadeDuration * 1000 + 100);
    }
  }

  private clearPreloadCacheForSong(songId: string): void {
    if (this.preloadedSong?.id === songId) {
      this.preloadedSong = null;
      this.preloadedBuffer = null;
    }
  }

  private handleTrackEnding(): void {
    if (this.activeSong) {
      this.onEnded(this.activeSong);
    }
  }

  /**
   * Progress reporting ticker.
   */
  private startProgressTicker(song: Song, startOffset: number): void {
    this.stopProgressTicker();
    
    let currentProgress = startOffset;
    const duration = song.durationSeconds || 180;
    
    this.onProgress(currentProgress, duration);

    this.progressIntervalId = setInterval(() => {
      if (this.ctx?.state === "suspended") return;
      
      currentProgress += 1;
      
      if (currentProgress >= duration) {
        currentProgress = duration;
        this.onProgress(currentProgress, duration);
        this.stopProgressTicker();
        this.handleTrackEnding();
      } else {
        this.onProgress(currentProgress, duration);
      }
    }, 1000);
  }

  private stopProgressTicker(): void {
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }
  }

  /**
   * HIGH-FIDELITY PROCEDURAL SYNTHESIZER FALLBACK
   * Synthesizes ambient music in real time using the Web Audio API based on Genre.
   */
  private startProceduralSynth(song: Song, trackGain: GainNode, startOffset: number): void {
    if (!this.ctx) return;

    const oscs: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    const genre = (song.genre || "calm").toLowerCase();

    // Map genres to musical parameters
    let tempo = 75; // BPM
    let scaleFrequencies = [220.00, 261.63, 293.66, 329.63, 392.00]; // A minor / C major pentatonic (A3, C4, D4, E4, G4)
    let synthType: OscillatorType = "sine";

    if (genre.includes("adventure")) {
      tempo = 115;
      scaleFrequencies = [146.83, 164.81, 196.00, 220.00, 293.66]; // D minor (D3, E3, G3, A3, D4)
      synthType = "triangle";
    } else if (genre.includes("calm")) {
      tempo = 55;
      scaleFrequencies = [196.00, 246.94, 293.66, 392.00, 440.00]; // G major (G3, B3, D4, G4, A4)
      synthType = "sine";
    } else if (genre.includes("battle")) {
      tempo = 135;
      scaleFrequencies = [110.00, 130.81, 146.83, 155.56, 164.81]; // C# dim / Locrian (A2, C3, D3, Eb3, E3)
      synthType = "sawtooth";
    } else if (genre.includes("mystery")) {
      tempo = 80;
      scaleFrequencies = [207.65, 246.94, 277.18, 311.13, 415.30]; // G# minor (G#3, B3, C#4, D#4, G#4)
      synthType = "sine";
    } else if (genre.includes("emotional")) {
      tempo = 68;
      scaleFrequencies = [220.00, 261.63, 329.63, 392.00, 523.25]; // C major (A3, C4, E4, G4, C5)
      synthType = "triangle";
    }

    const stepDuration = 60 / tempo; // Seconds per beat

    // 1. Create a warm base drone pad (low notes)
    const baseOsc1 = this.ctx.createOscillator();
    const baseOsc2 = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();

    baseOsc1.type = "sine";
    baseOsc2.type = "triangle";
    
    // Detune slightly for chorused premium sound
    baseOsc1.frequency.setValueAtTime(scaleFrequencies[0] / 2, this.ctx.currentTime);
    baseOsc2.frequency.setValueAtTime(scaleFrequencies[0] / 2 + 1.5, this.ctx.currentTime);

    droneGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    
    // Add LFO filter modulation for premium analog feel
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime); // slow swell
    lfoGain.gain.setValueAtTime(150, this.ctx.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    baseOsc1.connect(filter);
    baseOsc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(trackGain);

    baseOsc1.start();
    baseOsc2.start();
    lfo.start();

    oscs.push(baseOsc1, baseOsc2, lfo);
    gains.push(droneGain);

    // 2. Play sequential notes using a scheduler lookahead loop
    let nextNoteTime = this.ctx.currentTime;
    let stepIndex = Math.floor(startOffset / stepDuration);

    const scheduleNextNote = () => {
      if (!this.ctx || !this.activeSong) return;

      while (nextNoteTime < this.ctx.currentTime + 0.3) {
        // Calculate note frequency using simple chord structures
        let freqIdx = (stepIndex % 4 === 0) ? 0 : (stepIndex % 3 === 0) ? 2 : (stepIndex % 5 === 0) ? 4 : 1;
        let frequency = scaleFrequencies[freqIdx];
        
        // Add variations
        if (stepIndex % 8 === 7) frequency *= 1.5; // octave or fifth shift
        if (stepIndex % 12 === 0) frequency /= 1.5;

        // Skip notes occasionally in Calm/Mystery to create ambient space
        const shouldPlay = (genre.includes("calm") || genre.includes("mystery")) 
          ? (Math.random() > 0.3) 
          : true;

        if (shouldPlay) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = synthType;
          osc.frequency.setValueAtTime(frequency, nextNoteTime);
          
          // Micro vibrato for high-quality organic sound
          const vibrato = this.ctx.createOscillator();
          const vibratoGain = this.ctx.createGain();
          vibrato.frequency.setValueAtTime(genre.includes("battle") ? 8 : 4.5, nextNoteTime);
          vibratoGain.gain.setValueAtTime(frequency * 0.008, nextNoteTime);
          vibrato.connect(vibratoGain);
          vibratoGain.connect(osc.frequency);
          vibrato.start(nextNoteTime);
          oscs.push(vibrato);

          // Apply filter for non-harsh high frequencies
          const noteFilter = this.ctx.createBiquadFilter();
          noteFilter.type = "lowpass";
          noteFilter.frequency.setValueAtTime(genre.includes("battle") ? 1000 : 700, nextNoteTime);

          // Envelope: Fast attack, slow decay
          const peakVolume = genre.includes("battle") ? 0.05 : 0.03;
          gain.gain.setValueAtTime(0, nextNoteTime);
          gain.gain.linearRampToValueAtTime(peakVolume, nextNoteTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + stepDuration * (genre.includes("calm") ? 2.5 : 1.2));

          osc.connect(noteFilter);
          noteFilter.connect(gain);
          gain.connect(trackGain);

          osc.start(nextNoteTime);
          
          const stopTime = nextNoteTime + stepDuration * 3;
          osc.stop(stopTime);
          vibrato.stop(stopTime);

          oscs.push(osc);
          gains.push(gain);

          // Node memory cleanup once finished
          setTimeout(() => {
            try {
              osc.disconnect();
              vibrato.disconnect();
              noteFilter.disconnect();
              gain.disconnect();
            } catch (_) {}
          }, (stopTime - this.ctx!.currentTime) * 1000 + 100);
        }

        nextNoteTime += stepDuration;
        stepIndex++;
      }
    };

    scheduleNextNote();
    const intervalId = setInterval(scheduleNextNote, 100);

    this.activeSynthNodes = {
      oscillators: oscs,
      gainNodes: gains,
      intervalId
    };
  }
}
