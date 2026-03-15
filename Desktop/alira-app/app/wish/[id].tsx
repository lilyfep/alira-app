// app/wish/[id].tsx
// Pantalla de detalle de wishread — reemplaza el modal de wishreads

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, apiFetch } from '@/lib/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Linking, Platform, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const AMAZON_TAG = 'alirabooks-21';

const PRIORIDAD_META: Record<string, { color: string; label: string }> = {
  alta:  { color: '#ffb450', label: '🔥 Alta' },
  media: { color: Colors.accent, label: '◉ Media' },
  baja:  { color: '#64c878', label: '· Baja' },
};

export default function WishDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [wish, setWish]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [moving, setMoving]   = useState(false);

  const [editPrioridad, setEditPrioridad] = useState('media');
  const [editRec,       setEditRec]       = useState('');
  const [editNotas,     setEditNotas]     = useState('');

  useEffect(() => { loadWish(); }, [id]);

  const loadWish = async () => {
    const { ok, data } = await api.getWishreads();
    if (ok) {
      const items = data.data?.wishreads || [];
      const found = items.find((w: any) => String(w.id) === String(id));
      if (found) {
        setWish(found);
        setEditPrioridad(found.prioridad || 'media');
        setEditRec(found.recomendado_por || '');
        setEditNotas(found.notas || '');
      }
    }
    setLoading(false);
  };

  const guardar = async () => {
    if (!wish) return;
    setSaving(true);
    const { ok, data } = await api.updateWishread(wish.id, {
      prioridad: editPrioridad, recomendado_por: editRec, notas: editNotas,
    });
    setSaving(false);
    if (ok) {
      Alert.alert('✅ Guardado', 'Los cambios se han guardado.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Error', data?.message || 'No se pudo guardar.');
    }
  };

  const moverAColeccion = () => {
    Alert.alert('¿Mover a tu colección?', `"${wish.title}" pasará a Mi Colección.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Mover', onPress: async () => {
        setMoving(true);
        const { ok, data } = await apiFetch(`/wishreads/${wish.id}/move`, { method: 'POST' });
        setMoving(false);
        if (ok) {
          Alert.alert('¡Listo!', 'Libro añadido a tu colección.', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          Alert.alert('Error', data?.message || 'No se pudo mover.');
        }
      }},
    ]);
  };

  const eliminar = () => {
    Alert.alert('Eliminar de Wishreads', `¿Eliminar "${wish?.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const { ok } = await api.deleteWishread(wish.id);
        if (ok) router.back();
        else Alert.alert('Error', 'No se pudo eliminar.');
      }},
    ]);
  };

  const abrirAmazon = () => {
    if (!wish) return;
    const q = encodeURIComponent(`${wish.title} ${wish.author}`.trim());
    Linking.openURL(`https://www.amazon.es/s?k=${q}&tag=${AMAZON_TAG}`);
  };

  if (loading) return (
    <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
  );

  if (!wish) return (
    <View style={s.centered}><Text style={{ color: Colors.muted }}>No encontrado</Text></View>
  );

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{wish.title}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Portada + info */}
          <View style={s.topRow}>
            {wish.cover
              ? <Image source={{ uri: wish.cover }} style={s.cover} />
              : <View style={[s.cover, s.nocover]}><Text style={{ fontSize: 36 }}>✨</Text></View>}
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.bookTitle}>{wish.title}</Text>
              <Text style={s.bookAuthor}>{wish.author}</Text>
              {wish.year     ? <InfoRow icon="📅" label={wish.year} /> : null}
              {wish.category ? <InfoRow icon="🏷" label={wish.category} /> : null}
              {wish.language ? <InfoRow icon="🌐" label={wish.language.toUpperCase()} /> : null}
            </View>
          </View>

          {wish.description ? <ExpandableDesc text={wish.description} /> : null}

          <View style={s.divider} />

          {/* Prioridad */}
          <Text style={s.sLabel}>Prioridad</Text>
          <View style={s.pillRow}>
            {(['alta', 'media', 'baja'] as const).map(p => {
              const m = PRIORIDAD_META[p];
              const active = editPrioridad === p;
              return (
                <TouchableOpacity key={p}
                  style={[s.pill, active && { backgroundColor: m.color + '22', borderColor: m.color + '55' }]}
                  onPress={() => setEditPrioridad(p)}>
                  <Text style={[s.pillText, active && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Recomendado por */}
          <Text style={s.sLabel}>Recomendado por</Text>
          <TextInput style={s.fInput} value={editRec} onChangeText={setEditRec}
            placeholder="¿Quién te lo recomendó?" placeholderTextColor={Colors.muted} />

          {/* Notas */}
          <Text style={s.sLabel}>Notas personales</Text>
          <TextInput style={[s.fInput, { minHeight: 100, paddingTop: 12, marginBottom: 16 }]}
            value={editNotas} onChangeText={setEditNotas}
            placeholder="Por qué quieres leerlo..." placeholderTextColor={Colors.muted}
            multiline numberOfLines={4} textAlignVertical="top" />

          {/* Guardar */}
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={guardar} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.bg} />
              : <Text style={s.saveBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>

          {/* Amazon */}
          <TouchableOpacity style={s.amazonBtn} onPress={abrirAmazon}>
            <Text style={s.amazonBtnText}>🛒 Ver en Amazon</Text>
          </TouchableOpacity>

          {/* Mover a colección */}
          <TouchableOpacity style={[s.moveBtn, moving && { opacity: 0.6 }]}
            onPress={moverAColeccion} disabled={moving}>
            {moving ? <ActivityIndicator color={Colors.accent} />
              : <Text style={s.moveBtnText}>📚 Ya lo tengo → Mover a colección</Text>}
          </TouchableOpacity>

          {/* Eliminar */}
          <TouchableOpacity style={s.deleteBtn} onPress={eliminar}>
            <Text style={s.deleteBtnText}>🗑 Eliminar de Wishreads</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ExpandableDesc({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: Colors.muted, fontSize: 13, lineHeight: 20 }}
        numberOfLines={expanded ? undefined : 3}>{text}</Text>
      <TouchableOpacity onPress={() => setExpanded(v => !v)} style={{ marginTop: 4 }}>
        <Text style={{ color: Colors.accent, fontSize: 13, fontWeight: '700' }}>
          {expanded ? 'Ver menos ↑' : 'Ver más ↓'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 13 }}>{icon}</Text>
      <Text style={{ fontSize: 13, color: Colors.muted }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 12,
                  borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:      { paddingRight: 4 },
  backText:     { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  headerTitle:  { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll:       { padding: Spacing.lg, paddingBottom: 60 },
  topRow:       { flexDirection: 'row', gap: 14, marginBottom: 14 },
  cover:        { width: 100, height: 148, borderRadius: Radius.md },
  nocover:      { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  bookTitle:    { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  bookAuthor:   { fontSize: 14, color: Colors.muted, marginBottom: 6 },
  divider:      { height: 1, backgroundColor: Colors.border, marginBottom: 20 },
  sLabel:       { fontSize: 11, fontWeight: '700', color: Colors.muted,
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  fInput:       { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border,
                  color: Colors.text, padding: 13, fontSize: 15, marginBottom: 14 },
  pillRow:      { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  pill:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full,
                  borderWidth: 1, borderColor: Colors.border },
  pillText:     { color: Colors.muted, fontSize: 14, fontWeight: '600' },
  saveBtn:      { backgroundColor: Colors.accent, borderRadius: Radius.md,
                  padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText:  { color: Colors.bg, fontSize: 16, fontWeight: '800' },
  amazonBtn:    { backgroundColor: '#FF990022', borderRadius: Radius.md, borderWidth: 1,
                  borderColor: '#FF9900', padding: 14, alignItems: 'center', marginBottom: 10 },
  amazonBtnText:{ color: '#FF9900', fontSize: 15, fontWeight: '800' },
  moveBtn:      { backgroundColor: Colors.accent + '11', borderRadius: Radius.md, borderWidth: 1,
                  borderColor: Colors.accent + '33', padding: 14, alignItems: 'center', marginBottom: 10 },
  moveBtnText:  { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  deleteBtn:    { padding: 14, alignItems: 'center' },
  deleteBtnText:{ color: Colors.danger, fontSize: 14 },
});
