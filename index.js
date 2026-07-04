/**
 * Root entry point for Expo Router with react-native-track-player.
 *
 * IMPORTANT: TrackPlayer.registerPlaybackService() MUST be called before
 * AppRegistry.registerComponent() so the background headless task is
 * registered with the native layer on app start — even when the app is
 * brought to the foreground from a media notification.
 *
 * Expo Router normally uses expo-router/entry as "main", but we intercept
 * here first so we can register the playback service, then hand off to the
 * router entry as usual.
 */

import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  try {
    const TrackPlayer = require('react-native-track-player').default;
    TrackPlayer.registerPlaybackService(() => require('./track-player-service'));
  } catch (e) {
    console.warn('[MeloMobile] Failed to register TrackPlayer playback service:', e);
  }
}

// Hand off to Expo Router's entry point which registers the root component.
import 'expo-router/entry';
