// app/libro/[id].tsx
// Pantalla de detalle de libro — reemplaza el modal de colección
// Navegación nativa con router.push('/libro/123')

import { Colors, PRIORIDAD_OPTIONS, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Linking, Platform, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const AMAZON_TAG = 'alirabooks-21';

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

export default function LibroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

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

  useEffect(() => {
    loadBook();
  }, [id]);

  const loadBook = async () => {
    const { ok, data } = await api.getBooks();
    if (ok) {
      const books = data.data?.books || [];
      const found = books.find((b: any) => String(b.id) === String(id));
      if (found) {
        setBook(found);
        setEditEstado(found.estado || 'pendiente');
        setEditPrioridad(found.prioridad || '');
        setEditValoracion(found.valoracion || 0);
        setEditComentarios(found.comentarios || '');
        setEditUbicacion(found.ubicacion || 'estanteria');
        setEditPrestadoA(found.prestado_a || '');
        setEditFechaPrestamo(found.fecha_prestamo || '');
        setEditFechaInicio(found.fecha_inicio || '');
        setEditFechaFin(found.fecha_fin || '');
        setEditPrecioVenta(found.precio_venta ? String(found.precio_venta) : '');
        setEditFechaVenta(found.fecha_venta || '');
      }
    }
    setLoading(false);
  };

  const saveBook = async () => {
    if (!book) return;
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
    const { ok, data } = await api.updateBook(book.id, payload);
    setSaving(false);
    if (ok) {
      Alert.alert('✅ Guardado', 'Los cambios se han guardado.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Error', data?.message || 'No se pudo guardar.');
    }
  };

  const abrirAmazon = () => {
    if (!book) return;
    const q = encodeURIComponent(`${book.title} ${book.author}`.trim());
    Linking.openURL(`https://www.amazon.es/s?k=${q}&tag=${AMAZON_TAG}`);
  };

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );

  if (!book) return (
    <View style={s.centered}>
      <Text style={{ color: Colors.muted }}>Libro no encontrado</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{book.title}</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Portada + info */}
          <View style={s.topRow}>
            {book.cover
              ? <Image source={{ uri: book.cover }} style={s.cover} />
              : <View style={[s.cover, s.nocover]}><Text style={{ fontSize: 36 }}>📚</Text></View>}
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.bookTitle}>{book.title}</Text>
              <Text style={s.bookAuthor}>{book.author}</Text>
              {book.category ? <InfoRow icon="🏷" label={book.category} /> : null}
              {book.year     ? <InfoRow icon="📅" label={book.year} /> : null}
              {book.language ? <InfoRow icon="🌐" label={book.language.toUpperCase()} /> : null}
              {book.alta     ? <InfoRow icon="➕" label={`Añadido ${book.alta}`} /> : null}
            </View>
          </View>

          {book.description ? <ExpandableDesc text={book.description} /> : null}

          <View style={s.divider} />

          {/* Estado */}
          <Text style={s.sLabel}>Estado de lectura</Text>
          <View style={s.pillRow}>
            {ESTADO_OPTIONS.map(o => (
              <TouchableOpacity key={o.value}
                style={[s.pill, editEstado === o.value && s.pillActive]}
                onPress={() => setEditEstado(o.value)}>
                <Text style={[s.pillText, editEstado === o.value && { color: Colors.accent }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fechas */}
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.fLabel}>Inicio lectura</Text>
              <TextInput style={s.fInput} value={editFechaInicio} onChangeText={setEditFechaInicio}
                placeholder="AAAA-MM-DD" placeholderTextColor={Colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fLabel}>Fin lectura</Text>
              <TextInput style={s.fInput} value={editFechaFin} onChangeText={setEditFechaFin}
                placeholder="AAAA-MM-DD" placeholderTextColor={Colors.muted} />
            </View>
          </View>

          {/* Valoración + Amazon */}
          <Text style={s.sLabel}>Valoración</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setEditValoracion(editValoracion === n ? 0 : n)}>
                  <Text style={{ fontSize: 28, opacity: n <= editValoracion ? 1 : 0.2 }}>⭐</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.amazonBtn} onPress={abrirAmazon}>
              <Text style={{ fontSize: 22 }}>🎁</Text>
              <Text style={s.amazonBtnText}>Comprar</Text>
            </TouchableOpacity>
          </View>

          {/* Prioridad */}
          <Text style={s.sLabel}>Prioridad</Text>
          <View style={s.pillRow}>
            {PRIORIDAD_OPTIONS.map(o => (
              <TouchableOpacity key={o.value}
                style={[s.pill, editPrioridad === o.value && s.pillActive]}
                onPress={() => setEditPrioridad(editPrioridad === o.value ? '' : o.value)}>
                <Text style={[s.pillText, editPrioridad === o.value && { color: Colors.accent }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Comentarios */}
          <Text style={s.sLabel}>Comentarios</Text>
          <TextInput style={[s.fInput, { minHeight: 100, paddingTop: 12, marginBottom: 16 }]}
            value={editComentarios} onChangeText={setEditComentarios}
            placeholder="Tus notas sobre este libro..." placeholderTextColor={Colors.muted}
            multiline numberOfLines={4} textAlignVertical="top" />

          {/* Ubicación */}
          <Text style={s.sLabel}>Ubicación</Text>
          <View style={s.pillRow}>
            {UBICACION_OPTIONS.map(o => (
              <TouchableOpacity key={o.value}
                style={[s.pill, editUbicacion === o.value && s.pillActive]}
                onPress={() => setEditUbicacion(editUbicacion === o.value ? '' : o.value)}>
                <Text style={[s.pillText, editUbicacion === o.value && { color: Colors.accent }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Prestado */}
          {editUbicacion === 'prestado' && (
            <View style={s.row2}>
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

          {/* Vendido */}
          {editUbicacion === 'vendido' && (
            <View style={s.row2}>
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

          {/* Guardar */}
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveBook} disabled={saving}>
            {saving
              ? <ActivityIndicator color={Colors.bg} />
              : <Text style={s.saveBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

function ExpandableDesc({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.desc} numberOfLines={expanded ? undefined : 3}>{text}</Text>
      <TouchableOpacity onPress={() => setExpanded(v => !v)} style={{ marginTop: 4 }}>
        <Text style={{ color: Colors.accent, fontSize: 13, fontWeight: '700' }}>
          {expanded ? 'Ver menos ↑' : 'Ver más ↓'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 12,
               paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 12,
               borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:   { paddingRight: 4 },
  backText:  { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll:    { padding: Spacing.lg, paddingBottom: 60 },
  topRow:    { flexDirection: 'row', gap: 14, marginBottom: 14 },
  cover:     { width: 100, height: 148, borderRadius: Radius.md },
  nocover:   { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  bookTitle: { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  bookAuthor:{ fontSize: 14, color: Colors.muted, marginBottom: 6 },
  desc:      { color: Colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  divider:   { height: 1, backgroundColor: Colors.border, marginBottom: 20 },
  sLabel:    { fontSize: 11, fontWeight: '700', color: Colors.muted,
               textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  fLabel:    { fontSize: 12, color: Colors.muted, marginBottom: 6 },
  fInput:    { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
               borderWidth: 1, borderColor: Colors.border,
               color: Colors.text, padding: 13, fontSize: 15, marginBottom: 14 },
  pillRow:   { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  pill:      { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full,
               borderWidth: 1, borderColor: Colors.border },
  pillActive:{ backgroundColor: Colors.accent + '22', borderColor: Colors.accent + '55' },
  pillText:  { color: Colors.muted, fontSize: 14, fontWeight: '600' },
  row2:      { flexDirection: 'row', gap: 10 },
  amazonBtn: { backgroundColor: '#FF990022', borderRadius: Radius.md, borderWidth: 1,
               borderColor: '#FF9900', padding: 8, width: 68,
               alignItems: 'center', justifyContent: 'center' },
  amazonBtnText: { color: '#FF9900', fontSize: 10, fontWeight: '800', marginTop: 2 },
  saveBtn:   { backgroundColor: Colors.accent, borderRadius: Radius.md,
               padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '800' },
});
