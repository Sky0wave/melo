import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, StyleSheet, Platform } from 'react-native';
import 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { PlayerProvider, usePlayer } from '@/context/player-context';
import { AudioPlayer } from '@/components/audio-player';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}



let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.error('Failed to import react-native-webview:', e);
  }
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { user, loading } = useAuth();
  const { registerWebView, handleWebViewMessage, playerHtml } = usePlayer();

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
      {Platform.OS !== 'web' && WebView && (
        <View style={{ position: 'absolute', width: 1, height: 1, bottom: 0, right: 0, opacity: 0.01, pointerEvents: 'none', overflow: 'hidden' }}>
          <WebView
            ref={registerWebView}
            style={{ width: 1, height: 1 }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            source={{ html: playerHtml, baseUrl: 'https://youtube.com' }}
            onMessage={handleWebViewMessage}
          />
        </View>
      )}
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

