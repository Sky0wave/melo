import { Song } from "../types";
export type { Song };

export type LoopMode = 'none' | 'one' | 'playlist';

export interface PlaybackState {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number; // in seconds
  volume: number; // 0.0 to 1.0
  shuffleEnabled: boolean;
  loopMode: LoopMode;
  activeLayer: string | null;
}

export type EngineEvents = {
  'play': (song: Song) => void;
  'pause': () => void;
  'resume': () => void;
  'stop': () => void;
  'progress': (progress: number, duration: number) => void;
  'ended': (song: Song) => void;
  'error': (error: Error, song: Song) => void;
  'queue-changed': (queue: Song[]) => void;
  'layer-changed': (layerName: string | null) => void;
  'crossfade-start': (fromSong: Song | null, toSong: Song) => void;
  'crossfade-end': (song: Song) => void;
  'preload-start': (song: Song) => void;
  'preload-complete': (song: Song) => void;
  'state-change': () => void;
};
