import { Pause, Play, Heart, SkipBack, SkipForward } from "lucide-react";
import { Song } from "../types";

interface MiniPlayerProps {
  currentSong: Song;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPreviousSong: () => void;
  onNextSong: () => void;
  progress: number;
  onClick: () => void;
  followingTarget: string | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function MiniPlayer({
  currentSong,
  isPlaying,
  onTogglePlay,
  onPreviousSong,
  onNextSong,
  progress,
  onClick,
  followingTarget,
  isFavorite,
  onToggleFavorite
}: MiniPlayerProps) {
  const percent = currentSong.durationSeconds
    ? (progress / currentSong.durationSeconds) * 100
    : 0;

  return (
    <div
      onClick={onClick}
      className="fixed bottom-16 md:bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-[430px] md:max-w-[700px] bg-mulberry-dark/95 backdrop-blur-xl p-3 border-t md:border border-white/5 md:rounded-2xl z-40 flex items-center justify-between gap-4 animate-fade-in silver-edge select-none cursor-pointer shadow-2xl hover:bg-mulberry-light/95 transition-all"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Rotating Album Art */}
        <div className="relative shrink-0">
          <img
            src={currentSong.coverUrl}
            alt={currentSong.title}
            className={`w-11 h-11 rounded-full object-cover border border-white/10 shadow-lg ${
              isPlaying ? "animate-[spin_12s_linear_infinite]" : ""
            }`}
            style={{ animationPlayState: isPlaying ? "running" : "paused" }}
          />
          {/* Vinyl center pin indicator */}
          <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-[#080507] border border-white/20 shadow-inner" />
        </div>

        {/* Title / Artist */}
        <div className="min-w-0 text-left">
          <h5 className="font-serif text-xs font-bold text-mulberry-on truncate leading-snug">
            {currentSong.title}
          </h5>
          <p className="font-sans text-[10px] text-mulberry-on-variant truncate flex items-center gap-1">
            <span>{currentSong.artist}</span>
            {followingTarget && (
              <span className="text-emerald-400 font-mono text-[8px] uppercase tracking-normal">
                (Sync)
               </span>
            )}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
        {/* Heart / Like Button */}
        <button
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "Unlike song" : "Like song"}
          className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer group"
        >
          <Heart
            className={`w-4 h-4 transition-all duration-300 ${
              isFavorite
                ? "text-mulberry-primary fill-mulberry-primary scale-110"
                : "text-white/40 group-hover:text-white/60"
            }`}
          />
        </button>

        {/* Previous Song */}
        <button
          onClick={onPreviousSong}
          aria-label="Previous song"
          className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="w-9 h-9 rounded-full bg-mulberry-primary text-mulberry-base flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#FF007A]/10 cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current text-white" />
          ) : (
            <Play className="w-4 h-4 fill-current text-white ml-0.5" />
          )}
        </button>

        {/* Next Song */}
        <button
          onClick={onNextSong}
          aria-label="Next song"
          className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* Progress Strip */}
      <div className="absolute bottom-0 left-0 h-[2.5px] bg-[#FF007A]/15 w-full md:rounded-b-2xl overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-mulberry-primary to-[#ffd8e8] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
