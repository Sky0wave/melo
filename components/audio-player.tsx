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
  Alert,
  Image,
  ActivityIndicator,
  Animated
} from 'react-native';
import { usePlayer } from '@/context/player-context';
import { useAuth } from '@/context/auth-context';
import { dbService, Playlist, getSongCoverUrl } from '@/services/db';
import { downloadService } from '@/services/download-service';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

type DetailTab = 'lyrics' | 'eq' | 'queue' | 'jam';
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

// Self-contained animated audio visualizer
function AudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const barCount = 16;
  const anims = useRef(Array.from({ length: barCount }, () => new Animated.Value(4))).current;

  useEffect(() => {
    let animations: Animated.CompositeAnimation[] = [];
    if (isPlaying) {
      animations = anims.map((anim) => {
        const duration = 250 + Math.random() * 300;
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 8 + Math.random() * 26,
              duration: duration,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 4,
              duration: duration,
              useNativeDriver: false,
            }),
          ])
        );
      });
      animations.forEach(a => a.start());
    } else {
      anims.forEach(anim => {
        Animated.timing(anim, {
          toValue: 4,
          duration: 350,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      if (animations.length > 0) {
        animations.forEach(a => a.stop());
      }
    };
  }, [isPlaying, anims]);

  return (
    <View style={styles.visualizerContainer}>
      {anims.map((anim, idx) => (
        <Animated.View 
          key={`visualizer-bar-${idx}`}
          style={[
            styles.visualizerBar,
            {
              height: anim,
              backgroundColor: isPlaying ? '#FF007A' : '#4B5563',
              opacity: isPlaying ? 0.95 : 0.45,
            }
          ]}
        />
      ))}
    </View>
  );
}

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
    playSong,
    jamRoom,
    createJamRoom,
    joinJamRoom,
    leaveJamRoom,
    chatMessages,
    sendChatMessage
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

  // Jam states
  const [isCreatingTab, setIsCreatingTab] = useState(false);
  const [jamPassword, setJamPassword] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [chatMessageText, setChatMessageText] = useState('');

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
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function checkFavAndDownload() {
      if (currentSong && user) {
        try {
          const fav = await dbService.isFavorite(user.id, currentSong.id);
          setIsFav(fav);
          const down = await downloadService.isDownloaded(user.id, currentSong.id);
          setIsDownloaded(down);
        } catch (err) {
          console.error('Error checking status:', err);
        }
      }
    }
    checkFavAndDownload();
  }, [currentSong, user]);

  // Toggle Favorite
  const handleToggleFav = async () => {
    if (!user || !currentSong) return;
    try {
      const result = await dbService.toggleFavorite(user.id, currentSong.id);
      setIsFav(result);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Toggle Download for Offline Playback
  const handleToggleDownload = async () => {
    if (!user || !currentSong || isDownloading) return;
    try {
      setIsDownloading(true);
      if (isDownloaded) {
        await downloadService.removeDownloadedSong(user.id, currentSong.id);
        setIsDownloaded(false);
        Alert.alert('Removed', `"${currentSong.title}" removed from offline downloads.`);
      } else {
        await downloadService.downloadSong(currentSong, user.id);
        setIsDownloaded(true);
        Alert.alert('Downloaded!', `"${currentSong.title}" saved for offline listening.`);
      }
    } catch (err) {
      console.error('Error toggling download:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Open Add-to-Playlist
  const handleOpenPlaylists = async () => {
    if (!user) return;
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
    if (!user || !currentSong) return;
    try {
      await dbService.addSongToPlaylist(user.id, playlistId, currentSong.id);
      Alert.alert('Added', `"${currentSong.title}" added to playlist "${playlistName}"`);
      setPlaylistsModalVisible(false);
    } catch (err) {
      console.error('Error adding song to playlist:', err);
    }
  };

  // Create playlist and add song
  const handleCreatePlaylist = async () => {
    if (!user || !currentSong || !newPlaylistName.trim()) return;
    try {
      const newPlaylist = await dbService.createPlaylist(user.id, newPlaylistName.trim());
      await dbService.addSongToPlaylist(user.id, newPlaylist.id, currentSong.id);
      
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

  if (!currentSong || !user) return null;

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
              <Image 
                source={{ uri: getSongCoverUrl(currentSong) }} 
                style={styles.miniArtworkImage} 
              />
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
            <View style={styles.artworkFrame}>
              <Image 
                source={{ uri: getSongCoverUrl(currentSong) }} 
                style={styles.artworkImage}
                resizeMode="cover"
              />
              <View style={styles.artworkOverlay}>
                <Text style={styles.sourceTag}>
                  {currentSong.youtube_url.includes('youtube.com') ? 'YOUTUBE STREAM' : 'LOSSLESS'}
                </Text>
              </View>
            </View>
          </View>

          {/* Audio Visualizer */}
          <AudioVisualizer isPlaying={isPlaying} />

          {/* Track Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataText}>
              <Text style={styles.fullTitle} numberOfLines={1}>{currentSong.title}</Text>
              <Text style={styles.fullArtist} numberOfLines={1}>{currentSong.artist}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={handleToggleDownload} style={styles.favBtn} disabled={isDownloading}>
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FF007A" />
                ) : (
                  <Ionicons 
                    name={isDownloaded ? "checkmark-circle" : "download-outline"} 
                    size={28} 
                    color={isDownloaded ? "#10B981" : "#ECEDEE"} 
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleFav} style={styles.favBtn}>
                <Ionicons 
                  name={isFav ? "heart" : "heart-outline"} 
                  size={28} 
                  color={isFav ? "#EF4444" : "#ECEDEE"} 
                />
              </TouchableOpacity>
            </View>
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
                EQ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentBtn, detailTab === 'queue' && styles.segmentBtnActive]}
              onPress={() => setDetailTab('queue')}
            >
              <Text style={[styles.segmentText, detailTab === 'queue' && styles.segmentTextActive]}>
                Queue
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentBtn, detailTab === 'jam' && styles.segmentBtnActive]}
              onPress={() => setDetailTab('jam')}
            >
              <Text style={[styles.segmentText, detailTab === 'jam' && styles.segmentTextActive]}>
                Jam
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
                          style={[styles.visualSliderBar, { height: 120 }]}
                          activeOpacity={0.8}
                          onPress={(evt) => {
                            const { locationY } = evt.nativeEvent;
                            const ratio = Math.max(0, Math.min(1, locationY / 120));
                            const dbVal = Math.round(12 - ratio * 24);
                            updateEqBand(idx, dbVal);
                          }}
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
                      <Image 
                        source={{ uri: getSongCoverUrl(song) }} 
                        style={styles.queueArtworkImage} 
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

            {detailTab === 'jam' && (
              <View style={{ flex: 1, paddingHorizontal: 16 }}>
                {jamRoom ? (
                  /* Active Jam Room View */
                  <View style={{ flex: 1 }}>
                    <View style={styles.broadcastStatus}>
                      <View style={[styles.pulseDot, jamRoom.isHost ? styles.pulseDotHost : styles.pulseDotListener]} />
                      <Text style={styles.broadcastText}>
                        {jamRoom.isHost ? 'BROADCASTING LIVE (HOST)' : 'LISTENING LIVE (SYNCED)'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
                      <View>
                        <Text style={styles.jamRoomIdLabel}>ROOM ID</Text>
                        <Text style={styles.jamRoomIdValue}>{jamRoom.room_id}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.shareBtn, { paddingVertical: 8, paddingHorizontal: 12, marginTop: 0, width: 'auto' }]} 
                        onPress={() => {
                          import('react-native').then(({ Share }) => {
                            Share.share({
                              message: `Join my Melo Music Jam Room!\nRoom ID: ${jamRoom.room_id}\nPassword: ${jamPassword || '(Secured)'}`
                            }).catch(err => console.log(err));
                          });
                        }}
                      >
                        <Ionicons name="share-social-outline" size={14} color="#09090B" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#09090B' }}>SHARE</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Chat Box */}
                    <View style={[styles.chatSection, { height: 160 }]}>
                      <Text style={styles.chatSectionTitle}>SESSION CHAT</Text>
                      <ScrollView 
                        style={styles.chatScrollView}
                        contentContainerStyle={styles.chatContentContainer}
                        ref={(ref) => {
                          ref?.scrollToEnd({ animated: true });
                        }}
                      >
                        {chatMessages.length === 0 ? (
                          <Text style={styles.emptyChatText}>No messages yet. Start chatting!</Text>
                        ) : (
                          chatMessages.map((msg, index) => (
                            <View key={msg.id || index} style={styles.chatMessageItem}>
                              <Text style={styles.chatMessageUser}>{msg.username}</Text>
                              <Text style={styles.chatMessageText}>{msg.message}</Text>
                            </View>
                          ))
                        )}
                      </ScrollView>
                      <View style={styles.chatInputContainer}>
                        <TextInput
                          style={styles.chatInput}
                          placeholder="Type a message..."
                          placeholderTextColor="#6B7280"
                          value={chatMessageText}
                          onChangeText={setChatMessageText}
                        />
                        <TouchableOpacity 
                          style={styles.chatSendBtn}
                          onPress={() => {
                            if (chatMessageText.trim()) {
                              sendChatMessage(chatMessageText);
                              setChatMessageText('');
                            }
                          }}
                        >
                          <Ionicons name="send" size={12} color="#09090B" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={[styles.leaveBtn, { paddingVertical: 10 }]} 
                      onPress={() => {
                        leaveJamRoom();
                        Alert.alert('Left Jam', jamRoom.isHost ? 'You closed the Jam Room.' : 'You left the Jam Room.');
                      }}
                    >
                      <Ionicons name="log-out-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text style={styles.leaveBtnText}>
                        {jamRoom.isHost ? 'Close Jam' : 'Leave Jam'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Join / Create Form */
                  <View style={{ flex: 1 }}>
                    <View style={[styles.tabBar, { marginBottom: 12 }]}>
                      <TouchableOpacity 
                        style={[styles.tabBtn, !isCreatingTab && styles.tabBtnActive]} 
                        onPress={() => setIsCreatingTab(false)}
                      >
                        <Text style={[styles.tabBtnText, !isCreatingTab && styles.tabBtnTextActive]}>Join Room</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.tabBtn, isCreatingTab && styles.tabBtnActive]} 
                        onPress={() => setIsCreatingTab(true)}
                      >
                        <Text style={[styles.tabBtnText, isCreatingTab && styles.tabBtnTextActive]}>Create Room</Text>
                      </TouchableOpacity>
                    </View>

                    {isCreatingTab ? (
                      <View style={{ gap: 8 }}>
                        <Text style={[styles.inputLabel, { marginBottom: 2 }]}>Set Room Password</Text>
                        <TextInput
                          style={[styles.textInput, { paddingVertical: 8 }]}
                          placeholder="Enter password (e.g. 1234)"
                          placeholderTextColor="#6B7280"
                          secureTextEntry
                          value={jamPassword}
                          onChangeText={setJamPassword}
                        />
                        <TouchableOpacity 
                          style={[styles.actionBtn, isCreating && styles.actionBtnDisabled, { paddingVertical: 10 }]}
                          onPress={async () => {
                            if (!jamPassword.trim()) {
                              Alert.alert('Error', 'Please set a password for the room.');
                              return;
                            }
                            try {
                              setIsCreating(true);
                              const id = await createJamRoom(jamPassword);
                              Alert.alert('Room Created!', `Your 8-digit Room ID is ${id}`);
                            } catch (err: any) {
                              Alert.alert('Error', err.message || 'Failed to create room.');
                            } finally {
                              setIsCreating(false);
                            }
                          }}
                          disabled={isCreating}
                        >
                          {isCreating ? (
                            <ActivityIndicator size="small" color="#09090B" />
                          ) : (
                            <>
                              <Ionicons name="add-circle-outline" size={18} color="#09090B" style={{ marginRight: 6 }} />
                              <Text style={styles.actionBtnText}>Create Jam Room</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ gap: 8 }}>
                        <View>
                          <Text style={[styles.inputLabel, { marginBottom: 2 }]}>Room ID (8 Digits)</Text>
                          <TextInput
                            style={[styles.textInput, { paddingVertical: 8 }]}
                            placeholder="e.g. 58291039"
                            placeholderTextColor="#6B7280"
                            keyboardType="numeric"
                            maxLength={8}
                            value={joinRoomId}
                            onChangeText={setJoinRoomId}
                          />
                        </View>

                        <View>
                          <Text style={[styles.inputLabel, { marginBottom: 2 }]}>Password</Text>
                          <TextInput
                            style={[styles.textInput, { paddingVertical: 8 }]}
                            placeholder="Enter room password"
                            placeholderTextColor="#6B7280"
                            secureTextEntry
                            value={joinPassword}
                            onChangeText={setJoinPassword}
                          />
                        </View>

                        <TouchableOpacity 
                          style={[styles.actionBtn, isJoining && styles.actionBtnDisabled, { paddingVertical: 10 }]}
                          onPress={async () => {
                            if (joinRoomId.length !== 8) {
                              Alert.alert('Error', 'Room ID must be exactly 8 digits.');
                              return;
                            }
                            if (!joinPassword) {
                              Alert.alert('Error', 'Please enter the room password.');
                              return;
                            }
                            try {
                              setIsJoining(true);
                              await joinJamRoom(joinRoomId, joinPassword);
                              Alert.alert('Joined!', `Successfully joined room ${joinRoomId}`);
                            } catch (err: any) {
                              Alert.alert('Error', err.message || 'Failed to join room.');
                            } finally {
                              setIsJoining(false);
                            }
                          }}
                          disabled={isJoining}
                        >
                          {isJoining ? (
                            <ActivityIndicator size="small" color="#09090B" />
                          ) : (
                            <>
                              <Ionicons name="enter-outline" size={18} color="#09090B" style={{ marginRight: 6 }} />
                              <Text style={styles.actionBtnText}>Join Jam Room</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
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
                <Text style={styles.emptyPlaylistsText}>You don&apos;t have any playlists yet.</Text>
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
    height: height * 0.22,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  artworkFrame: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: '#1E1E22',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 122, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#FF007A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  artworkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  miniArtworkImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 122, 0.2)',
  },
  queueArtworkImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  broadcastStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'center',
    marginVertical: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseDotHost: {
    backgroundColor: '#FF007A',
  },
  pulseDotListener: {
    backgroundColor: '#10B981',
  },
  broadcastText: {
    color: '#ECEDEE',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  jamRoomIdLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  jamRoomIdValue: {
    color: '#ECEDEE',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF007A',
    borderRadius: 12,
  },
  leaveBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    marginTop: 8,
  },
  leaveBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E1E22',
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#2D2D34',
  },
  tabBtnText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#ECEDEE',
  },
  inputLabel: {
    color: '#9BA1A6',
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    color: '#ECEDEE',
    paddingHorizontal: 14,
    fontSize: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF007A',
    borderRadius: 12,
    marginTop: 4,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#09090B',
    fontSize: 13,
    fontWeight: '800',
  },
  chatSection: {
    width: '100%',
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: '#252528',
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
  },
  chatSectionTitle: {
    color: '#FF007A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  chatScrollView: {
    flex: 1,
    marginBottom: 6,
  },
  chatContentContainer: {
    gap: 6,
  },
  emptyChatText: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  chatMessageItem: {
    backgroundColor: '#1E1E22',
    borderRadius: 8,
    padding: 6,
  },
  chatMessageUser: {
    color: '#FF007A',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 1,
  },
  chatMessageText: {
    color: '#ECEDEE',
    fontSize: 12,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: '#2D2D34',
    borderRadius: 8,
    color: '#ECEDEE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  chatSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF007A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 38,
    marginVertical: 10,
  },
  visualizerBar: {
    width: 4,
    borderRadius: 2,
  },
});
