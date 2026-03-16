// app/bibliotecas/[id].tsx
// Detalle de una biblioteca — lista de libros con opción de quitar

import { Colors, ESTADO_META, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, Pressable,
  SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const EMOJIS = ['📚','📖','✨','🌟','❤️','🔥','🎯','🏆','🌙','☀️','🎭','🎪','🌈','💫','🦋','🌺'];
const COLORS = ['#7aa2ff','#ff6b9d','#ffd466','#64c878','#ff9900','#c084fc','#38bdf8','#fb7185'];

interface LibBook {
  id: number; title: string; author: string; cover: string; estado: string;
}

export default function LibraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lib, setLib]           = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editEmoji, setEditEmoji]   = useState('📚');
  const [editColor, setEditColor]   = useState('#7aa2ff');
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const loadLib = useCallback(async () => {
    const { ok, data } = await api.getLibrary(parseInt(id));
    if (ok) {
      setLib(data.data);
      setEditNombre(data.data.nombre);
      setEditEmoji(data.data.emoji);
      setEditColor(data.data.color);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { loadLib(); }, [loadLib]));

  const saveEdit = async () => {
    setSaving(true);
    const { ok } = await api.updateLibrary(parseInt(id), {
      nombre: editNombre, emoji: editEmoji, color: editColor,
    });
    setSaving(false);
    if (ok) { setShowEdit(false); loadLib(); }
    else Alert.alert('Error', 'No se pudo guardar.');
  };

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

  const removeBook = (book: LibBook) => {
    Alert.alert('¿Quitar de la biblioteca?', `"${book.title}" se quitará de "${lib?.nombre}".`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: async () => {
        const { ok } = await api.removeBookFromLibrary(parseInt(id), book.id);
        if (ok) loadLib();
        else Alert.alert('Error', 'No se pudo quitar.');
      }},
    ]);
  };

  const renderBook = ({ item }: { item: LibBook }) => {
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
          <View style={[s.badge, { backgroundColor: meta.color + '22' }]}>
            <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.removeBtn} onPress={() => removeBook(item)}>
          <Text style={{ color: Colors.danger, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (!lib)    return <View style={s.centered}><Text style={{ color: Colors.muted }}>No encontrada</Text></View>;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 24 }}>{lib.emoji}</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{lib.nombre}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowEdit(true)}>
          <Text style={{ color: Colors.muted, fontSize: 14 }}>Editar</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[s.statsRow, { borderColor: lib.color + '33' }]}>
        <Text style={[s.statsNum, { color: lib.color }]}>{lib.total_books}</Text>
        <Text style={s.statsLabel}>{lib.total_books === 1 ? 'libro' : 'libros'} en esta biblioteca</Text>
      </View>

      {lib.books?.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>{lib.emoji}</Text>
          <Text style={s.emptyTitle}>Biblioteca vacía</Text>
          <Text style={s.emptySub}>
            Añade libros desde su ficha pulsando{'\n'}"Añadir a biblioteca"
          </Text>
        </View>
      ) : (
        <FlatList
          data={lib.books}
          keyExtractor={i => i.id.toString()}
          renderItem={renderBook}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40, paddingTop: 8 }}
        />
      )}

      {/* Botón eliminar biblioteca */}
      <TouchableOpacity style={s.deleteBibBtn} onPress={deleteLib} disabled={deleting}>
        {deleting ? <ActivityIndicator color={Colors.danger} />
          : <Text style={s.deleteBibText}>🗑 Eliminar biblioteca</Text>}
      </TouchableOpacity>

      {/* Modal editar */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <Pressable style={s.overlay} onPress={() => setShowEdit(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Editar biblioteca</Text>

            <Text style={s.sheetLabel}>Nombre</Text>
            <TextInput style={s.input} value={editNombre} onChangeText={setEditNombre}
              placeholder="Nombre..." placeholderTextColor={Colors.muted} maxLength={50} />

            <Text style={s.sheetLabel}>Emoji</Text>
            <View style={s.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e}
                  style={[s.emojiBtn, editEmoji === e && { backgroundColor: Colors.accent + '33' }]}
                  onPress={() => setEditEmoji(e)}>
                  <Text style={{ fontSize: 24 }}>{e}</Text>
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

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveEdit} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.bg} />
                : <Text style={s.saveBtnText}>Guardar cambios</Text>}
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
  headerTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 2 },
  statsRow:     { flexDirection: 'row', alignItems: 'center', gap: 10,
                  marginHorizontal: Spacing.lg, marginVertical: 12,
                  backgroundColor: Colors.card, borderRadius: Radius.lg,
                  borderWidth: 1, padding: 14 },
  statsNum:     { fontSize: 32, fontWeight: '900' },
  statsLabel:   { fontSize: 14, color: Colors.muted },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub:     { color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  bookCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
                  borderRadius: Radius.lg, padding: 12, marginBottom: 10,
                  borderWidth: 1, borderColor: Colors.border },
  cover:        { width: 52, height: 76, borderRadius: 8 },
  nocover:      { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  bookInfo:     { flex: 1, marginLeft: 12, gap: 4 },
  bookTitle:    { fontSize: 14, fontWeight: '700', color: Colors.text },
  bookAuthor:   { fontSize: 12, color: Colors.muted },
  badge:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText:    { fontSize: 11, fontWeight: '600' },
  removeBtn:    { padding: 8 },
  deleteBibBtn: { margin: Spacing.lg, padding: 14, alignItems: 'center',
                  borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.danger + '44' },
  deleteBibText:{ color: Colors.danger, fontSize: 14, fontWeight: '700' },
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
  saveBtn:      { backgroundColor: Colors.accent, borderRadius: Radius.md, padding: 15, alignItems: 'center' },
  saveBtnText:  { color: Colors.bg, fontSize: 16, fontWeight: '800' },
});
