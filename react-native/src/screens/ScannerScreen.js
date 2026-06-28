import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useStore } from '../store/ticketStore';
import { ScanService } from '../services/ScanService';

// Demo UUIDs that cycle through the three result states
const DEMO_UUIDS = [
  'QR-NEON-GA-2841',   // valid
  'SCANNED-001',        // already scanned
  'INVALID-FAKE-UUID',  // invalid / not found
];

// ---------------------------------------------------------------------------
// Result card config — maps scan outcome → visual treatment
// ---------------------------------------------------------------------------
function getResultStyle(result) {
  if (!result) return null;
  if (result.offline) {
    return {
      headerBg:    result.success ? '#065F46' : '#7F1D1D',
      borderColor: result.success ? '#34D399' : '#EF4444',
      icon:        result.success ? '✓' : '✗',
      label:       result.success ? '✓ VALID (OFFLINE)' : '✗ INVALID (OFFLINE)',
    };
  }
  if (result.alreadyScanned) {
    return { headerBg: '#78350F', borderColor: '#F59E0B', icon: '⚠', label: '⚠️ ALREADY SCANNED' };
  }
  if (result.success) {
    return { headerBg: '#15803D', borderColor: '#22C55E', icon: '✓', label: '✓ VALID' };
  }
  return { headerBg: '#991B1B', borderColor: '#EF4444', icon: '✗', label: '✗ INVALID' };
}

