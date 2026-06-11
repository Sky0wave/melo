import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Alert
} from 'react-native';
import { dbService, Song } from '@/services/db';
import { usePlayer } from '@/context/player-context';
import { useAuth } from '@/context/auth-context';
import { Ionicons } from '@expo/vector-icons';

const GENRES = [
  { id: '1', name: 'Ambient Chill', color: '#6366F1' },
  { id: '2', name: 'Electronic', color: '#FF007A' },
  { id: '3', name: 'Hip-Hop Pulse', color: '#F59E0B' },
  { id: '4', name: 'Deep Focus', color: '#3B82F6' },
  { id: '5', name: 'Late Night Jazz', color: '#EC4899' },
  { id: '6', name: 'Acoustic sessions', color: '#EF4444' }
];

export default function SearchScreen() {
  const { user } = useAuth();
  const { playSong, currentSong, isPlaying } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Add song modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songUrl, setSongUrl] = useState('');

  // Fetch all songs
  const fetchSongs = async () => {
    try {
      const songs = await dbService.getSongs();
      setAllSongs(songs);
      if (user) {
        const favs = await dbService.getFavorites(user.id);
        setFavorites(favs.map(f => f.id));
      }
    } catch (err) {
      console.error('Error fetching songs in search:', err);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [user, currentSong]);

  // Filter songs based on query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs([]);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = allSongs.filter(
        (song) => 
          song.title.toLowerCase().includes(query) || 
          song.artist.toLowerCase().includes(query)
      );
      setFilteredSongs(filtered);
    }
  }, [searchQuery, allSongs]);

  // Create Song Action
  const handleAddSong = async () => {
    if (!songTitle.trim() || !songArtist.trim()) {
      Alert.alert('Error', 'Please enter both Title and Artist.');
      return;
    }
    try {
      const newSong = await dbService.addSong(
        songTitle.trim(),
        songArtist.trim(),
        songUrl.trim() || 'https://www.youtube.com/'
      );
      
      Alert.alert('Success', `"${newSong.title}" added to the catalog!`);
      setSongTitle('');
      setSongArtist('');
      setSongUrl('');
      setAddModalVisible(false);
      
      await fetchSongs();
    } catch (err) {
      console.error('Error adding song:', err);
    }
  };

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => setAddModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#FF007A" />
          <Text style={styles.addBtnText}>Add Track</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={20} color="#6B7280" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Artists, songs, or tags..."
          placeholderTextColor="#4B5563"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {searchQuery.length > 0 ? (
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#4B5563" />
              <Text style={styles.emptyText}>{`No results for "${searchQuery}"`}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCurrent = currentSong?.id === item.id;
            const isFav = favorites.includes(item.id);
            return (
              <View style={[styles.songRow, isCurrent && styles.songRowActive]}>
                <TouchableOpacity 
                  style={styles.songMain}
                  onPress={() => playSong(item, filteredSongs)}
                >
                  <Ionicons 
                    name={isCurrent && isPlaying ? "volume-medium" : "musical-notes-outline"} 
                    size={22} 
                    color={isCurrent ? "#FF007A" : "#ECEDEE"} 
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.songTitle, isCurrent && styles.songTitleActive]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleToggleFav(item.id)} style={{ padding: 8 }}>
                  <Ionicons 
                    name={isFav ? "heart" : "heart-outline"} 
                    size={22} 
                    color={isFav ? "#EF4444" : "#6B7280"} 
                  />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.browseTitle}>Browse All Genres</Text>
          <View style={styles.grid}>
            {GENRES.map((g) => (
              <View 
                key={g.id} 
                style={[styles.genreCard, { backgroundColor: g.color }]}
              >
                <Text style={styles.genreText}>{g.name}</Text>
                <Ionicons 
                  name="disc" 
                  size={50} 
                  color="rgba(255,255,255,0.12)" 
                  style={styles.genreIcon} 
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ADD SONG MODAL */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Track to Catalog</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ECEDEE" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Track Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Moonlight Sonata"
                placeholderTextColor="#4B5563"
                value={songTitle}
                onChangeText={setSongTitle}
              />

              <Text style={styles.label}>Artist Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Beethoven"
                placeholderTextColor="#4B5563"
                value={songArtist}
                onChangeText={setSongArtist}
              />

              <Text style={styles.label}>YouTube URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://youtube.com/..."
                placeholderTextColor="#4B5563"
                value={songUrl}
                onChangeText={setSongUrl}
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddSong}>
                <Text style={styles.submitBtnText}>Add Track</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#ECEDEE',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  addBtnText: {
    color: '#FF007A',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    color: '#ECEDEE',
    fontSize: 16,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  browseTitle: {
    color: '#ECEDEE',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  genreCard: {
    width: '48%',
    height: 100,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  genreText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  genreIcon: {
    position: 'absolute',
    right: -10,
    top: -10,
    transform: [{ rotate: '25deg' }],
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
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
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ECEDEE',
    fontSize: 18,
    fontWeight: '700',
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#ECEDEE',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#09090B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    color: '#ECEDEE',
    fontSize: 16,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#FF007A',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#09090B',
    fontSize: 16,
    fontWeight: '700',
  },
});
