import { useEffect, useRef } from "react";

interface LoginScreenProps {
  onSignIn: (response: any) => void;
  isLoading?: boolean;
}

export function LoginScreen({ onSignIn, isLoading }: LoginScreenProps) {
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "950921906220-dt0pscki7erf5j27ahdqj33q01qnlbiv.apps.googleusercontent.com";

    const tryRender = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id) return;

      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onSignIn,
        auto_select: false,
      });

      if (btnRef.current) {
        g.accounts.id.renderButton(btnRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 280,
        });
      }
    };

    // Poll until Google script loads
    const timer = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        clearInterval(timer);
        tryRender();
      }
    }, 300);

    return () => clearInterval(timer);
  }, [onSignIn]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#07060a]">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#FF007A]/8 blur-[120px] animate-[drift_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#7B2FFF]/8 blur-[120px] animate-[drift_16s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-[#FF007A]/5 blur-[100px] animate-[drift_9s_ease-in-out_infinite_2s]" />
      </div>

      {/* Waveform SVG bars at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden pointer-events-none opacity-20">
        <svg viewBox="0 0 1440 128" preserveAspectRatio="none" className="w-full h-full">
          {Array.from({ length: 72 }).map((_, i) => {
            const h = 20 + Math.sin(i * 0.4) * 30 + Math.sin(i * 0.15) * 40;
            return (
              <rect
                key={i}
                x={i * 20}
                y={128 - h}
                width="14"
                height={h}
                rx="3"
                fill={i % 3 === 0 ? "#FF007A" : "#7B2FFF"}
                opacity={0.4 + Math.sin(i * 0.3) * 0.3}
                style={{ animation: `waveBar ${1.5 + (i % 7) * 0.2}s ease-in-out infinite alternate`, animationDelay: `${(i * 0.05) % 1.5}s` }}
              />
            );
          })}
        </svg>
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main login card */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 py-12 max-w-sm w-full mx-4"
           style={{ animation: "fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#FF007A]/30 blur-2xl scale-150 animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF007A]/20 to-[#7B2FFF]/20 border border-white/10 flex items-center justify-center backdrop-blur-sm"
                 style={{ boxShadow: "0 0 40px rgba(255,0,122,0.2)" }}>
              <img src="/favicon.svg" alt="Melo" className="w-10 h-10" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="font-serif text-4xl font-bold tracking-widest text-white"
                style={{ background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              MELO
            </h1>
            <p className="text-white/40 text-xs font-sans tracking-[0.2em] uppercase mt-1">
              High-Fidelity Music
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Sign in content */}
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="text-center space-y-2">
            <h2 className="text-white font-sans font-semibold text-lg">Welcome back</h2>
            <p className="text-white/40 text-sm font-sans leading-relaxed">
              Sign in to access your music, playlists, and personalized experience.
            </p>
          </div>

          {/* Google sign in button container */}
          <div className="relative group">
            {isLoading ? (
              <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                <div className="w-4 h-4 rounded-full border-2 border-[#FF007A]/40 border-t-[#FF007A] animate-spin" />
                <span className="text-white/60 text-sm font-sans">Signing in...</span>
              </div>
            ) : (
              <div
                ref={btnRef}
                id="google-signin-btn-login"
                className="overflow-hidden rounded-full"
                style={{ minWidth: 280 }}
              />
            )}
          </div>

          <p className="text-white/20 text-[10px] font-sans text-center leading-relaxed max-w-[220px]">
            By signing in, you agree to Melo's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.97); }
        }
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