// ---------------------------------------------------------------------------
// ScannerScreen
// ---------------------------------------------------------------------------
export default function ScannerScreen() {
  const { state, dispatch } = useStore();
  // Use the currently selected event for offline cache; fall back to 'e1' in demo mode
  const eventId = state.selectedEvent ?? 'e1';

  // All scan state is local — no store dispatches for scan results
  const [scanning, setScanning]       = useState(false);
  const [result, setResult]           = useState(null); // null = ready to scan
  const [demoIndex, setDemoIndex]     = useState(0);    // cycles through DEMO_UUIDS
  const [cacheReady, setCacheReady]   = useState(false);
  const [primingCache, setPrimingCache] = useState(false);

  // Scan-line animation
  const lineAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [lineAnim]);

  // ---------------------------------------------------------------------------
  // Core scan handler — calls ScanService, falls back to offline on network error
  // ---------------------------------------------------------------------------
  const performScan = useCallback(async (uuid) => {
    setScanning(true);
    setResult(null);
    try {
      const data = await ScanService.scanTicket(uuid);
      setResult({ ...data, offline: false, uuid });
    } catch {
      // Network / server error → fall back to offline cache
      try {
        const offlineData = await ScanService.scanOffline(uuid, eventId);
        setResult({ ...offlineData, uuid, attendeeName: null, ticketType: null, alreadyScanned: false });
      } catch {
        setResult({ success: false, offline: true, uuid, attendeeName: null, ticketType: null, alreadyScanned: false });
      }
    } finally {
      setScanning(false);
    }
  }, [eventId]);

  // ---------------------------------------------------------------------------
  // Simulate button — cycles through demo UUIDs for each of the three states
  // ---------------------------------------------------------------------------
  const handleSimulate = useCallback(() => {
    const uuid = DEMO_UUIDS[demoIndex % DEMO_UUIDS.length];
    setDemoIndex((i) => i + 1);
    performScan(uuid);
  }, [demoIndex, performScan]);

  // ---------------------------------------------------------------------------
  // "Go Offline" — pre-seeds AsyncStorage cache so scanOffline() will work
  // ---------------------------------------------------------------------------
  const handlePrimeCache = useCallback(async () => {
    setPrimingCache(true);
    try {
      const res = await ScanService.primeOfflineCache(eventId);
      setCacheReady(true);
      Alert.alert('Offline Cache Ready', `${res.count} ticket UUID${res.count !== 1 ? 's' : ''} cached. You can now scan without a network connection.`);
    } catch (err) {
      Alert.alert('Cache Failed', err.message || 'Could not prime offline cache.');
    } finally {
      setPrimingCache(false);
    }
  }, [eventId]);

  // ---------------------------------------------------------------------------
  // Reset to scanner view from any result state
  // ---------------------------------------------------------------------------
  const resetScan = useCallback(() => {
    setResult(null);
    setScanning(false);
  }, []);

  const style = getResultStyle(result);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => dispatch({ type: 'GO_HOME' })}>
          <Text style={s.back}>← Close</Text>
        </TouchableOpacity>
        <Text style={s.title}>Ticket Scanner</Text>
        <TouchableOpacity style={s.offlineBtn} onPress={handlePrimeCache} disabled={primingCache}>
          {primingCache
            ? <ActivityIndicator size="small" color="#818CF8" />
            : <Text style={[s.offlineBtnText, cacheReady && s.offlineBtnReady]}>
                {cacheReady ? '📡 Cached' : '📡 Go Offline'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      {/* Scanner view */}
      {!result ? (
        <View style={s.scanArea}>
          {/* Viewfinder */}
          <View style={s.viewfinder}>
            <View style={[s.corner, s.tl]} />
            <View style={[s.corner, s.tr]} />
            <View style={[s.corner, s.bl]} />
            <View style={[s.corner, s.br]} />
            <Animated.View
              style={[
                s.scanLine,
                { transform: [{ translateY: lineAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 100] }) }] },
              ]}
            />
            <Text style={s.viewfinderIcon}>📱</Text>
          </View>

          <Text style={s.scanLabel}>Scan attendee QR code at entry</Text>

          {scanning ? (
            <View style={s.spinnerWrap}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={s.scanningText}>Validating…</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={s.simBtn} onPress={handleSimulate} activeOpacity={0.8}>
                <Text style={s.simBtnText}>⚡ Simulate Scan</Text>
              </TouchableOpacity>
              <Text style={s.demoNote}>Cycles: valid → already scanned → invalid</Text>
            </>
          )}
        </View>
      ) : (
        /* Result card */
        <View style={s.resultArea}>
          <View style={[s.resultCard, { borderColor: style.borderColor }]}>
            {/* Result header */}
            <View style={[s.resultHeader, { backgroundColor: style.headerBg }]}>
              <Text style={s.resultIcon}>{style.icon}</Text>
              <Text style={s.resultLabel}>{style.label}</Text>
              {result.offline && (
                <View style={s.offlineBadge}>
                  <Text style={s.offlineBadgeText}>OFFLINE MODE</Text>
                </View>
              )}
            </View>

            {/* Result body */}
            <View style={s.resultBody}>
              {result.success && !result.alreadyScanned && !result.offline ? (
                /* Valid online scan */
                <>
                  <Text style={s.attendeeName}>{result.attendeeName || '—'}</Text>
                  <Text style={s.attendeeTicketType}>{result.ticketType || '—'}</Text>
                  <Text style={s.uuidText}>{result.uuid}</Text>
                </>
              ) : result.alreadyScanned ? (
                /* Double-scan warning */
                <>
                  <Text style={s.resultMessage}>This ticket has already been scanned and admitted.</Text>
                  <Text style={s.uuidText}>{result.uuid}</Text>
                </>
              ) : result.offline ? (
                /* Offline cache result */
                <>
                  <Text style={s.resultMessage}>
                    {result.success
                      ? 'UUID found in offline cache — entry permitted.'
                      : 'UUID not found in offline cache — entry denied.'}
                  </Text>
                  <Text style={s.uuidText}>{result.uuid}</Text>
                </>
              ) : (
                /* Invalid ticket */
                <>
                  <Text style={s.resultMessage}>{result.error || 'This ticket is not valid.'}</Text>
                  <Text style={s.uuidText}>{result.uuid}</Text>
                </>
              )}
            </View>
          </View>

          {/* Scan Next button */}
          <TouchableOpacity style={s.nextBtn} onPress={resetScan} disabled={scanning} activeOpacity={0.85}>
            <Text style={s.nextBtnText}>Scan Next →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles — dark scanner theme consistent with the original screen
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F1A' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  back: { color: '#818CF8', fontSize: 15, fontWeight: '600' },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  offlineBtn: {
    minWidth: 90,
    alignItems: 'flex-end',
  },
  offlineBtnText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '600',
  },
  offlineBtnReady: {
    color: '#34D399',
  },

  // Scanner viewfinder
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  viewfinder: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#6366F1',
    borderWidth: 4,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#6366F1',
    opacity: 0.8,
  },
  viewfinderIcon: { fontSize: 48, opacity: 0.3 },
  scanLabel: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },
  spinnerWrap: { alignItems: 'center', gap: 10 },
  scanningText: { color: '#818CF8', fontSize: 14, fontWeight: '600' },
  simBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  simBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  demoNote: { color: '#374151', fontSize: 11, textAlign: 'center' },

  // Result card
  resultArea: { flex: 1, padding: 20, justifyContent: 'center', gap: 16 },
  resultCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
  },
  resultHeader: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  resultIcon: { fontSize: 40, color: '#fff' },
  resultLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  offlineBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  offlineBadgeText: {
    color: '#FCD34D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  resultBody: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  attendeeName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  attendeeTicketType: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 15,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 22,
  },
  uuidText: {
    fontSize: 11,
    color: '#374151',
    letterSpacing: 1.5,
    marginTop: 8,
  },

  // Scan Next button
  nextBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
