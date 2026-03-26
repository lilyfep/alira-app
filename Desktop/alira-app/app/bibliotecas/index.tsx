// app/bibliotecas/index.tsx
// Lista de bibliotecas + crear nueva + añadir libros desde colección
// Botón "Ir a buscar" para añadir libros nuevos desde el buscador

import ScreenHeader from '@/components/ScreenHeader';
import { Colors, ESTADO_META, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Keyboard,
  KeyboardAvoidingView, Modal, Platform, Pressable,
  RefreshControl, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const EMOJIS = ['📚','📖','✨','🌟','❤️','🔥','🎯','🏆','🌙','☀️','🎭','🎪','🌈','💫','🦋','🌺'];
const COLORS  = ['#7aa2ff','#ff6b9d','#ffd466','#64c878','#ff9900','#c084fc','#38bdf8','#fb7185'];

interface Library { id: number; nombre: string; emoji: string; color: string; total_books: number; }
interface ColBook  { id: number; title: string; author: string; cover: string; estado: string; }

export default function BibliotecasScreen() {
  const [libs,       setLibs]       = useState<Library[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Paso 1: crear
  const [showCreate, setShowCreate] = useState(false);
  const [nombre,     setNombre]     = useState('');
  const [emoji,      setEmoji]      = useState('📚');
  const [color,      setColor]      = useState('#7aa2ff');
  const [saving,     setSaving]     = useState(false);

  // Paso 2: añadir desde colección
  const [showAddBooks, setShowAddBooks] = useState(false);
  const [newLibId,     setNewLibId]     = useState<number | null>(null);
  const [colBooks,     setColBooks]     = useState<ColBook[]>([]);
  const [loadingCol,   setLoadingCol]   = useState(false);
  const [searchCol,    setSearchCol]    = useState('');
  const [selected,     setSelected]     = useState<Set<number>>(new Set());
  const [addingOne,    setAddingOne]    = useState<number | null>(null);
  const [addingMany,   setAddingMany]   = useState(false);

  // ── Carga ──────────────────────────────────────────────────────────────────
  const loadLibs = useCallback(async () => {
    const { ok, data } = await api.getLibraries();
    if (ok) setLibs(data.data?.libraries || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadLibs(); }, [loadLibs]));
  const onRefresh = () => { setRefreshing(true); loadLibs(); };

  // ── Crear biblioteca ───────────────────────────────────────────────────────
  const createLib = async () => {
    if (!nombre.trim()) { Alert.alert('Falta el nombre', 'Ponle nombre a tu biblioteca.'); return; }
    Keyboard.dismiss();
    setSaving(true);
    const { ok, data } = await api.createLibrary(nombre.trim(), emoji, color);
    setSaving(false);
    if (!ok) { Alert.alert('Error', data?.message || 'No se pudo crear.'); return; }

    const createdId = data.data?.id;
    setShowCreate(false);
    setNombre(''); setEmoji('📚'); setColor('#7aa2ff');
    loadLibs();

    if (createdId) {
      setNewLibId(createdId);
      setSelected(new Set());
      setSearchCol('');
      setShowAddBooks(true);
      setLoadingCol(true);
      const { ok: ok2, data: d2 } = await api.getBooks();
      if (ok2) setColBooks(d2.data?.books || []);
      setLoadingCol(false);
    }
  };

  // ── Colección ──────────────────────────────────────────────────────────────
  const toggleSelect = (bookId: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(bookId) ? next.delete(bookId) : next.add(bookId);
      return next;
    });
  };

  const filteredCol = colBooks.filter(b => {
    const q = searchCol.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q);
  });

  const addOneFromCol = async (book: ColBook) => {
    if (!newLibId) return;
    setAddingOne(book.id);
    const { ok } = await api.addBookToLibrary(newLibId, book.id);
    setAddingOne(null);
    if (ok) {
      setColBooks(prev => prev.filter(b => b.id !== book.id));
      setSelected(prev => { const n = new Set(prev); n.delete(book.id); return n; });
      loadLibs();
    } else {
      Alert.alert('Error', 'No se pudo añadir el libro.');
    }
  };

  const addSelected = async () => {
    if (!newLibId || selected.size === 0) return;
    setAddingMany(true);
    await Promise.all(Array.from(selected).map(bookId => api.addBookToLibrary(newLibId, bookId)));
    setAddingMany(false);
    setShowAddBooks(false);
    loadLibs();
  };

  // ── Render libro en modal ──────────────────────────────────────────────────
  const renderColBook = ({ item }: { item: ColBook }) => {
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
        <TouchableOpacity
          style={[s.addOneBtn, isSelected && s.addOneBtnSelected]}
          onPress={() => isSelected ? toggleSelect(item.id) : addOneFromCol(item)}
          disabled={isAdding}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isAdding
            ? <ActivityIndicator size="small" color={Colors.accent} />
            : <Text style={[s.addOneBtnText, isSelected && { color: Colors.accent }]}>
                {isSelected ? '✓' : '+'}
              </Text>}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  return (
    <SafeAreaView style={s.container}>

      <ScreenHeader
        title="Mis Bibliotecas"
        rightElement={
          <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.addBtnText}>+ Nueva</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}>
        {libs.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 52, marginBottom: 16 }}>📚</Text>
            <Text style={s.emptyTitle}>Crea tu primera biblioteca</Text>
            <Text style={s.emptySub}>Organiza tus libros como quieras — por géneros, momentos, estados de ánimo...</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={s.emptyBtnText}>+ Crear biblioteca</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.grid}>
            {libs.map(lib => (
              <TouchableOpacity key={lib.id} style={[s.libCard, { borderColor: lib.color + '44' }]}
                onPress={() => router.push(`/bibliotecas/${lib.id}`)} activeOpacity={0.75}>
                <View style={[s.libEmoji, { backgroundColor: lib.color + '22' }]}>
                  <Text style={{ fontSize: 32 }}>{lib.emoji}</Text>
                </View>
                <Text style={s.libNombre} numberOfLines={2}>{lib.nombre}</Text>
                <Text style={s.libCount}>{lib.total_books} {lib.total_books === 1 ? 'libro' : 'libros'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Modal paso 1: Crear biblioteca ──────────────────────────────── */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={s.overlay} onPress={() => { Keyboard.dismiss(); setShowCreate(false); }}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>Nueva biblioteca</Text>

              <Text style={s.sheetLabel}>Nombre</Text>
              <TextInput
                style={s.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Favoritos, Verano 2026..."
                placeholderTextColor={Colors.muted}
                autoFocus
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <Text style={s.sheetLabel}>Emoji</Text>
              <View style={s.emojiGrid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity key={e}
                    style={[s.emojiBtn, emoji === e && { backgroundColor: Colors.accent + '33' }]}
                    onPress={() => setEmoji(e)}>
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.sheetLabel}>Color</Text>
              <View style={s.colorRow}>
                {COLORS.map(c => (
                  <TouchableOpacity key={c}
                    style={[s.colorBtn, { backgroundColor: c },
                      color === c && { borderWidth: 3, borderColor: Colors.text }]}
                    onPress={() => setColor(c)} />
                ))}
              </View>

              <View style={[s.preview, { borderColor: color + '44' }]}>
                <View style={[s.libEmoji, { backgroundColor: color + '22' }]}>
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </View>
                <Text style={[s.libNombre, { fontSize: 16 }]}>{nombre || 'Mi biblioteca'}</Text>
              </View>

              <TouchableOpacity style={[s.createBtn, saving && { opacity: 0.6 }]}
                onPress={createLib} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={Colors.bg} />
                  : <Text style={s.createBtnText}>Crear y añadir libros →</Text>}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal paso 2: Añadir desde colección ────────────────────────── */}
      <Modal visible={showAddBooks} transparent animationType="slide" onRequestClose={() => setShowAddBooks(false)}>
        <Pressable style={s.overlay} onPress={() => setShowAddBooks(false)}>
          <Pressable style={s.addSheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />

            <View style={s.addSheetHead}>
              <View>
                <Text style={s.sheetTitle}>Añadir libros</Text>
                <Text style={s.addSheetSub}>Elige de tu colección</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddBooks(false)}>
                <Text style={{ color: Colors.muted, fontSize: 14 }}>Saltar</Text>
              </TouchableOpacity>
            </View>

            {/* Buscador */}
            <View style={s.searchWrap}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Buscar en tu colección..."
                placeholderTextColor={Colors.muted}
                value={searchCol}
                onChangeText={setSearchCol}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchCol.length > 0 && (
                <TouchableOpacity onPress={() => setSearchCol('')}>
                  <Text style={{ color: Colors.muted, fontSize: 14, paddingRight: 4 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Botón ir a buscar */}
            <TouchableOpacity
              style={s.goSearchBtn}
              onPress={() => { setShowAddBooks(false); router.push('/(tabs)/buscar'); }}
            >
              <Text style={s.goSearchIcon}>🔍</Text>
              <View>
                <Text style={s.goSearchTitle}>Buscar un libro nuevo</Text>
                <Text style={s.goSearchSub}>Ir al buscador para añadirlo a tu colección y biblioteca</Text>
              </View>
              <Text style={{ color: Colors.muted, fontSize: 18 }}>›</Text>
            </TouchableOpacity>

            {loadingCol ? (
              <View style={s.addLoading}><ActivityIndicator size="large" color={Colors.accent} /></View>
            ) : filteredCol.length === 0 ? (
              <View style={s.addLoading}>
                <Text style={{ color: Colors.muted, fontSize: 14, textAlign: 'center' }}>
                  {colBooks.length === 0 ? 'No tienes libros en tu colección aún' : 'No se encontraron libros'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCol}
                keyExtractor={item => String(item.id)}
                renderItem={renderColBook}
                style={s.addList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            )}

            {selected.size > 0 && (
              <TouchableOpacity style={[s.addManyBtn, addingMany && { opacity: 0.6 }]}
                onPress={addSelected} disabled={addingMany}>
                {addingMany
                  ? <ActivityIndicator color={Colors.bg} />
                  : <Text style={s.addManyBtnText}>
                      Añadir {selected.size} {selected.size === 1 ? 'libro' : 'libros'}
                    </Text>}
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  addBtn:     { backgroundColor: Colors.accent + 'cc', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 14 },
  scroll:     { padding: Spacing.lg, paddingBottom: 60 },
  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub:   { color: Colors.muted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 40, marginBottom: 24 },
  emptyBtn:   { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: 24, paddingVertical: 13 },
  emptyBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 15 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  libCard:    { width: '47%', backgroundColor: Colors.card, borderRadius: Radius.lg,
                borderWidth: 1, padding: 16, alignItems: 'center', gap: 8 },
  libEmoji:   { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  libNombre:  { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  libCount:   { fontSize: 12, color: Colors.muted },
  overlay:    { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet:      { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, paddingBottom: 40 },
  sheetHandle:{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
                alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  sheetLabel: { fontSize: 12, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase',
                letterSpacing: 0.8, marginBottom: 8, marginTop: 12 },
  input:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md, borderWidth: 1,
                borderColor: Colors.border, color: Colors.text, padding: 13, fontSize: 16, marginBottom: 8 },
  emojiGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  emojiBtn:   { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  colorRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorBtn:   { width: 32, height: 32, borderRadius: 16 },
  preview:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bg,
                borderRadius: Radius.lg, borderWidth: 1, padding: 14, marginBottom: 16 },
  createBtn:  { backgroundColor: Colors.accent, borderRadius: Radius.md, padding: 15, alignItems: 'center' },
  createBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '800' },
  addSheet:   { backgroundColor: Colors.card, borderTopLeftRadius: Radius.xl,
                borderTopRightRadius: Radius.xl, paddingTop: Spacing.md,
                paddingHorizontal: Spacing.lg, paddingBottom: 32, maxHeight: '90%' },
  addSheetHead: { flexDirection: 'row', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: Spacing.md },
  addSheetSub:  { color: Colors.muted, fontSize: 13 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg,
                  borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
                  paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm },
  searchIcon:   { fontSize: 16, marginRight: 6 },
  searchInput:  { flex: 1, color: Colors.text, fontSize: 15, paddingVertical: 10 },

  // Botón ir a buscar
  goSearchBtn:   { flexDirection: 'row', alignItems: 'center', gap: 10,
                   backgroundColor: Colors.bg, borderRadius: Radius.md,
                   borderWidth: 1, borderColor: Colors.border,
                   padding: Spacing.md, marginBottom: Spacing.sm },
  goSearchIcon:  { fontSize: 20 },
  goSearchTitle: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  goSearchSub:   { color: Colors.muted, fontSize: 12, marginTop: 1 },

  addLoading:   { height: 140, alignItems: 'center', justifyContent: 'center' },
  addList:      { flex: 1, minHeight: 200 },
  addBookCard:         { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm,
                         borderBottomWidth: 1, borderBottomColor: Colors.border },
  addBookCardSelected: { backgroundColor: Colors.accent + '0d' },
  addCover:            { width: 44, height: 64, borderRadius: Radius.sm, backgroundColor: Colors.border },
  nocover:             { alignItems: 'center', justifyContent: 'center' },
  addBookInfo:         { flex: 1, paddingHorizontal: Spacing.sm },
  addBookTitle:        { color: Colors.text, fontWeight: '700', fontSize: 13, marginBottom: 2 },
  addBookAuthor:       { color: Colors.muted, fontSize: 12, marginBottom: 4 },
  badge:               { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeText:           { fontSize: 11, fontWeight: '700' },
  addOneBtn:           { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
                         borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  addOneBtnSelected:   { borderColor: Colors.accent, backgroundColor: Colors.accent + '22' },
  addOneBtnText:       { color: Colors.muted, fontSize: 20, lineHeight: 22, fontWeight: '700' },
  addManyBtn:          { backgroundColor: Colors.accent, borderRadius: Radius.full,
                         paddingVertical: 14, alignItems: 'center', marginTop: Spacing.md },
  addManyBtnText:      { color: Colors.bg, fontWeight: '800', fontSize: 15 },
});
