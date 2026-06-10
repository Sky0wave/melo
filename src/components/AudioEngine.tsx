import { useEffect, useRef } from "react";

interface AudioEngineProps {
  isPlaying: boolean;
  songId: string | null;
  eqBands: number[];
}

export function AudioEngine({ isPlaying, songId, eqBands }: AudioEngineProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);

  // Update EQ bands dynamically when they change without rebuilding the graph
  useEffect(() => {
    if (eqBands && filtersRef.current.length === eqBands.length) {
      eqBands.forEach((gain, idx) => {
        const filter = filtersRef.current[idx];
        if (filter && audioCtxRef.current) {
          filter.gain.setValueAtTime(gain, audioCtxRef.current.currentTime);
        }
      });
    }
  }, [eqBands]);

  useEffect(() => {
    // Lazy initialisation to comply with browser gesture requirements
    if (isPlaying && !audioCtxRef.current) {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          audioCtxRef.current = new AudioCtxClass();
        }
      } catch (err) {
        console.warn("Audio Context not supported in this browser environment.", err);
      }
    }

    if (!audioCtxRef.current) return;

    // Do not play synthetic sound for YouTube tracks
    if (songId && songId.startsWith("yt_")) {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (_) {}
          oscillatorRef.current = null;
      }
      return;
    }

    if (isPlaying) {
      try {
        // Resume if suspended (browser security rules)
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }

        // Clean up previous nodes
        if (oscillatorRef.current) {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        }
        filtersRef.current.forEach(f => f.disconnect());
        filtersRef.current = [];

        // Create elegant low-frequency sine synth note depending on song identity
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();

        // Map song IDs to warm audio tones
        let freq = 110; // default low note A
        if (songId === "vivid_obsessions") freq = 130.81; // C3
        else if (songId === "midnight_bloom") freq = 146.83; // D3
        else if (songId === "subsonic_waves") freq = 97.99; // G2 (deep bass)
        else if (songId === "nocturnal_radiance") freq = 110.00; // A2
        else if (songId === "shadow_choreography") freq = 82.41; // E2 (heavy base)
        else if (songId === "neon_resurgence") freq = 164.81; // E3
        else if (songId === "silk_static") freq = 123.47; // B2

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);

        // Low volume so it is extremely pleasant and non-disruptive
        gain.gain.setValueAtTime(0.02, audioCtxRef.current.currentTime);
        
        // Add a gentle tremolo LFO for luxurious analog wave feel
        const lfo = audioCtxRef.current.createOscillator();
        const lfoGain = audioCtxRef.current.createGain();
        lfo.frequency.value = 0.5; // low frequency 0.5hz
        lfoGain.gain.value = 0.008; // subtle amplitude tremolo
        
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        
        osc.connect(gain);

        // Create 5 equalizer filter nodes
        const eqFreqs = [60, 230, 910, 4000, 14000];
        const newFilters = eqFreqs.map((f, i) => {
          const filter = audioCtxRef.current!.createBiquadFilter();
          filter.type = i === 0 ? "lowshelf" : i === 4 ? "highshelf" : "peaking";
          filter.frequency.value = f;
          filter.gain.value = eqBands[i] || 0;
          return filter;
        });

        // Chain the filter nodes: gain -> filter0 -> filter1 -> ... -> filter4 -> destination
        let lastNode: AudioNode = gain;
        newFilters.forEach(filter => {
          lastNode.connect(filter);
          lastNode = filter;
        });
        lastNode.connect(audioCtxRef.current.destination);

        filtersRef.current = newFilters;

        osc.start();
        lfo.start();

        oscillatorRef.current = osc;
        gainNodeRef.current = gain;
      } catch (e) {
        console.error("Failed to start synth oscillator:", e);
      }
    } else {
      // Fade out slowly
      if (gainNodeRef.current && audioCtxRef.current) {
        try {
          const t = audioCtxRef.current.currentTime;
          gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, t);
          gainNodeRef.current.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
          
          setTimeout(() => {
            if (oscillatorRef.current && !isPlaying) {
              oscillatorRef.current.stop();
              oscillatorRef.current.disconnect();
              oscillatorRef.current = null;
            }
          }, 350);
        } catch (e) {
          // Fallback direct cleanup
          if (oscillatorRef.current) {
            oscillatorRef.current.disconnect();
            oscillatorRef.current = null;
          }
        }
      }
    }

    return () => {
      // Cleanup nodes
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (_) {}
        oscillatorRef.current = null;
      }
    };
  }, [isPlaying, songId]);

  return null; // pure sound node
}
