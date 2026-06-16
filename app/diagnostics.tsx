import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';

// Resolve host IP dynamically to connect to local services
let devHost = 'localhost';
try {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    devHost = hostUri.split(':')[0];
  }
} catch (e) {
  console.warn('[diagnostics] Failed to resolve hostUri:', e);
}

const DEV_SUITE_URL = `http://${devHost}:4000`;
const METRO_URL = `http://${devHost}:8081`;
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || `http://${devHost}:3000`;

interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'warning' | 'offline';
  latency?: number;
  error?: string;
}

interface CodebaseStats {
  healthScore: number;
  totalFiles: number;
  totalLines: number;
  todosCount: number;
  lintCount: number;
  tscCount: number;
  todos: { file: string; line: number; type: string; text: string }[];
  largeFilesCount: number;
}

export default function DiagnosticsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  
  // Status states
  const [metroStatus, setMetroStatus] = useState<ServiceStatus>({ name: 'Metro Packager', url: METRO_URL, status: 'offline' });
  const [backendStatus, setBackendStatus] = useState<ServiceStatus>({ name: 'Backend API', url: BACKEND_URL, status: 'offline' });
  const [dbStatus, setDbStatus] = useState<ServiceStatus>({ name: 'Neon Postgres DB', url: 'Neon Cloud', status: 'offline' });
  const [devSuiteStatus, setDevSuiteStatus] = useState<ServiceStatus>({ name: 'Dev-Suite Agent', url: DEV_SUITE_URL, status: 'offline' });

  // Code analysis states
  const [codeStats, setCodeStats] = useState<CodebaseStats | null>(null);

  const pingService = async (url: string, timeout = 2000): Promise<{ ok: boolean; latency?: number; error?: string }> => {
    const start = Date.now();
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return { 
        ok: res.status >= 200 && res.status < 400,
        latency: Date.now() - start 
      };
    } catch (err: any) {
      clearTimeout(id);
      return { ok: false, error: err.message || 'Timeout' };
    }
  };

  const checkAllServices = async () => {
    // 1. Ping Metro
    const metroRes = await pingService(`${METRO_URL}/status`);
    setMetroStatus({
      name: 'Metro Packager',
      url: METRO_URL,
      status: metroRes.ok ? 'online' : 'offline',
      latency: metroRes.latency,
      error: metroRes.error
    });

    // 2. Ping Backend API
    const backendRes = await pingService(`${BACKEND_URL}/api/tracks`);
    setBackendStatus({
      name: 'Backend API',
      url: BACKEND_URL,
      status: backendRes.ok ? 'online' : 'offline',
      latency: backendRes.latency,
      error: backendRes.error
    });

    // 3. Ping Dev-Suite Server
    const suiteRes = await pingService(`${DEV_SUITE_URL}/api/status`);
    setDevSuiteStatus({
      name: 'Dev-Suite Agent',
      url: DEV_SUITE_URL,
      status: suiteRes.ok ? 'online' : 'offline',
      latency: suiteRes.latency,
      error: suiteRes.error
    });

    // If Dev-Suite is running, fetch details (including DB status from host's perspective)
    if (suiteRes.ok) {
      try {
        const statusRes = await fetch(`${DEV_SUITE_URL}/api/status`);
        const statusData = await statusRes.json();
        
        if (statusData.database) {
          setDbStatus({
            name: 'Neon Postgres DB',
            url: statusData.database.host,
            status: statusData.database.status,
            latency: statusData.database.latency,
            error: statusData.database.error
          });
        }

        const analysisRes = await fetch(`${DEV_SUITE_URL}/api/analysis`);
        const analysisData = await analysisRes.json();

        setCodeStats({
          healthScore: analysisData.healthScore,
          totalFiles: analysisData.codebase.totalFiles,
          totalLines: analysisData.codebase.totalLines,
          todosCount: analysisData.codebase.todos.length,
          lintCount: analysisData.lint.count,
          tscCount: analysisData.tsc.count,
          todos: analysisData.codebase.todos,
          largeFilesCount: analysisData.codebase.largeFiles.length
        });
      } catch (err) {
        console.warn('Failed to load dev suite details:', err);
      }
    } else {
      // Fallback DB ping (TCP can't be easily done on react-native fetch, so set to offline or unknown)
      setDbStatus({
        name: 'Neon Postgres DB',
        url: 'Neon Cloud',
        status: 'offline',
        error: 'Dev-Suite Server offline (required to check Database state)'
      });
      setCodeStats(null);
    }
  };

  const loadData = async () => {
    await checkAllServices();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkAllServices();
    setRefreshing(false);
  };

  const triggerAction = async (action: string) => {
    if (devSuiteStatus.status !== 'online') return;
    try {
      await fetch(`${DEV_SUITE_URL}/api/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      // reload after triggering action
      setTimeout(checkAllServices, 1000);
    } catch (e) {
      console.warn('Action failed:', e);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ECEDEE" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Diagnostics</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Ionicons name="reload" size={20} color="#FF007A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF007A" />
        }
      >
        {/* Top Health Meter if connected */}
        {codeStats ? (
          <View style={styles.healthCard}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreText}>{codeStats.healthScore}</Text>
              <Text style={styles.scoreLabel}>Health</Text>
            </View>
            <View style={styles.healthTextContainer}>
              <Text style={styles.healthHeading}>Codebase Integrity</Text>
              <Text style={styles.healthSubheading}>
                {codeStats.healthScore >= 90
                  ? 'Excellent structure & type safety.'
                  : codeStats.healthScore >= 75
                  ? 'Good, but some warnings require attention.'
                  : 'Refactoring advised soon.'}
              </Text>
              <View style={styles.miniStatsRow}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatVal}>{codeStats.totalFiles}</Text>
                  <Text style={styles.miniStatLabel}>Files</Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatVal}>{(codeStats.totalLines / 1000).toFixed(1)}k</Text>
                  <Text style={styles.miniStatLabel}>LOC</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.offlineBanner}>
            <Ionicons name="warning-outline" size={24} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.offlineBannerTitle}>Dev-Suite Agent Offline</Text>
              <Text style={styles.offlineBannerText}>
                {"Run 'npm run dev-suite' in your workspace to enable local static code analysis and Neon DB status audits."}
              </Text>
            </View>
          </View>
        )}

        {/* Live Services Section */}
        <Text style={styles.sectionHeader}>LIVE ENVIRONMENT STATE</Text>
        
        {/* Metro Packager */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceTitleRow}>
              <View style={[styles.statusDot, metroStatus.status === 'online' ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.serviceName}>{metroStatus.name}</Text>
            </View>
            <Text style={styles.serviceLabel}>{metroStatus.status === 'online' ? 'ACTIVE' : 'OFFLINE'}</Text>
          </View>
          <Text style={styles.serviceUrl}>{metroStatus.url}</Text>
          {metroStatus.latency && <Text style={styles.serviceMeta}>Ping latency: {metroStatus.latency}ms</Text>}
        </View>

        {/* Backend API */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceTitleRow}>
              <View style={[styles.statusDot, backendStatus.status === 'online' ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.serviceName}>{backendStatus.name}</Text>
            </View>
            <Text style={styles.serviceLabel}>{backendStatus.status === 'online' ? 'ACTIVE' : 'OFFLINE'}</Text>
          </View>
          <Text style={styles.serviceUrl}>{backendStatus.url}</Text>
          {backendStatus.latency && <Text style={styles.serviceMeta}>Response time: {backendStatus.latency}ms</Text>}
        </View>

        {/* Neon Database */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceTitleRow}>
              <View style={[styles.statusDot, dbStatus.status === 'online' ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.serviceName}>{dbStatus.name}</Text>
            </View>
            <Text style={styles.serviceLabel}>{dbStatus.status === 'online' ? 'CONNECTED' : 'DISCONNECTED'}</Text>
          </View>
          <Text style={styles.serviceUrl} numberOfLines={1}>{dbStatus.url}</Text>
          {dbStatus.latency ? (
            <Text style={styles.serviceMeta}>Query response: {dbStatus.latency}ms</Text>
          ) : dbStatus.error ? (
            <Text style={[styles.serviceMeta, { color: '#EF4444' }]}>{dbStatus.error}</Text>
          ) : null}
        </View>

        {/* Dev Suite Agent */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceTitleRow}>
              <View style={[styles.statusDot, devSuiteStatus.status === 'online' ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.serviceName}>{devSuiteStatus.name}</Text>
            </View>
            <Text style={styles.serviceLabel}>{devSuiteStatus.status === 'online' ? 'RUNNING' : 'STOPPED'}</Text>
          </View>
          <Text style={styles.serviceUrl}>{devSuiteStatus.url}</Text>
          {devSuiteStatus.latency && <Text style={styles.serviceMeta}>Agent ping: {devSuiteStatus.latency}ms</Text>}
        </View>

        {/* Audit Details */}
        {codeStats && (
          <>
            <Text style={styles.sectionHeader}>CODE QUALITY LOGS</Text>
            <View style={styles.auditGrid}>
              <View style={styles.auditCard}>
                <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                <Text style={styles.auditVal}>{codeStats.lintCount}</Text>
                <Text style={styles.auditLabel}>Lint Warnings</Text>
              </View>
              <View style={styles.auditCard}>
                <Ionicons name="bug-outline" size={20} color="#EF4444" />
                <Text style={styles.auditVal}>{codeStats.tscCount}</Text>
                <Text style={styles.auditLabel}>TS Compiler Errors</Text>
              </View>
              <View style={styles.auditCard}>
                <Ionicons name="expand-outline" size={20} color="#06B6D4" />
                <Text style={styles.auditVal}>{codeStats.largeFilesCount}</Text>
                <Text style={styles.auditLabel}>Large Components</Text>
              </View>
              <View style={styles.auditCard}>
                <Ionicons name="checkbox-outline" size={20} color="#10B981" />
                <Text style={styles.auditVal}>{codeStats.todosCount}</Text>
                <Text style={styles.auditLabel}>Code TODOs</Text>
              </View>
            </View>
          </>
        )}

        {/* Quick Commands */}
        {devSuiteStatus.status === 'online' && (
          <>
            <Text style={styles.sectionHeader}>DEVELOPER ACTIONS</Text>
            <View style={styles.commandsContainer}>
              <TouchableOpacity style={styles.cmdBtn} onPress={() => triggerAction('restart-metro')}>
                <Ionicons name="refresh-circle-outline" size={22} color="#FF007A" />
                <Text style={styles.cmdBtnText}>Restart Metro Bundler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cmdBtn} onPress={() => triggerAction('lint')}>
                <Ionicons name="bug-outline" size={22} color="#FF007A" />
                <Text style={styles.cmdBtnText}>Trigger ESLint Run</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cmdBtn} onPress={() => triggerAction('tsc')}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#FF007A" />
                <Text style={styles.cmdBtnText}>Trigger Typechecker</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Code TODOs List */}
        {codeStats && codeStats.todos.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>ACTIVE CODE ANNOTATIONS ({codeStats.todosCount})</Text>
            <View style={styles.todosContainer}>
              {codeStats.todos.slice(0, 10).map((todo, idx) => (
                <View key={idx} style={styles.todoItem}>
                  <View style={styles.todoHeader}>
                    <Text style={styles.todoFile} numberOfLines={1}>
                      {todo.file}:{todo.line}
                    </Text>
                    <View style={styles.todoBadge}>
                      <Text style={styles.todoBadgeText}>{todo.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.todoText}>{todo.text}</Text>
                </View>
              ))}
              {codeStats.todos.length > 10 && (
                <Text style={styles.todoFooter}>+ {codeStats.todos.length - 10} more annotations. See full list in web dashboard.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
    backgroundColor: '#09090B',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#ECEDEE',
    fontSize: 18,
    fontWeight: '700',
  },
  refreshBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
    marginBottom: 24,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FF007A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF007A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreText: {
    color: '#ECEDEE',
    fontSize: 28,
    fontWeight: '800',
  },
  scoreLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  healthTextContainer: {
    flex: 1,
    marginLeft: 20,
  },
  healthHeading: {
    color: '#ECEDEE',
    fontSize: 18,
    fontWeight: '700',
  },
  healthSubheading: {
    color: '#9BA1A6',
    fontSize: 13,
    marginTop: 4,
  },
  miniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniStatVal: {
    color: '#FF007A',
    fontWeight: '700',
    fontSize: 13,
  },
  miniStatLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginLeft: 4,
  },
  miniStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#27272A',
    marginHorizontal: 12,
  },
  offlineBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  offlineBannerTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  offlineBannerText: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
    paddingLeft: 4,
  },
  serviceCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 16,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotOnline: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  dotOffline: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  serviceName: {
    color: '#ECEDEE',
    fontWeight: '700',
    fontSize: 15,
  },
  serviceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  serviceUrl: {
    color: '#9BA1A6',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  serviceMeta: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  auditGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  auditCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    width: '48%', // roughly half
    alignItems: 'center',
    gap: 6,
  },
  auditVal: {
    color: '#ECEDEE',
    fontSize: 22,
    fontWeight: '800',
  },
  auditLabel: {
    color: '#9BA1A6',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  commandsContainer: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 8,
    marginBottom: 20,
  },
  cmdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  cmdBtnText: {
    color: '#ECEDEE',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  todosContainer: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 16,
  },
  todoItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    paddingVertical: 12,
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  todoFile: {
    color: '#ECEDEE',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
    marginRight: 12,
  },
  todoBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  todoBadgeText: {
    color: '#06B6D4',
    fontSize: 9,
    fontWeight: '800',
  },
  todoText: {
    color: '#9BA1A6',
    fontSize: 13,
  },
  todoFooter: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
});
