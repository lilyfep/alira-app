// app/(tabs)/buscar.tsx
// Búsqueda Google Books + escáner ISBN
// Al pulsar un resultado → bottom sheet: Colección | Wishreads | Biblioteca

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, apiFetch } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal,
  Pressable, SafeAreaView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';

interface SearchResult {
  google_books_id: string;
  titulo: string;
  autor: string;
  portada_url: string;
  anio_publicacion: string;
  descripcion: string;
  idioma: string;
  categorias: string[];
}

interface Library {
  id: number; nombre: string; emoji: string; color: string;
}

// ── Normalización categorías ───────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'fiction': 'Ficción', 'literary fiction': 'Ficción', 'general fiction': 'Ficción',
  'science fiction': 'Ciencia Ficción', 'sci-fi': 'Ciencia Ficción',
  'fantasy': 'Fantasía', 'fantasy fiction': 'Fantasía',
  'horror': 'Terror', 'horror fiction': 'Terror',
  'romance': 'Romance', 'love stories': 'Romance',
  'thriller': 'Thriller', 'suspense': 'Thriller', 'mystery': 'Thriller', 'crime': 'Thriller',
  'historical fiction': 'Histórica',
  'adventure': 'Aventura', 'adventure fiction': 'Aventura',
  'juvenile fiction': 'Juvenil', 'juvenile literature': 'Juvenil', 'young adult fiction': 'Juvenil',
  'children': 'Infantil', "children's stories": 'Infantil',
  'poetry': 'Poesía', 'drama': 'Teatro', 'theater': 'Teatro',
  'classics': 'Clásicos', 'classic literature': 'Clásicos', 'literary classics': 'Clásicos',
  'nonfiction': 'No ficción', 'non-fiction': 'No ficción', 'general': 'No ficción',
  'biography': 'Biografía', 'autobiography': 'Biografía', 'biography & autobiography': 'Biografía',
  'history': 'Historia', 'science': 'Ciencia', 'essays': 'Ensayo',
  'self-help': 'Autoayuda', 'philosophy': 'Filosofía', 'psychology': 'Psicología',
  'economics': 'Economía', 'business': 'Economía', 'business & economics': 'Economía',
  'travel': 'Viajes', 'cooking': 'Cocina', 'food': 'Cocina',
  'art': 'Arte', 'comics': 'Cómic', 'comic books': 'Cómic', 'graphic novels': 'Cómic',
};

function normalizarCategoria(raw: string): string {
  if (!raw) return '';
  return CATEGORY_MAP[raw.toLowerCase().trim()] || raw;
}

