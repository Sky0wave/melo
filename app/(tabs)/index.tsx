import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  Dimensions,
  ImageBackground,
  Modal,
  TextInput,
  Alert,
  Share,
  Clipboard
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { usePlayer } from '@/context/player-context';
import { dbService, Song } from '@/services/db';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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

export default function HomeScreen() {
  const { user } = useAuth();
  const { 
    playSong, 
    currentSong, 
    isPlaying,
    jamRoom,
    createJamRoom,
    joinJamRoom,
    leaveJamRoom
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
  }, [user, currentSong]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF007A" />
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
                  <View style={[styles.recentIconContainer, isCurrent && styles.activeRecentIcon]}>
                    <Ionicons 
                      name={isCurrent && isPlaying ? "volume-medium" : "musical-notes"} 
                      size={28} 
                      color={isCurrent ? "#FF007A" : "#ECEDEE"} 
                    />
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
                  <Ionicons 
                    name={isCurrent && isPlaying ? "volume-medium" : "play-circle-outline"} 
                    size={24} 
                    color={isCurrent ? "#FF007A" : "#ECEDEE"} 
                    style={{ marginRight: 12 }}
                  />
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

              <Text style={styles.jamRoomIdLabel}>ROOM ID</Text>
              <Text style={styles.jamRoomIdValue}>{jamRoom.room_id}</Text>

              <View style={styles.jamInfoCard}>
                <Ionicons name="information-circle-outline" size={18} color="#FF007A" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.jamInfoText}>
                  {jamRoom.isHost 
                    ? 'Anyone with this Room ID and your password can join. The music you play, pause, or seek will sync to them in real time.'
                    : 'Your music is synchronized with the host. If the host plays, pauses, or changes the song, your player will follow.'}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.shareBtn} 
                onPress={() => {
                  Share.share({
                    message: `Join my Melo Music Jam Room!\nRoom ID: ${jamRoom.room_id}\nPassword: ${jamPassword || '(Secured)'}`
                  }).catch(err => console.log(err));
                }}
              >
                <Ionicons name="share-social-outline" size={18} color="#09090B" style={{ marginRight: 6 }} />
                <Text style={styles.shareBtnText}>Share Room Info</Text>
              </TouchableOpacity>

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
  recentIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeRecentIcon: {
    borderColor: '#FF007A',
    backgroundColor: 'rgba(255, 0, 122, 0.03)',
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
});
