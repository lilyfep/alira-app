// app/(tabs)/wishreads.tsx
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, apiFetch } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Image, Linking, Modal,
  Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet,
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
  category: string; language: string; year: string; description: string;
  prioridad: string; recomendado_por: string; notas: string;
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
  const [selected, setSelected]     = useState<WishItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editPrioridad, setEditPrioridad] = useState('media');
  const [editRec, setEditRec]       = useState('');
  const [editNotas, setEditNotas]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [moving, setMoving]         = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;

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

  const openModal = (item: WishItem) => {
    setSelected(item);
    setEditPrioridad(item.prioridad || 'media');
    setEditRec(item.recomendado_por || '');
    setEditNotas(item.notas || '');
    setModalVisible(true);
    Animated.spring(modalAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => { setModalVisible(false); setSelected(null); });
  };

  const guardar = async () => {
    if (!selected) return;
    setSaving(true);
    const { ok, data } = await api.updateWishread(selected.id, {
      prioridad: editPrioridad, recomendado_por: editRec, notas: editNotas,
    });
    setSaving(false);
    if (ok) {
      setItems(prev => prev.map(i => i.id === selected.id
        ? { ...i, prioridad: editPrioridad, recomendado_por: editRec, notas: editNotas } : i));
      closeModal();
    } else Alert.alert('Error', data?.message || 'No se pudo guardar.');
  };

  const moverAColeccion = () => {
    if (!selected) return;
    Alert.alert('¿Mover a tu colección?', `"${selected.title}" pasará a Mi Colección.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Mover', onPress: async () => {
        setMoving(true);
        const { ok, data } = await apiFetch(`/wishreads/${selected.id}/move`, { method: 'POST' });
        setMoving(false);
        if (ok) { setItems(prev => prev.filter(i => i.id !== selected.id)); closeModal(); Alert.alert('¡Listo!', 'Libro añadido a tu colección.'); }
        else Alert.alert('Error', data?.message || 'No se pudo mover.');
      }},
    ]);
  };

  const eliminar = () => {
    if (!selected) return;
    Alert.alert('Eliminar de Wishreads', `¿Eliminar "${selected.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const { ok } = await api.deleteWishread(selected.id);
        if (ok) { setItems(prev => prev.filter(i => i.id !== selected.id)); closeModal(); }
        else Alert.alert('Error', 'No se pudo eliminar.');
      }},
    ]);
  };

  const abrirAmazon = (title: string, author: string) => {
    const q = encodeURIComponent(`${title} ${author}`.trim());
    Linking.openURL(`https://www.amazon.es/s?k=${q}&tag=${AMAZON_TAG}`);
  };

  const renderItem = (item: WishItem) => {
    const meta = PRIORIDAD_META[item.prioridad] || PRIORIDAD_META.media;
    return (
      <TouchableOpacity key={item.id} style={s.card} onPress={() => openModal(item)} activeOpacity={0.75}>
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
        {/* Botón Amazon naranja visible */}
        <TouchableOpacity style={s.amazonCardBtn} onPress={() => abrirAmazon(item.title, item.author)}>
          <Text style={s.amazonCardIcon}>🛒</Text>
          <Text style={s.amazonCardText}>Amazon</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        stickyHeaderIndices={[0]}>

        {/* Header */}
        <View style={s.stickyHeader}>
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
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {UBICACION_OPTIONS.map(o => (
            <TouchableOpacity key={o.value}
              style={[s.chip, editUbicacion === o.value && s.chipActive]}
              onPress={() => setEditUbicacion(o.value)}>
              <Text style={[s.chipText, editUbicacion === o.value && { color: Colors.accent }]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.countText}>{filtered.length} {filtered.length === 1 ? 'libro' : 'libros'}</Text>

        {filtered.length === 0
          ? <View style={[s.centered, { marginTop: 60 }]}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
              <Text style={{ color: Colors.muted, fontSize: 16, textAlign: 'center', paddingHorizontal: 40 }}>
                {items.length === 0 ? 'Tu Wishreads está vacía.\nBusca un libro arriba.' : 'Sin libros con esta prioridad.'}
              </Text>
            </View>
          : <View style={s.list}>{filtered.map(item => renderItem(item))}</View>}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal} statusBarTranslucent>
        <Pressable style={s.overlay} onPress={closeModal}>
          <Animated.View style={[s.modalCard, {
            opacity: modalAnim,
            transform: [{ translateY: modalAnim.interpolate({ inputRange:[0,1], outputRange:[60,0] }) }],
          }]}>
            <Pressable onPress={e => e.stopPropagation()}>
              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
                keyboardShouldPersistTaps="handled"
                bounces={true}
                nestedScrollEnabled={true}>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mTitle} numberOfLines={2}>{selected?.title}</Text>
                    <Text style={s.mAuthor}>{selected?.author}</Text>
                  </View>
                  <TouchableOpacity onPress={closeModal}
                    style={{ padding: 8, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border }}>
                    <Text style={{ color: Colors.muted }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  {selected?.cover
                    ? <Image source={{ uri: selected.cover }} style={s.mCover} />
                    : <View style={[s.mCover, s.nocover]}><Text style={{ fontSize: 32 }}>✨</Text></View>}
                  <View style={{ flex: 1, gap: 5 }}>
                    {selected?.year     ? <MRow icon="📅" label={selected.year} /> : null}
                    {selected?.category ? <MRow icon="🏷" label={selected.category} /> : null}
                    {selected?.language ? <MRow icon="🌐" label={selected.language.toUpperCase()} /> : null}
                  </View>
                </View>

                {selected?.description
                  ? <Text style={{ color: Colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 }}
                      numberOfLines={3}>{selected.description}</Text>
                  : null}

                <View style={{ height: 1, backgroundColor: Colors.border, marginBottom: 18 }} />

                <Text style={s.sLabel}>Prioridad</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {(['alta', 'media', 'baja'] as const).map(p => {
                    const m = PRIORIDAD_META[p];
                    const active = editPrioridad === p;
                    return (
                      <TouchableOpacity key={p}
                        style={[s.chip, active && { backgroundColor: m.color + '22', borderColor: m.color + '55' }]}
                        onPress={() => setEditPrioridad(p)}>
                        <Text style={[s.chipText, active && { color: m.color }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.sLabel}>Recomendado por</Text>
                <TextInput style={s.fInput} value={editRec} onChangeText={setEditRec}
                  placeholder="¿Quién te lo recomendó?" placeholderTextColor={Colors.muted} />

                <Text style={s.sLabel}>Notas personales</Text>
                <TextInput style={[s.fInput, { minHeight: 80, paddingTop: 11 }]}
                  value={editNotas} onChangeText={setEditNotas}
                  placeholder="Por qué quieres leerlo..." placeholderTextColor={Colors.muted}
                  multiline numberOfLines={4} textAlignVertical="top" />

                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={guardar} disabled={saving}>
                  {saving ? <ActivityIndicator color={Colors.bg} />
                    : <Text style={s.saveBtnText}>Guardar cambios</Text>}
                </TouchableOpacity>

                {/* Amazon naranja */}
                <TouchableOpacity style={s.amazonModalBtn}
                  onPress={() => selected && abrirAmazon(selected.title, selected.author)}>
                  <Text style={s.amazonModalBtnText}>🛒 Ver en Amazon</Text>
                </TouchableOpacity>

                {/* Mover a colección */}
                <TouchableOpacity style={[s.moveBtn, moving && { opacity: 0.6 }]}
                  onPress={moverAColeccion} disabled={moving}>
                  {moving ? <ActivityIndicator color={Colors.accent} />
                    : <Text style={s.moveBtnText}>📚 Ya lo tengo → Mover a colección</Text>}
                </TouchableOpacity>

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

function MRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 13 }}>{icon}</Text>
      <Text style={{ fontSize: 13, color: Colors.muted }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  centered:     { justifyContent: 'center', alignItems: 'center' },
  stickyHeader: { backgroundColor: Colors.bg, paddingHorizontal: Spacing.lg,
                  paddingTop: Spacing.md, paddingBottom: 8 },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: Colors.text },
  pageSub:      { fontSize: 13, color: Colors.muted, marginTop: 2 },

  searchBox:      { margin: Spacing.lg, marginTop: 8, backgroundColor: Colors.accent + '0d',
                    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.accent + '26', padding: Spacing.md },
  searchBoxTitle: { fontSize: 14, fontWeight: '700', color: Colors.accent, marginBottom: 10 },
  searchRow:      { flexDirection: 'row', gap: 8 },
  searchInput:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: Radius.md,
                    borderWidth: 1, borderColor: Colors.border, color: Colors.text, padding: 11, fontSize: 14 },
  searchBtn:      { backgroundColor: Colors.accent, borderRadius: Radius.md,
                    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  searchBtnText:  { color: Colors.bg, fontWeight: '800', fontSize: 14 },

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

  list:         { paddingHorizontal: Spacing.lg, gap: 10 },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
                  borderRadius: Radius.lg, padding: 12, borderWidth: 1, borderColor: Colors.border },
  cover:        { width: 52, height: 76, borderRadius: 8 },
  nocover:      { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  cardBody:     { flex: 1, marginLeft: 10, gap: 3 },
  cardTitle:    { fontSize: 14, fontWeight: '800', color: Colors.text },
  cardAuthor:   { fontSize: 12, color: Colors.muted },
  prioBadge:    { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  prioBadgeText:{ fontSize: 11, fontWeight: '700' },
  recText:      { fontSize: 11, color: Colors.muted },
  notasText:    { fontSize: 11, color: Colors.muted, marginTop: 2 },

  // Botón Amazon naranja visible en la card
  amazonCardBtn:  { alignItems: 'center', justifyContent: 'center', marginLeft: 8,
                    backgroundColor: '#FF990022', borderRadius: Radius.md,
                    borderWidth: 1, borderColor: '#FF990055',
                    paddingHorizontal: 8, paddingVertical: 6 },
  amazonCardIcon: { fontSize: 16 },
  amazonCardText: { fontSize: 10, fontWeight: '700', color: '#FF9900', marginTop: 2 },

  overlay:    { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard:  { backgroundColor: Colors.card, borderTopLeftRadius: Radius.xl,
                borderTopRightRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border,
                maxHeight: '92%', padding: Spacing.lg },
  mTitle:     { fontSize: 17, fontWeight: '900', color: Colors.text },
  mAuthor:    { fontSize: 13, color: Colors.muted, marginTop: 3 },
  mCover:     { width: 80, height: 118, borderRadius: Radius.md },
  sLabel:     { fontSize: 11, fontWeight: '700', color: Colors.muted,
                textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  fInput:     { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                borderWidth: 1, borderColor: Colors.border,
                color: Colors.text, padding: 11, fontSize: 14, marginBottom: 14 },
  saveBtn:    { backgroundColor: Colors.accent, borderRadius: Radius.md,
                padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText:{ color: Colors.bg, fontSize: 15, fontWeight: '800' },
  amazonModalBtn:    { backgroundColor: '#FF990022', borderRadius: Radius.md, borderWidth: 1,
                       borderColor: '#FF9900', padding: 13, alignItems: 'center', marginBottom: 10 },
  amazonModalBtnText:{ color: '#FF9900', fontSize: 14, fontWeight: '800' },
  moveBtn:    { backgroundColor: Colors.accent + '11', borderRadius: Radius.md, borderWidth: 1,
                borderColor: Colors.accent + '33', padding: 13, alignItems: 'center', marginBottom: 10 },
  moveBtnText:{ color: Colors.accent, fontSize: 14, fontWeight: '700' },
  deleteBtn:  { padding: 13, alignItems: 'center' },
  deleteBtnText: { color: Colors.danger, fontSize: 14 },
});
