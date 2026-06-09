import { useEffect, useRef, useCallback } from "react";

interface YouTubePlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  onReady: () => void;
  seekTo?: number | null; // set externally to trigger a seek
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
    if (ytApiLoaded && window.YT && window.YT.Player) {
      resolve();
      return;
    }

    ytApiReadyCallbacks.push(resolve);

    if (ytApiLoading) return;
    ytApiLoading = true;

    const existingScript = document.getElementById("yt-iframe-api");
    if (existingScript) {
      // Script tag exists but API may not be ready
      if (window.YT && window.YT.Player) {
        ytApiLoaded = true;
        ytApiReadyCallbacks.forEach((cb) => cb());
        ytApiReadyCallbacks.length = 0;
      }
      return;
    }

    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      ytApiReadyCallbacks.forEach((cb) => cb());
      ytApiReadyCallbacks.length = 0;
    };
  });
}

export function YouTubePlayer({
  videoId,
  isPlaying,
  onTimeUpdate,
  onEnded,
  onReady,
  seekTo,
}: YouTubePlayerProps) {
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
    if (!videoId) return;

    let destroyed = false;

    const initPlayer = async () => {
      await loadYouTubeAPI();
      if (destroyed) return;

      // If player already exists for the same container, just load new video
      if (playerRef.current && isPlayerReady.current) {
        if (currentVideoIdRef.current !== videoId) {
          currentVideoIdRef.current = videoId;
          playerRef.current.loadVideoById(videoId);
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

      currentVideoIdRef.current = videoId;

      playerRef.current = new window.YT.Player("yt-player-container", {
        height: "1",
        width: "1",
        videoId: videoId,
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
          },
        },
      });
    };

    initPlayer();

    return () => {
      destroyed = true;
    };
  }, [videoId]);

  // Handle play/pause state changes
  useEffect(() => {
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
    if (!videoId || !playerRef.current || !isPlayerReady.current) return;
    if (currentVideoIdRef.current !== videoId) {
      currentVideoIdRef.current = videoId;
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId]);

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
        top: "-9999px",
        left: "-9999px",
        width: "1px",
        height: "1px",
        opacity: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div id="yt-player-container" />
    </div>
  );
}
