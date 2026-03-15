// app/(tabs)/coleccion.tsx
import { Colors, ESTADO_META, PRIORIDAD_OPTIONS, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Image, Linking, Modal,
  Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const AMAZON_TAG = 'alirabooks-21';

interface Book {
  id: number; title: string; author: string; cover: string;
  category: string; language: string; year: string; description: string;
  estado: string; prioridad: string; valoracion: number; comentarios: string;
  leido: boolean; lo_tengo: boolean; ubicacion: string; prestado_a: string;
  baja: string; alta: string; fecha_inicio: string; fecha_fin: string;
  fecha_prestamo: string; precio_venta: number; fecha_venta: string;
}

const ESTADOS_FILTER = [
  { value: 'todos',     label: 'Todos' },
  { value: 'leyendo',   label: '📖 Leyendo' },
  { value: 'leido',     label: '✓ Leídos' },
  { value: 'pendiente', label: '⏳ Pend.' },
];

const ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'leyendo',   label: 'Leyendo' },
  { value: 'leido',     label: 'Leído' },
];

const UBICACION_OPTIONS = [
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
  const [filter, setFilter]         = useState('todos');
  const [search, setSearch]         = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving]         = useState(false);

  const [editEstado,        setEditEstado]        = useState('');
  const [editPrioridad,     setEditPrioridad]     = useState('');
  const [editValoracion,    setEditValoracion]    = useState(0);
  const [editComentarios,   setEditComentarios]   = useState('');
  const [editUbicacion,     setEditUbicacion]     = useState('');
  const [editPrestadoA,     setEditPrestadoA]     = useState('');
  const [editFechaPrestamo, setEditFechaPrestamo] = useState('');
  const [editFechaInicio,   setEditFechaInicio]   = useState('');
  const [editFechaFin,      setEditFechaFin]      = useState('');
  const [editPrecioVenta,   setEditPrecioVenta]   = useState('');
  const [editFechaVenta,    setEditFechaVenta]    = useState('');

  const modalAnim = useRef(new Animated.Value(0)).current;

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
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    return matchEstado && matchSearch;
  });

  const stats = {
    leidos:    books.filter(b => b.estado === 'leido').length,
    leyendo:   books.filter(b => b.estado === 'leyendo').length,
    pendiente: books.filter(b => b.estado === 'pendiente').length,
  };

  const openModal = (book: Book) => {
    setSelectedBook(book);
    setEditEstado(book.estado || 'pendiente');
    setEditPrioridad(book.prioridad || '');
    setEditValoracion(book.valoracion || 0);
    setEditComentarios(book.comentarios || '');
    setEditUbicacion(book.ubicacion || 'estanteria');
    setEditPrestadoA(book.prestado_a || '');
    setEditFechaPrestamo(book.fecha_prestamo || '');
    setEditFechaInicio(book.fecha_inicio || '');
    setEditFechaFin(book.fecha_fin || '');
    setEditPrecioVenta(book.precio_venta ? String(book.precio_venta) : '');
    setEditFechaVenta(book.fecha_venta || '');
    setModalVisible(true);
    Animated.spring(modalAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => { setModalVisible(false); setSelectedBook(null); });
  };

  const saveBook = async () => {
    if (!selectedBook) return;
    setSaving(true);
    const payload: Record<string, any> = {
      estado: editEstado, prioridad: editPrioridad, valoracion: editValoracion,
      comentarios: editComentarios, ubicacion: editUbicacion,
      prestado_a: editPrestadoA,
      fecha_prestamo: editFechaPrestamo || null,
      fecha_inicio: editFechaInicio || null,
      fecha_fin: editFechaFin || null,
      precio_venta: editPrecioVenta ? parseFloat(editPrecioVenta) : null,
      fecha_venta: editFechaVenta || null,
    };
    const { ok, data } = await api.updateBook(selectedBook.id, payload);
    setSaving(false);
    if (ok) {
      setBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, ...payload } : b));
      closeModal();
      Alert.alert('✅ Guardado', 'Los cambios se han guardado.');
    } else {
      Alert.alert('Error', data?.message || 'No se pudo guardar.');
    }
  };

  const abrirAmazon = (title: string, author: string) => {
    const q = encodeURIComponent(`${title} ${author}`.trim());
    Linking.openURL(`https://www.amazon.es/s?k=${q}&tag=${AMAZON_TAG}`);
  };

  const renderBook = ({ item }: { item: Book }) => {
    const meta = ESTADO_META[item.estado] || { color: Colors.muted, label: item.estado };
    return (
      <TouchableOpacity style={s.bookCard} onPress={() => openModal(item)} activeOpacity={0.75}>
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

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  return (
    <SafeAreaView style={s.container}>
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
        : <FlatList data={filtered} keyExtractor={i => i.id.toString()}
            renderItem={renderBook}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={8}
            getItemLayout={(_, index) => ({ length: 108, offset: 108 * index, index })}
          />}

      {/* Modal — scroll fix con nestedScrollEnabled */}
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal} statusBarTranslucent>
        <Pressable style={s.overlay} onPress={closeModal}>
          <Animated.View style={[s.modalCard, {
            opacity: modalAnim,
            transform: [{ translateY: modalAnim.interpolate({ inputRange:[0,1], outputRange:[60,0] }) }],
          }]}>
            <Pressable onPress={e => e.stopPropagation()}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                bounces={true}
                nestedScrollEnabled={true}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mTitle} numberOfLines={2}>{selectedBook?.title}</Text>
                    <Text style={s.mAuthor}>{selectedBook?.author}</Text>
                  </View>
                  <TouchableOpacity onPress={closeModal}
                    style={{ padding: 8, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border }}>
                    <Text style={{ color: Colors.muted }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  {selectedBook?.cover
                    ? <Image source={{ uri: selectedBook.cover }} style={s.mCover} />
                    : <View style={[s.mCover, s.nocover]}><Text style={{ fontSize: 30 }}>📚</Text></View>}
                  <View style={{ flex: 1, gap: 5 }}>
                    {selectedBook?.category ? <MRow icon="🏷" label={selectedBook.category} /> : null}
                    {selectedBook?.year     ? <MRow icon="📅" label={selectedBook.year} /> : null}
                    {selectedBook?.language ? <MRow icon="🌐" label={selectedBook.language.toUpperCase()} /> : null}
                    {selectedBook?.alta     ? <MRow icon="➕" label={`Añadido ${selectedBook.alta}`} /> : null}
                  </View>
                </View>

                {selectedBook?.description
                  ? <Text style={{ color: Colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 }}
                      numberOfLines={3}>{selectedBook.description}</Text>
                  : null}

                <View style={{ height: 1, backgroundColor: Colors.border, marginBottom: 18 }} />

                <Text style={s.sLabel}>Estado de lectura</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {ESTADO_OPTIONS.map(o => (
                    <TouchableOpacity key={o.value}
                      style={[s.chip, editEstado === o.value && s.chipActive]}
                      onPress={() => setEditEstado(o.value)}>
                      <Text style={[s.chipText, editEstado === o.value && { color: Colors.accent }]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fLabel}>Inicio</Text>
                    <TextInput style={s.fInput} value={editFechaInicio} onChangeText={setEditFechaInicio}
                      placeholder="AAAA-MM-DD" placeholderTextColor={Colors.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fLabel}>Fin</Text>
                    <TextInput style={s.fInput} value={editFechaFin} onChangeText={setEditFechaFin}
                      placeholder="AAAA-MM-DD" placeholderTextColor={Colors.muted} />
                  </View>
                </View>

                <Text style={s.sLabel}>Valoración</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[1,2,3,4,5].map(n => (
                      <TouchableOpacity key={n} onPress={() => setEditValoracion(editValoracion === n ? 0 : n)}>
                        <Text style={{ fontSize: 26, opacity: n <= editValoracion ? 1 : 0.2 }}>⭐</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#FF990022', borderRadius: Radius.md, borderWidth: 1,
                            borderColor: '#FF9900', padding: 8,
                            width: 64, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => selectedBook && abrirAmazon(selectedBook.title, selectedBook.author)}>
                    <Text style={{ fontSize: 22 }}>🎁</Text>
                    <Text style={{ fontSize: 10, color: '#FF9900', fontWeight: '700', marginTop: 2 }}>Comprar</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={s.sLabel}>Prioridad</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {[{ value: '', label: 'Sin prioridad' }, ...PRIORIDAD_OPTIONS].map(o => (
                    <TouchableOpacity key={o.value}
                      style={[s.chip, editPrioridad === o.value && s.chipActive]}
                      onPress={() => setEditPrioridad(o.value)}>
                      <Text style={[s.chipText, editPrioridad === o.value && { color: Colors.accent }]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.sLabel}>Comentarios</Text>
                <TextInput style={[s.fInput, { minHeight: 80, paddingTop: 11, marginBottom: 14 }]}
                  value={editComentarios} onChangeText={setEditComentarios}
                  placeholder="Tus notas sobre este libro..." placeholderTextColor={Colors.muted}
                  multiline numberOfLines={3} textAlignVertical="top" />

                <Text style={s.sLabel}>Ubicación</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {UBICACION_OPTIONS.map(o => (
                    <TouchableOpacity key={o.value}
                      style={[s.chip, editUbicacion === o.value && s.chipActive]}
                      onPress={() => setEditUbicacion(o.value)}>
                      <Text style={[s.chipText, editUbicacion === o.value && { color: Colors.accent }]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {editUbicacion === 'prestado' && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fLabel}>Prestado a</Text>
                      <TextInput style={s.fInput} value={editPrestadoA} onChangeText={setEditPrestadoA}
                        placeholder="Nombre" placeholderTextColor={Colors.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fLabel}>Fecha préstamo</Text>
                      <TextInput style={s.fInput} value={editFechaPrestamo} onChangeText={setEditFechaPrestamo}
                        placeholder="AAAA-MM-DD" placeholderTextColor={Colors.muted} />
                    </View>
                  </View>
                )}

                {editUbicacion === 'vendido' && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fLabel}>Precio venta (€)</Text>
                      <TextInput style={s.fInput} value={editPrecioVenta} onChangeText={setEditPrecioVenta}
                        placeholder="9.99" placeholderTextColor={Colors.muted} keyboardType="decimal-pad" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fLabel}>Fecha venta</Text>
                      <TextInput style={s.fInput} value={editFechaVenta} onChangeText={setEditFechaVenta}
                        placeholder="AAAA-MM-DD" placeholderTextColor={Colors.muted} />
                    </View>
                  </View>
                )}

                {/* Botones acción */}
                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={saveBook} disabled={saving}>
                  {saving ? <ActivityIndicator color={Colors.bg} />
                    : <Text style={s.saveBtnText}>Guardar cambios</Text>}
                </TouchableOpacity>

              </ScrollView>
            </Pressable>
          </Animated.View>
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
function MRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 12, color: Colors.muted }}>{label}</Text>
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
  overlay:      { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: Colors.card, borderTopLeftRadius: Radius.xl,
                  borderTopRightRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border,
                  maxHeight: '92%', padding: Spacing.lg },
  mTitle:       { fontSize: 17, fontWeight: '900', color: Colors.text },
  mAuthor:      { fontSize: 13, color: Colors.muted, marginTop: 3 },
  mCover:       { width: 80, height: 118, borderRadius: Radius.md },
  sLabel:       { fontSize: 11, fontWeight: '700', color: Colors.muted,
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  fLabel:       { fontSize: 12, color: Colors.muted, marginBottom: 5 },
  fInput:       { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border,
                  color: Colors.text, padding: 11, fontSize: 14, marginBottom: 14 },
  saveBtn:      { backgroundColor: Colors.accent, borderRadius: Radius.md,
                  padding: 14, alignItems: 'center' },
  saveBtnText:  { color: Colors.bg, fontSize: 15, fontWeight: '800' },
  amazonModalBtn:  { backgroundColor: '#FF990022', borderRadius: Radius.md, borderWidth: 1,
                     borderColor: '#FF9900', padding: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  amazonModalIcon: { fontSize: 18 },
  amazonModalText: { color: '#FF9900', fontSize: 11, fontWeight: '800' },
});
