// app/(tabs)/admin.tsx
import { Colors, ESTADO_META, Radius, Spacing } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, RefreshControl, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

interface Metrics {
  total_users: number; total_books: number;
  premium_users: number; verified: number;
  leidos: number; leyendo: number; pendiente: number;
}
interface ChartData { labels: string[]; users: number[]; books: number[]; }
interface UserRow {
  id: number; username: string; email: string; plan: string;
  is_admin: boolean; active: boolean; email_verified: boolean;
  total_books: number; total_wish: number; created: string;
}
interface BookRow {
  id: number; title: string; author: string; cover: string;
  estado: string; valoracion: number; categoria: string; ubicacion: string;
}
interface WishRow {
  id: number; title: string; author: string; cover: string; prioridad: string;
}

const PRIORIDAD_META: Record<string, string> = {
  alta: '#ffb450', media: Colors.accent, baja: '#64c878',
};

export default function AdminScreen() {
  const [tab, setTab]           = useState<'metrics'|'users'|'logs'>('metrics');
  const [metrics, setMetrics]   = useState<Metrics | null>(null);
  const [charts, setCharts]     = useState<ChartData | null>(null);
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [logs, setLogs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQ, setSearchQ]   = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [logPage, setLogPage]   = useState(1);
  const [logPages, setLogPages] = useState(1);

  // Vista detalle usuario
  const [detailUser, setDetailUser]     = useState<UserRow | null>(null);
  const [detailTab, setDetailTab]       = useState<'books'|'wish'>('books');
  const [detailBooks, setDetailBooks]   = useState<BookRow[]>([]);
  const [detailWish, setDetailWish]     = useState<WishRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user').then(u => {
      if (!u) { router.replace('/login'); return; }
      const user = JSON.parse(u);
      if (!user.is_admin) { router.replace('/(tabs)/buscar'); return; }
      loadAll();
    });
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadMetrics(), loadUsers(1), loadLogs(1)]);
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const loadMetrics = async () => {
    const { ok, data } = await apiFetch('/admin/metrics');
    if (ok) { setMetrics(data.data.metrics); setCharts(data.data.charts); }
  };

  const loadUsers = async (page = 1, q = searchQ) => {
    const { ok, data } = await apiFetch(`/admin/users?page=${page}&q=${encodeURIComponent(q)}`);
    if (ok) {
      setUsers(page === 1 ? data.data.users : prev => [...prev, ...data.data.users]);
      setUserPage(data.data.page);
      setUserPages(data.data.pages);
    }
  };

  const loadLogs = async (page = 1) => {
    const { ok, data } = await apiFetch(`/admin/logs?page=${page}`);
    if (ok) {
      setLogs(page === 1 ? data.data.logs : prev => [...prev, ...data.data.logs]);
      setLogPage(data.data.page);
      setLogPages(data.data.pages);
    }
  };

  const openUserDetail = async (user: UserRow) => {
    setDetailUser(user);
    setDetailTab('books');
    setLoadingDetail(true);
    const [booksRes, wishRes] = await Promise.all([
      apiFetch(`/admin/users/${user.id}/books`),
      apiFetch(`/admin/users/${user.id}/wishreads`),
    ]);
    if (booksRes.ok) setDetailBooks(booksRes.data.data.books);
    if (wishRes.ok)  setDetailWish(wishRes.data.data.wishreads);
    setLoadingDetail(false);
  };

  const toggleUser = async (user: UserRow) => {
    Alert.alert(
      user.active ? 'Desactivar usuario' : 'Activar usuario',
      `¿${user.active ? 'Desactivar' : 'Activar'} a ${user.username}?`,
      [{ text: 'Cancelar', style: 'cancel' },
       { text: 'Confirmar', onPress: async () => {
          const { ok } = await apiFetch(`/admin/users/${user.id}/toggle`, { method: 'POST' });
          if (ok) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
          else Alert.alert('Error', 'No se pudo cambiar el estado.');
       }}]
    );
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  // ── Vista detalle usuario ──────────────────────────────────────────────────
  if (detailUser) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setDetailUser(null)} style={s.backBtn}>
            <Text style={{ color: Colors.accent, fontWeight: '700' }}>← Volver</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>👤 {detailUser.username}</Text>
            <Text style={s.headerSub}>{detailUser.email} · {detailUser.plan}</Text>
          </View>
        </View>

        <View style={s.tabRow}>
          <TouchableOpacity style={[s.tabBtn, detailTab === 'books' && s.tabBtnActive]}
            onPress={() => setDetailTab('books')}>
            <Text style={[s.tabBtnText, detailTab === 'books' && { color: Colors.accent }]}>
              📚 Colección ({detailUser.total_books})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tabBtn, detailTab === 'wish' && s.tabBtnActive]}
            onPress={() => setDetailTab('wish')}>
            <Text style={[s.tabBtnText, detailTab === 'wish' && { color: Colors.accent }]}>
              ✨ Wishreads ({detailUser.total_wish})
            </Text>
          </TouchableOpacity>
        </View>

        {loadingDetail
          ? <View style={s.centered}><ActivityIndicator color={Colors.accent} /></View>
          : <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}>
              {detailTab === 'books' && (
                detailBooks.length === 0
                  ? <Text style={{ color: Colors.muted, textAlign: 'center', marginTop: 40 }}>Sin libros</Text>
                  : detailBooks.map(b => {
                      const meta = ESTADO_META[b.estado] || { color: Colors.muted, label: b.estado };
                      return (
                        <View key={b.id} style={s.detailCard}>
                          {b.cover
                            ? <Image source={{ uri: b.cover }} style={s.detailCover} />
                            : <View style={[s.detailCover, s.nocover]}><Text style={{ fontSize: 18 }}>📚</Text></View>}
                          <View style={{ flex: 1 }}>
                            <Text style={s.detailTitle} numberOfLines={2}>{b.title}</Text>
                            <Text style={s.detailAuthor}>{b.author}</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              <View style={[s.badge, { backgroundColor: meta.color + '22' }]}>
                                <Text style={[{ fontSize: 11, fontWeight: '600' }, { color: meta.color }]}>{meta.label}</Text>
                              </View>
                              {b.valoracion > 0 && <Text style={{ fontSize: 11 }}>{'⭐'.repeat(b.valoracion)}</Text>}
                              {b.categoria ? <Text style={s.detailMeta}>{b.categoria}</Text> : null}
                            </View>
                          </View>
                        </View>
                      );
                    })
              )}
              {detailTab === 'wish' && (
                detailWish.length === 0
                  ? <Text style={{ color: Colors.muted, textAlign: 'center', marginTop: 40 }}>Wishreads vacía</Text>
                  : detailWish.map(w => (
                      <View key={w.id} style={s.detailCard}>
                        {w.cover
                          ? <Image source={{ uri: w.cover }} style={s.detailCover} />
                          : <View style={[s.detailCover, s.nocover]}><Text style={{ fontSize: 18 }}>✨</Text></View>}
                        <View style={{ flex: 1 }}>
                          <Text style={s.detailTitle} numberOfLines={2}>{w.title}</Text>
                          <Text style={s.detailAuthor}>{w.author}</Text>
                          <View style={[s.badge, { backgroundColor: (PRIORIDAD_META[w.prioridad] || Colors.muted) + '22',
                            marginTop: 4, alignSelf: 'flex-start' }]}>
                            <Text style={{ fontSize: 11, fontWeight: '600',
                              color: PRIORIDAD_META[w.prioridad] || Colors.muted }}>{w.prioridad}</Text>
                          </View>
                        </View>
                      </View>
                    ))
              )}
            </ScrollView>
        }
      </SafeAreaView>
    );
  }

  // ── Vista principal admin ──────────────────────────────────────────────────
  const maxChart = charts ? Math.max(...charts.users, ...charts.books, 1) : 1;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>⚡ Admin</Text>
        {metrics && <Text style={s.headerSub}>{metrics.total_users} usuarios · {metrics.total_books} libros</Text>}
      </View>

      <View style={s.tabRow}>
        {(['metrics', 'users', 'logs'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabBtnText, tab === t && { color: Colors.accent }]}>
              {t === 'metrics' ? '📊 Métricas' : t === 'users' ? '👥 Usuarios' : '📋 Logs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}>

        {tab === 'metrics' && metrics && (
          <>
            <View style={s.grid}>
              <MetricBox value={metrics.total_users}   label="Usuarios"    color={Colors.accent} />
              <MetricBox value={metrics.total_books}   label="Libros"      color='#7aa2ff' />
              <MetricBox value={metrics.premium_users} label="Premium"     color={Colors.warning} />
              <MetricBox value={metrics.verified}      label="Verificados" color={Colors.success} />
              <MetricBox value={metrics.leidos}        label="Leídos"      color={Colors.success} />
              <MetricBox value={metrics.leyendo}       label="Leyendo"     color={Colors.accent} />
            </View>
            {charts && (
              <>
                <Card title="👤 Usuarios nuevos (14 días)">
                  <MiniBarChart labels={charts.labels} values={charts.users} color={Colors.accent} max={maxChart} />
                </Card>
                <Card title="📚 Libros añadidos (14 días)">
                  <MiniBarChart labels={charts.labels} values={charts.books} color={Colors.warning} max={maxChart} />
                </Card>
              </>
            )}
          </>
        )}

        {tab === 'users' && (
          <>
            <View style={s.searchRow}>
              <TextInput style={s.searchInput} placeholder="Buscar usuario o email..."
                placeholderTextColor={Colors.muted} value={searchQ} onChangeText={setSearchQ}
                onSubmitEditing={() => loadUsers(1)} returnKeyType="search" autoCapitalize="none" />
              <TouchableOpacity style={s.searchBtn} onPress={() => loadUsers(1)}>
                <Text style={{ color: Colors.bg, fontWeight: '800' }}>Buscar</Text>
              </TouchableOpacity>
            </View>

            {users.map(u => (
              <TouchableOpacity key={u.id} style={s.userCard} onPress={() => openUserDetail(u)} activeOpacity={0.75}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={s.userName}>{u.username}</Text>
                    {u.is_admin && <Badge label="admin" color={Colors.accent} />}
                    {u.plan !== 'free' && <Badge label="premium" color={Colors.warning} />}
                    {!u.active && <Badge label="inactivo" color={Colors.danger} />}
                  </View>
                  <Text style={s.userEmail}>{u.email}</Text>
                  <Text style={s.userMeta}>
                    📚 {u.total_books} libros · ✨ {u.total_wish} wishreads · {u.created}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Text style={{ color: Colors.muted, fontSize: 18 }}>›</Text>
                  {!u.is_admin && (
                    <TouchableOpacity
                      style={[s.toggleBtn, { borderColor: u.active ? Colors.danger + '44' : Colors.success + '44' }]}
                      onPress={() => toggleUser(u)}>
                      <Text style={{ fontSize: 11, fontWeight: '700',
                        color: u.active ? Colors.danger : Colors.success }}>
                        {u.active ? 'Desact.' : 'Activar'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {userPage < userPages && (
              <TouchableOpacity style={s.loadMoreBtn} onPress={() => loadUsers(userPage + 1)}>
                <Text style={s.loadMoreText}>Cargar más</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {tab === 'logs' && (
          <>
            {logs.map(l => (
              <View key={l.id} style={s.logRow}>
                <View style={[s.logDot, { backgroundColor: l.action.includes('login') ? Colors.success : Colors.muted }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.logAction}>{l.action}</Text>
                    <Text style={s.logTime}>{l.created}</Text>
                  </View>
                  <Text style={s.logUser}>{l.username}{l.country ? ` · ${l.country}` : ''}{l.ip ? ` · ${l.ip}` : ''}</Text>
                  {l.detail ? <Text style={s.logDetail}>{l.detail}</Text> : null}
                </View>
              </View>
            ))}
            {logPage < logPages && (
              <TouchableOpacity style={s.loadMoreBtn} onPress={() => loadLogs(logPage + 1)}>
                <Text style={s.loadMoreText}>Cargar más</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={cs.card}>
      <Text style={cs.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}
function MetricBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[cs.metricBox, { borderColor: color + '33' }]}>
      <Text style={[cs.metricVal, { color }]}>{value}</Text>
      <Text style={cs.metricLabel}>{label}</Text>
    </View>
  );
}
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[cs.badge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[cs.badgeText, { color }]}>{label}</Text>
    </View>
  );
}
function MiniBarChart({ labels, values, color, max }: { labels: string[]; values: number[]; color: string; max: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80, marginTop: 8 }}>
      {values.map((v, i) => {
        const h = v > 0 ? Math.max((v / max) * 70, 4) : 3;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            {v > 0 && <Text style={{ fontSize: 9, color: Colors.text, fontWeight: '700' }}>{v}</Text>}
            <View style={{ width: '100%', height: h, borderRadius: 3,
              backgroundColor: v > 0 ? color : 'rgba(255,255,255,0.06)' }} />
            {i % 2 === 0 && <Text style={{ fontSize: 9, color: Colors.muted }}>{labels[i]}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 8 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: Colors.text },
  headerSub:    { fontSize: 12, color: Colors.muted, marginTop: 2 },
  backBtn:      { paddingRight: 8 },
  tabRow:       { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 8, marginBottom: 4 },
  tabBtn:       { flex: 1, paddingVertical: 8, borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.accent + '16', borderColor: Colors.accent + '44' },
  tabBtnText:   { fontSize: 11, fontWeight: '700', color: Colors.muted },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  searchRow:    { flexDirection: 'row', gap: 10, marginBottom: 14 },
  searchInput:  { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border, color: Colors.text, padding: 11, fontSize: 14 },
  searchBtn:    { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  userCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
                  borderRadius: Radius.lg, padding: 12, marginBottom: 10,
                  borderWidth: 1, borderColor: Colors.border },
  userName:     { fontSize: 15, fontWeight: '700', color: Colors.text },
  userEmail:    { fontSize: 12, color: Colors.muted, marginTop: 2 },
  userMeta:     { fontSize: 11, color: Colors.muted, marginTop: 3 },
  toggleBtn:    { borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  logRow:       { flexDirection: 'row', gap: 10, paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: Colors.border },
  logDot:       { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  logAction:    { fontSize: 13, fontWeight: '700', color: Colors.text },
  logTime:      { fontSize: 12, color: Colors.muted },
  logUser:      { fontSize: 12, color: Colors.muted, marginTop: 2 },
  logDetail:    { fontSize: 11, color: Colors.muted, marginTop: 2, opacity: 0.7 },
  loadMoreBtn:  { padding: 14, alignItems: 'center', borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border, marginTop: 8 },
  loadMoreText: { color: Colors.accent, fontWeight: '700' },
  // Detalle usuario
  detailCard:   { flexDirection: 'row', gap: 12, backgroundColor: Colors.card,
                  borderRadius: Radius.lg, padding: 12, marginBottom: 10,
                  borderWidth: 1, borderColor: Colors.border },
  detailCover:  { width: 48, height: 70, borderRadius: 6 },
  nocover:      { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  detailTitle:  { fontSize: 14, fontWeight: '700', color: Colors.text },
  detailAuthor: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  detailMeta:   { fontSize: 11, color: Colors.muted },
  badge:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
});

const cs = StyleSheet.create({
  card:        { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1,
                 borderColor: Colors.border, padding: Spacing.md, marginBottom: 14 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  metricBox:   { width: '47%', backgroundColor: 'rgba(255,255,255,0.03)',
                 borderRadius: Radius.md, borderWidth: 1, padding: 14, alignItems: 'center' },
  metricVal:   { fontSize: 28, fontWeight: '900' },
  metricLabel: { fontSize: 12, color: Colors.muted, marginTop: 3 },
  badge:       { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:   { fontSize: 10, fontWeight: '700' },
});
