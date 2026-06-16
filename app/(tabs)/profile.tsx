import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { dbService } from '@/services/db';
import { usePlayer } from '@/context/player-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut, isMock } = useAuth();
  const { pauseSong } = usePlayer();

  const [playlistCount, setPlaylistCount] = useState(0);
  
  // Settings toggle states Replicated from Web / Database
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [losslessEnabled, setLosslessEnabled] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const fetchStatsAndSettings = async () => {
      if (!user) return;
      try {
        const playlists = await dbService.getPlaylists(user.id);
        setPlaylistCount(playlists.length);

        const settings = await dbService.getSettings(user.id);
        setNotificationsEnabled(settings.notifications);
        setLosslessEnabled(settings.audio_quality === 'lossless');
        setTheme(settings.theme === 'light' ? 'light' : 'dark');
      } catch (err) {
        console.error('Error fetching profile stats or settings:', err);
      }
    };
    fetchStatsAndSettings();
  }, [user]);

  const handleToggleNotifications = async () => {
    if (!user) return;
    try {
      const nextVal = !notificationsEnabled;
      setNotificationsEnabled(nextVal);
      await dbService.updateSettings(user.id, { notifications: nextVal });
    } catch (err) {
      console.error('Error toggling notifications:', err);
    }
  };

  const handleToggleLossless = async () => {
    if (!user) return;
    try {
      const nextVal = !losslessEnabled;
      setLosslessEnabled(nextVal);
      await dbService.updateSettings(user.id, { 
        audio_quality: nextVal ? 'lossless' : 'high' 
      });
    } catch (err) {
      console.error('Error toggling lossless quality:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      pauseSong();
      await signOut();
      router.replace('/(auth)/login' as any);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Listener'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'listener@melo.co'}</Text>

        {/* Replicated Web Google Auth Badge */}
        <View style={[styles.authBadge, isMock ? styles.authBadgeMock : styles.authBadgeLive]}>
          <Ionicons 
            name={isMock ? "logo-electron" : "logo-google"} 
            size={12} 
            color={isMock ? "#F59E0B" : "#10B981"} 
            style={{ marginRight: 6 }} 
          />
          <Text style={[styles.authBadgeText, { color: isMock ? "#F59E0B" : "#10B981" }]}>
            {isMock ? "LOCAL OFF-LINE DATABASE" : "GOOGLE AUTH CONNECTED"}
          </Text>
        </View>
      </View>

      {/* Web Replicated Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>1.2k</Text>
          <Text style={styles.statLabel}>Hours Streamed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{playlistCount}</Text>
          <Text style={styles.statLabel}>Playlists</Text>
        </View>
      </View>

      {/* Replicated Settings parameter toggles */}
      <Text style={styles.sectionHeader}>PREMIUM PARAMETERS</Text>
      <View style={styles.menuContainer}>
        {/* Toggle 1: Push Notifications */}
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={handleToggleNotifications}
        >
          <Ionicons name="notifications-outline" size={20} color="#ECEDEE" />
          <Text style={styles.menuItemText}>Push Notifications</Text>
          <View style={[styles.toggleBadge, notificationsEnabled ? styles.toggleBadgeActive : styles.toggleBadgeInactive]}>
            <Text style={[styles.toggleBadgeText, notificationsEnabled ? styles.toggleBadgeTextActive : styles.toggleBadgeTextInactive]}>
              {notificationsEnabled ? "ENABLED" : "DISABLED"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Toggle 2: Lossless Quality */}
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={handleToggleLossless}
        >
          <Ionicons name="infinite-outline" size={20} color="#ECEDEE" />
          <Text style={styles.menuItemText}>Lossless Streaming</Text>
          <View style={[styles.toggleBadge, losslessEnabled ? styles.toggleBadgeActive : styles.toggleBadgeInactive]}>
            <Text style={[styles.toggleBadgeText, losslessEnabled ? styles.toggleBadgeTextActive : styles.toggleBadgeTextInactive]}>
              {losslessEnabled ? "24-BIT MQA" : "16-BIT CD"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Toggle 3: Active Theme */}
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={async () => {
            if (!user) return;
            try {
              const nextVal = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextVal);
              await dbService.updateSettings(user.id, { theme: nextVal });
            } catch (err) {
              console.error('Error toggling theme:', err);
            }
          }}
        >
          <Ionicons name="sunny-outline" size={20} color="#ECEDEE" />
          <Text style={styles.menuItemText}>Active Theme</Text>
          <View style={[styles.toggleBadge, theme === 'dark' ? styles.toggleBadgeActive : styles.toggleBadgeInactive]}>
            <Text style={[styles.toggleBadgeText, theme === 'dark' ? styles.toggleBadgeTextActive : styles.toggleBadgeTextInactive]}>
              {theme.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Settings Options */}
      <Text style={styles.sectionHeader}>SUPPORT</Text>
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#ECEDEE" />
          <Text style={styles.menuItemText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Developer Tools */}
      <Text style={styles.sectionHeader}>DEVELOPER SUITE</Text>
      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/diagnostics' as any)}
        >
          <Ionicons name="pulse-outline" size={20} color="#FF007A" />
          <Text style={[styles.menuItemText, { color: '#FF007A', fontWeight: '700' }]}>System Diagnostics</Text>
          <Ionicons name="chevron-forward" size={16} color="#FF007A" />
        </TouchableOpacity>
      </View>

      {/* Log out / Deauthorize button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
        <Text style={styles.logoutBtnText}>Deauthorize Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF007A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF007A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    color: '#09090B',
    fontSize: 36,
    fontWeight: '800',
  },
  userName: {
    color: '#ECEDEE',
    fontSize: 24,
    fontWeight: '800',
  },
  userEmail: {
    color: '#9BA1A6',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  authBadgeMock: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  authBadgeLive: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  authBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  statNum: {
    color: '#FF007A',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: '#9BA1A6',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  sectionHeader: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  menuContainer: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 8,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemText: {
    color: '#ECEDEE',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  toggleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleBadgeActive: {
    backgroundColor: 'rgba(255, 0, 122, 0.05)',
    borderColor: 'rgba(255, 0, 122, 0.2)',
  },
  toggleBadgeInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.05)',
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  toggleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  toggleBadgeTextActive: {
    color: '#FF007A',
  },
  toggleBadgeTextInactive: {
    color: '#6B7280',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    height: 52,
    marginTop: 12,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
