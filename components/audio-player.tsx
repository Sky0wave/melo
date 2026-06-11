import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  SafeAreaView, 
  Dimensions, 
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { usePlayer } from '@/context/player-context';
import { useAuth } from '@/context/auth-context';
import { dbService, Playlist, Song } from '@/services/db';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

type DetailTab = 'lyrics' | 'eq' | 'queue';
type EqPreset = 'Flat' | 'Bass' | 'Treble' | 'Vocal' | 'Electronic';

interface LyricLine {
  time: number | null;
  text: string;
}

// Preset lyrics for seeded tracks
const PRESET_LYRICS: Record<string, string> = {
  '1': `[00:00] (Instrumental Intro)
[00:05] Oh, baby, where are you now when I need you most?
[00:12] I'd give it all just to hold you close
[00:19] Sorry that I broke your heart, your heart
[00:26] Never coming down, I was running round
[00:32] I was running round for you
[00:39] (Seductive Synth Solo)
[00:50] I said, baby, I'm running out of time
[00:57] I need you here, I need you by my side`,
  '2': `[00:00] (Fast Electronic Beat)
[00:06] I've been tryna call
[00:10] I've been on my own for long enough
[00:15] Maybe you can show me how to love, maybe
[00:21] I'm going through withdrawals
[00:25] You don't even have to do too much
[00:30] You can turn me on with just a touch, baby
[00:37] I look around and Sin City's cold and empty
[00:44] No one's around to judge me`,
  '3': `[00:00] (Daft Punk Vocoder Intro)
[00:07] I'm tryna put you in the worst mood, ah
[00:11] P1 cleaner than your church shoes, ah
[00:14] Milli point two just to hurt you, ah
[00:18] House so empty, need a centerpiece
[00:21] Twenty racks a table cut from ebony
[00:25] Cut that trophy girls, they don't wanna leave`,
  '4': `[00:00] (Dreamy Electronic Opening)
[00:12] Waiting in a car
[00:16] Waiting for a ride in the dark
[00:20] The night city grows
[00:24] Look at the neon signs glow
[00:30] (Instrumental Synth Chorus)
[00:45] We own the streets tonight
[00:49] Under the high-gloss digital light`
};

