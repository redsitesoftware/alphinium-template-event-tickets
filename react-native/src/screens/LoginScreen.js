import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_POPUP_URL = '/auth-popup';
const JWT_KEY = 'alphinium_auth_token';

export default function LoginScreen({ onLogin }) {
  const popupRef = useRef(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(JWT_KEY).then((token) => {
      if (token && active) onLogin?.({ token });
    });
    if (Platform.OS !== 'web') return () => { active = false; };

    function handleMessage(event) {
      if (event.data?.type === 'alphinium-auth' && event.data.jwt) {
        AsyncStorage.setItem(JWT_KEY, event.data.jwt).then(() => {
          if (active) onLogin?.({ token: event.data.jwt, user: event.data.user });
        });
        popupRef.current?.close();
      }
    }
    window.addEventListener('message', handleMessage);
    return () => { active = false; window.removeEventListener('message', handleMessage); };
  }, [onLogin]);

  function handleSocialLogin() {
    if (Platform.OS === 'web') {
      const w = 480, h = 640;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      popupRef.current = window.open(AUTH_POPUP_URL, 'alphinium-auth',
        `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
      return;
    }
    Alert.alert('Sign in', 'Native login coming soon — use the web app to sign in.');
  }

  function handleGuest() {
    onLogin?.({ guest: true });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.container}>
        <View style={styles.brand}>
          <Text style={styles.emoji}>🎫</Text>
          <Text style={styles.appName}>EventPass</Text>
          <Text style={styles.tagline}>Sign in to continue</Text>
        </View>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSocialLogin}>
            <Text style={styles.primaryBtnText}>🔐  Sign in with Google or Facebook</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestBtn} onPress={handleGuest}>
            <Text style={styles.guestBtnText}>Continue as guest →</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.terms}>
          By signing in you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 48 },
  emoji: { fontSize: 64, marginBottom: 16 },
  appName: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#A0A0C0' },
  buttons: { gap: 12 },
  primaryBtn: { backgroundColor: '#7C3AED', padding: 18, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  guestBtn: { padding: 16, alignItems: 'center' },
  guestBtnText: { color: '#606080', fontSize: 14 },
  terms: { fontSize: 11, textAlign: 'center', color: '#404060', marginTop: 32, lineHeight: 18 },
});
