import { X, Play, Trash2, AlignJustify } from "lucide-react";
import { Song } from "../types";

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Song[];
  currentIndex: number;
  onPlayIndex: (index: number) => void;
  onRemoveIndex: (index: number) => void;
  onClearQueue: () => void;
}

export function QueuePanel({
  isOpen,
  onClose,
  queue,
  currentIndex,
  onPlayIndex,
  onRemoveIndex,
  onClearQueue
}: QueuePanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#07060a]/80 backdrop-blur-md animate-fade-in">
      {/* Click outside container to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Drawer Panel */}
      <div className="relative z-10 w-full max-w-[480px] md:max-w-[700px] h-[75vh] bg-mulberry-dark border-t border-white/10 rounded-t-3xl flex flex-col overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-bold text-white tracking-wide">Play Queue</h3>
            <span className="text-[10px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-white/50 font-mono">
              {queue.length} track{queue.length !== 1 && "s"}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="text-[10px] uppercase font-bold tracking-widest text-[#FF007A] hover:bg-[#FF007A]/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
              <p className="font-serif text-sm text-white/70">Queue is empty</p>
              <p className="text-[10px] text-white/40 max-w-[200px] leading-relaxed">
                Add songs to the queue from search or library to keep the vibe going.
              </p>
            </div>
          ) : (
            queue.map((song, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <div
                  key={`${song.id}-${idx}`}
                  className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-mulberry-primary/10 border-mulberry-primary/30"
                      : "bg-white/2 border-white/2 hover:bg-white/4 hover:border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Drag indicator icon placeholder / track number */}
                    <div className="flex items-center justify-center shrink-0 w-6 h-6">
                      {isCurrent ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-mulberry-primary animate-ping" />
                      ) : (
                        <span className="text-[10px] font-mono text-white/30">{idx + 1}</span>
                      )}
                    </div>

                    <img
                      src={song.coverUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover silver-edge shrink-0"
                    />

                    <div className="min-w-0 text-left">
                      <h4
                        className={`text-xs font-bold truncate leading-snug transition-colors ${
                          isCurrent ? "text-mulberry-primary" : "text-white/90"
                        }`}
                      >
                        {song.title}
                      </h4>
                      <p className="text-[10px] text-white/40 truncate">{song.artist}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    {!isCurrent && (
                      <button
                        onClick={() => onPlayIndex(idx)}
                        className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer"
                        title="Play now"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveIndex(idx)}
                      className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-[#FF007A] transition-colors cursor-pointer"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
