import { X, Sliders } from "lucide-react";

interface EqualizerProps {
  isOpen: boolean;
  onClose: () => void;
  eqBands: number[];
  onChangeBand: (index: number, value: number) => void;
  onApplyPreset: (presetGains: number[]) => void;
}

const PRESETS = [
  { name: "Flat", gains: [0, 0, 0, 0, 0] },
  { name: "Bass Boost", gains: [8, 4, 0, -1, -3] },
  { name: "Treble Boost", gains: [-3, -1, 0, 4, 8] },
  { name: "Vocal", gains: [-2, 2, 6, 4, -1] },
  { name: "Electronic", gains: [6, 2, -2, 3, 5] }
];

export function Equalizer({
  isOpen,
  onClose,
  eqBands,
  onChangeBand,
  onApplyPreset
}: EqualizerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#07060a]/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-[480px] md:max-w-[700px] bg-mulberry-dark border-t border-white/10 rounded-t-3xl p-6 space-y-6 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-mulberry-primary" />
            <h3 className="font-serif text-base font-bold text-white tracking-wide">Audio Equalizer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning info */}
        <p className="text-[9px] text-white/40 leading-relaxed text-center bg-white/3 border border-white/5 p-2 rounded-lg">
          Note: Equalizer affects synthetic playback tracks. YouTube tracks bypass the custom Web Audio graph due to browser security restrictions.
        </p>

        {/* Presets Chips */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-widest text-white/35">Presets</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const isMatch = eqBands.every((g, idx) => g === preset.gains[idx]);
              return (
                <button
                  key={preset.name}
                  onClick={() => onApplyPreset(preset.gains)}
                  className={`text-[10px] px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-sans ${
                    isMatch
                      ? "bg-mulberry-primary text-white border-mulberry-primary font-bold"
                      : "bg-white/3 text-white/60 border-white/5 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders container */}
        <div className="space-y-3">
          <label className="text-[10px] uppercase font-bold tracking-widest text-white/35">Frequency Bands</label>
          <div className="grid grid-cols-5 gap-3 h-52 bg-white/2 border border-white/5 rounded-2xl p-4 items-center">
            {["60Hz", "230Hz", "910Hz", "4kHz", "14kHz"].map((bandName, idx) => (
              <div key={bandName} className="flex flex-col items-center justify-between h-full space-y-2">
                <span className="text-[10px] font-mono text-white/65">{eqBands[idx] > 0 ? `+${eqBands[idx]}` : eqBands[idx]} dB</span>
                
                {/* Vertical Slider */}
                <div className="flex-1 w-6 flex items-center justify-center relative group">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={eqBands[idx]}
                    onChange={(e) => onChangeBand(idx, parseInt(e.target.value, 10))}
                    className="w-32 accent-mulberry-primary -rotate-90 bg-white/10 hover:bg-white/20 rounded-lg appearance-none cursor-pointer h-1 transform origin-center transition-all"
                  />
                </div>

                <span className="text-[9px] uppercase font-bold tracking-wider text-white/40">{bandName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
