// app/bibliotecas/index.tsx
// Lista de todas las bibliotecas personalizadas del usuario

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

const EMOJIS = ['📚','📖','✨','🌟','❤️','🔥','🎯','🏆','🌙','☀️','🎭','🎪','🌈','💫','🦋','🌺'];
const COLORS = ['#7aa2ff','#ff6b9d','#ffd466','#64c878','#ff9900','#c084fc','#38bdf8','#fb7185'];

interface Library {
  id: number; nombre: string; emoji: string; color: string; total_books: number;
}

export default function BibliotecasScreen() {
  const [libs, setLibs]         = useState<Library[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [nombre, setNombre]     = useState('');
  const [emoji, setEmoji]       = useState('📚');
  const [color, setColor]       = useState('#7aa2ff');
  const [saving, setSaving]     = useState(false);

  const loadLibs = useCallback(async () => {
    const { ok, data } = await api.getLibraries();
    if (ok) setLibs(data.data?.libraries || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadLibs(); }, [loadLibs]));

  const onRefresh = () => { setRefreshing(true); loadLibs(); };

  const createLib = async () => {
    if (!nombre.trim()) { Alert.alert('Falta el nombre', 'Ponle nombre a tu biblioteca.'); return; }
    setSaving(true);
    const { ok, data } = await api.createLibrary(nombre.trim(), emoji, color);
    setSaving(false);
    if (ok) {
      setShowCreate(false);
      setNombre(''); setEmoji('📚'); setColor('#7aa2ff');
      loadLibs();
    } else {
      Alert.alert('Error', data?.message || 'No se pudo crear.');
    }
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mis Bibliotecas</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={s.addBtnText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

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

      {/* Modal crear biblioteca */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={s.overlay} onPress={() => setShowCreate(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Nueva biblioteca</Text>

            <Text style={s.sheetLabel}>Nombre</Text>
            <TextInput style={s.input} value={nombre} onChangeText={setNombre}
              placeholder="Ej: Favoritos, Verano 2026..." placeholderTextColor={Colors.muted}
              autoFocus maxLength={50} />

            <Text style={s.sheetLabel}>Emoji</Text>
            <View style={s.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e} style={[s.emojiBtn, emoji === e && { backgroundColor: Colors.accent + '33' }]}
                  onPress={() => setEmoji(e)}>
                  <Text style={{ fontSize: 24 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sheetLabel}>Color</Text>
            <View style={s.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorBtn, { backgroundColor: c },
                  color === c && { borderWidth: 3, borderColor: Colors.text }]}
                  onPress={() => setColor(c)} />
              ))}
            </View>

            {/* Preview */}
            <View style={[s.preview, { borderColor: color + '44' }]}>
              <View style={[s.libEmoji, { backgroundColor: color + '22' }]}>
                <Text style={{ fontSize: 28 }}>{emoji}</Text>
              </View>
              <Text style={[s.libNombre, { fontSize: 16 }]}>{nombre || 'Mi biblioteca'}</Text>
            </View>

            <TouchableOpacity style={[s.createBtn, saving && { opacity: 0.6 }]}
              onPress={createLib} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.bg} />
                : <Text style={s.createBtnText}>Crear biblioteca</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 12,
                  borderBottomWidth: 1, borderBottomColor: Colors.border },
  backText:     { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: Colors.text },
  addBtn:       { backgroundColor: Colors.accent + 'cc', borderRadius: Radius.md,
                  paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:   { color: Colors.bg, fontWeight: '800', fontSize: 14 },
  scroll:       { padding: Spacing.lg, paddingBottom: 60 },
  empty:        { alignItems: 'center', paddingTop: 60 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub:     { color: Colors.muted, textAlign: 'center', lineHeight: 22,
                  paddingHorizontal: 40, marginBottom: 24 },
  emptyBtn:     { backgroundColor: Colors.accent, borderRadius: Radius.md,
                  paddingHorizontal: 24, paddingVertical: 13 },
  emptyBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 15 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  libCard:      { width: '47%', backgroundColor: Colors.card, borderRadius: Radius.lg,
                  borderWidth: 1, padding: 16, alignItems: 'center', gap: 8 },
  libEmoji:     { width: 64, height: 64, borderRadius: 32,
                  alignItems: 'center', justifyContent: 'center' },
  libNombre:    { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  libCount:     { fontSize: 12, color: Colors.muted },
  overlay:      { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet:        { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                  borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, paddingBottom: 40 },
  sheetTitle:   { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 20 },
  sheetLabel:   { fontSize: 12, fontWeight: '700', color: Colors.muted,
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  input:        { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border,
                  color: Colors.text, padding: 13, fontSize: 16, marginBottom: 16 },
  emojiGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  emojiBtn:     { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  colorRow:     { flexDirection: 'row', gap: 10, marginBottom: 20 },
  colorBtn:     { width: 32, height: 32, borderRadius: 16 },
  preview:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.bg,
                  borderRadius: Radius.lg, borderWidth: 1, padding: 14, marginBottom: 20 },
  createBtn:    { backgroundColor: Colors.accent, borderRadius: Radius.md,
                  padding: 15, alignItems: 'center' },
  createBtnText:{ color: Colors.bg, fontSize: 16, fontWeight: '800' },
});
