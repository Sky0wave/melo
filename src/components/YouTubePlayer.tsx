import { useEffect, useRef, useCallback } from "react";

interface YouTubePlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  onReady: () => void;
  seekTo?: number | null; // set externally to trigger a seek
  onError?: (errorCode: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let ytApiLoaded = false;
let ytApiLoading = false;
const ytApiReadyCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    ytApiReadyCallbacks.push(resolve);

    if (ytApiLoading) {
      const interval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(interval);
          ytApiLoaded = true;
          ytApiReadyCallbacks.forEach((cb) => cb());
          ytApiReadyCallbacks.length = 0;
        }
      }, 100);
      return;
    }
    ytApiLoading = true;

    let tag = document.getElementById("yt-iframe-api") as HTMLScriptElement | null;
    if (!tag) {
      tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const checkReady = () => {
      if (window.YT && window.YT.Player) {
        ytApiLoaded = true;
        ytApiReadyCallbacks.forEach((cb) => cb());
        ytApiReadyCallbacks.length = 0;
        return true;
      }
      return false;
    };

    window.onYouTubeIframeAPIReady = () => {
      checkReady();
    };

    const interval = setInterval(() => {
      if (checkReady()) {
        clearInterval(interval);
      }
    }, 100);
  });
}

export function YouTubePlayer({
  videoId,
  isPlaying,
  onTimeUpdate,
  onEnded,
  onReady,
  seekTo,
  onError,
}: YouTubePlayerProps) {
  const cleanVideoId = videoId ? videoId.replace(/^(yt_)+/, "") : null;
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const isPlayerReady = useRef(false);
  const pendingPlayRef = useRef(false);

  // Progress update loop via requestAnimationFrame
  const startProgressLoop = useCallback(() => {
    const tick = () => {
      if (playerRef.current && isPlayerReady.current) {
        try {
          const currentTime = playerRef.current.getCurrentTime?.() || 0;
          const duration = playerRef.current.getDuration?.() || 0;
          onTimeUpdate(currentTime, duration);
        } catch (e) {
          // Player may be in invalid state
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [onTimeUpdate]);

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Initialize YouTube player
  useEffect(() => {
    if (!cleanVideoId) return;

    let destroyed = false;

    const initPlayer = async () => {
      await loadYouTubeAPI();
      if (destroyed) return;

      // If player already exists for the same container, just load new video
      if (playerRef.current && isPlayerReady.current) {
        if (currentVideoIdRef.current !== cleanVideoId) {
          currentVideoIdRef.current = cleanVideoId;
          playerRef.current.loadVideoById(cleanVideoId);
        }
        return;
      }

      // Destroy existing player if container mismatch
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
        isPlayerReady.current = false;
      }

      currentVideoIdRef.current = cleanVideoId;

      playerRef.current = new window.YT.Player("yt-player-container", {
        host: "https://www.youtube-nocookie.com",
        height: "200",
        width: "200",
        videoId: cleanVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (destroyed) return;
            isPlayerReady.current = true;
            event.target.setVolume(100);
            onReady();
            startProgressLoop();
            if (pendingPlayRef.current) {
              event.target.playVideo();
              pendingPlayRef.current = false;
            }
          },
          onStateChange: (event: any) => {
            if (destroyed) return;
            const state = event.data;
            // YT.PlayerState: ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3, CUED=5
            if (state === 0) {
              // Video ended
              stopProgressLoop();
              onEnded();
            } else if (state === 1) {
              // Playing
              startProgressLoop();
            } else if (state === 2) {
              // Paused - keep loop for UI but update less
            }
          },
          onError: (event: any) => {
            console.error("YouTube Player error:", event.data);
            if (onError) {
              onError(event.data);
            }
          },
        },
      });
    };

    initPlayer();

    return () => {
      destroyed = true;
    };
  }, [cleanVideoId]);

  // Handle play/pause state changes
  useEffect(() => {
    const silentAudio = document.getElementById("silent-audio-bg") as HTMLAudioElement;
    if (silentAudio) {
      if (isPlaying) {
        silentAudio.play().catch((err) => {
          console.warn("Silent audio play prevented:", err);
        });
      } else {
        silentAudio.pause();
      }
    }

    if (!playerRef.current || !isPlayerReady.current) {
      if (isPlaying) pendingPlayRef.current = true;
      return;
    }

    try {
      if (isPlaying) {
        playerRef.current.playVideo();
        startProgressLoop();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      console.warn("YouTube player state change failed:", e);
    }
  }, [isPlaying, startProgressLoop]);

  // Handle video ID changes when player is already ready
  useEffect(() => {
    if (!cleanVideoId || !playerRef.current || !isPlayerReady.current) return;
    if (currentVideoIdRef.current !== cleanVideoId) {
      currentVideoIdRef.current = cleanVideoId;
      playerRef.current.loadVideoById(cleanVideoId);
    }
  }, [cleanVideoId]);

  // Handle external seek requests
  useEffect(() => {
    if (seekTo !== null && seekTo !== undefined && playerRef.current && isPlayerReady.current) {
      try {
        playerRef.current.seekTo(seekTo, true);
      } catch (e) {
        console.warn("YouTube seek failed:", e);
      }
    }
  }, [seekTo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressLoop();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
        isPlayerReady.current = false;
      }
    };
  }, [stopProgressLoop]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        width: "200px",
        height: "200px",
        opacity: 0.01,
        pointerEvents: "none",
        zIndex: -10,
        overflow: "hidden",
      }}
    >
      <div id="yt-player-container" />
      <audio
        id="silent-audio-bg"
        loop
        src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAG"
      />
    </div>
  );
}
