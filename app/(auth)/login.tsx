import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView 
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { signIn, isMock } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    
    const result = await signIn(email, password);
    setLoading(false);
    
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      // AuthProvider triggers layout switch automatically
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="musical-notes" size={40} color="#FF007A" />
          </View>
          <Text style={styles.title}>Melo</Text>
          <Text style={styles.subtitle}>Your personal soundtrack, refined.</Text>
        </View>

        {isMock && (
          <View style={styles.mockBadge}>
            <Ionicons name="information-circle-outline" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
            <Text style={styles.mockBadgeText}>Running in Demo Mode (Local Storage)</Text>
          </View>
        )}

        <View style={styles.form}>
          {errorMsg && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#4B5563"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#4B5563"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#09090B" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {isMock && (
            <View style={styles.demoTip}>
              <Text style={styles.demoTipText}>
                💡 Try signing up or log in as any user. Passwords are saved locally.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Melo? </Text>
            <TouchableOpacity onPress={() => router.push('/register' as any)}>
              <Text style={styles.footerLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 0, 122, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 122, 0.3)',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ECEDEE',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#9BA1A6',
    marginTop: 8,
    textAlign: 'center',
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  mockBadgeText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    flex: 1,
  },
  label: {
    color: '#ECEDEE',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#ECEDEE',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#FF007A',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF007A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#880044',
  },
  buttonText: {
    color: '#09090B',
    fontSize: 16,
    fontWeight: '700',
  },
  demoTip: {
    marginTop: 16,
    alignItems: 'center',
  },
  demoTipText: {
    color: '#9BA1A6',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  footerLink: {
    color: '#FF007A',
    fontSize: 14,
    fontWeight: '600',
  },
});
