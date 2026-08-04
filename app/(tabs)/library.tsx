import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  TextInput, 
  Alert,
  Image
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { usePlayer } from '@/context/player-context';
import { dbService, Playlist, Song, getSongCoverUrl } from '@/services/db';
import { downloadService } from '@/services/download-service';
import { Ionicons } from '@expo/vector-icons';

type TabType = 'playlists' | 'favorites' | 'downloads';

export default function LibraryScreen() {
  const { user } = useAuth();
  const { playSong, currentSong, isPlaying } = usePlayer();

  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [downloads, setDownloads] = useState<Song[]>([]);
  
  // Create playlist modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Playlist detail modal
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);

  // Load Library Data
  const loadLibraryData = useCallback(async () => {
    if (!user) return;
    try {
      if (activeTab === 'playlists') {
        const data = await dbService.getPlaylists(user.id);
        setPlaylists(data);
      } else if (activeTab === 'favorites') {
        const data = await dbService.getFavorites(user.id);
        setFavorites(data);
      } else if (activeTab === 'downloads') {
        const data = await downloadService.getDownloadedSongs(user.id);
        setDownloads(data);
      }
    } catch (err) {
      console.error('Error loading library data:', err);
    }
  }, [user, activeTab]);

  useEffect(() => {
    loadLibraryData();
  }, [loadLibraryData, currentSong]);

  // Load selected playlist songs
  const fetchPlaylistSongs = async (playlistId: string) => {
    if (!user) return;
    try {
      const songs = await dbService.getSongsInPlaylist(user.id, playlistId);
      setPlaylistSongs(songs);
    } catch (err) {
      console.error('Error fetching playlist songs:', err);
    }
  };

  const handleOpenPlaylistDetail = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    await fetchPlaylistSongs(playlist.id);
  };

  // Create Playlist Action
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !user) return;
    try {
      await dbService.createPlaylist(user.id, newPlaylistName.trim());
      setNewPlaylistName('');
      setCreateModalVisible(false);
      loadLibraryData();
      Alert.alert('Success', 'Playlist created!');
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  // Delete Playlist Action
  const handleDeletePlaylist = async (playlistId: string, name: string) => {
    Alert.alert(
      'Delete Playlist',
      `Delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await dbService.deletePlaylist(user.id, playlistId);
              loadLibraryData();
              setSelectedPlaylist(null);
            } catch (err) {
              console.error('Error deleting playlist:', err);
            }
          }
        }
      ]
    );
  };

  // Remove Song from Playlist
  const handleRemoveSongFromPlaylist = async (songId: string, songTitle: string) => {
    if (!selectedPlaylist || !user) return;
    setPlaylistSongs(prev => prev.filter(s => s.id !== songId));
    try {
      await dbService.removeSongFromPlaylist(user.id, selectedPlaylist.id, songId);
      await fetchPlaylistSongs(selectedPlaylist.id);
      await loadLibraryData();
      Alert.alert('Removed', `"${songTitle}" removed from playlist.`);
    } catch (err) {
      console.error('Error removing song:', err);
      fetchPlaylistSongs(selectedPlaylist.id);
    }
  };

  // Remove Favorite
  const handleRemoveFavorite = async (songId: string) => {
    if (!user) return;
    try {
      await dbService.toggleFavorite(user.id, songId);
      loadLibraryData();
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  // Remove Downloaded Song
  const handleRemoveDownload = async (songId: string, songTitle: string) => {
    if (!user) return;
    try {
      await downloadService.removeDownloadedSong(user.id, songId);
      loadLibraryData();
      Alert.alert('Deleted', `"${songTitle}" removed from downloads.`);
    } catch (err) {
      console.error('Error deleting download:', err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        {activeTab === 'playlists' && (
          <TouchableOpacity 
            style={styles.createBtn}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#FF007A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'playlists' && styles.tabActive]}
          onPress={() => setActiveTab('playlists')}
        >
          <Text style={[styles.tabText, activeTab === 'playlists' && styles.tabTextActive]}>
            Playlists
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>
            Liked Songs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'downloads' && styles.tabActive]}
          onPress={() => setActiveTab('downloads')}
        >
          <Text style={[styles.tabText, activeTab === 'downloads' && styles.tabTextActive]}>
            Downloads
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lists */}
      {activeTab === 'playlists' ? (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={56} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Playlists Yet</Text>
              <Text style={styles.emptySubtitle}>{"Tap the '+' button in the top right to start a playlist."}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.playlistRow}
              onPress={() => handleOpenPlaylistDetail(item)}
            >
              <View style={styles.playlistCoverContainer}>
                <View style={styles.playlistCoverGradient}>
                  <Ionicons name="folder-outline" size={22} color="#09090B" />
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.playlistRowName}>{item.name}</Text>
                <Text style={styles.playlistRowSub}>Personal Playlist</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeletePlaylist(item.id, item.name)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      ) : activeTab === 'favorites' ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={56} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Liked Songs</Text>
              <Text style={styles.emptySubtitle}>Songs you favorite will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCurrent = currentSong?.id === item.id;
            return (
              <View style={[styles.songRow, isCurrent && styles.songRowActive]}>
                <TouchableOpacity 
                  style={styles.songMain}
                  onPress={() => playSong(item, favorites)}
                >
                  <View style={styles.songRowImageContainer}>
                    <Image 
                      source={{ uri: getSongCoverUrl(item) }} 
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
                      {item.title}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleRemoveFavorite(item.id)} style={{ padding: 8 }}>
                  <Ionicons name="heart" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => `dl-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="download-outline" size={56} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Offline Downloads</Text>
              <Text style={styles.emptySubtitle}>Downloaded songs will be available to play offline here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCurrent = currentSong?.id === item.id;
            return (
              <View style={[styles.songRow, isCurrent && styles.songRowActive]}>
                <TouchableOpacity 
                  style={styles.songMain}
                  onPress={() => playSong(item, downloads)}
                >
                  <View style={styles.songRowImageContainer}>
                    <Image 
                      source={{ uri: getSongCoverUrl(item) }} 
                      style={styles.songRowImage} 
                    />
                    {isCurrent && isPlaying && (
                      <View style={styles.playingImageOverlay}>
                        <Ionicons name="volume-medium" size={16} color="#FF007A" />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={[styles.songTitle, isCurrent && styles.songTitleActive]} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={styles.songArtist} numberOfLines={1}>{item.artist} • Offline Available</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleRemoveDownload(item.id, item.title)} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* CREATE PLAYLIST MODAL */}
      <Modal
        visible={createModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Playlist</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ECEDEE" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. My Favorites Mix"
              placeholderTextColor="#4B5563"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.createActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setCreateModalVisible(false)}
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
        </View>
      </Modal>

      {/* PLAYLIST DETAIL MODAL */}
      <Modal
        visible={!!selectedPlaylist}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPlaylist(null)}
      >
        {selectedPlaylist && (
          <View style={styles.playlistDetailContainer}>
            {/* Header */}
            <View style={styles.playlistDetailHeader}>
              <TouchableOpacity onPress={() => setSelectedPlaylist(null)} style={styles.detailHeaderBtn}>
                <Ionicons name="chevron-down" size={28} color="#ECEDEE" />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>{selectedPlaylist.name}</Text>
              <TouchableOpacity 
                onPress={() => handleDeletePlaylist(selectedPlaylist.id, selectedPlaylist.name)} 
                style={styles.detailHeaderBtn}
              >
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {/* Song list */}
            <FlatList
              data={playlistSongs}
              keyExtractor={(item) => `plist-song-${item.id}`}
              contentContainerStyle={styles.detailListContent}
              ListEmptyComponent={
                <View style={styles.detailEmptyContainer}>
                  <Ionicons name="musical-notes-outline" size={48} color="#4B5563" />
                  <Text style={styles.detailEmptyTitle}>Empty Playlist</Text>
                  <Text style={styles.detailEmptySubtitle}>Add songs to this playlist from Search.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isCurrent = currentSong?.id === item.id;
                return (
                  <View style={[styles.songRow, isCurrent && styles.songRowActive]}>
                    <TouchableOpacity 
                      style={styles.songMain}
                      onPress={() => playSong(item, playlistSongs)}
                    >
                      <View style={styles.songRowImageContainer}>
                        <Image 
                          source={{ uri: getSongCoverUrl(item) }} 
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
                          {item.title}
                        </Text>
                        <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => handleRemoveSongFromPlaylist(item.id, item.title)} 
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="remove-circle-outline" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>
        )}
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
    marginBottom: 16,
  },
  headerTitle: {
    color: '#ECEDEE',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#18181B',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: '#FF007A',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FF007A',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  playlistCoverContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 122, 0.25)',
  },
  playlistCoverGradient: {
    flex: 1,
    backgroundColor: '#FF007A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songRowImageContainer: {
    width: 40,
    height: 40,
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
  playlistRowName: {
    color: '#ECEDEE',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistRowSub: {
    color: '#9BA1A6',
    fontSize: 12,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 10,
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
    paddingVertical: 80,
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#ECEDEE',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 40,
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
  input: {
    backgroundColor: '#09090B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    color: '#ECEDEE',
    fontSize: 16,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 20,
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
  playlistDetailContainer: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  playlistDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#18181B',
  },
  detailHeaderBtn: {
    padding: 8,
  },
  detailHeaderTitle: {
    color: '#ECEDEE',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  detailListContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  detailEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  detailEmptyTitle: {
    color: '#ECEDEE',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  detailEmptySubtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
  },
});
