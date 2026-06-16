import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Share,
  Image,
  Animated
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { usePlayer } from '@/context/player-context';
import { dbService, Song, getSongCoverUrl } from '@/services/db';
import { Ionicons } from '@expo/vector-icons';

const MOODS = ['All', 'Energetic', 'Focus', 'Melancholic'];

// Map track names to moods for the seed songs
const SONG_MOODS: Record<string, string> = {
  'f5b5f25a-4933-4f0e-be4c-0c1598f828a1': 'Energetic',     // After Hours
  'f5b5f25a-4933-4f0e-be4c-0c1598f828a2': 'Energetic',     // Blinding Lights
  'f5b5f25a-4933-4f0e-be4c-0c1598f828a3': 'Energetic',     // Starboy
  'f5b5f25a-4933-4f0e-be4c-0c1598f828a4': 'Focus',         // Midnight City
  'f5b5f25a-4933-4f0e-be4c-0c1598f828a5': 'Focus',         // Intro
  'f5b5f25a-4933-4f0e-be4c-0c1598f828a6': 'Melancholic',   // Sweater Weather
  'f5b5f25a-4933-4f0e-be4c-0c1598f828a7': 'Melancholic',   // Royals
  'f5b5f25a-4933-4f0e-be4c-0c1598f828a8': 'Melancholic',   // Perfect Places
};

