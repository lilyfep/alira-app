// app/libro/[id].tsx
// Paridad total con coleccion.html + notificaciones push

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, apiFetch } from '@/lib/api';
import { checkAndNotify } from '@/lib/notifications';
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

const CATEGORIAS = [
  'Ficción', 'Ciencia Ficción', 'Fantasía', 'Terror', 'Romance',
  'Thriller', 'Histórica', 'Aventura', 'Infantil', 'Juvenil',
  'Poesía', 'Teatro', 'Clásicos', 'No ficción', 'Biografía',
  'Historia', 'Ciencia', 'Ensayo', 'Autoayuda', 'Filosofía',
  'Psicología', 'Economía', 'Viajes', 'Cocina', 'Arte', 'Cómic',
];

const IDIOMAS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Portugués' },
  { value: 'ca', label: 'Catalán' },
  { value: 'eu', label: 'Euskera' },
  { value: 'gl', label: 'Gallego' },
];

const UBICACIONES = [
  { value: 'estanteria',   label: '📚 En mi estantería' },
  { value: 'ebook',        label: '📱 Lo tengo en ebook' },
  { value: 'prestado',     label: '🤝 Lo presté' },
  { value: 'biblioteca',   label: '🏛️ Biblioteca' },
  { value: 'me_prestaron', label: '🎁 Me lo prestaron' },
  { value: 'vendido',      label: '💶 Lo vendí' },
];

const PRIORIDAD_OPTIONS = [
  { value: 'alta',  label: '🔴 Alta' },
  { value: 'media', label: '🟡 Media' },
  { value: 'baja',  label: '🟢 Baja' },
];

