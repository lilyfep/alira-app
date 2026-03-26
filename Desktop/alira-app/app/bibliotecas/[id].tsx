// app/bibliotecas/[id].tsx
// Detalle de una biblioteca personalizada — estilo playlist Spotify
// + Modal para añadir libros desde tu colección (búsqueda, selección múltiple, añadir uno a uno)

import ScreenHeader from '@/components/ScreenHeader';
import { Colors, ESTADO_META, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, Pressable,
  RefreshControl, SafeAreaView,
  StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';

const EMOJIS = ['📚','📖','✨','🌟','❤️','🔥','🎯','🏆','🌙','☀️','🎭','🎪','🌈','💫','🦋','🌺'];
const COLORS  = ['#7aa2ff','#ff6b9d','#ffd466','#64c878','#ff9900','#c084fc','#38bdf8','#fb7185'];

interface LibBook {
  id: number; title: string; author: string; cover: string; estado: string;
}

interface Library {
  id: number; nombre: string; emoji: string; color: string;
  total_books: number; books: LibBook[];
}

interface ColBook {
  id: number; title: string; author: string; cover: string; estado: string;
}

export default function LibraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [lib,        setLib]        = useState<Library | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  // Edición
  const [editNombre, setEditNombre] = useState('');
  const [editEmoji,  setEditEmoji]  = useState('📚');
  const [editColor,  setEditColor]  = useState('#7aa2ff');

  // Modal añadir libros
  const [showAdd,     setShowAdd]     = useState(false);
  const [colBooks,    setColBooks]    = useState<ColBook[]>([]);
  const [loadingCol,  setLoadingCol]  = useState(false);
  const [searchAdd,   setSearchAdd]   = useState('');
  const [selected,    setSelected]    = useState<Set<number>>(new Set());
  const [addingOne,   setAddingOne]   = useState<number | null>(null);
  const [addingMany,  setAddingMany]  = useState(false);

  // ── Carga biblioteca ───────────────────────────────────────────────────────
  const loadLib = useCallback(async () => {
    const { ok, data } = await api.getLibrary(parseInt(id));
    if (ok) {
      const l: Library = data.data;
      setLib(l);
      setEditNombre(l.nombre);
      setEditEmoji(l.emoji);
      setEditColor(l.color);
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useFocusEffect(useCallback(() => { loadLib(); }, [loadLib]));
  const onRefresh = () => { setRefreshing(true); loadLib(); };

  // ── Abrir modal añadir ─────────────────────────────────────────────────────
  const openAddModal = async () => {
    setShowAdd(true);
    setSearchAdd('');
    setSelected(new Set());
    setLoadingCol(true);
    const { ok, data } = await api.getBooks();
    if (ok) {
      const all: ColBook[] = data.data?.books || [];
      // Excluir los que ya están en la biblioteca
      const inLib = new Set((lib?.books || []).map(b => b.id));
      setColBooks(all.filter(b => !inLib.has(b.id)));
    }
    setLoadingCol(false);
  };

  // ── Filtro búsqueda ────────────────────────────────────────────────────────
  const filteredCol = colBooks.filter(b => {
    const q = searchAdd.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q);
  });

  // ── Toggle selección ───────────────────────────────────────────────────────
  const toggleSelect = (bookId: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(bookId) ? next.delete(bookId) : next.add(bookId);
      return next;
    });
  };

  // ── Añadir uno directamente ────────────────────────────────────────────────
  const addOne = async (book: ColBook) => {
    setAddingOne(book.id);
    const { ok } = await api.addBookToLibrary(parseInt(id), book.id);
    setAddingOne(null);
    if (ok) {
      setColBooks(prev => prev.filter(b => b.id !== book.id));
      setSelected(prev => { const n = new Set(prev); n.delete(book.id); return n; });
      loadLib();
    } else {
      Alert.alert('Error', 'No se pudo añadir el libro.');
    }
  };

  // ── Añadir seleccionados ───────────────────────────────────────────────────
  const addSelected = async () => {
    if (selected.size === 0) return;
    setAddingMany(true);
    const ids = Array.from(selected);
    await Promise.all(ids.map(bookId => api.addBookToLibrary(parseInt(id), bookId)));
    setAddingMany(false);
    setShowAdd(false);
    loadLib();
  };

  // ── Guardar edición ────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editNombre.trim()) { Alert.alert('Falta el nombre', 'Ponle un nombre a tu biblioteca.'); return; }
    setSaving(true);
    const { ok } = await api.updateLibrary(parseInt(id), {
      nombre: editNombre.trim(), emoji: editEmoji, color: editColor,
    });
    setSaving(false);
    if (ok) { setShowEdit(false); loadLib(); }
    else Alert.alert('Error', 'No se pudo guardar.');
  };

  // ── Eliminar biblioteca ────────────────────────────────────────────────────
  const deleteLib = () => {
    Alert.alert('¿Eliminar biblioteca?',
      `Se eliminará "${lib?.nombre}". Los libros no se borran de tu colección.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        setDeleting(true);
        const { ok } = await api.deleteLibrary(parseInt(id));
        setDeleting(false);
        if (ok) router.back();
        else Alert.alert('Error', 'No se pudo eliminar.');
      }},
    ]);
  };

  // ── Quitar libro ───────────────────────────────────────────────────────────
  const removeBook = (book: LibBook) => {
    Alert.alert('¿Quitar de la biblioteca?',
      `"${book.title}" se quitará de "${lib?.nombre}", pero seguirá en tu colección.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: async () => {
        const { ok } = await api.removeBookFromLibrary(parseInt(id), book.id);
        if (ok) loadLib();
        else Alert.alert('Error', 'No se pudo quitar el libro.');
      }},
    ]);
  };

  // ── Render libro en biblioteca ─────────────────────────────────────────────
  const renderBook = ({ item }: { item: LibBook }) => {
    const meta = ESTADO_META[item.estado] || { color: Colors.muted, label: item.estado };
    return (
      <TouchableOpacity style={s.bookCard} onPress={() => router.push(`/libro/${item.id}`)} activeOpacity={0.75}>
        {item.cover
          ? <Image source={{ uri: item.cover }} style={s.cover} />
          : <View style={[s.cover, s.nocover]}><Text style={{ fontSize: 22 }}>📚</Text></View>}
        <View style={s.bookInfo}>
          <Text style={s.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.bookAuthor} numberOfLines={1}>{item.author || 'Autor desconocido'}</Text>
          <View style={[s.badge, { backgroundColor: meta.color + '22' }]}>
            <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.removeBtn} onPress={() => removeBook(item)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: Colors.danger, fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ── Render libro en modal añadir ───────────────────────────────────────────
  const renderAddBook = ({ item }: { item: ColBook }) => {
    const isSelected = selected.has(item.id);
    const isAdding   = addingOne === item.id;
    const meta = ESTADO_META[item.estado] || { color: Colors.muted, label: item.estado };
    return (
      <TouchableOpacity
        style={[s.addBookCard, isSelected && s.addBookCardSelected]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.75}
      >
        {item.cover
          ? <Image source={{ uri: item.cover }} style={s.addCover} />
          : <View style={[s.addCover, s.nocover]}><Text style={{ fontSize: 18 }}>📚</Text></View>}
        <View style={s.addBookInfo}>
          <Text style={s.addBookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.addBookAuthor} numberOfLines={1}>{item.author || 'Autor desconocido'}</Text>
          <View style={[s.badge, { backgroundColor: meta.color + '22' }]}>
            <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        {/* Botón + individual */}
        <TouchableOpacity
          style={[s.addOneBtn, isSelected && s.addOneBtnSelected]}
          onPress={() => isSelected ? toggleSelect(item.id) : addOne(item)}
          disabled={isAdding}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isAdding
            ? <ActivityIndicator size="small" color={Colors.accent} />
            : <Text style={[s.addOneBtnText, isSelected && { color: Colors.accent }]}>
                {isSelected ? '✓' : '+'}
              </Text>
          }
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ── Loading / not found ────────────────────────────────────────────────────
  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (!lib)    return (
    <View style={s.centered}>
      <Text style={{ color: Colors.muted, fontSize: 16 }}>Biblioteca no encontrada</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
        <Text style={{ color: Colors.accent }}>← Volver</Text>
      </TouchableOpacity>
    </View>
  );

  const books: LibBook[] = lib.books || [];

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>

      <ScreenHeader
        title={`${lib.emoji} ${lib.nombre}`}
        rightElement={
          <TouchableOpacity onPress={() => setShowEdit(true)}>
            <Text style={{ color: Colors.accent, fontSize: 15, fontWeight: '600' }}>Editar</Text>
          </TouchableOpacity>
        }
      />

      {/* Banner hero */}
      <View style={[s.heroBanner, { backgroundColor: lib.color + '18', borderColor: lib.color + '33' }]}>
        <View style={[s.heroEmojiWrap, { backgroundColor: lib.color + '28' }]}>
          <Text style={{ fontSize: 36 }}>{lib.emoji}</Text>
        </View>
        <View style={s.heroTextWrap}>
          <Text style={[s.heroName, { color: lib.color }]}>{lib.nombre}</Text>
          <Text style={s.heroCount}>{books.length} {books.length === 1 ? 'libro' : 'libros'}</Text>
        </View>
        {/* Botón añadir libros */}
        <TouchableOpacity style={[s.addLibBtn, { backgroundColor: lib.color + '22', borderColor: lib.color + '55' }]}
          onPress={openAddModal}>
          <Text style={[s.addLibBtnText, { color: lib.color }]}>+ Añadir</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {books.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>📭</Text>
          <Text style={s.emptyTitle}>Biblioteca vacía</Text>
          <Text style={s.emptySub}>Añade libros de tu colección o busca nuevos.</Text>
          <TouchableOpacity style={[s.emptyBtn, { backgroundColor: lib.color + '22', borderColor: lib.color + '55' }]}
            onPress={openAddModal}>
            <Text style={[s.emptyBtnText, { color: lib.color }]}>+ Añadir libros</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={item => String(item.id)}
          renderItem={renderBook}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListFooterComponent={
            <TouchableOpacity style={s.deleteLibBtn} onPress={deleteLib} disabled={deleting}>
              {deleting
                ? <ActivityIndicator size="small" color={Colors.danger} />
                : <Text style={s.deleteLibText}>🗑 Eliminar biblioteca</Text>}
            </TouchableOpacity>
          }
        />
      )}

      {books.length === 0 && (
        <TouchableOpacity style={[s.deleteLibBtn, { marginBottom: 32 }]} onPress={deleteLib} disabled={deleting}>
          {deleting
            ? <ActivityIndicator size="small" color={Colors.danger} />
            : <Text style={s.deleteLibText}>🗑 Eliminar biblioteca</Text>}
        </TouchableOpacity>
      )}

      {/* ── Modal: Añadir libros ─────────────────────────────────────────── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <Pressable style={s.overlay} onPress={() => setShowAdd(false)}>
          <Pressable style={s.addSheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />

            {/* Cabecera modal */}
            <View style={s.addSheetHead}>
              <Text style={s.sheetTitle}>Añadir libros</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Text style={{ color: Colors.muted, fontSize: 14 }}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            {/* Buscador */}
            <View style={s.searchWrap}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Buscar en tu colección..."
                placeholderTextColor={Colors.muted}
                value={searchAdd}
                onChangeText={setSearchAdd}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchAdd.length > 0 && (
                <TouchableOpacity onPress={() => setSearchAdd('')}>
                  <Text style={{ color: Colors.muted, fontSize: 14, paddingRight: 4 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Lista de libros */}
            {loadingCol ? (
              <View style={s.addLoading}>
                <ActivityIndicator size="large" color={Colors.accent} />
              </View>
            ) : filteredCol.length === 0 ? (
              <View style={s.addLoading}>
                <Text style={{ color: Colors.muted, fontSize: 14 }}>
                  {colBooks.length === 0
                    ? 'Todos tus libros ya están en esta biblioteca'
                    : 'No se encontraron libros'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCol}
                keyExtractor={item => String(item.id)}
                renderItem={renderAddBook}
                style={s.addList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            )}

            {/* Botón añadir seleccionados */}
            {selected.size > 0 && (
              <TouchableOpacity
                style={[s.addManyBtn, addingMany && { opacity: 0.6 }]}
                onPress={addSelected}
                disabled={addingMany}
              >
                {addingMany
                  ? <ActivityIndicator color={Colors.bg} />
                  : <Text style={s.addManyBtnText}>
                      Añadir {selected.size} {selected.size === 1 ? 'libro' : 'libros'}
                    </Text>
                }
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal: Editar biblioteca ─────────────────────────────────────── */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <Pressable style={s.overlay} onPress={() => setShowEdit(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Editar biblioteca</Text>

            <Text style={s.sheetLabel}>Nombre</Text>
            <TextInput style={s.input} value={editNombre} onChangeText={setEditNombre}
              placeholder="Nombre de tu biblioteca..." placeholderTextColor={Colors.muted}
              maxLength={60} autoFocus />

            <Text style={s.sheetLabel}>Emoji</Text>
            <View style={s.emojiRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e}
                  style={[s.emojiBtn, editEmoji === e && { backgroundColor: Colors.accent + '33' }]}
                  onPress={() => setEditEmoji(e)}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sheetLabel}>Color</Text>
            <View style={s.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c}
                  style={[s.colorBtn, { backgroundColor: c },
                    editColor === c && { borderWidth: 3, borderColor: Colors.text }]}
                  onPress={() => setEditColor(c)} />
              ))}
            </View>

            <View style={[s.preview, { borderColor: editColor + '55', backgroundColor: editColor + '12' }]}>
              <Text style={{ fontSize: 24 }}>{editEmoji}</Text>
              <Text style={[s.previewName, { color: editColor }]} numberOfLines={1}>
                {editNombre || 'Mi biblioteca'}
              </Text>
            </View>

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: editColor }, saving && { opacity: 0.6 }]}
              onPress={saveEdit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.saveBtnText}>Guardar cambios</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEdit(false)}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered:  { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroBanner:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg,
                   marginTop: Spacing.md, marginBottom: Spacing.sm, padding: Spacing.md,
                   borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  heroEmojiWrap: { width: 56, height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  heroTextWrap:  { flex: 1 },
  heroName:      { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  heroCount:     { color: Colors.muted, fontSize: 13 },
  addLibBtn:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1 },
  addLibBtnText: { fontWeight: '700', fontSize: 13 },

  // Lista
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 40 },

  // Libro en biblioteca
  bookCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
                borderRadius: Radius.md, marginBottom: Spacing.sm, padding: Spacing.sm,
                borderWidth: 1, borderColor: Colors.border },
  cover:      { width: 52, height: 76, borderRadius: Radius.sm, backgroundColor: Colors.border },
  nocover:    { alignItems: 'center', justifyContent: 'center' },
  bookInfo:   { flex: 1, paddingHorizontal: Spacing.sm },
  bookTitle:  { color: Colors.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  bookAuthor: { color: Colors.muted, fontSize: 13, marginBottom: 6 },
  badge:      { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  removeBtn:  { padding: Spacing.sm, alignItems: 'center', justifyContent: 'center' },

  // Empty
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  emptyTitle: { color: Colors.text, fontWeight: '800', fontSize: 18, marginBottom: 8, textAlign: 'center' },
  emptySub:   { color: Colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn:   { paddingVertical: 12, paddingHorizontal: 24, borderRadius: Radius.full, borderWidth: 1 },
  emptyBtnText: { fontWeight: '700', fontSize: 14 },

  // Eliminar
  deleteLibBtn:  { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, paddingVertical: 14,
                   borderRadius: Radius.md, alignItems: 'center', borderWidth: 1,
                   borderColor: Colors.danger + '44', backgroundColor: Colors.danger + '0d' },
  deleteLibText: { color: Colors.danger, fontWeight: '700', fontSize: 14 },

  // Modal base
  overlay:     { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet:       { backgroundColor: Colors.card, borderTopLeftRadius: Radius.xl,
                 borderTopRightRadius: Radius.xl, paddingHorizontal: Spacing.lg,
                 paddingBottom: 40, paddingTop: Spacing.md },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
                 alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitle:  { color: Colors.text, fontWeight: '800', fontSize: 18, marginBottom: Spacing.lg },
  sheetLabel:  { color: Colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase',
                 letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md },
  input:       { backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1,
                 borderColor: Colors.border, color: Colors.text, fontSize: 15,
                 paddingHorizontal: Spacing.md, paddingVertical: 12 },
  emojiRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  emojiBtn:    { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center',
                 justifyContent: 'center', backgroundColor: Colors.bg },
  colorRow:    { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  colorBtn:    { width: 34, height: 34, borderRadius: Radius.full, borderWidth: 2, borderColor: 'transparent' },
  preview:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md,
                 padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  previewName: { fontWeight: '700', fontSize: 15, flex: 1 },
  saveBtn:     { marginTop: Spacing.lg, paddingVertical: 14, borderRadius: Radius.full, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn:   { marginTop: Spacing.sm, alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: Colors.muted, fontSize: 14 },

  // Modal añadir libros
  addSheet:     { backgroundColor: Colors.card, borderTopLeftRadius: Radius.xl,
                  borderTopRightRadius: Radius.xl, paddingTop: Spacing.md,
                  paddingHorizontal: Spacing.lg, paddingBottom: 32, maxHeight: '85%' },
  addSheetHead: { flexDirection: 'row', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: Spacing.md },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg,
                  borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
                  paddingHorizontal: Spacing.sm, marginBottom: Spacing.md },
  searchIcon:   { fontSize: 16, marginRight: 6 },
  searchInput:  { flex: 1, color: Colors.text, fontSize: 15, paddingVertical: 10 },
  addLoading:   { height: 160, alignItems: 'center', justifyContent: 'center' },
  addList:      { maxHeight: 380 },

  // Libro en modal añadir
  addBookCard:         { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm,
                         borderBottomWidth: 1, borderBottomColor: Colors.border },
  addBookCardSelected: { backgroundColor: Colors.accent + '0d' },
  addCover:            { width: 44, height: 64, borderRadius: Radius.sm, backgroundColor: Colors.border },
  addBookInfo:         { flex: 1, paddingHorizontal: Spacing.sm },
  addBookTitle:        { color: Colors.text, fontWeight: '700', fontSize: 13, marginBottom: 2 },
  addBookAuthor:       { color: Colors.muted, fontSize: 12, marginBottom: 4 },

  // Botón + individual
  addOneBtn:       { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
                     borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  addOneBtnSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '22' },
  addOneBtnText:   { color: Colors.muted, fontSize: 20, lineHeight: 22, fontWeight: '700' },

  // Botón añadir seleccionados
  addManyBtn:     { backgroundColor: Colors.accent, borderRadius: Radius.full,
                    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.md },
  addManyBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 15 },
});
