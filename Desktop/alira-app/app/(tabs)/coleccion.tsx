// app/(tabs)/coleccion.tsx
// Sin modal — al pulsar un libro navega a /libro/[id]

import { Colors, ESTADO_META, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList, Image, Linking,
  RefreshControl, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

interface Book {
  id: number; title: string; author: string; cover: string;
  estado: string; valoracion: number; ubicacion: string; prestado_a: string;
}

const ESTADOS_FILTER = [
  { value: 'todos',     label: 'Todos' },
  { value: 'leyendo',   label: '📖 Leyendo' },
  { value: 'leido',     label: '✓ Leídos' },
  { value: 'pendiente', label: '⏳ Pend.' },
];

export default function ColeccionScreen() {
  const [books, setBooks]           = useState<Book[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('todos');
  const [search, setSearch]         = useState('');

  const loadBooks = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) { router.replace('/login'); return; }
    const { ok, data } = await api.getBooks();
    if (ok) setBooks(data.data?.books || []);
    else if (data?.message === 'Sesión expirada') router.replace('/login');
  }, []);

  useEffect(() => { loadBooks().finally(() => setLoading(false)); }, [loadBooks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  }, [loadBooks]);

  const exportar = () => {
    Alert.alert('Exportar colección', 'Se abrirá tu navegador para descargar el Excel.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Exportar', onPress: () => Linking.openURL('https://www.aliraspace.com/export.xlsx') },
    ]);
  };

  const filtered = books.filter(b => {
    const matchEstado = filter === 'todos' || b.estado === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || b.title.toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q);
    return matchEstado && matchSearch;
  });

  const stats = {
    leidos:    books.filter(b => b.estado === 'leido').length,
    leyendo:   books.filter(b => b.estado === 'leyendo').length,
    pendiente: books.filter(b => b.estado === 'pendiente').length,
  };

  const renderBook = ({ item }: { item: Book }) => {
    const meta = ESTADO_META[item.estado] || { color: Colors.muted, label: item.estado };
    return (
      <TouchableOpacity
        style={s.bookCard}
        onPress={() => router.push(`/libro/${item.id}`)}
        activeOpacity={0.75}
      >
        {item.cover
          ? <Image source={{ uri: item.cover }} style={s.cover} />
          : <View style={[s.cover, s.nocover]}><Text style={{ fontSize: 22 }}>📚</Text></View>}
        <View style={s.bookInfo}>
          <Text style={s.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.bookAuthor} numberOfLines={1}>{item.author}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <View style={[s.badge, { backgroundColor: meta.color + '22' }]}>
              <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.valoracion > 0 && <Text style={{ fontSize: 11 }}>{'⭐'.repeat(item.valoracion)}</Text>}
          </View>
          {item.ubicacion === 'prestado' && item.prestado_a
            ? <Text style={{ fontSize: 11, color: '#ffd466', marginTop: 2 }}>🤝 {item.prestado_a}</Text>
            : null}
        </View>
        <Text style={{ color: Colors.muted, fontSize: 22, paddingLeft: 8 }}>›</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>📚 Mi Colección</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Chip label={`${stats.leidos} leídos`}   color={Colors.success} />
            <Chip label={`${stats.leyendo} leyendo`} color={Colors.accent} />
            <Chip label={`${stats.pendiente} pend.`} color={Colors.warning} />
          </View>
        </View>
        <TouchableOpacity style={s.exportBtn} onPress={exportar}>
          <Text style={s.exportBtnText}>⬇ Excel</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={s.searchWrap}>
        <Text style={{ paddingLeft: 12, fontSize: 14 }}>🔍</Text>
        <TextInput style={s.searchInput} placeholder="Buscar en tu colección..."
          placeholderTextColor={Colors.muted} value={search} onChangeText={setSearch}
          autoCorrect={false} autoCapitalize="none" />
        {search.length > 0 &&
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: Colors.muted, fontSize: 16, paddingRight: 10 }}>✕</Text>
          </TouchableOpacity>}
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersRow} style={{ flexGrow: 0 }}>
        {ESTADOS_FILTER.map(f => (
          <TouchableOpacity key={f.value}
            style={[s.chip, filter === f.value && s.chipActive]}
            onPress={() => setFilter(f.value)}>
            <Text style={[s.chipText, filter === f.value && { color: Colors.accent }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.countText}>
        {filtered.length} {filtered.length === 1 ? 'libro' : 'libros'}
        {filter !== 'todos' || search ? ' encontrados' : ' en total'}
      </Text>

      {filtered.length === 0
        ? <View style={s.centered}>
            <Text style={{ fontSize: 44, marginBottom: 10 }}>📖</Text>
            <Text style={{ color: Colors.muted }}>Sin resultados</Text>
          </View>
        : <FlatList
            data={filtered}
            keyExtractor={i => i.id.toString()}
            renderItem={renderBook}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={8}
            getItemLayout={(_, index) => ({ length: 108, offset: 108 * index, index })}
          />}
    </SafeAreaView>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3,
      backgroundColor: color + '1a', borderColor: color + '40' }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
                  paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 8 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: Colors.text },
  exportBtn:    { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1,
                  borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  exportBtnText:{ color: Colors.muted, fontSize: 13, fontWeight: '600' },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg,
                  backgroundColor: Colors.card, borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  searchInput:  { flex: 1, color: Colors.text, fontSize: 14, padding: 11 },
  filtersRow:   { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 10, paddingTop: 2 },
  chip:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
                  borderWidth: 1, borderColor: Colors.border },
  chipActive:   { backgroundColor: Colors.accent + '22', borderColor: Colors.accent + '55' },
  chipText:     { color: Colors.muted, fontSize: 13, fontWeight: '600' },
  countText:    { color: Colors.muted, fontSize: 12, paddingHorizontal: Spacing.lg, marginBottom: 8 },
  bookCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
                  borderRadius: Radius.lg, padding: 12, marginBottom: 10,
                  borderWidth: 1, borderColor: Colors.border },
  cover:        { width: 58, height: 84, borderRadius: Radius.sm },
  nocover:      { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  bookInfo:     { flex: 1, marginLeft: 12, gap: 3 },
  bookTitle:    { fontSize: 15, fontWeight: '700', color: Colors.text },
  bookAuthor:   { fontSize: 13, color: Colors.muted },
  badge:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:    { fontSize: 12, fontWeight: '600' },
});
