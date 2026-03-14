import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const API_URL = 'https://web-production-cfc01.up.railway.app/api/v1';

export default function BibliotecaScreen() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userStr = await AsyncStorage.getItem('user');
      if (!token) { router.replace('/'); return; }
      if (userStr) setUser(JSON.parse(userStr));

      const res = await fetch(`${API_URL}/books/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBooks(data.data?.books || data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/');
  };

  const getEstadoColor = (estado: string) => {
    if (estado === 'leido') return '#22c55e';
    if (estado === 'leyendo') return '#4B4FE8';
    if (estado === 'pendiente') return '#f59e0b';
    return '#6b7280';
  };

  const getEstadoLabel = (estado: string) => {
    if (estado === 'leido') return '✓ Leído';
    if (estado === 'leyendo') return '📖 Leyendo';
    if (estado === 'pendiente') return '⏳ Pendiente';
    return estado;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4B4FE8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mi biblioteca</Text>
          {user && <Text style={styles.headerSub}>{user.username}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{books.length} libros</Text>
      </View>

      {/* Lista */}
      {books.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No tienes libros todavía</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item: any) => item.id?.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <View style={styles.bookCard}>
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.cover} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Text style={styles.coverEmoji}>📚</Text>
                </View>
              )}
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) + '22' }]}>
                  <Text style={[styles.estadoText, { color: getEstadoColor(item.estado) }]}>
                    {getEstadoLabel(item.estado)}
                  </Text>
                </View>
                {item.rating > 0 && (
                  <Text style={styles.rating}>{'⭐'.repeat(item.rating)}</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d1117' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  logoutBtn: { backgroundColor: '#161b22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: '#6b7280', fontSize: 13 },
  statsRow: { paddingHorizontal: 20, marginBottom: 8 },
  statsText: { color: '#6b7280', fontSize: 13 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  bookCard: { flexDirection: 'row', backgroundColor: '#161b22', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#21262d' },
  cover: { width: 56, height: 80, borderRadius: 6 },
  coverPlaceholder: { width: 56, height: 80, borderRadius: 6, backgroundColor: '#21262d', justifyContent: 'center', alignItems: 'center' },
  coverEmoji: { fontSize: 24 },
  bookInfo: { flex: 1, marginLeft: 12, justifyContent: 'center', gap: 4 },
  bookTitle: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  bookAuthor: { fontSize: 13, color: '#6b7280' },
  estadoBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  estadoText: { fontSize: 12, fontWeight: '500' },
  rating: { fontSize: 12, marginTop: 2 },
  emptyText: { color: '#6b7280', fontSize: 16 },
});