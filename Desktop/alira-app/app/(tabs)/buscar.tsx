// app/(tabs)/buscar.tsx
// Búsqueda Google Books → añadir a colección o a Wishreads

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, apiFetch } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image,
  SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View,
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
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  // Tracking por google_books_id
  const [addedCol, setAddedCol]   = useState<Set<string>>(new Set());
  const [addedWish, setAddedWish] = useState<Set<string>>(new Set());
  const [addingCol, setAddingCol]   = useState<string | null>(null);
  const [addingWish, setAddingWish] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem('access_token').then(t => {
      if (!t) router.replace('/login');
    });
  }, []);

  const buscar = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResults([]);
    const { ok, data } = await api.search(q);
    setLoading(false);
    if (ok) setResults(data.data?.results || []);
    else Alert.alert('Error', 'No se pudo buscar. Comprueba tu conexión.');
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
    else Alert.alert('Error', data?.message || 'No se pudo añadir el libro.');
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
    const id        = item.google_books_id;
    const inCol     = addedCol.has(id);
    const inWish    = addedWish.has(id);
    const loadingC  = addingCol === id;
    const loadingW  = addingWish === id;

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
            {/* Añadir a colección */}
            <TouchableOpacity
              style={[s.addBtn, (inCol || loadingC) && s.addBtnDone]}
              onPress={() => añadirColeccion(item)}
              disabled={inCol || loadingC}
            >
              {loadingC
                ? <ActivityIndicator size="small" color={Colors.bg} />
                : <Text style={s.addBtnText}>{inCol ? '✓ Colección' : '+ Colección'}</Text>}
            </TouchableOpacity>

            {/* Añadir a Wishreads */}
            <TouchableOpacity
              style={[s.wishBtn, (inWish || loadingW) && s.wishBtnDone]}
              onPress={() => añadirWishreads(item)}
              disabled={inWish || loadingW}
            >
              {loadingW
                ? <ActivityIndicator size="small" color="#ffd466" />
                : <Text style={s.wishBtnText}>{inWish ? '✓ Wishreads' : '✨ Wishreads'}</Text>}
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

      <View style={s.searchRow}>
        <TextInput
          ref={inputRef}
          style={s.searchInput}
          placeholder="Título, autor o ISBN..."
          placeholderTextColor={Colors.muted}
          value={query} onChangeText={setQuery}
          onSubmitEditing={buscar}
          returnKeyType="search"
          autoCapitalize="none" autoCorrect={false}
        />
        <TouchableOpacity style={s.searchBtn} onPress={buscar} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color={Colors.bg} />
            : <Text style={s.searchBtnText}>Buscar</Text>}
        </TouchableOpacity>
      </View>

      {results.length === 0 && !loading && (
        <View style={s.empty}>
          <Text style={{ fontSize: 52, marginBottom: 14 }}>📖</Text>
          <Text style={s.emptyTitle}>Busca un libro</Text>
          <Text style={s.emptySub}>Escribe el título o autor arriba{'\n'}y pulsa Buscar</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.google_books_id || item.titulo}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  header:        { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 8 },
  headerTitle:   { fontSize: 22, fontWeight: '800', color: Colors.text },
  headerSub:     { fontSize: 13, color: Colors.muted, marginTop: 2 },
  searchRow:     { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, marginBottom: 14 },
  searchInput:   { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md,
                   borderWidth: 1, borderColor: Colors.border,
                   color: Colors.text, padding: 13, fontSize: 15 },
  searchBtn:     { backgroundColor: Colors.accent, borderRadius: Radius.md,
                   paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 15 },
  empty:         { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub:      { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  card:          { flexDirection: 'row', gap: 12, backgroundColor: Colors.card,
                   borderRadius: Radius.lg, padding: 12, marginBottom: 12,
                   borderWidth: 1, borderColor: Colors.border },
  cover:         { width: 74, height: 110, borderRadius: Radius.sm },
  nocover:       { backgroundColor: 'rgba(255,255,255,0.05)',
                   justifyContent: 'center', alignItems: 'center' },
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
  wishBtnDone:   { backgroundColor: 'rgba(255,200,80,.22)', borderColor: 'rgba(255,200,80,.5)' },
  wishBtnText:   { color: '#ffd466', fontSize: 12, fontWeight: '700' },
});