export default function LibroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook]         = useState<any>(null);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editEstado,        setEditEstado]        = useState('pendiente');
  const [editValoracion,    setEditValoracion]    = useState(0);
  const [editPrioridad,     setEditPrioridad]     = useState('');
  const [editFechaInicio,   setEditFechaInicio]   = useState('');
  const [editFechaFin,      setEditFechaFin]      = useState('');
  const [editCategoria,     setEditCategoria]     = useState('');
  const [editIdioma,        setEditIdioma]        = useState('');
  const [editUbicacion,     setEditUbicacion]     = useState('estanteria');
  const [editPrestadoA,     setEditPrestadoA]     = useState('');
  const [editFechaPrestamo, setEditFechaPrestamo] = useState('');
  const [editPrecioVenta,   setEditPrecioVenta]   = useState('');
  const [editFechaVenta,    setEditFechaVenta]    = useState('');
  const [editAlta,          setEditAlta]          = useState('');
  const [editBaja,          setEditBaja]          = useState('');
  const [editComentarios,   setEditComentarios]   = useState('');

  useEffect(() => { loadBook(); }, [id]);

  const loadBook = async () => {
    const { ok, data } = await api.getBooks();
    if (ok) {
      const books = data.data?.books || [];
      setAllBooks(books);
      const found = books.find((b: any) => String(b.id) === String(id));
      if (found) {
        setBook(found);
        setEditEstado(found.estado || 'pendiente');
        setEditValoracion(found.valoracion || 0);
        setEditPrioridad(found.prioridad || '');
        setEditFechaInicio(found.fecha_inicio || '');
        setEditFechaFin(found.fecha_fin || '');
        setEditCategoria(found.category || '');
        setEditIdioma(found.language || '');
        setEditUbicacion(found.ubicacion || 'estanteria');
        setEditPrestadoA(found.prestado_a || '');
        setEditFechaPrestamo(found.fecha_prestamo || '');
        setEditPrecioVenta(found.precio_venta ? String(found.precio_venta) : '');
        setEditFechaVenta(found.fecha_venta || '');
        setEditAlta(found.alta || '');
        setEditBaja(found.baja || '');
        setEditComentarios(found.comentarios || '');
      }
    }
    setLoading(false);
  };

  const saveBook = async () => {
    if (!book) return;
    setSaving(true);

    const eraLeido    = book.estado === 'leido';
    const ahoraLeido  = editEstado === 'leido';
    const recienLeido = !eraLeido && ahoraLeido;

    const { ok, data } = await api.updateBook(book.id, {
      estado: editEstado, valoracion: editValoracion, prioridad: editPrioridad,
      fecha_inicio: editFechaInicio || null, fecha_fin: editFechaFin || null,
      category: editCategoria, language: editIdioma, ubicacion: editUbicacion,
      prestado_a: editPrestadoA, fecha_prestamo: editFechaPrestamo || null,
      precio_venta: editPrecioVenta ? parseFloat(editPrecioVenta) : null,
      fecha_venta: editFechaVenta || null, alta: editAlta || null,
      baja: editBaja, comentarios: editComentarios,
    });

    setSaving(false);

    if (ok) {
      if (recienLeido) {
        await checkAndNotify(allBooks, { libroRecienTerminado: book.title });
      }

      Alert.alert('✅ Guardado', 'Los cambios se han guardado.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Error', data?.message || 'No se pudo guardar.');
    }
  };

  const eliminarLibro = () => {
    Alert.alert('¿Eliminar libro?', `"${book?.title}" se eliminará de tu colección.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        setDeleting(true);
        const { ok } = await apiFetch(`/books/${book.id}`, { method: 'DELETE' });
        setDeleting(false);
        if (ok) router.back();
        else Alert.alert('Error', 'No se pudo eliminar.');
      }},
    ]);
  };

  const abrirAmazon = () => {
    if (!book) return;
    const q = encodeURIComponent(`${book.title} ${book.author}`.trim());
    Linking.openURL(`https://www.amazon.es/s?k=${q}&tag=${AMAZON_TAG}`);
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (!book)   return <View style={s.centered}><Text style={{ color: Colors.muted }}>Libro no encontrado</Text></View>;

  const showPrioridad = editEstado === 'pendiente' || editEstado === 'leyendo';

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{book.title}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={s.topRow}>
            {book.cover
              ? <Image source={{ uri: book.cover }} style={s.cover} />
              : <View style={[s.cover, s.nocover]}><Text style={{ fontSize: 36 }}>📚</Text></View>}
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.bookTitle}>{book.title}</Text>
              <Text style={s.bookAuthor}>{book.author}</Text>
              {book.year ? <InfoRow icon="📅" label={book.year} /> : null}
            </View>
          </View>

          {book.description ? <ExpandableDesc text={book.description} /> : null}

          <SectionLabel title="Lectura" />

          <Text style={s.fLabel}>Estado</Text>
          <View style={s.pillRow}>
            {ESTADO_OPTIONS.map(o => (
              <TouchableOpacity key={o.value}
                style={[s.pill, editEstado === o.value && s.pillActive]}
                onPress={() => setEditEstado(o.value)}>
                <Text style={[s.pillText, editEstado === o.value && { color: Colors.accent }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fLabel}>Valoración</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setEditValoracion(editValoracion === n ? 0 : n)}>
                  <Text style={{ fontSize: 28, opacity: n <= editValoracion ? 1 : 0.2 }}>⭐</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.amazonSmallBtn} onPress={abrirAmazon}>
              <Text style={{ fontSize: 20 }}>🎁</Text>
              <Text style={s.amazonSmallText}>Comprar</Text>
            </TouchableOpacity>
          </View>

          {showPrioridad && (
            <>
              <Text style={s.fLabel}>Prioridad</Text>
              <View style={s.pillRow}>
                {PRIORIDAD_OPTIONS.map(o => (
                  <TouchableOpacity key={o.value}
                    style={[s.pill, editPrioridad === o.value && s.pillActive]}
                    onPress={() => setEditPrioridad(editPrioridad === o.value ? '' : o.value)}>
                    <Text style={[s.pillText, editPrioridad === o.value && { color: Colors.accent }]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

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

          <SectionLabel title="Libro" />

          <Text style={s.fLabel}>Categoría</Text>
          <View style={s.pillRow}>
            {CATEGORIAS.map(c => (
              <TouchableOpacity key={c}
                style={[s.pillSm, editCategoria === c && s.pillActive]}
                onPress={() => setEditCategoria(editCategoria === c ? '' : c)}>
                <Text style={[s.pillSmText, editCategoria === c && { color: Colors.accent }]}>{c}</Text>
              </TouchableOpacity>
            ))}
              <TouchableOpacity
                style={[s.pillSm, !CATEGORIAS.includes(editCategoria) && editCategoria !== '' && s.pillActive]}
                onPress={() => setEditCategoria('__custom__')}>
                <Text style={s.pillSmText}>✏️ Otra</Text>
              </TouchableOpacity>
          </View>
            {(!CATEGORIAS.includes(editCategoria)) && (
              <TextInput style={[s.fInput, { marginBottom: 14 }]}
                value={editCategoria === '__custom__' ? '' : editCategoria}
                onChangeText={setEditCategoria}
                placeholder="Escribe tu categoría..."
                placeholderTextColor={Colors.muted}
                autoFocus />
            )}
          <Text style={s.fLabel}>Idioma</Text>
          <View style={s.pillRow}>
            {IDIOMAS.map(i => (
              <TouchableOpacity key={i.value}
                style={[s.pillSm, editIdioma === i.value && s.pillActive]}
                onPress={() => setEditIdioma(editIdioma === i.value ? '' : i.value)}>
                <Text style={[s.pillSmText, editIdioma === i.value && { color: Colors.accent }]}>{i.label}</Text>
              </TouchableOpacity>
            ))}
              <TouchableOpacity
                style={[s.pillSm, !IDIOMAS.map(i=>i.value).includes(editIdioma) && editIdioma !== '' && s.pillActive]}
                onPress={() => setEditIdioma('__custom__')}>
                <Text style={s.pillSmText}>✏️ Otro</Text>
              </TouchableOpacity>
          </View>

          <SectionLabel title="¿Dónde está este libro?" />

          <View style={s.pillRow}>
            {UBICACIONES.map(o => (
              <TouchableOpacity key={o.value}
                style={[s.pill, editUbicacion === o.value && s.pillActive]}
                onPress={() => setEditUbicacion(editUbicacion === o.value ? '' : o.value)}>
                <Text style={[s.pillText, editUbicacion === o.value && { color: Colors.accent }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {editUbicacion === 'prestado' && (
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Text style={s.fLabel}>¿A quién se lo prestaste?</Text>
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

          <SectionLabel title="Colección" />

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.fLabel}>Alta (fecha añadido)</Text>
              <TextInput style={s.fInput} value={editAlta} onChangeText={setEditAlta}
                placeholder="AAAA-MM-DD" placeholderTextColor={Colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fLabel}>Baja (opcional)</Text>
              <TextInput style={s.fInput} value={editBaja} onChangeText={setEditBaja}
                placeholder="vendido / regalado…" placeholderTextColor={Colors.muted} />
            </View>
          </View>

          <Text style={s.fLabel}>Comentarios</Text>
          <TextInput style={[s.fInput, { minHeight: 100, paddingTop: 12, marginBottom: 20 }]}
            value={editComentarios} onChangeText={setEditComentarios}
            placeholder="Notas, opinión, cita favorita…" placeholderTextColor={Colors.muted}
            multiline numberOfLines={4} textAlignVertical="top" />

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveBook} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.bg} />
              : <Text style={s.saveBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
            onPress={eliminarLibro} disabled={deleting}>
            {deleting ? <ActivityIndicator color={Colors.danger} />
              : <Text style={s.deleteBtnText}>🗑 Eliminar libro</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(122,162,255,0.15)',
      paddingTop: 14, marginTop: 4, marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.accent,
        textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</Text>
    </View>
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
  container:      { flex: 1, backgroundColor: Colors.bg },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 12,
                    borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:        { paddingRight: 4 },
  backText:       { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  headerTitle:    { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll:         { padding: Spacing.lg, paddingBottom: 60 },
  topRow:         { flexDirection: 'row', gap: 14, marginBottom: 14 },
  cover:          { width: 100, height: 148, borderRadius: Radius.md },
  nocover:        { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  bookTitle:      { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  bookAuthor:     { fontSize: 14, color: Colors.muted },
  fLabel:         { fontSize: 12, color: Colors.muted, marginBottom: 6 },
  fInput:         { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                    borderWidth: 1, borderColor: Colors.border,
                    color: Colors.text, padding: 13, fontSize: 15, marginBottom: 14 },
  pillRow:        { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  pill:           { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full,
                    borderWidth: 1, borderColor: Colors.border },
  pillActive:     { backgroundColor: Colors.accent + '22', borderColor: Colors.accent + '55' },
  pillText:       { color: Colors.muted, fontSize: 14, fontWeight: '600' },
  pillSm:         { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full,
                    borderWidth: 1, borderColor: Colors.border },
  pillSmText:     { color: Colors.muted, fontSize: 12, fontWeight: '600' },
  row2:           { flexDirection: 'row', gap: 10 },
  amazonSmallBtn: { backgroundColor: '#FF990022', borderRadius: Radius.md, borderWidth: 1,
                    borderColor: '#FF9900', padding: 8, width: 68,
                    alignItems: 'center', justifyContent: 'center' },
  amazonSmallText:{ color: '#FF9900', fontSize: 10, fontWeight: '800', marginTop: 2 },
  saveBtn:        { backgroundColor: Colors.accent, borderRadius: Radius.md,
                    padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText:    { color: Colors.bg, fontSize: 16, fontWeight: '800' },
  deleteBtn:      { borderWidth: 1, borderColor: Colors.danger + '44',
                    borderRadius: Radius.md, padding: 14, alignItems: 'center' },
  deleteBtnText:  { color: Colors.danger, fontSize: 14, fontWeight: '700' },
});