// Replicated web EQ values
const PRESET_VALUES: Record<EqPreset, number[]> = {
  Flat: [0, 0, 0, 0, 0],
  Bass: [6, 4, 1, 0, -2],
  Treble: [-2, 0, 2, 5, 8],
  Vocal: [-4, -2, 5, 4, 1],
  Electronic: [5, 2, -1, 3, 4]
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function AudioPlayer() {
  const { user } = useAuth();
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    pauseSong,
    resumeSong,
    nextSong,
    prevSong,
    seek,
    isExpanded,
    setIsExpanded,
    queue,
    playSong
  } = usePlayer();

  const [isFav, setIsFav] = useState(false);
  const [playlistsModalVisible, setPlaylistsModalVisible] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);

  // Web replicated tabs
  const [detailTab, setDetailTab] = useState<DetailTab>('lyrics');
  const [activePreset, setActivePreset] = useState<EqPreset>('Flat');
  const [eqBands, setEqBands] = useState<number[]>([0, 0, 0, 0, 0]); // 5 frequency sliders

  // Scroll ref for lyrics
  const lyricsScrollRef = useRef<ScrollView>(null);
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);

  // Apply EQ Preset
  const handleApplyPreset = (preset: EqPreset) => {
    setActivePreset(preset);
    setEqBands(PRESET_VALUES[preset]);
  };

  // Generate or parse lyrics
  useEffect(() => {
    if (!currentSong) return;
    const rawLyrics = PRESET_LYRICS[currentSong.id] || `[00:00] (Intro beats)
[00:08] Listening to ${currentSong.title} by ${currentSong.artist}
[00:16] Moving slow through the digital room
[00:24] High-fidelity soundscapes sweep the gloom
[00:32] Glistening silver ripples in your ears
[00:40] High-gloss obsidian Cathedral appears
[00:48] (Ambient Interlude)
[01:00] Backwards and forwards, we ride the sound
[01:08] In this music catalog, we are unbound`;

    const lines = rawLyrics.split('\n');
    const parsed: LyricLine[] = [];
    const timeRegex = /^\[(\d{2}):(\d{2})\]\s*(.*)$/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      const match = trimmed.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        parsed.push({
          time: minutes * 60 + seconds,
          text: match[3].trim()
        });
      } else {
        parsed.push({
          time: null,
          text: trimmed
        });
      }
    }
    setParsedLyrics(parsed);
  }, [currentSong]);

  // Sync favorites
  useEffect(() => {
    async function checkFav() {
      if (currentSong && user) {
        try {
          const fav = await dbService.isFavorite(user.id, currentSong.id);
          setIsFav(fav);
        } catch (err) {
          console.error('Error checking favorite:', err);
        }
      }
    }
    checkFav();
  }, [currentSong, user]);

  if (!currentSong || !user) return null;

  // Toggle Favorite
  const handleToggleFav = async () => {
    try {
      const result = await dbService.toggleFavorite(user.id, currentSong.id);
      setIsFav(result);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Open Add-to-Playlist
  const handleOpenPlaylists = async () => {
    try {
      const data = await dbService.getPlaylists(user.id);
      setPlaylists(data);
      setPlaylistsModalVisible(true);
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
  };

  // Add song to playlist
  const handleAddSongToPlaylist = async (playlistId: string, playlistName: string) => {
    try {
      await dbService.addSongToPlaylist(playlistId, currentSong.id);
      Alert.alert('Added', `"${currentSong.title}" added to playlist "${playlistName}"`);
      setPlaylistsModalVisible(false);
    } catch (err) {
      console.error('Error adding song to playlist:', err);
    }
  };

  // Create playlist and add song
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const newPlaylist = await dbService.createPlaylist(user.id, newPlaylistName.trim());
      await dbService.addSongToPlaylist(newPlaylist.id, currentSong.id);
      
      setNewPlaylistName('');
      setShowCreateInput(false);
      setPlaylistsModalVisible(false);
      
      Alert.alert('Success', `Playlist "${newPlaylist.name}" created!`);
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  const handleProgressBarPress = (evt: any) => {
    const { locationX } = evt.nativeEvent;
    const barWidth = width - 64;
    const ratio = Math.max(0, Math.min(1, locationX / barWidth));
    seek(ratio * duration);
  };

  // Equalizer manual helper
  const updateEqBand = (index: number, val: number) => {
    const next = [...eqBands];
    next[index] = val;
    setEqBands(next);
    setActivePreset('Flat'); // Switching to Flat/custom if manual adjustments are made
  };

  // Calculate active lyric line
  let activeLyricIndex = -1;
  for (let i = 0; i < parsedLyrics.length; i++) {
    const line = parsedLyrics[i];
    if (line.time !== null && line.time <= progress) {
      activeLyricIndex = i;
    }
  }

  // Scroll active lyric to center if ref is available
  useEffect(() => {
    if (activeLyricIndex >= 0 && lyricsScrollRef.current) {
      lyricsScrollRef.current.scrollTo({
        y: activeLyricIndex * 34,
        animated: true
      });
    }
  }, [activeLyricIndex]);

  return (
    <>
      {/* 1. MINI FLOATING PLAYER */}
      {!isExpanded && (
        <TouchableOpacity 
          style={styles.miniPlayer} 
          activeOpacity={0.9} 
          onPress={() => setIsExpanded(true)}
        >
          <View style={styles.miniProgressBarContainer}>
            <View style={[styles.miniProgressBar, { width: `${(progress / duration) * 100}%` }]} />
          </View>
          
          <View style={styles.miniPlayerContent}>
            <View style={styles.miniInfo}>
              <View style={styles.miniDisc}>
                <Ionicons name="disc" size={24} color="#FF007A" />
              </View>
              <View style={styles.miniText}>
                <Text style={styles.miniTitle} numberOfLines={1}>{currentSong.title}</Text>
                <Text style={styles.miniArtist} numberOfLines={1}>{currentSong.artist}</Text>
              </View>
            </View>

            <View style={styles.miniControls}>
              <TouchableOpacity onPress={handleToggleFav} style={styles.miniControlBtn}>
                <Ionicons 
                  name={isFav ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isFav ? "#EF4444" : "#ECEDEE"} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={isPlaying ? pauseSong : resumeSong} 
                style={styles.miniControlBtn}
              >
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={24} 
                  color="#FF007A" 
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={nextSong} style={styles.miniControlBtn}>
                <Ionicons name="play-skip-forward" size={22} color="#ECEDEE" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* 2. EXPANDED HUD FULL PLAYER */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsExpanded(false)}
      >
        <SafeAreaView style={styles.fullPlayer}>
          {/* Header */}
          <View style={styles.fullHeader}>
            <TouchableOpacity onPress={() => setIsExpanded(false)} style={styles.headerBtn}>
              <Ionicons name="chevron-down" size={28} color="#ECEDEE" />
            </TouchableOpacity>
            <Text style={styles.fullHeaderTitle}>Now Playing</Text>
            <TouchableOpacity onPress={handleOpenPlaylists} style={styles.headerBtn}>
              <Ionicons name="add-circle-outline" size={28} color="#ECEDEE" />
            </TouchableOpacity>
          </View>

          {/* Album Cover Art */}
          <View style={styles.artworkContainer}>
            <View style={styles.artworkGlow}>
              <Ionicons name="disc-outline" size={100} color="#FF007A" />
              <Text style={styles.sourceTag}>
                {currentSong.youtube_url.includes('youtube.com') ? 'YOUTUBE STREAM' : 'LOSSLESS'}
              </Text>
            </View>
          </View>

          {/* Track Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataText}>
              <Text style={styles.fullTitle} numberOfLines={1}>{currentSong.title}</Text>
              <Text style={styles.fullArtist} numberOfLines={1}>{currentSong.artist}</Text>
            </View>
            <TouchableOpacity onPress={handleToggleFav} style={styles.favBtn}>
              <Ionicons 
                name={isFav ? "heart" : "heart-outline"} 
                size={30} 
                color={isFav ? "#EF4444" : "#ECEDEE"} 
              />
            </TouchableOpacity>
          </View>

          {/* Segment Tab Selector (Like Web App) */}
          <View style={styles.tabSelector}>
            <TouchableOpacity 
              style={[styles.segmentBtn, detailTab === 'lyrics' && styles.segmentBtnActive]}
              onPress={() => setDetailTab('lyrics')}
            >
              <Text style={[styles.segmentText, detailTab === 'lyrics' && styles.segmentTextActive]}>
                Lyrics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentBtn, detailTab === 'eq' && styles.segmentBtnActive]}
              onPress={() => setDetailTab('eq')}
            >
              <Text style={[styles.segmentText, detailTab === 'eq' && styles.segmentTextActive]}>
                Equalizer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentBtn, detailTab === 'queue' && styles.segmentBtnActive]}
              onPress={() => setDetailTab('queue')}
            >
              <Text style={[styles.segmentText, detailTab === 'queue' && styles.segmentTextActive]}>
                Play Queue
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Tab Body Panel */}
          <View style={styles.tabPanelContainer}>
            {detailTab === 'lyrics' && (
              <ScrollView 
                ref={lyricsScrollRef}
                style={styles.lyricsScroll}
                contentContainerStyle={{ paddingVertical: 12 }}
              >
                {parsedLyrics.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  return (
                    <Text 
                      key={`lyric-${idx}`} 
                      style={[
                        styles.lyricLineText, 
                        isActive && styles.lyricLineTextActive
                      ]}
                    >
                      {line.text}
                    </Text>
                  );
                })}
              </ScrollView>
            )}

            {detailTab === 'eq' && (
              <View style={{ flex: 1, paddingVertical: 8 }}>
                {/* Replicated Web Preset selection pills */}
                <View style={styles.eqPresetRow}>
                  {(['Flat', 'Bass', 'Treble', 'Vocal', 'Electronic'] as EqPreset[]).map((p) => {
                    const isPresetActive = activePreset === p;
                    return (
                      <TouchableOpacity 
                        key={p} 
                        style={[styles.eqPresetPill, isPresetActive && styles.eqPresetPillActive]}
                        onPress={() => handleApplyPreset(p)}
                      >
                        <Text style={[styles.eqPresetText, isPresetActive && styles.eqPresetTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* EQ Sliders */}
                <View style={styles.eqSlidersRow}>
                  {[
                    { label: '60Hz', sub: 'Sub-Bass' },
                    { label: '230Hz', sub: 'Low-Mid' },
                    { label: '910Hz', sub: 'Midrange' },
                    { label: '4kHz', sub: 'Presence' },
                    { label: '14kHz', sub: 'Brilliance' }
                  ].map((band, idx) => (
                    <View key={`eq-${idx}`} style={styles.eqSliderCol}>
                      <Text style={styles.eqValText}>{eqBands[idx] > 0 ? `+${eqBands[idx]}` : eqBands[idx]} dB</Text>
                      <View style={styles.sliderTrackWrapper}>
                        <TouchableOpacity 
                          style={styles.visualSliderBar}
                          activeOpacity={0.8}
                          onPress={() => updateEqBand(idx, Math.floor(Math.random() * 25) - 12)}
                        >
                          <View style={[styles.visualSliderBg]} />
                          <View 
                            style={[
                              styles.visualSliderThumb, 
                              { bottom: `${((eqBands[idx] + 12) / 24) * 100}%` }
                            ]} 
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.eqLabelText}>{band.label}</Text>
                      <Text style={styles.eqSubLabel}>{band.sub}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {detailTab === 'queue' && (
              <ScrollView style={styles.queueScroll} contentContainerStyle={{ paddingBottom: 24 }}>
                {queue.map((song, idx) => {
                  const isCurrent = currentSong.id === song.id;
                  return (
                    <TouchableOpacity 
                      key={`queue-${song.id}-${idx}`}
                      style={[styles.queueRow, isCurrent && styles.queueRowActive]}
                      onPress={() => playSong(song, queue)}
                    >
                      <Ionicons 
                        name={isCurrent && isPlaying ? "volume-medium" : "musical-notes-outline"} 
                        size={18} 
                        color={isCurrent ? "#FF007A" : "#6B7280"} 
                        style={{ marginRight: 12 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.queueTitle, isCurrent && styles.queueTitleActive]} numberOfLines={1}>
                          {song.title}
                        </Text>
                        <Text style={styles.queueArtist} numberOfLines={1}>{song.artist}</Text>
                      </View>
                      <Text style={styles.queueIndexText}>#{idx + 1}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Timeline Seek Bar */}
          <View style={styles.timelineContainer}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={handleProgressBarPress}
              style={styles.progressBarBg}
            >
              <View style={[styles.progressBarFill, { width: `${(progress / duration) * 100}%` }]} />
              <View style={[styles.progressKnob, { left: `${(progress / duration) * 100}%` }]} />
            </TouchableOpacity>
            <View style={styles.timeLabels}>
              <Text style={styles.timeText}>{formatTime(progress)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Playback Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.secondaryControlBtn} onPress={() => setDetailTab('queue')}>
              <Ionicons name="shuffle" size={24} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity onPress={prevSong} style={styles.primaryControlBtn}>
              <Ionicons name="play-skip-back" size={36} color="#ECEDEE" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={isPlaying ? pauseSong : resumeSong} 
              style={styles.playPauseBtn}
            >
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={36} 
                color="#09090B" 
                style={{ marginLeft: isPlaying ? 0 : 4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={nextSong} style={styles.primaryControlBtn}>
              <Ionicons name="play-skip-forward" size={36} color="#ECEDEE" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryControlBtn} onPress={handleOpenPlaylists}>
              <Ionicons name="list" size={24} color="#FF007A" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 3. ADD TO PLAYLIST MODAL */}
      <Modal
        visible={playlistsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => { setPlaylistsModalVisible(false); setShowCreateInput(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Playlist</Text>
              <TouchableOpacity onPress={() => { setPlaylistsModalVisible(false); setShowCreateInput(false); }}>
                <Ionicons name="close" size={24} color="#ECEDEE" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.playlistList} contentContainerStyle={{ paddingBottom: 16 }}>
              {playlists.length === 0 ? (
                <Text style={styles.emptyPlaylistsText}>You don't have any playlists yet.</Text>
              ) : (
                playlists.map((p) => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={styles.playlistItem}
                    onPress={() => handleAddSongToPlaylist(p.id, p.name)}
                  >
                    <Ionicons name="musical-notes-outline" size={20} color="#FF007A" style={{ marginRight: 12 }} />
                    <Text style={styles.playlistItemText}>{p.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {showCreateInput ? (
              <View style={styles.createInputContainer}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="New Playlist Name"
                  placeholderTextColor="#4B5563"
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  autoFocus
                />
                <View style={styles.createActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.cancelBtn]} 
                    onPress={() => setShowCreateInput(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.confirmBtn]} 
                    onPress={handleCreatePlaylist}
                  >
                    <Text style={styles.confirmBtnText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.createPlaylistTrigger}
                onPress={() => setShowCreateInput(true)}
              >
                <Ionicons name="add" size={20} color="#09090B" style={{ marginRight: 8 }} />
                <Text style={styles.createPlaylistTriggerText}>Create New Playlist</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Mini player
  miniPlayer: {
    position: 'absolute',
    bottom: 82,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(24, 24, 27, 0.98)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  miniProgressBarContainer: {
    height: 2,
    backgroundColor: '#27272A',
    width: '100%',
  },
  miniProgressBar: {
    height: 2,
    backgroundColor: '#FF007A',
  },
  miniPlayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  miniInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniDisc: {
    marginRight: 10,
  },
  miniText: {
    flex: 1,
  },
  miniTitle: {
    color: '#ECEDEE',
    fontSize: 14,
    fontWeight: '700',
  },
  miniArtist: {
    color: '#9BA1A6',
    fontSize: 12,
    marginTop: 2,
  },
  miniControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniControlBtn: {
    padding: 8,
    marginLeft: 4,
  },

  // Full player modal
  fullPlayer: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  fullHeaderTitle: {
    color: '#ECEDEE',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerBtn: {
    padding: 8,
  },
  artworkContainer: {
    height: height * 0.18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkGlow: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 0, 122, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 122, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceTag: {
    color: '#FF007A',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  metadataText: {
    flex: 1,
    marginRight: 16,
  },
  fullTitle: {
    color: '#ECEDEE',
    fontSize: 22,
    fontWeight: '800',
  },
  fullArtist: {
    color: '#FF007A',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  favBtn: {
    padding: 8,
  },

  // Tabs Replicated from Web App
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    marginHorizontal: 32,
    padding: 4,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FF007A',
  },
  segmentText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: '#09090B',
  },

  // Tab Panel
  tabPanelContainer: {
    flex: 1,
    marginHorizontal: 32,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#1E1E20',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  lyricsScroll: {
    flex: 1,
  },
  lyricLineText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  lyricLineTextActive: {
    color: '#FF007A',
    fontSize: 16,
    fontWeight: '800',
  },

  // Equalizer Preset Bar
  eqPresetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#1E1E20',
    marginBottom: 12,
  },
  eqPresetPill: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: 'transparent',
  },
  eqPresetPillActive: {
    backgroundColor: '#FF007A',
    borderColor: '#FF007A',
  },
  eqPresetText: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '700',
  },
  eqPresetTextActive: {
    color: '#09090B',
  },

  // EQ Sliders
  eqSlidersRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eqContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  eqSliderCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eqValText: {
    color: '#FF007A',
    fontSize: 10,
    fontWeight: '700',
  },
  sliderTrackWrapper: {
    flex: 1,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  visualSliderBar: {
    width: 4,
    height: '100%',
    backgroundColor: '#27272A',
    borderRadius: 2,
    position: 'relative',
    alignItems: 'center',
  },
  visualSliderBg: {
    position: 'absolute',
    width: 4,
    height: '100%',
    backgroundColor: '#27272A',
  },
  visualSliderThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF007A',
    shadowColor: '#FF007A',
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  eqLabelText: {
    color: '#ECEDEE',
    fontSize: 11,
    fontWeight: '700',
  },
  eqSubLabel: {
    color: '#6B7280',
    fontSize: 8,
    marginTop: 2,
  },

  // Queue Row
  queueScroll: {
    flex: 1,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#1E1E20',
  },
  queueRowActive: {
    backgroundColor: 'rgba(255, 0, 122, 0.02)',
  },
  queueTitle: {
    color: '#ECEDEE',
    fontSize: 13,
    fontWeight: '600',
  },
  queueTitleActive: {
    color: '#FF007A',
  },
  queueArtist: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  queueIndexText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },

  // Timeline
  timelineContainer: {
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#27272A',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF007A',
    borderRadius: 2,
  },
  progressKnob: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ECEDEE',
    marginLeft: -5,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
  },

  // Controls
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF007A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF007A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryControlBtn: {
    padding: 10,
  },
  secondaryControlBtn: {
    padding: 10,
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#27272A',
    paddingBottom: 14,
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ECEDEE',
    fontSize: 18,
    fontWeight: '700',
  },
  playlistList: {
    maxHeight: 250,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#27272A',
  },
  playlistItemText: {
    color: '#ECEDEE',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyPlaylistsText: {
    color: '#9BA1A6',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  createPlaylistTrigger: {
    flexDirection: 'row',
    backgroundColor: '#FF007A',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  createPlaylistTriggerText: {
    color: '#09090B',
    fontSize: 16,
    fontWeight: '700',
  },
  createInputContainer: {
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#09090B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    color: '#ECEDEE',
    fontSize: 16,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  cancelBtnText: {
    color: '#9BA1A6',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#FF007A',
  },
  confirmBtnText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '700',
  },
});
