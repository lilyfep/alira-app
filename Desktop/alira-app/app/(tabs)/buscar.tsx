// app/(tabs)/buscar.tsx
// Búsqueda Google Books + escáner ISBN con cámara

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, apiFetch } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal,
  SafeAreaView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
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

export default function BuscarScreen() {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [addedCol, setAddedCol]   = useState<Set<string>>(new Set());
  const [addedWish, setAddedWish] = useState<Set<string>>(new Set());
  const [addingCol, setAddingCol]   = useState<string | null>(null);
  const [addingWish, setAddingWish] = useState<string | null>(null);

  // Escáner ISBN
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission]     = useCameraPermissions();
  const scanned = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('access_token').then(t => {
      if (!t) router.replace('/login');
    });
  }, []);

  const buscar = async (q?: string) => {
    const term = (q || query).trim();
    if (!term) return;
    setLoading(true);
    setResults([]);
    const { ok, data } = await api.search(term);
    setLoading(false);
    if (ok) setResults(data.data?.results || []);
    else Alert.alert('Error', 'No se pudo buscar. Comprueba tu conexión.');
  };

  const abrirScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Cámara', 'Necesitamos permiso para acceder a la cámara.');
        return;
      }
    }
    scanned.current = false;
    setScannerVisible(true);
  };

  const onBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned.current) return;
    scanned.current = true;
    setScannerVisible(false);
    setQuery(data);
    buscar(data);
  };

  const añadirColeccion = async (item: SearchResult) => {
    const id = item.google_books_id;
    setAddingCol(id);
    const { ok, data } = await apiFetch('/books/add', {
      method: 'POST',
      body: JSON.stringify({
        title: item.titulo, author: item.autor, cover: item.portada_url,
        year: item.anio_publicacion, description: item.descripcion,
        language: item.idioma, category: item.categorias?.[0] || '',
        estado: 'pendiente',
      }),
    });
    setAddingCol(null);
    if (ok) setAddedCol(prev => new Set([...prev, id]));
    else if (data?.message?.includes('límite')) {
      Alert.alert('Límite alcanzado', data.message, [
        { text: 'Ver Alira+', onPress: () => router.push('/(tabs)/premium') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Error', data?.message || 'No se pudo añadir.');
    }
  };

  const añadirWishreads = async (item: SearchResult) => {
    const id = item.google_books_id;
    setAddingWish(id);
    const { ok, data } = await api.addWishread({
      title: item.titulo, author: item.autor, cover: item.portada_url,
      year: item.anio_publicacion, description: item.descripcion,
      language: item.idioma, category: item.categorias?.[0] || '',
      prioridad: 'media',
    });
    setAddingWish(null);
    if (ok) setAddedWish(prev => new Set([...prev, id]));
    else Alert.alert('Error', data?.message || 'No se pudo añadir a Wishreads.');
  };

  const renderItem = ({ item }: { item: SearchResult }) => {
    const id       = item.google_books_id;
    const inCol    = addedCol.has(id);
    const inWish   = addedWish.has(id);
    const loadingC = addingCol === id;
    const loadingW = addingWish === id;

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
            <TouchableOpacity
              style={[s.addBtn, (inCol || loadingC) && s.addBtnDone]}
              onPress={() => añadirColeccion(item)}
              disabled={inCol || !!loadingC}>
              {loadingC
                ? <ActivityIndicator size="small" color={Colors.bg} />
                : <Text style={[s.addBtnText, inCol && { color: Colors.success }]}>
                    {inCol ? '✓ Añadido' : '+ Colección'}
                  </Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.wishBtn, (inWish || loadingW) && s.wishBtnDone]}
              onPress={() => añadirWishreads(item)}
              disabled={inWish || !!loadingW}>
              {loadingW
                ? <ActivityIndicator size="small" color="#ffd466" />
                : <Text style={[s.wishBtnText, inWish && { opacity: 0.5 }]}>
                    {inWish ? '✓ Wishreads' : '✨ Wishreads'}
                  </Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🔍 Buscar libros</Text>
        <Text style={s.headerSub}>Añade a tu colección o Wishreads</Text>
      </View>

      {/* Barra de búsqueda + escáner */}
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
        {/* Botón escáner ISBN */}
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
          <Text style={s.emptySub}>
            Escribe el título o autor{'\n'}o escanea el código de barras 📷
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.google_books_id || item.titulo}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}
      />

      {/* ── Modal escáner ISBN ── */}
      <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
        <View style={s.scannerContainer}>
          <View style={s.scannerHeader}>
            <Text style={s.scannerTitle}>📷 Escanear ISBN</Text>
            <TouchableOpacity
              style={s.scannerCloseBtn}
              onPress={() => setScannerVisible(false)}>
              <Text style={s.scannerCloseTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {permission?.granted && (
            <CameraView
              style={s.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128'] }}
              onBarcodeScanned={onBarCodeScanned}
            >
              {/* Marco de escaneo */}
              <View style={s.scanOverlay}>
                <View style={s.scanFrame} />
                <View style={s.scanLine} />
              </View>
            </CameraView>
          )}

          <Text style={s.scannerHint}>
            Apunta la cámara al código de barras del libro
          </Text>
        </View>
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
                   borderWidth: 1, borderColor: Colors.border,
                   color: Colors.text, padding: 13, fontSize: 15 },
  scanBtn:       { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1,
                   borderColor: Colors.border, width: 48, alignItems: 'center', justifyContent: 'center' },
  searchBtn:     { backgroundColor: Colors.accent, borderRadius: Radius.md,
                   paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 15 },
  empty:         { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub:      { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  card:          { flexDirection: 'row', gap: 12, backgroundColor: Colors.card,
                   borderRadius: Radius.lg, padding: 12, marginBottom: 12,
                   borderWidth: 1, borderColor: Colors.border },
  cover:         { width: 74, height: 110, borderRadius: Radius.sm },
  nocover:       { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  info:          { flex: 1, gap: 4 },
  title:         { fontSize: 15, fontWeight: '700', color: Colors.text },
  author:        { fontSize: 13, color: Colors.muted },
  year:          { fontSize: 12, color: Colors.muted, opacity: 0.7 },
  desc:          { fontSize: 12, color: Colors.muted, lineHeight: 18 },
  actions:       { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  addBtn:        { backgroundColor: Colors.accent + 'cc', borderRadius: Radius.md,
                   paddingHorizontal: 12, paddingVertical: 7,
                   borderWidth: 1, borderColor: Colors.accent + '55' },
  addBtnDone:    { backgroundColor: Colors.success + '22', borderColor: Colors.success + '44' },
  addBtnText:    { color: Colors.bg, fontSize: 12, fontWeight: '700' },
  wishBtn:       { backgroundColor: 'rgba(255,200,80,.12)', borderRadius: Radius.md,
                   paddingHorizontal: 12, paddingVertical: 7,
                   borderWidth: 1, borderColor: 'rgba(255,200,80,.3)' },
  wishBtnDone:   { opacity: 0.6 },
  wishBtnText:   { color: '#ffd466', fontSize: 12, fontWeight: '700' },

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
  scannerHint:      { color: '#a9b7d6', fontSize: 14, textAlign: 'center',
                      padding: 20, paddingBottom: 40 },
});