function Skeleton({ width, height, borderRadius = 4, style }: { width: number | string, height: number | string, borderRadius?: number, style?: any }) {
  const pulseAnim = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    const sharedAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.28,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.12,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    sharedAnimation.start();
    return () => sharedAnimation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#ECEDEE',
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { 
    playSong, 
    currentSong, 
    isPlaying,
    jamRoom,
    createJamRoom,
    joinJamRoom,
    leaveJamRoom,
    chatMessages,
    sendChatMessage
  } = usePlayer();

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Jam modal states
  const [showJamModal, setShowJamModal] = useState(false);
  const [isCreatingTab, setIsCreatingTab] = useState(false);
  const [jamPassword, setJamPassword] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [chatMessageText, setChatMessageText] = useState('');
  
  // Replicating web mood filters
  const [selectedMood, setSelectedMood] = useState('All');

  // Determine greeting based on time of day
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'GOOD MORNING';
    if (hours < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  // Taste-based sorting algorithm
  const getTasteSortedSongs = (allSongs: Song[], history: Song[], favIds: string[]) => {
    if (history.length === 0 && favIds.length === 0) {
      return allSongs;
    }

    const moodCounts: Record<string, number> = {};
    const artistCounts: Record<string, number> = {};

    history.forEach(song => {
      const mood = SONG_MOODS[song.id];
      if (mood) moodCounts[mood] = (moodCounts[mood] || 0) + 1.5;
      if (song.artist) artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
    });

    favIds.forEach(favId => {
      const mood = SONG_MOODS[favId];
      if (mood) moodCounts[mood] = (moodCounts[mood] || 0) + 2.0;
      const song = allSongs.find(s => s.id === favId);
      if (song && song.artist) artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 2;
    });

    let favoriteMood = '';
    let maxMoodCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > maxMoodCount) {
        maxMoodCount = count;
        favoriteMood = mood;
      }
    });

    let favoriteArtist = '';
    let maxArtistCount = 0;
    Object.entries(artistCounts).forEach(([artist, count]) => {
      if (count > maxArtistCount) {
        maxArtistCount = count;
        favoriteArtist = artist;
      }
    });

    return [...allSongs].sort((a, b) => {
      const aMood = SONG_MOODS[a.id] || '';
      const bMood = SONG_MOODS[b.id] || '';
      const aArtist = a.artist || '';
      const bArtist = b.artist || '';

      const aIsFavMood = aMood === favoriteMood;
      const bIsFavMood = bMood === favoriteMood;
      const aIsFavArtist = aArtist === favoriteArtist;
      const bIsFavArtist = bArtist === favoriteArtist;

      const scoreA = (aIsFavArtist ? 4 : 0) + (aIsFavMood ? 2 : 0);
      const scoreB = (bIsFavArtist ? 4 : 0) + (bIsFavMood ? 2 : 0);

      return scoreB - scoreA;
    });
  };

  // Fetch home feed data
  const loadHomeData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const allSongs = await dbService.getSongs();
      const history = await dbService.getRecentlyPlayed(user.id);
      const favs = await dbService.getFavorites(user.id);
      const favIds = favs.map(f => f.id);

      const personalizedSongs = getTasteSortedSongs(allSongs, history, favIds);
      setSongs(personalizedSongs);
      setRecentlyPlayed(history);
      setFavorites(favIds);
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData, currentSong]);

  // Toggle favorite
  const handleToggleFav = async (songId: string) => {
    if (!user) return;
    try {
      const result = await dbService.toggleFavorite(user.id, songId);
      if (result) {
        setFavorites(prev => [...prev, songId]);
      } else {
        setFavorites(prev => prev.filter(id => id !== songId));
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Filter songs based on selected mood
  const filteredSongs = songs.filter(song => {
    if (selectedMood === 'All') return true;
    const mood = SONG_MOODS[song.id] || 'All';
    return mood === selectedMood;
  });

  // Play banner song
  const handlePlayBanner = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs);
    }
  };

  if (loading && songs.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B' }}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Skeleton width={100} height={12} borderRadius={3} style={{ marginBottom: 8 }} />
              <Skeleton width={180} height={24} borderRadius={4} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Skeleton width={40} height={40} borderRadius={20} />
              <Skeleton width={40} height={40} borderRadius={20} />
            </View>
          </View>

          {/* Curation Card Placeholder */}
          <View style={[styles.curationCard, { opacity: 0.6 }]}>
            <View style={styles.badgeContainer}>
              <SparkleIcon />
              <Text style={styles.badgeText}>CURATION ALPHA</Text>
            </View>
            <Skeleton width={200} height={22} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width={250} height={14} borderRadius={3} style={{ marginBottom: 16 }} />
            <Skeleton width={90} height={36} borderRadius={18} />
          </View>

          {/* Mood Selector Pills */}
          <View style={{ marginBottom: 24, paddingHorizontal: 20, flexDirection: 'row', gap: 8 }}>
            <Skeleton width={50} height={34} borderRadius={17} />
            <Skeleton width={80} height={34} borderRadius={17} />
            <Skeleton width={60} height={34} borderRadius={17} />
            <Skeleton width={90} height={34} borderRadius={17} />
          </View>

          {/* Recently Played Section Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 20 }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ width: 100 }}>
                  <Skeleton width={100} height={100} borderRadius={12} style={{ marginBottom: 8 }} />
                  <Skeleton width={80} height={12} borderRadius={3} style={{ marginBottom: 6 }} />
                  <Skeleton width={50} height={10} borderRadius={2} />
                </View>
              ))}
            </View>
          </View>

          {/* Songs Section Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Made For You</Text>
            <View style={{ paddingHorizontal: 20, gap: 16 }}>
              {[1, 2, 3, 5].map((i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Skeleton width={44} height={44} borderRadius={8} style={{ marginRight: 12 }} />
                    <View>
                      <Skeleton width={120} height={14} borderRadius={3} style={{ marginBottom: 6 }} />
                      <Skeleton width={80} height={10} borderRadius={2} />
                    </View>
                  </View>
                  <Skeleton width={20} height={20} borderRadius={10} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#09090B' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Greeting Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.questionText}>What moves you tonight?</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Jam Room Button */}
            <TouchableOpacity 
              style={[styles.jamHeaderBtn, jamRoom && styles.jamHeaderBtnActive]} 
              onPress={() => setShowJamModal(true)}
            >
              <Ionicons 
                name={jamRoom ? "radio" : "people-outline"} 
                size={20} 
                color={jamRoom ? "#09090B" : "#ECEDEE"} 
              />
              {jamRoom && <Text style={styles.jamBadgeText}>LIVE</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileBtn}>
              <Text style={styles.avatarText}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      {/* Curation Card: Replicating Web "THE MIDNIGHT VAULT" */}
      <View style={styles.curationCard}>
        <View style={styles.curationContent}>
          <View style={styles.badgeContainer}>
            <SparkleIcon />
            <Text style={styles.badgeText}>CURATION ALPHA</Text>
          </View>
          <Text style={styles.curationTitle}>THE MIDNIGHT VAULT</Text>
          <Text style={styles.curationSubtitle}>Dive into the high-gloss aesthetic curated for late nights.</Text>
          <TouchableOpacity style={styles.playNowBtn} onPress={handlePlayBanner}>
            <Ionicons name="play" size={16} color="#09090B" style={{ marginRight: 6 }} />
            <Text style={styles.playNowBtnText}>PLAY NOW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mood Selectors Pill Scroll */}
      <View style={{ marginBottom: 24 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodScroll}
        >
          {MOODS.map((mood) => {
            const isActive = selectedMood === mood;
            return (
              <TouchableOpacity 
                key={mood}
                style={[styles.moodPill, isActive && styles.moodPillActive]}
                onPress={() => setSelectedMood(mood)}
              >
                <Text style={[styles.moodText, isActive && styles.moodTextActive]}>
                  {mood}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Recently Played Section */}
      {recentlyPlayed.length > 0 && selectedMood === 'All' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentlyPlayedScroll}
          >
            {recentlyPlayed.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <TouchableOpacity 
                  key={`history-${song.id}-${index}`}
                  style={styles.recentCard}
                  onPress={() => playSong(song, recentlyPlayed)}
                >
                  <View style={[styles.recentImageContainer, isCurrent && styles.activeRecentImage]}>
                    <Image 
                      source={{ uri: getSongCoverUrl(song) }} 
                      style={styles.recentImage}
                    />
                    {isCurrent && isPlaying && (
                      <View style={styles.recentPlayingOverlay}>
                        <Ionicons name="volume-medium" size={24} color="#FF007A" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.recentTitle} numberOfLines={1}>{song.title}</Text>
                  <Text style={styles.recentArtist} numberOfLines={1}>{song.artist}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Songs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedMood === 'All' ? 'Made For You' : `${selectedMood} Tracks`}
        </Text>
        {filteredSongs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tracks in this category.</Text>
          </View>
        ) : (
          filteredSongs.map((song) => {
            const isCurrent = currentSong?.id === song.id;
            const isFav = favorites.includes(song.id);
            return (
              <View key={song.id} style={[styles.songRow, isCurrent && styles.songRowActive]}>
                <TouchableOpacity 
                  style={styles.songMain}
                  onPress={() => playSong(song, filteredSongs)}
                >
                  <View style={styles.songRowImageContainer}>
                    <Image 
                      source={{ uri: getSongCoverUrl(song) }} 
                      style={styles.songRowImage} 
                    />
                    {isCurrent && isPlaying && (
                      <View style={styles.playingImageOverlay}>
                        <Ionicons name="volume-medium" size={16} color="#FF007A" />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.songTitle, isCurrent && styles.songTitleActive]} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handleToggleFav(song.id)}
                  style={styles.favBtn}
                >
                  <Ionicons 
                    name={isFav ? "heart" : "heart-outline"} 
                    size={22} 
                    color={isFav ? "#EF4444" : "#6B7280"} 
                  />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>

    {/* Jam Room Modal */}
    <Modal
      visible={showJamModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowJamModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people" size={22} color="#FF007A" />
              <Text style={styles.modalTitle}>Jam Room</Text>
            </View>
            <TouchableOpacity onPress={() => setShowJamModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#ECEDEE" />
            </TouchableOpacity>
          </View>

          {jamRoom ? (
            /* Active Jam Room View */
            <View style={styles.jamActiveContainer}>
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
                  style={[styles.shareBtn, { marginTop: 0, paddingVertical: 8, paddingHorizontal: 12 }]} 
                  onPress={() => {
                    Share.share({
                      message: `Join my Melo Music Jam Room!\nRoom ID: ${jamRoom.room_id}\nPassword: ${jamPassword || '(Secured)'}`
                    }).catch(err => console.log(err));
                  }}
                >
                  <Ionicons name="share-social-outline" size={16} color="#09090B" style={{ marginRight: 4 }} />
                  <Text style={[styles.shareBtnText, { fontSize: 11 }]}>Share Room</Text>
                </TouchableOpacity>
              </View>

              {/* Chat Box */}
              <View style={styles.chatSection}>
                <Text style={styles.chatSectionTitle}>SESSION CHAT</Text>
                <ScrollView 
                  style={styles.chatScrollView}
                  contentContainerStyle={styles.chatContentContainer}
                  ref={(ref) => {
                    ref?.scrollToEnd({ animated: true });
                  }}
                >
                  {chatMessages.length === 0 ? (
                    <Text style={styles.emptyChatText}>No messages yet. Send a message to start the conversation!</Text>
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
                style={styles.leaveBtn} 
                onPress={() => {
                  leaveJamRoom();
                  setShowJamModal(false);
                  Alert.alert('Left Jam', jamRoom.isHost ? 'You closed the Jam Room.' : 'You left the Jam Room.');
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.leaveBtnText}>
                  {jamRoom.isHost ? 'Close Jam Room' : 'Leave Jam Room'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Create or Join View */
            <View style={styles.modalTabsContainer}>
              {/* Tab Selector */}
              <View style={styles.tabBar}>
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
                /* Create Room Form */
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Set Room Password</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter password (e.g. 1234)"
                    placeholderTextColor="#6B7280"
                    secureTextEntry
                    value={jamPassword}
                    onChangeText={setJamPassword}
                  />
                  <TouchableOpacity 
                    style={[styles.actionBtn, isCreating && styles.actionBtnDisabled]}
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
                /* Join Room Form */
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Room ID (8 Digits)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 58291039"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    maxLength={8}
                    value={joinRoomId}
                    onChangeText={setJoinRoomId}
                  />

                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter room password"
                    placeholderTextColor="#6B7280"
                    secureTextEntry
                    value={joinPassword}
                    onChangeText={setJoinPassword}
                  />

                  <TouchableOpacity 
                    style={[styles.actionBtn, isJoining && styles.actionBtnDisabled]}
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
                        setShowJamModal(false);
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
      </View>
    </Modal>
  </View>
  );
}

function SparkleIcon() {
  return (
    <Ionicons name="sparkles" size={11} color="#FF007A" style={{ marginRight: 4 }} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  greeting: {
    color: '#9BA1A6',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  questionText: {
    color: '#ECEDEE',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF007A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#09090B',
    fontSize: 16,
    fontWeight: '800',
  },
  // Curation card
  curationCard: {
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: '#252528',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  curationContent: {
    zIndex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 122, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 122, 0.25)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    color: '#FF007A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  curationTitle: {
    color: '#ECEDEE',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  curationSubtitle: {
    color: '#9BA1A6',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  playNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF007A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  playNowBtnText: {
    color: '#09090B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Mood pills
  moodScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  moodPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  moodPillActive: {
    backgroundColor: '#FF007A',
    borderColor: '#FF007A',
  },
  moodText: {
    color: '#9BA1A6',
    fontSize: 13,
    fontWeight: '600',
  },
  moodTextActive: {
    color: '#09090B',
    fontWeight: '800',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#ECEDEE',
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  recentlyPlayedScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  recentCard: {
    width: 100,
  },
  recentImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  activeRecentImage: {
    borderColor: '#FF007A',
  },
  recentImage: {
    width: '100%',
    height: '100%',
  },
  recentPlayingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songRowImageContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#27272A',
  },
  songRowImage: {
    width: '100%',
    height: '100%',
  },
  playingImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentTitle: {
    color: '#ECEDEE',
    fontSize: 13,
    fontWeight: '600',
  },
  recentArtist: {
    color: '#9BA1A6',
    fontSize: 11,
    marginTop: 2,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 14,
    marginBottom: 10,
  },
  songRowActive: {
    borderColor: '#FF007A',
    backgroundColor: 'rgba(255, 0, 122, 0.02)',
  },
  songMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  songTitle: {
    color: '#ECEDEE',
    fontSize: 15,
    fontWeight: '600',
  },
  songTitleActive: {
    color: '#FF007A',
  },
  songArtist: {
    color: '#9BA1A6',
    fontSize: 12,
    marginTop: 3,
  },
  favBtn: {
    padding: 8,
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  // Jam room elements styling
  jamHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: '#2D2D30',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  jamHeaderBtnActive: {
    backgroundColor: '#FF007A',
    borderColor: '#FF007A',
    paddingHorizontal: 10,
    width: 'auto',
    gap: 4,
  },
  jamBadgeText: {
    color: '#09090B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#222225',
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#ECEDEE',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    padding: 4,
  },
  jamActiveContainer: {
    alignItems: 'center',
    gap: 16,
  },
  broadcastStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
  },
  jamRoomIdValue: {
    color: '#ECEDEE',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
  },
  jamInfoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 0, 122, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 122, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
  },
  jamInfoText: {
    color: '#9BA1A6',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  shareBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF007A',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  shareBtnText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '800',
  },
  leaveBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
  },
  leaveBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '800',
  },
  modalTabsContainer: {
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E1E22',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#2D2D34',
  },
  tabBtnText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#ECEDEE',
  },
  formContainer: {
    gap: 12,
  },
  inputLabel: {
    color: '#9BA1A6',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    color: '#ECEDEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF007A',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '800',
  },
  chatSection: {
    width: '100%',
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: '#252528',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    height: 220,
  },
  chatSectionTitle: {
    color: '#FF007A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  chatScrollView: {
    flex: 1,
    marginBottom: 8,
  },
  chatContentContainer: {
    gap: 8,
  },
  emptyChatText: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  chatMessageItem: {
    backgroundColor: '#1E1E22',
    borderRadius: 10,
    padding: 8,
  },
  chatMessageUser: {
    color: '#FF007A',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  chatMessageText: {
    color: '#ECEDEE',
    fontSize: 13,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: '#2D2D34',
    borderRadius: 10,
    color: '#ECEDEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF007A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
