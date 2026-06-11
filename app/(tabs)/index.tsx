import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  Dimensions,
  ImageBackground
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
  const { playSong, currentSong, isPlaying } = usePlayer();

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Replicating web mood filters
  const [selectedMood, setSelectedMood] = useState('All');

  // Determine greeting based on time of day
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'GOOD MORNING';
    if (hours < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  // Fetch home feed data
  const loadHomeData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const allSongs = await dbService.getSongs();
      setSongs(allSongs);

      const history = await dbService.getRecentlyPlayed(user.id);
      setRecentlyPlayed(history);

      const favs = await dbService.getFavorites(user.id);
      setFavorites(favs.map(f => f.id));
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Greeting Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.questionText}>What moves you tonight?</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
          <Text style={styles.avatarText}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
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
});
