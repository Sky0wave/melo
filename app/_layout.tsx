import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { PlayerProvider } from '@/context/player-context';
import { AudioPlayer } from '@/components/audio-player';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { user, loading } = useAuth();
  const colorScheme = useColorScheme();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>Melo 🎵</Text>
        <ActivityIndicator size="large" color="#FF007A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      {user && <AudioPlayer />}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <PlayerProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AppContent />
          <StatusBar style="light" />
        </ThemeProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    color: '#FF007A',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
});

