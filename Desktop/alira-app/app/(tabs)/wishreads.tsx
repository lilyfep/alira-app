// app/(tabs)/wishreads.tsx
// Sin modal — al pulsar un libro navega a /wish/[id]

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Linking,
  RefreshControl, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const AMAZON_TAG = 'alirabooks-21';

const PRIORIDAD_META: Record<string, { color: string; label: string }> = {
  alta:  { color: '#ffb450', label: '🔥 Alta' },
  media: { color: Colors.accent, label: '◉ Media' },
  baja:  { color: '#64c878', label: '· Baja' },
};

const FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'alta',  label: '🔥 Alta' },
  { value: 'media', label: '◉ Media' },
  { value: 'baja',  label: '· Baja' },
];

interface WishItem {
  id: number; title: string; author: string; cover: string;
  prioridad: string; recomendado_por: string; notas: string;
  category: string; year: string;
}

interface SearchResult {
  titulo: string; autor: string; portada_url: string;
  anio_publicacion: string; descripcion: string; idioma: string; categorias: string[];
}

export default function WishreadsScreen() {
  const [items, setItems]           = useState<WishItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro]         = useState('todas');
  const [query, setQuery]           = useState('');
  const [searching, setSearching]   = useState(false);
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [addingId, setAddingId]     = useState<number | null>(null);
  const [resultPrioridad, setResultPrioridad] = useState<Record<number, string>>({});

  const loadWishreads = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) { router.replace('/login'); return; }
    const { ok, data } = await api.getWishreads();
    if (ok) setItems(data.data?.wishreads || []);
    else if (data?.message === 'Sesión expirada') router.replace('/login');
  }, []);

  useEffect(() => { loadWishreads().finally(() => setLoading(false)); }, [loadWishreads]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWishreads();
    setRefreshing(false);
  }, [loadWishreads]);

  const filtered = filtro === 'todas' ? items : items.filter(i => i.prioridad === filtro);

  const buscar = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setResults([]);
    const { ok, data } = await api.search(q);
    setSearching(false);
    if (ok) setResults(data.data?.results || []);
    else Alert.alert('Error', 'No se pudo buscar.');
  };

  const añadir = async (item: SearchResult, idx: number) => {
    const prioridad = resultPrioridad[idx] || 'media';
    setAddingId(idx);
    const { ok, data } = await api.addWishread({
      title: item.titulo, author: item.autor, cover: item.portada_url,
      year: item.anio_publicacion, description: item.descripcion,
      language: item.idioma, category: item.categorias?.[0] || '', prioridad,
    });
    setAddingId(null);
    if (ok) { await loadWishreads(); setResults([]); setQuery(''); }
    else Alert.alert('Error', data?.message || 'No se pudo añadir.');
  };

  const renderItem = ({ item }: { item: WishItem }) => {
    const meta = PRIORIDAD_META[item.prioridad] || PRIORIDAD_META.media;
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => router.push(`/wish/${item.id}`)}
        activeOpacity={0.75}
      >
        {item.cover
          ? <Image source={{ uri: item.cover }} style={s.cover} />
          : <View style={[s.cover, s.nocover]}><Text style={{ fontSize: 24 }}>✨</Text></View>}
        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.cardAuthor} numberOfLines={1}>{item.author || 'Autor desconocido'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <View style={[s.prioBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
              <Text style={[s.prioBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.recomendado_por ? <Text style={s.recText}>👤 {item.recomendado_por}</Text> : null}
          </View>
          {item.notas ? <Text style={s.notasText} numberOfLines={1}>{item.notas}</Text> : null}
        </View>
        {/* Amazon naranja */}
        <TouchableOpacity style={s.amazonCardBtn}
          onPress={() => {
            const q = encodeURIComponent(`${item.title} ${item.author}`.trim());
            Linking.openURL(`https://www.amazon.es/s?k=${q}&tag=${AMAZON_TAG}`);
          }}>
          <Text style={{ fontSize: 16 }}>🛒</Text>
          <Text style={s.amazonCardText}>Amazon</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.pageTitle}>✨ Wishreads</Text>
        <Text style={s.pageSub}>{items.length} libros en tu lista</Text>
      </View>

      {/* Buscador */}
      <View style={s.searchBox}>
        <Text style={s.searchBoxTitle}>+ Añadir libro a tu wishlist</Text>
        <View style={s.searchRow}>
          <TextInput style={s.searchInput} placeholder="Título, autor o ISBN..."
            placeholderTextColor={Colors.muted} value={query} onChangeText={setQuery}
            onSubmitEditing={buscar} returnKeyType="search" autoCapitalize="none" autoCorrect={false} />
          <TouchableOpacity style={s.searchBtn} onPress={buscar} disabled={searching}>
            {searching ? <ActivityIndicator size="small" color={Colors.bg} />
              : <Text style={s.searchBtnText}>Buscar</Text>}
          </TouchableOpacity>
        </View>

        {results.length > 0 && (
          <View style={s.resultsWrap}>
            {results.map((r, idx) => (
              <View key={idx} style={s.resultRow}>
                {r.portada_url
                  ? <Image source={{ uri: r.portada_url }} style={s.resultCover} />
                  : <View style={[s.resultCover, s.nocover]}><Text>📚</Text></View>}
                <View style={s.resultInfo}>
                  <Text style={s.resultTitle} numberOfLines={2}>{r.titulo}</Text>
                  <Text style={s.resultAuthor}>{r.autor || 'Autor desconocido'}</Text>
                </View>
                <View style={s.resultActions}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {['alta', 'media', 'baja'].map(p => {
                      const active = (resultPrioridad[idx] || 'media') === p;
                      const m = PRIORIDAD_META[p];
                      return (
                        <TouchableOpacity key={p}
                          onPress={() => setResultPrioridad(prev => ({ ...prev, [idx]: p }))}
                          style={[s.miniPrioBtn, active && { backgroundColor: m.color + '22', borderColor: m.color + '55' }]}>
                          <Text style={{ fontSize: 13 }}>{p === 'alta' ? '🔥' : p === 'media' ? '◉' : '·'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity style={[s.addBtn, addingId === idx && { opacity: 0.5 }]}
                    onPress={() => añadir(r, idx)} disabled={addingId === idx}>
                    {addingId === idx ? <ActivityIndicator size="small" color={Colors.bg} />
                      : <Text style={s.addBtnText}>+ Añadir</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtrosRow} style={{ flexGrow: 0 }}>
        {FILTROS.map(f => (
          <TouchableOpacity key={f.value}
            style={[s.chip, filtro === f.value && s.chipActive]}
            onPress={() => setFiltro(f.value)}>
            <Text style={[s.chipText, filtro === f.value && { color: Colors.accent }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.countText}>{filtered.length} {filtered.length === 1 ? 'libro' : 'libros'}</Text>

      {filtered.length === 0
        ? <View style={[s.centered, { flex: 1 }]}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
            <Text style={{ color: Colors.muted, fontSize: 16, textAlign: 'center', paddingHorizontal: 40 }}>
              {items.length === 0 ? 'Tu Wishreads está vacía.\nBusca un libro arriba.' : 'Sin libros con esta prioridad.'}
            </Text>
          </View>
        : <FlatList
            data={filtered}
            keyExtractor={i => i.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={8}
          />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  centered:     { justifyContent: 'center', alignItems: 'center' },
  header:       { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 8 },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: Colors.text },
  pageSub:      { fontSize: 13, color: Colors.muted, marginTop: 2 },
  searchBox:    { marginHorizontal: Spacing.lg, marginBottom: 12, backgroundColor: Colors.accent + '0d',
                  borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.accent + '26', padding: Spacing.md },
  searchBoxTitle:{ fontSize: 14, fontWeight: '700', color: Colors.accent, marginBottom: 10 },
  searchRow:    { flexDirection: 'row', gap: 8 },
  searchInput:  { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border, color: Colors.text, padding: 11, fontSize: 14 },
  searchBtn:    { backgroundColor: Colors.accent, borderRadius: Radius.md,
                  paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  searchBtnText:{ color: Colors.bg, fontWeight: '800', fontSize: 14 },
  resultsWrap:  { marginTop: 12, gap: 8 },
  resultRow:    { flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border, padding: 10 },
  resultCover:  { width: 40, height: 58, borderRadius: 6 },
  resultInfo:   { flex: 1, minWidth: 0 },
  resultTitle:  { fontSize: 13, fontWeight: '700', color: Colors.text },
  resultAuthor: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  resultActions:{ gap: 6, alignItems: 'flex-end' },
  miniPrioBtn:  { padding: 5, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  addBtn:       { backgroundColor: Colors.accent + 'cc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText:   { color: Colors.bg, fontSize: 12, fontWeight: '700' },
  filtrosRow:   { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 10 },
  chip:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
                  borderWidth: 1, borderColor: Colors.border },
  chipActive:   { backgroundColor: Colors.accent + '22', borderColor: Colors.accent + '55' },
  chipText:     { color: Colors.muted, fontSize: 13, fontWeight: '600' },
  countText:    { color: Colors.muted, fontSize: 12, paddingHorizontal: Spacing.lg, marginBottom: 8 },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
                  borderRadius: Radius.lg, padding: 12, marginBottom: 10,
                  borderWidth: 1, borderColor: Colors.border },
  cover:        { width: 52, height: 76, borderRadius: 8 },
  nocover:      { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  cardBody:     { flex: 1, marginLeft: 10, gap: 3 },
  cardTitle:    { fontSize: 14, fontWeight: '800', color: Colors.text },
  cardAuthor:   { fontSize: 12, color: Colors.muted },
  prioBadge:    { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  prioBadgeText:{ fontSize: 11, fontWeight: '700' },
  recText:      { fontSize: 11, color: Colors.muted },
  notasText:    { fontSize: 11, color: Colors.muted, marginTop: 2 },
  amazonCardBtn:{ alignItems: 'center', justifyContent: 'center', marginLeft: 8,
                  backgroundColor: '#FF990022', borderRadius: Radius.md,
                  borderWidth: 1, borderColor: '#FF990055', paddingHorizontal: 8, paddingVertical: 6 },
  amazonCardText:{ fontSize: 10, fontWeight: '700', color: '#FF9900', marginTop: 2 },
});
