// app/(tabs)/wishreads.tsx
// ─── Wishreads completo ──────────────────────────────────────────────────────
// Paridad con wishreads.html:
//   • Buscar libros (Google Books vía API)
//   • Añadir con prioridad (alta/media/baja)
//   • Lista filtrada por prioridad
//   • Modal con editar prioridad, recomendado_por, notas
//   • Botón "Ya lo tengo" → mueve a colección
//   • Botón Amazon con affiliate tag
//   • Eliminar
//   • Pull-to-refresh

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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
  id: number;
  title: string;
  author: string;
  cover: string;
  category: string;
  language: string;
  year: string;
  description: string;
  prioridad: string;
  recomendado_por: string;
  notas: string;
}

interface SearchResult {
  titulo: string;
  autor: string;
  portada_url: string;
  anio_publicacion: string;
  descripcion: string;
  idioma: string;
  categorias: string[];
}

export default function WishreadsScreen() {
  const [items, setItems]         = useState<WishItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro]       = useState('todas');

  // Búsqueda
  const [query, setQuery]         = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [addingId, setAddingId]   = useState<number | null>(null); // índice del resultado añadiéndose
  const [resultPrioridad, setResultPrioridad] = useState<Record<number, string>>({});

  // Modal
  const [selected, setSelected]   = useState<WishItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editPrioridad, setEditPrioridad]     = useState('media');
  const [editRec, setEditRec]                 = useState('');
  const [editNotas, setEditNotas]             = useState('');
  const [saving, setSaving]       = useState(false);
  const [moving, setMoving]       = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;

  // ── Carga ─────────────────────────────────────────────────────────────────
  const loadWishreads = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) { router.replace('/'); return; }
    const { ok, data } = await api.getWishreads();
    if (ok) setItems(data.data?.wishreads || []);
    else if (data?.message === 'Sesión expirada') router.replace('/');
  }, []);

  useEffect(() => {
    loadWishreads().finally(() => setLoading(false));
  }, [loadWishreads]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWishreads();
    setRefreshing(false);
  }, [loadWishreads]);

  // ── Filtro local ──────────────────────────────────────────────────────────
  const filtered = filtro === 'todas'
    ? items
    : items.filter(i => i.prioridad === filtro);

  // ── Buscar libros ─────────────────────────────────────────────────────────
  const buscar = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setResults([]);
    const { ok, data } = await api.search(q);
    setSearching(false);
    if (ok) {
      setResults(data.data?.results || []);
    } else {
      Alert.alert('Error', 'No se pudo buscar. Inténtalo de nuevo.');
    }
  };

  // ── Añadir a wishreads ────────────────────────────────────────────────────
  const añadir = async (item: SearchResult, idx: number) => {
    const prioridad = resultPrioridad[idx] || 'media';
    setAddingId(idx);
    const { ok, data } = await api.addWishread({
      title:       item.titulo,
      author:      item.autor,
      cover:       item.portada_url,
      year:        item.anio_publicacion,
      description: item.descripcion,
      language:    item.idioma,
      category:    item.categorias?.[0] || '',
      prioridad,
    });
    setAddingId(null);
    if (ok) {
      await loadWishreads();
      setResults([]);
      setQuery('');
    } else {
      Alert.alert('Error', data?.message || 'No se pudo añadir.');
    }
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openModal = (item: WishItem) => {
    setSelected(item);
    setEditPrioridad(item.prioridad || 'media');
    setEditRec(item.recomendado_por || '');
    setEditNotas(item.notas || '');
    setModalVisible(true);
    Animated.spring(modalAnim, {
      toValue: 1, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => { setModalVisible(false); setSelected(null); });
  };

  const guardar = async () => {
    if (!selected) return;
    setSaving(true);
    const { ok, data } = await api.updateWishread(selected.id, {
      prioridad:       editPrioridad,
      recomendado_por: editRec,
      notas:           editNotas,
    });
    setSaving(false);
    if (ok) {
      setItems(prev => prev.map(i =>
        i.id === selected.id
          ? { ...i, prioridad: editPrioridad, recomendado_por: editRec, notas: editNotas }
          : i
      ));
      closeModal();
    } else {
      Alert.alert('Error', data?.message || 'No se pudo guardar.');
    }
  };

  const moverAColeccion = () => {
    if (!selected) return;
    Alert.alert(
      '¿Mover a tu colección?',
      `"${selected.title}" pasará a Mi Colección.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          onPress: async () => {
            setMoving(true);
            const { ok, data } = await api.updateWishread(selected.id, {}); // dummy call
            // Llamada real al endpoint move
            const { ok: ok2, data: data2 } = await apiFetchDirect(`/wishreads/${selected.id}/move`);
            setMoving(false);
            if (ok2) {
              setItems(prev => prev.filter(i => i.id !== selected.id));
              closeModal();
              Alert.alert('¡Listo!', 'Libro añadido a tu colección.');
            } else {
              Alert.alert('Error', data2?.message || 'No se pudo mover.');
            }
          },
        },
      ]
    );
  };

  const eliminar = () => {
    if (!selected) return;
    Alert.alert(
      'Eliminar de Wishreads',
      `¿Eliminar "${selected.title}" de tu lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { ok } = await api.deleteWishread(selected.id);
            if (ok) {
              setItems(prev => prev.filter(i => i.id !== selected.id));
              closeModal();
            } else {
              Alert.alert('Error', 'No se pudo eliminar.');
            }
          },
        },
      ]
    );
  };

  const abrirAmazon = (title: string, author: string) => {
    const q = encodeURIComponent(`${title} ${author}`.trim());
    Linking.openURL(`https://www.amazon.es/s?k=${q}&tag=${AMAZON_TAG}`);
  };

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: WishItem }) => {
    const meta = PRIORIDAD_META[item.prioridad] || PRIORIDAD_META.media;
    return (
      <TouchableOpacity style={s.card} onPress={() => openModal(item)} activeOpacity={0.75}>
        {item.cover ? (
          <Image source={{ uri: item.cover }} style={s.cover} />
        ) : (
          <View style={[s.cover, s.coverPlaceholder]}>
            <Text style={{ fontSize: 24 }}>✨</Text>
          </View>
        )}
        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.cardAuthor} numberOfLines={1}>{item.author || 'Autor desconocido'}</Text>
          <View style={s.cardMeta}>
            <View style={[s.prioBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
              <Text style={[s.prioBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.recomendado_por ? (
              <Text style={s.recText}>👤 {item.recomendado_por}</Text>
            ) : null}
          </View>
          {item.notas ? (
            <Text style={s.notasText} numberOfLines={2}>{item.notas}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={s.amazonBtn}
          onPress={() => abrirAmazon(item.title, item.author)}
        >
          <Text style={s.amazonBtnText}>🛒</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
        stickyHeaderIndices={[0]}
      >
        {/* Header sticky */}
        <View style={s.stickyHeader}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.pageTitle}>✨ Wishreads</Text>
              <Text style={s.pageSubtitle}>{items.length} libros en tu lista</Text>
            </View>
          </View>
        </View>

        {/* Buscador */}
        <View style={s.searchBox}>
          <Text style={s.searchBoxTitle}>🔍 Añadir libro</Text>
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              placeholder="Buscar título o autor..."
              placeholderTextColor={Colors.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={buscar}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.searchBtn} onPress={buscar} disabled={searching}>
              {searching
                ? <ActivityIndicator size="small" color={Colors.bg} />
                : <Text style={s.searchBtnText}>Buscar</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Resultados de búsqueda */}
          {results.length > 0 && (
            <View style={s.resultsWrap}>
              {results.map((r, idx) => (
                <View key={idx} style={s.resultRow}>
                  {r.portada_url ? (
                    <Image source={{ uri: r.portada_url }} style={s.resultCover} />
                  ) : (
                    <View style={[s.resultCover, s.coverPlaceholder]}>
                      <Text style={{ fontSize: 16 }}>📚</Text>
                    </View>
                  )}
                  <View style={s.resultInfo}>
                    <Text style={s.resultTitle} numberOfLines={2}>{r.titulo}</Text>
                    <Text style={s.resultAuthor}>{r.autor || 'Autor desconocido'}</Text>
                    {r.anio_publicacion ? <Text style={s.resultYear}>{r.anio_publicacion}</Text> : null}
                  </View>
                  <View style={s.resultActions}>
                    {/* Selector de prioridad inline */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {['alta', 'media', 'baja'].map(p => {
                          const active = (resultPrioridad[idx] || 'media') === p;
                          const m = PRIORIDAD_META[p];
                          return (
                            <TouchableOpacity
                              key={p}
                              onPress={() => setResultPrioridad(prev => ({ ...prev, [idx]: p }))}
                              style={[
                                s.miniPrioBtn,
                                active && { backgroundColor: m.color + '22', borderColor: m.color + '55' },
                              ]}
                            >
                              <Text style={[s.miniPrioBtnText, active && { color: m.color }]}>
                                {p === 'alta' ? '🔥' : p === 'media' ? '◉' : '·'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                    <TouchableOpacity
                      style={[s.addBtn, addingId === idx && { opacity: 0.5 }]}
                      onPress={() => añadir(r, idx)}
                      disabled={addingId === idx}
                    >
                      {addingId === idx
                        ? <ActivityIndicator size="small" color={Colors.bg} />
                        : <Text style={s.addBtnText}>+ Añadir</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Filtros de prioridad */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtrosRow}
        >
          {FILTROS.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[s.filtroChip, filtro === f.value && s.filtroChipActive]}
              onPress={() => setFiltro(f.value)}
            >
              <Text style={[s.filtroChipText, filtro === f.value && s.filtroChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.countText}>
          {filtered.length} {filtered.length === 1 ? 'libro' : 'libros'}
        </Text>

        {/* Lista */}
        {filtered.length === 0 ? (
          <View style={[s.centered, { marginTop: 60 }]}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
            <Text style={{ color: Colors.muted, fontSize: 16, textAlign: 'center', paddingHorizontal: 40 }}>
              {items.length === 0
                ? 'Tu Wishreads está vacía.\nBusca un libro arriba para añadirlo.'
                : 'No hay libros con esta prioridad.'}
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {filtered.map(item => renderItem({ item }))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal} statusBarTranslucent>
        <Pressable style={s.overlay} onPress={closeModal}>
          <Animated.View
            style={[s.modalCard, {
              opacity: modalAnim,
              transform: [{ translateY: modalAnim.interpolate({ inputRange: [0,1], outputRange: [60,0] }) }],
            }]}
          >
            <Pressable onPress={e => e.stopPropagation()}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">

                {/* Cabecera */}
                <View style={s.modalHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle} numberOfLines={2}>{selected?.title}</Text>
                    <Text style={s.modalAuthor}>{selected?.author}</Text>
                  </View>
                  <TouchableOpacity onPress={closeModal} style={s.closeBtn}>
                    <Text style={{ color: Colors.muted, fontSize: 18 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Portada + meta */}
                <View style={s.modalTopRow}>
                  {selected?.cover ? (
                    <Image source={{ uri: selected.cover }} style={s.modalCover} />
                  ) : (
                    <View style={[s.modalCover, s.coverPlaceholder]}>
                      <Text style={{ fontSize: 36 }}>✨</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 6 }}>
                    {selected?.year     ? <MiniInfo icon="📅" label={selected.year} /> : null}
                    {selected?.category ? <MiniInfo icon="🏷" label={selected.category} /> : null}
                    {selected?.language ? <MiniInfo icon="🌐" label={selected.language.toUpperCase()} /> : null}
                  </View>
                </View>

                {selected?.description ? (
                  <Text style={s.modalDesc} numberOfLines={4}>{selected.description}</Text>
                ) : null}

                <View style={s.divider} />

                {/* Prioridad */}
                <Text style={s.sectionLabel}>Prioridad</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {(['alta', 'media', 'baja'] as const).map(p => {
                    const m = PRIORIDAD_META[p];
                    const active = editPrioridad === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setEditPrioridad(p)}
                        style={[s.prioBtn, active && { backgroundColor: m.color + '22', borderColor: m.color + '55' }]}
                      >
                        <Text style={[s.prioBtnText, active && { color: m.color }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Recomendado por */}
                <Text style={s.sectionLabel}>Recomendado por</Text>
                <TextInput
                  style={s.fieldInput}
                  value={editRec}
                  onChangeText={setEditRec}
                  placeholder="¿Quién te lo recomendó?"
                  placeholderTextColor={Colors.muted}
                />

                {/* Notas */}
                <Text style={s.sectionLabel}>Notas personales</Text>
                <TextInput
                  style={[s.fieldInput, s.textarea]}
                  value={editNotas}
                  onChangeText={setEditNotas}
                  placeholder="Por qué quieres leerlo, qué te dijeron..."
                  placeholderTextColor={Colors.muted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Acciones */}
                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={guardar}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color={Colors.bg} />
                    : <Text style={s.saveBtnText}>Guardar cambios</Text>
                  }
                </TouchableOpacity>

                {/* Botón Amazon */}
                <TouchableOpacity
                  style={s.amazonModalBtn}
                  onPress={() => selected && abrirAmazon(selected.title, selected.author)}
                >
                  <Text style={s.amazonModalBtnText}>🛒 Ver en Amazon</Text>
                </TouchableOpacity>

                {/* Ya lo tengo */}
                <TouchableOpacity
                  style={[s.moveBtn, moving && { opacity: 0.6 }]}
                  onPress={moverAColeccion}
                  disabled={moving}
                >
                  {moving
                    ? <ActivityIndicator color={Colors.accent} />
                    : <Text style={s.moveBtnText}>📚 Ya lo tengo → Mover a colección</Text>
                  }
                </TouchableOpacity>

                {/* Eliminar */}
                <TouchableOpacity style={s.deleteBtn} onPress={eliminar}>
                  <Text style={s.deleteBtnText}>🗑 Eliminar de Wishreads</Text>
                </TouchableOpacity>

              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helper move (usa apiFetch directamente para el endpoint /move) ────────────
async function apiFetchDirect(path: string) {
  const { apiFetch } = require('@/lib/api');
  return apiFetch(path, { method: 'POST' });
}

function MiniInfo({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 13 }}>{icon}</Text>
      <Text style={{ fontSize: 13, color: Colors.muted }}>{label}</Text>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  centered:   { justifyContent: 'center', alignItems: 'center' },

  stickyHeader: { backgroundColor: Colors.bg, paddingBottom: 4 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between',
                  alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: Colors.text },
  pageSubtitle: { fontSize: 13, color: Colors.muted, marginTop: 2 },

  // Buscador
  searchBox:      { margin: Spacing.lg, marginTop: 12, backgroundColor: Colors.accent + '0d',
                    borderRadius: Radius.lg, borderWidth: 1,
                    borderColor: Colors.accent + '26', padding: Spacing.md },
  searchBoxTitle: { fontSize: 14, fontWeight: '700', color: Colors.accent, marginBottom: 12 },
  searchRow:      { flexDirection: 'row', gap: 8 },
  searchInput:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
                    color: Colors.text, padding: 11, fontSize: 14 },
  searchBtn:      { backgroundColor: Colors.accent, borderRadius: Radius.md,
                    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  searchBtnText:  { color: Colors.bg, fontWeight: '800', fontSize: 14 },

  // Resultados
  resultsWrap:    { marginTop: 12, gap: 8 },
  resultRow:      { flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 10 },
  resultCover:    { width: 40, height: 58, borderRadius: 6 },
  resultInfo:     { flex: 1, minWidth: 0 },
  resultTitle:    { fontSize: 13, fontWeight: '700', color: Colors.text },
  resultAuthor:   { fontSize: 12, color: Colors.muted, marginTop: 2 },
  resultYear:     { fontSize: 11, color: Colors.muted, opacity: 0.6, marginTop: 2 },
  resultActions:  { gap: 6, alignItems: 'flex-end' },
  miniPrioBtn:    { padding: 5, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  miniPrioBtnText:{ fontSize: 13 },
  addBtn:         { backgroundColor: Colors.accent + 'cc', borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText:     { color: Colors.bg, fontSize: 12, fontWeight: '700' },

  // Filtros
  filtrosRow:     { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 12 },
  filtroChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
                    borderWidth: 1, borderColor: Colors.border },
  filtroChipActive:    { backgroundColor: Colors.accent + '22', borderColor: Colors.accent + '55' },
  filtroChipText:      { color: Colors.muted, fontSize: 13, fontWeight: '600' },
  filtroChipTextActive:{ color: Colors.accent },
  countText:      { color: Colors.muted, fontSize: 13, paddingHorizontal: Spacing.lg, marginBottom: 8 },

  // Lista
  list:       { paddingHorizontal: Spacing.lg, gap: 10 },
  card:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.card,
                borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border },
  cover:      { width: 56, height: 80, borderRadius: 10 },
  coverPlaceholder: { backgroundColor: 'rgba(255,255,255,0.05)',
                      justifyContent: 'center', alignItems: 'center' },
  cardBody:   { flex: 1, marginLeft: 12, gap: 4 },
  cardTitle:  { fontSize: 15, fontWeight: '800', color: Colors.text },
  cardAuthor: { fontSize: 13, color: Colors.muted },
  cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  prioBadge:  { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  prioBadgeText: { fontSize: 11, fontWeight: '700' },
  recText:    { fontSize: 11, color: Colors.muted },
  notasText:  { fontSize: 12, color: Colors.muted, lineHeight: 18, marginTop: 4 },
  amazonBtn:  { padding: 8, justifyContent: 'center' },
  amazonBtnText: { fontSize: 20 },

  // Modal
  overlay:    { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard:  { backgroundColor: Colors.card, borderTopLeftRadius: Radius.xl,
                borderTopRightRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border,
                maxHeight: '92%', padding: Spacing.lg },
  modalHead:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.text },
  modalAuthor:{ fontSize: 14, color: Colors.muted, marginTop: 4 },
  closeBtn:   { padding: 8, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  modalTopRow:{ flexDirection: 'row', gap: 14, marginBottom: 14 },
  modalCover: { width: 90, height: 134, borderRadius: Radius.md },
  modalDesc:  { color: Colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  divider:    { height: 1, backgroundColor: Colors.border, marginBottom: 20 },
  sectionLabel:{ fontSize: 12, fontWeight: '700', color: Colors.muted,
                 textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  fieldInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                borderWidth: 1, borderColor: Colors.border,
                color: Colors.text, padding: 12, fontSize: 14, marginBottom: 14 },
  textarea:   { minHeight: 80, paddingTop: 12 },
  prioBtn:    { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.full,
                borderWidth: 1, borderColor: Colors.border },
  prioBtnText:{ color: Colors.muted, fontSize: 14, fontWeight: '600' },

  saveBtn:       { backgroundColor: Colors.accent, borderRadius: Radius.md,
                   padding: 15, alignItems: 'center', marginTop: 4, marginBottom: 10 },
  saveBtnText:   { color: Colors.bg, fontSize: 16, fontWeight: '800' },
  amazonModalBtn:{ backgroundColor: '#FF990022', borderRadius: Radius.md, borderWidth: 1,
                   borderColor: '#FF990044', padding: 13, alignItems: 'center', marginBottom: 10 },
  amazonModalBtnText: { color: '#FF9900', fontSize: 14, fontWeight: '700' },
  moveBtn:       { backgroundColor: Colors.accent + '11', borderRadius: Radius.md, borderWidth: 1,
                   borderColor: Colors.accent + '33', padding: 13, alignItems: 'center', marginBottom: 10 },
  moveBtnText:   { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  deleteBtn:     { padding: 13, alignItems: 'center' },
  deleteBtnText: { color: Colors.danger, fontSize: 14 },
});
