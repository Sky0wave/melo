import React, { useState, useEffect, useRef } from "react";
import { Shield, Key, Mail } from "lucide-react";

interface AdminLoginGateProps {
  onSuccess: (password: string, user: any) => void;
  isLoading: boolean;
  errorMsg: string;
}

export function AdminLoginGate({ onSuccess, isLoading, errorMsg }: AdminLoginGateProps) {
  const [password, setPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("sky0wave01@gmail.com");
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "950921906220-dt0pscki7erf5j27ahdqj33q01qnlbiv.apps.googleusercontent.com";

    const handleGoogleSignInResponse = async (response: any) => {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential })
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Google authentication failed.");
        }

        const data = await res.json();
        if (data.success && data.user) {
          if (data.user.role === "admin") {
            setGoogleUser(data.user);
            setShowPasswordInput(true); // Still prompt for password as second factor for safety, or auto login
            // For convenience, we can autofill "mulberry" or prompt them.
            // Let's prompt for vault password to authenticate fully.
          } else {
            alert("Access Denied: Your Google account is not configured as an administrator.");
          }
        }
      } catch (err) {
        console.error("[Google Sign-In Error]", err);
        alert("Authentication failed.");
      }
    };

    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleSignInResponse,
          auto_select: false
        });
        
        if (btnRef.current) {
          (window as any).google.accounts.id.renderButton(
            btnRef.current,
            { theme: "filled_black", size: "large", text: "signin_with", shape: "pill" }
          );
        }
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    let user = googleUser;
    if (!user) {
      const displayEmail = adminEmail.trim() || "sky0wave01@gmail.com";
      const displayName = displayEmail.split("@")[0] || "Admin";
      user = {
        name: displayName,
        email: displayEmail,
        role: "admin",
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF007A&color=fff`
      };
    }
    onSuccess(password.trim(), user);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#07060a]">
      {/* Glow Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#FF007A]/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#7B2FFF]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 glass-card p-8 max-w-md w-full mx-4 text-center space-y-6 animate-slide-up">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#FF007A]/10 flex items-center justify-center border border-[#FF007A]/20 shadow-lg shadow-[#FF007A]/5">
          <Shield className="w-8 h-8 text-[#FF007A] animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold tracking-wide text-white">Unlock Admin Vault</h2>
          <p className="text-xs text-white/50 leading-relaxed">
            Authorized personnel only. Please sign in with your administrator Google account or enter your administrator credentials.
          </p>
        </div>

        {!showPasswordInput ? (
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/30">Option 1: Authenticate Profile</span>
            <div ref={btnRef} />
            <button
              onClick={() => setShowPasswordInput(true)}
              className="text-[10px] text-white/40 hover:text-white/60 transition-colors underline cursor-pointer"
            >
              Option 2: Use Admin ID & Password
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block mb-2 text-center">Credentials Verification</span>
            
            {googleUser ? (
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-left mb-4">
                {googleUser.picture && (
                  <img src={googleUser.picture} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                )}
                <div>
                  <p className="text-xs font-bold text-white">{googleUser.name}</p>
                  <p className="text-[10px] text-white/40">{googleUser.email}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">Admin ID (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    placeholder="sky0wave01@gmail.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF007A] transition-all font-sans"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">Vault Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF007A] transition-all font-sans"
                  autoFocus
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-[#FF007A] text-[10px] font-bold uppercase tracking-wider text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#FF007A] hover:bg-[#FF007A]/90 text-white font-sans text-xs font-bold uppercase tracking-wider py-4 rounded-xl transition-all shadow-lg shadow-[#FF007A]/15 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? "Unlocking Vault..." : "Authorize Admin Access"}
            </button>
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setGoogleUser(null);
                  setShowPasswordInput(false);
                }}
                className="text-[10px] text-white/40 hover:text-white/60 transition-colors cursor-pointer"
              >
                {googleUser ? `Sign out of ${googleUser.name}` : "Back to Google Sign-in"}
              </button>
            </div>
          </form>
        )}

        <div className="h-px bg-white/5 w-full" />
        <p className="text-[9px] text-white/30 tracking-wide">
          Tip: The default project password is configured during server instantiation.
        </p>
      </div>
    </div>
  );
}
