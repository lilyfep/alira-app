// app/(tabs)/coleccion.tsx
// Filtros avanzados: estado, categoría, idioma, ubicación

import { Colors, ESTADO_META, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Linking,
  Modal, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

interface Book {
  id: number; title: string; author: string; cover: string;
  estado: string; valoracion: number; ubicacion: string; prestado_a: string;
  category: string; language: string;
}

const ESTADOS_FILTER = [
  { value: '',          label: 'Todos' },
  { value: 'leyendo',   label: '📖 Leyendo' },
  { value: 'leido',     label: '✓ Leídos' },
  { value: 'pendiente', label: '⏳ Pendientes' },
];

const UBICACIONES = [
  { value: '',           label: 'Todas' },
  { value: 'estanteria', label: '🏠 Estantería' },
  { value: 'prestado',   label: '🤝 Prestado' },
  { value: 'digital',    label: '📱 Digital' },
  { value: 'vendido',    label: '💰 Vendido' },
  { value: 'perdido',    label: '🔍 Perdido' },
];

export default function ColeccionScreen() {
  const [books, setBooks]           = useState<Book[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [search, setSearch]         = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [filterUbic, setFilterUbic] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [vista, setVista] = useState<'lista'|'grid'>('lista');

  const loadBooks = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) { router.replace('/login'); return; }
    const { ok, data } = await api.getBooks();
    if (ok) setBooks(data.data?.books || []);
    else if (data?.message === 'Sesión expirada') router.replace('/login');
  }, []);

  useEffect(() => { loadBooks().finally(() => setLoading(false)); }, [loadBooks]);
  useEffect(() => {
    AsyncStorage.getItem('vista_coleccion').then(v => {
      if (v === 'grid' || v === 'lista') setVista(v as 'grid'|'lista');
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  }, [loadBooks]);

  // Opciones dinámicas de categoría e idioma
  const categories = [...new Set(books.map(b => b.category).filter(Boolean))].sort();
  const languages  = [...new Set(books.map(b => b.language).filter(Boolean))].sort();

  const activeFilters = [filterEstado, filterCat, filterLang, filterUbic].filter(Boolean).length;

  const resetFilters = () => {
    setFilterEstado(''); setFilterCat(''); setFilterLang(''); setFilterUbic('');
  };

  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    if (q && !b.title.toLowerCase().includes(q) && !(b.author||'').toLowerCase().includes(q)) return false;
    if (filterEstado && b.estado !== filterEstado) return false;
    if (filterCat  && b.category !== filterCat) return false;
    if (filterLang && b.language !== filterLang) return false;
    if (filterUbic && b.ubicacion !== filterUbic) return false;
    return true;
  });

  const stats = {
    leidos:    books.filter(b => b.estado === 'leido').length,
    leyendo:   books.filter(b => b.estado === 'leyendo').length,
    pendiente: books.filter(b => b.estado === 'pendiente').length,
  };

  const toggleVista = async () => {
    const nueva = vista === 'lista' ? 'grid' : 'lista';
    setVista(nueva);
    await AsyncStorage.setItem('vista_coleccion', nueva);
  };

  const exportar = () => {
    Alert.alert('Exportar colección', 'Se abrirá tu navegador para descargar el Excel.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Exportar', onPress: () => Linking.openURL('https://www.aliraspace.com/export.xlsx') },
    ]);
  };

  const renderBook = ({ item }: { item: Book }) => {
    const meta = ESTADO_META[item.estado] || { color: Colors.muted, label: item.estado };
    return (
      <TouchableOpacity style={s.bookCard}
        onPress={() => router.push(`/libro/${item.id}`)} activeOpacity={0.75}>
        {item.cover
          ? <Image source={{ uri: item.cover }} style={s.cover} />
          : <View style={[s.cover, s.nocover]}><Text style={{ fontSize: 22 }}>📚</Text></View>}
        <View style={s.bookInfo}>
          <Text style={s.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.bookAuthor} numberOfLines={1}>{item.author}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            <View style={[s.badge, { backgroundColor: meta.color + '22' }]}>
              <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.valoracion > 0 && <Text style={{ fontSize: 11 }}>{'⭐'.repeat(item.valoracion)}</Text>}
            {item.category ? <Text style={s.catTag}>{item.category}</Text> : null}
          </View>
          {item.ubicacion === 'prestado' && item.prestado_a
            ? <Text style={{ fontSize: 11, color: '#ffd466', marginTop: 2 }}>🤝 {item.prestado_a}</Text>
            : null}
        </View>
        <Text style={{ color: Colors.muted, fontSize: 22, paddingLeft: 8 }}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderBookGrid = ({ item }: { item: Book }) => {
    const meta = ESTADO_META[item.estado] || { color: Colors.muted, label: item.estado };
    return (
      <TouchableOpacity style={s.gridCard}
        onPress={() => router.push(`/libro/${item.id}`)} activeOpacity={0.75}>
        {item.cover
          ? <Image source={{ uri: item.cover }} style={s.gridCover} />
          : <View style={[s.gridCover, s.nocover]}><Text style={{ fontSize: 28 }}>📚</Text></View>}
        <View style={[s.gridDot, { backgroundColor: meta.color }]} />
        <Text style={s.gridTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={s.gridAuthor} numberOfLines={1}>{item.author}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;

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
        <TouchableOpacity
          style={{ paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' }}
          onPress={toggleVista}>
          <Text style={{ fontSize: 22, color: Colors.text, opacity: 0.8 }}>
            {vista === 'lista' ? '⊞' : '☰'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.exportBtn} onPress={exportar}>
          <Text style={s.exportBtnText}>⬇ Excel</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador + botón filtros */}
      <View style={s.searchRow}>
        <View style={s.searchWrap}>
          <Text style={{ paddingLeft: 12, fontSize: 14 }}>🔍</Text>
          <TextInput style={s.searchInput} placeholder="Buscar título o autor..."
            placeholderTextColor={Colors.muted} value={search} onChangeText={setSearch}
            autoCorrect={false} autoCapitalize="none" />
          {search.length > 0 &&
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: Colors.muted, fontSize: 16, paddingRight: 10 }}>✕</Text>
            </TouchableOpacity>}
        </View>
        <TouchableOpacity
          style={[s.filterBtn, activeFilters > 0 && s.filterBtnActive]}
          onPress={() => setShowFilters(true)}>
          <Text style={{ fontSize: 16 }}>⚙️</Text>
          {activeFilters > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filtros rápidos de estado */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersRow} style={{ flexGrow: 0 }}>
        {ESTADOS_FILTER.map(f => (
          <TouchableOpacity key={f.value}
            style={[s.chip, filterEstado === f.value && s.chipActive]}
            onPress={() => setFilterEstado(f.value)}>
            <Text style={[s.chipText, filterEstado === f.value && { color: Colors.accent }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.countText}>
        {filtered.length} {filtered.length === 1 ? 'libro' : 'libros'}
        {activeFilters > 0 || search ? ' encontrados' : ' en total'}
        {activeFilters > 0 && (
          <Text onPress={resetFilters} style={{ color: Colors.accent }}> · Limpiar filtros</Text>
        )}
      </Text>

      {filtered.length === 0
        ? <View style={s.centered}>
            <Text style={{ fontSize: 44, marginBottom: 10 }}>📖</Text>
            <Text style={{ color: Colors.muted }}>Sin resultados</Text>
            {activeFilters > 0 && (
              <TouchableOpacity onPress={resetFilters} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.accent, fontWeight: '700' }}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        : <FlatList
            data={filtered}
            keyExtractor={i => i.id.toString()}
            renderItem={vista === 'lista' ? renderBook : renderBookGrid}
            numColumns={vista === 'grid' ? 2 : 1}
            key={vista}
            columnWrapperStyle={vista === 'grid' ? { gap: 10, paddingHorizontal: Spacing.lg } : undefined}
            contentContainerStyle={{ paddingHorizontal: vista === 'lista' ? Spacing.lg : 0, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={8}
            getItemLayout={(_, index) => ({ length: 108, offset: 108 * index, index })}
          />}

      {/* ── Panel de filtros avanzados ── */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <Pressable style={s.filterOverlay} onPress={() => setShowFilters(false)}>
          <Pressable style={s.filterPanel} onPress={e => e.stopPropagation()}>
            <View style={s.filterPanelHead}>
              <Text style={s.filterPanelTitle}>Filtros</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={{ color: Colors.accent, fontWeight: '700', fontSize: 14 }}>Limpiar todo</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Categoría */}
              {categories.length > 0 && (
                <>
                  <Text style={s.filterSLabel}>Categoría</Text>
                  <View style={s.filterChips}>
                    <TouchableOpacity
                      style={[s.chip, filterCat === '' && s.chipActive]}
                      onPress={() => setFilterCat('')}>
                      <Text style={[s.chipText, filterCat === '' && { color: Colors.accent }]}>Todas</Text>
                    </TouchableOpacity>
                    {categories.map(c => (
                      <TouchableOpacity key={c}
                        style={[s.chip, filterCat === c && s.chipActive]}
                        onPress={() => setFilterCat(c)}>
                        <Text style={[s.chipText, filterCat === c && { color: Colors.accent }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Idioma */}
              {languages.length > 0 && (
                <>
                  <Text style={s.filterSLabel}>Idioma</Text>
                  <View style={s.filterChips}>
                    <TouchableOpacity
                      style={[s.chip, filterLang === '' && s.chipActive]}
                      onPress={() => setFilterLang('')}>
                      <Text style={[s.chipText, filterLang === '' && { color: Colors.accent }]}>Todos</Text>
                    </TouchableOpacity>
                    {languages.map(l => (
                      <TouchableOpacity key={l}
                        style={[s.chip, filterLang === l && s.chipActive]}
                        onPress={() => setFilterLang(l)}>
                        <Text style={[s.chipText, filterLang === l && { color: Colors.accent }]}>{l.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Ubicación */}
              <Text style={s.filterSLabel}>Ubicación</Text>
              <View style={s.filterChips}>
                {UBICACIONES.map(u => (
                  <TouchableOpacity key={u.value}
                    style={[s.chip, filterUbic === u.value && s.chipActive]}
                    onPress={() => setFilterUbic(u.value)}>
                    <Text style={[s.chipText, filterUbic === u.value && { color: Colors.accent }]}>{u.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

            </ScrollView>

            <TouchableOpacity style={s.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={s.applyBtnText}>
                Ver {filtered.length} {filtered.length === 1 ? 'libro' : 'libros'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  container:     { flex: 1, backgroundColor: Colors.bg },
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
                   paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 8 },
  headerTitle:   { fontSize: 22, fontWeight: '800', color: Colors.text },
  exportBtn:     { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1,
                   borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  exportBtnText: { color: Colors.muted, fontSize: 13, fontWeight: '600' },

  searchRow:     { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, marginBottom: 10 },
  searchWrap:    { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
                   borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  searchInput:   { flex: 1, color: Colors.text, fontSize: 14, padding: 11 },
  filterBtn:     { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1,
                   borderColor: Colors.border, width: 46, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive:{ borderColor: Colors.accent + '66', backgroundColor: Colors.accent + '11' },
  filterBadge:   { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.accent,
                   borderRadius: 99, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText:{ color: Colors.bg, fontSize: 10, fontWeight: '800' },

  filtersRow:    { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 10, paddingTop: 2 },
  chip:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
                   borderWidth: 1, borderColor: Colors.border },
  chipActive:    { backgroundColor: Colors.accent + '22', borderColor: Colors.accent + '55' },
  chipText:      { color: Colors.muted, fontSize: 13, fontWeight: '600' },
  countText:     { color: Colors.muted, fontSize: 12, paddingHorizontal: Spacing.lg, marginBottom: 8 },

  vistaBtn:   { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1,
                borderColor: Colors.border, width: 42, alignItems: 'center', justifyContent: 'center' },
  gridCard:   { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg,
                borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: 'hidden' },
  gridCover:  { width: '100%', height: 180 },
  gridDot:    { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5 },
  gridTitle:  { fontSize: 12, fontWeight: '700', color: Colors.text, padding: 8, paddingBottom: 2 },
  gridAuthor: { fontSize: 11, color: Colors.muted, paddingHorizontal: 8, paddingBottom: 8 },

  bookCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
                   borderRadius: Radius.lg, padding: 12, marginBottom: 10,
                   borderWidth: 1, borderColor: Colors.border },
  cover:         { width: 58, height: 84, borderRadius: Radius.sm },
  nocover:       { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  bookInfo:      { flex: 1, marginLeft: 12, gap: 3 },
  bookTitle:     { fontSize: 15, fontWeight: '700', color: Colors.text },
  bookAuthor:    { fontSize: 13, color: Colors.muted },
  badge:         { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:     { fontSize: 12, fontWeight: '600' },
  catTag:        { fontSize: 11, color: Colors.muted, backgroundColor: 'rgba(255,255,255,0.06)',
                   borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },

  // Panel filtros
  filterOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  filterPanel:   { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                   borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
                   maxHeight: '75%' },
  filterPanelHead:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterPanelTitle:{ fontSize: 18, fontWeight: '800', color: Colors.text },
  filterSLabel:  { fontSize: 11, fontWeight: '700', color: Colors.muted,
                   textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  filterChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  applyBtn:      { backgroundColor: Colors.accent, borderRadius: Radius.md,
                   padding: 15, alignItems: 'center', marginTop: 8 },
  applyBtnText:  { color: Colors.bg, fontSize: 16, fontWeight: '800' },
});
