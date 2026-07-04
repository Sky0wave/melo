const TrackPlayer = require('react-native-track-player');

module.exports = async function() {
  TrackPlayer.addEventListener('remote-play', () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener('remote-pause', () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener('remote-next', () => {
    // Note: nextSong is handled by React context via state listeners,
    // but remote triggers can trigger TrackPlayer skipToNext.
    TrackPlayer.skipToNext().catch(() => {});
  });

  TrackPlayer.addEventListener('remote-previous', () => {
    TrackPlayer.skipToPrevious().catch(() => {});
  });

  TrackPlayer.addEventListener('remote-seek', (event) => {
    TrackPlayer.seekTo(event.position);
  });
};