export default function BuscarScreen() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Escáner ISBN
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission]     = useCameraPermissions();
  const scanned = useRef(false);

  // Bottom sheet
  const [sheetItem,    setSheetItem]    = useState<SearchResult | null>(null);
  const [libraries,    setLibraries]    = useState<Library[]>([]);
  const [showLibPicker, setShowLibPicker] = useState(false);

  // Estados de añadido por google_books_id
  const [addedCol,  setAddedCol]  = useState<Set<string>>(new Set());
  const [addedWish, setAddedWish] = useState<Set<string>>(new Set());
  const [addedLibs, setAddedLibs] = useState<Set<string>>(new Set());
  const [busy,      setBusy]      = useState<string | null>(null); // google_books_id en proceso

  useEffect(() => {
    AsyncStorage.getItem('access_token').then(t => { if (!t) router.replace('/login'); });
  }, []);

  // ── Buscar ─────────────────────────────────────────────────────────────────
  const buscar = async (override?: string) => {
    const term = override || query.trim();
    if (!term) return;
    setLoading(true);
    setResults([]);
    const { ok, data } = await api.search(term);
    setLoading(false);
    if (ok) setResults(data.data?.results || []);
    else Alert.alert('Error', 'No se pudo buscar. Comprueba tu conexión.');
  };

  // ── Escáner ISBN ───────────────────────────────────────────────────────────
  const abrirScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Cámara', 'Necesitamos permiso para acceder a la cámara.'); return; }
    }
    scanned.current = false;
    setScannerVisible(true);
  };

  const onBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned.current) return;
    scanned.current = true;
    setScannerVisible(false);
    setQuery(data);
    buscar(`isbn:${data}`);
  };

  // ── Abrir bottom sheet ─────────────────────────────────────────────────────
  const abrirSheet = async (item: SearchResult) => {
    setSheetItem(item);
    setShowLibPicker(false);
    // Cargar bibliotecas en paralelo
    const { ok, data } = await api.getLibraries();
    if (ok) setLibraries(data.data?.libraries || []);
  };

  const cerrarSheet = () => { setSheetItem(null); setShowLibPicker(false); };

  // ── Añadir a colección ─────────────────────────────────────────────────────
  const añadirColeccion = async (item: SearchResult) => {
    const id = item.google_books_id;
    setBusy(id + '_col');
    const { ok, data } = await apiFetch('/books/add', {
      method: 'POST',
      body: JSON.stringify({
        title: item.titulo, author: item.autor, cover: item.portada_url,
        year: item.anio_publicacion, description: item.descripcion,
        language: item.idioma, category: normalizarCategoria(item.categorias?.[0] || ''),
        estado: 'pendiente',
      }),
    });
    setBusy(null);
    if (ok) {
      setAddedCol(prev => new Set([...prev, id]));
      cerrarSheet();
    } else if (data?.message?.includes('límite')) {
      Alert.alert('Límite alcanzado', data.message, [
        { text: 'Ver Alira+', onPress: () => router.push('/(tabs)/premium') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Error', data?.message || 'No se pudo añadir.');
    }
  };

  // ── Añadir a Wishreads ─────────────────────────────────────────────────────
  const añadirWishreads = async (item: SearchResult) => {
    const id = item.google_books_id;
    setBusy(id + '_wish');
    const { ok, data } = await api.addWishread({
      title: item.titulo, author: item.autor, cover: item.portada_url,
      year: item.anio_publicacion, description: item.descripcion,
      language: item.idioma, category: normalizarCategoria(item.categorias?.[0] || ''),
      prioridad: 'media',
    });
    setBusy(null);
    if (ok) {
      setAddedWish(prev => new Set([...prev, id]));
      cerrarSheet();
    } else {
      Alert.alert('Error', data?.message || 'No se pudo añadir a Wishreads.');
    }
  };

  // ── Añadir a biblioteca ────────────────────────────────────────────────────
  const añadirBiblioteca = async (item: SearchResult, libId: number) => {
    const id = item.google_books_id;
    setBusy(id + '_lib');

    // 1. Añadir a colección (si ya existe, el backend devuelve el id igualmente)
    const { data: d1 } = await apiFetch('/books/', {
      method: 'POST',
      body: JSON.stringify({
        title:    item.titulo,
        author:   item.autor,
        cover:    item.portada_url,
        year:     item.anio_publicacion,
        description: item.descripcion,
        language: item.idioma,
        category: normalizarCategoria(item.categorias?.[0] || ''),
        estado:   'pendiente',
      }),
    });

    const bookId = d1?.data?.id;

    if (!bookId) {
      setBusy(null);
      Alert.alert('Error', d1?.message || 'No se pudo añadir a la colección.');
      return;
    }

    // 2. Añadir a biblioteca
    await api.addBookToLibrary(libId, bookId);

    setBusy(null);
    setAddedLibs(prev => new Set([...prev, id]));
    cerrarSheet();
    Alert.alert('✅ Añadido', `"${item.titulo}" añadido a tu colección y a la biblioteca.`);
  };
  // ── Render resultado ───────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: SearchResult }) => {
    const id     = item.google_books_id;
    const inCol  = addedCol.has(id);
    const inWish = addedWish.has(id);
    const inLib  = addedLibs.has(id);

    // Badge de estado
    const badge = inCol ? { label: '✓ En colección', color: Colors.success }
                : inWish ? { label: '✓ En Wishreads', color: '#ffd466' }
                : inLib  ? { label: '✓ En biblioteca', color: Colors.accent }
                : null;

    return (
      <View style={s.card}>
        {item.portada_url
          ? <Image source={{ uri: item.portada_url }} style={s.cover} />
          : <View style={[s.cover, s.nocover]}><Text style={{ fontSize: 24 }}>📚</Text></View>}
        <View style={s.info}>
          <Text style={s.title} numberOfLines={2}>{item.titulo}</Text>
          <Text style={s.author} numberOfLines={1}>{item.autor || 'Autor desconocido'}</Text>
          {item.anio_publicacion ? <Text style={s.year}>{item.anio_publicacion}</Text> : null}
          {item.descripcion ? <Text style={s.desc} numberOfLines={2}>{item.descripcion}</Text> : null}
          <View style={s.actions}>
            {badge ? (
              <View style={[s.badgePill, { backgroundColor: badge.color + '22', borderColor: badge.color + '55' }]}>
                <Text style={[s.badgePillText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ) : (
              <TouchableOpacity style={s.addBtn} onPress={() => abrirSheet(item)}>
                <Text style={s.addBtnText}>+ Añadir</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🔍 Buscar libros</Text>
        <Text style={s.headerSub}>Añade a tu colección, Wishreads o biblioteca</Text>
      </View>

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Título, autor o ISBN..."
          placeholderTextColor={Colors.muted}
          value={query} onChangeText={setQuery}
          onSubmitEditing={() => buscar()}
          returnKeyType="search"
          autoCapitalize="none" autoCorrect={false}
        />
        <TouchableOpacity style={s.scanBtn} onPress={abrirScanner}>
          <Text style={{ fontSize: 20 }}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.searchBtn} onPress={() => buscar()} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color={Colors.bg} />
            : <Text style={s.searchBtnText}>Buscar</Text>}
        </TouchableOpacity>
      </View>

      {results.length === 0 && !loading && (
        <View style={s.empty}>
          <Text style={{ fontSize: 52, marginBottom: 14 }}>📖</Text>
          <Text style={s.emptyTitle}>Busca un libro</Text>
          <Text style={s.emptySub}>Escribe el título o autor{'\n'}o escanea el código de barras 📷</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.google_books_id || item.titulo}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}
      />

      {/* ── Modal escáner ISBN ──────────────────────────────────────────── */}
      <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
        <View style={s.scannerContainer}>
          <View style={s.scannerHeader}>
            <Text style={s.scannerTitle}>📷 Escanear ISBN</Text>
            <TouchableOpacity style={s.scannerCloseBtn} onPress={() => setScannerVisible(false)}>
              <Text style={s.scannerCloseTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          {permission?.granted && (
            <CameraView style={s.camera} facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128'] }}
              onBarcodeScanned={onBarCodeScanned}>
              <View style={s.scanOverlay}>
                <View style={s.scanFrame} />
                <View style={s.scanLine} />
              </View>
            </CameraView>
          )}
          <Text style={s.scannerHint}>Apunta la cámara al código de barras del libro</Text>
        </View>
      </Modal>

      {/* ── Bottom sheet: opciones de añadir ───────────────────────────── */}
      <Modal visible={!!sheetItem} transparent animationType="slide" onRequestClose={cerrarSheet}>
        <Pressable style={s.overlay} onPress={cerrarSheet}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />

            {/* Mini preview del libro */}
            {sheetItem && (
              <View style={s.sheetBook}>
                {sheetItem.portada_url
                  ? <Image source={{ uri: sheetItem.portada_url }} style={s.sheetCover} />
                  : <View style={[s.sheetCover, s.nocover]}><Text>📚</Text></View>}
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetBookTitle} numberOfLines={2}>{sheetItem.titulo}</Text>
                  <Text style={s.sheetBookAuthor} numberOfLines={1}>{sheetItem.autor || 'Autor desconocido'}</Text>
                </View>
              </View>
            )}

            <Text style={s.sheetLabel}>¿Dónde quieres añadirlo?</Text>

            {/* Opción: Colección */}
            <TouchableOpacity
              style={[s.sheetOption, busy === sheetItem?.google_books_id + '_col' && s.sheetOptionBusy]}
              onPress={() => sheetItem && añadirColeccion(sheetItem)}
              disabled={!!busy}
            >
              {busy === sheetItem?.google_books_id + '_col'
                ? <ActivityIndicator size="small" color={Colors.accent} />
                : <>
                    <Text style={s.sheetOptionIcon}>📚</Text>
                    <View style={s.sheetOptionText}>
                      <Text style={s.sheetOptionTitle}>Mi colección</Text>
                      <Text style={s.sheetOptionSub}>Añadir como pendiente</Text>
                    </View>
                    <Text style={s.sheetOptionArrow}>›</Text>
                  </>}
            </TouchableOpacity>

            {/* Opción: Wishreads */}
            <TouchableOpacity
              style={[s.sheetOption, busy === sheetItem?.google_books_id + '_wish' && s.sheetOptionBusy]}
              onPress={() => sheetItem && añadirWishreads(sheetItem)}
              disabled={!!busy}
            >
              {busy === sheetItem?.google_books_id + '_wish'
                ? <ActivityIndicator size="small" color="#ffd466" />
                : <>
                    <Text style={s.sheetOptionIcon}>✨</Text>
                    <View style={s.sheetOptionText}>
                      <Text style={s.sheetOptionTitle}>Wishreads</Text>
                      <Text style={s.sheetOptionSub}>Para leer en el futuro</Text>
                    </View>
                    <Text style={s.sheetOptionArrow}>›</Text>
                  </>}
            </TouchableOpacity>

            {/* Opción: Biblioteca */}
            <TouchableOpacity
              style={[s.sheetOption, showLibPicker && s.sheetOptionActive]}
              onPress={() => setShowLibPicker(p => !p)}
              disabled={!!busy}
            >
              <Text style={s.sheetOptionIcon}>🗂</Text>
              <View style={s.sheetOptionText}>
                <Text style={s.sheetOptionTitle}>Una biblioteca</Text>
                <Text style={s.sheetOptionSub}>Añadir a colección y biblioteca</Text>
              </View>
              <Text style={s.sheetOptionArrow}>{showLibPicker ? '∨' : '›'}</Text>
            </TouchableOpacity>

            {/* Picker de bibliotecas */}
            {showLibPicker && (
              <View style={s.libPicker}>
                {libraries.length === 0 ? (
                  <Text style={{ color: Colors.muted, fontSize: 13, padding: 12, textAlign: 'center' }}>
                    No tienes bibliotecas aún
                  </Text>
                ) : (
                  libraries.map(lib => (
                    <TouchableOpacity
                      key={lib.id}
                      style={[s.libPickerItem, busy === sheetItem?.google_books_id + '_lib' && { opacity: 0.5 }]}
                      onPress={() => sheetItem && añadirBiblioteca(sheetItem, lib.id)}
                      disabled={!!busy}
                    >
                      <Text style={{ fontSize: 20 }}>{lib.emoji}</Text>
                      <Text style={s.libPickerName}>{lib.nombre}</Text>
                      {busy === sheetItem?.google_books_id + '_lib'
                        ? <ActivityIndicator size="small" color={Colors.accent} />
                        : <Text style={{ color: Colors.accent, fontSize: 18 }}>+</Text>}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            <TouchableOpacity style={s.cancelBtn} onPress={cerrarSheet}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  header:        { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 8 },
  headerTitle:   { fontSize: 22, fontWeight: '800', color: Colors.text },
  headerSub:     { fontSize: 13, color: Colors.muted, marginTop: 2 },
  searchRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: 14 },
  searchInput:   { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md,
                   borderWidth: 1, borderColor: Colors.border, color: Colors.text, padding: 13, fontSize: 15 },
  scanBtn:       { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1,
                   borderColor: Colors.border, width: 48, alignItems: 'center', justifyContent: 'center' },
  searchBtn:     { backgroundColor: Colors.accent, borderRadius: Radius.md,
                   paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 15 },
  empty:         { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub:      { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },

  // Tarjeta resultado
  card:     { flexDirection: 'row', gap: 12, backgroundColor: Colors.card,
              borderRadius: Radius.lg, padding: 12, marginBottom: 12,
              borderWidth: 1, borderColor: Colors.border },
  cover:    { width: 74, height: 110, borderRadius: Radius.sm },
  nocover:  { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  info:     { flex: 1, gap: 4 },
  title:    { fontSize: 15, fontWeight: '700', color: Colors.text },
  author:   { fontSize: 13, color: Colors.muted },
  year:     { fontSize: 12, color: Colors.muted, opacity: 0.7 },
  desc:     { fontSize: 12, color: Colors.muted, lineHeight: 18 },
  actions:  { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  addBtn:   { backgroundColor: Colors.accent + 'cc', borderRadius: Radius.md,
              paddingHorizontal: 12, paddingVertical: 7,
              borderWidth: 1, borderColor: Colors.accent + '55' },
  addBtnText: { color: Colors.bg, fontSize: 12, fontWeight: '700' },
  badgePill:  { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  badgePillText: { fontSize: 12, fontWeight: '700' },

  // Escáner
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      padding: 20, paddingTop: 60 },
  scannerTitle:     { fontSize: 18, fontWeight: '700', color: '#fff' },
  scannerCloseBtn:  { backgroundColor: 'transparent', borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.3)', borderRadius: 10,
                      paddingHorizontal: 14, paddingVertical: 8 },
  scannerCloseTxt:  { color: '#fff', fontSize: 14 },
  camera:           { flex: 1 },
  scanOverlay:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame:        { width: 260, height: 160, borderWidth: 2,
                      borderColor: 'rgba(122,162,255,0.6)', borderRadius: 12 },
  scanLine:         { position: 'absolute', left: '10%', right: '10%', height: 2,
                      backgroundColor: 'rgba(122,162,255,0.8)',
                      shadowColor: Colors.accent, shadowOpacity: 0.8, shadowRadius: 4 },
  scannerHint:      { color: '#a9b7d6', fontSize: 14, textAlign: 'center', padding: 20, paddingBottom: 40 },

  // Bottom sheet
  overlay:    { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet:      { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                borderWidth: 1, borderColor: Colors.border,
                paddingHorizontal: Spacing.lg, paddingBottom: 40, paddingTop: Spacing.md },
  sheetHandle:{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
                alignSelf: 'center', marginBottom: Spacing.md },

  // Mini preview libro
  sheetBook:       { flexDirection: 'row', gap: 12, alignItems: 'center',
                     backgroundColor: Colors.bg, borderRadius: Radius.md,
                     padding: Spacing.sm, marginBottom: Spacing.md,
                     borderWidth: 1, borderColor: Colors.border },
  sheetCover:      { width: 44, height: 64, borderRadius: Radius.sm, backgroundColor: Colors.border },
  sheetBookTitle:  { color: Colors.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  sheetBookAuthor: { color: Colors.muted, fontSize: 13 },

  sheetLabel: { color: Colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase',
                letterSpacing: 0.8, marginBottom: Spacing.sm },

  // Opciones del sheet
  sheetOption:      { flexDirection: 'row', alignItems: 'center', gap: 12,
                      backgroundColor: Colors.bg, borderRadius: Radius.md,
                      padding: Spacing.md, marginBottom: 8,
                      borderWidth: 1, borderColor: Colors.border, minHeight: 60 },
  sheetOptionBusy:  { opacity: 0.6 },
  sheetOptionActive:{ borderColor: Colors.accent + '66', backgroundColor: Colors.accent + '0d' },
  sheetOptionIcon:  { fontSize: 24, width: 32, textAlign: 'center' },
  sheetOptionText:  { flex: 1 },
  sheetOptionTitle: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  sheetOptionSub:   { color: Colors.muted, fontSize: 12, marginTop: 1 },
  sheetOptionArrow: { color: Colors.muted, fontSize: 20, fontWeight: '300' },

  // Picker de bibliotecas
  libPicker:     { backgroundColor: Colors.bg, borderRadius: Radius.md,
                   borderWidth: 1, borderColor: Colors.accent + '33',
                   marginBottom: 8, overflow: 'hidden' },
  libPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12,
                   padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  libPickerName: { flex: 1, color: Colors.text, fontWeight: '600', fontSize: 14 },

  cancelBtn:     { marginTop: 4, alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { color: Colors.muted, fontSize: 14 },
});
