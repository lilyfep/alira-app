// app/libro/[id].tsx
// Ficha completa del libro — paridad con coleccion.html
// + botón "Añadir a biblioteca" con bottom sheet
// + notificaciones push al marcar como leído

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, apiFetch } from '@/lib/api';
import { checkAndNotify } from '@/lib/notifications';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Linking, Modal, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

// ── Constantes ────────────────────────────────────────────────────────────────
const AMAZON_TAG = 'alirabooks-21';

const ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', color: Colors.muted },
  { value: 'leyendo',   label: 'Leyendo',   color: '#ffd466'    },
  { value: 'leido',     label: 'Leído',     color: '#64c878'    },
];

const PRIORIDAD_OPTIONS = [
  { value: 'alta',  label: '🔴 Alta'  },
  { value: 'media', label: '🟡 Media' },
  { value: 'baja',  label: '🟢 Baja'  },
];

const CATEGORIAS = [
  'Ficción', 'Ciencia Ficción', 'Fantasía', 'Terror', 'Romance',
  'Thriller', 'Histórica', 'Aventura', 'Infantil', 'Juvenil',
  'Poesía', 'Teatro', 'Clásicos', 'No ficción', 'Biografía',
  'Historia', 'Ciencia', 'Ensayo', 'Autoayuda', 'Filosofía',
  'Psicología', 'Economía', 'Viajes', 'Cocina', 'Arte', 'Cómic',
];

const IDIOMAS = [
  { value: 'es', label: 'Español'   },
  { value: 'en', label: 'Inglés'    },
  { value: 'fr', label: 'Francés'   },
  { value: 'de', label: 'Alemán'    },
  { value: 'it', label: 'Italiano'  },
  { value: 'pt', label: 'Portugués' },
  { value: 'ca', label: 'Catalán'   },
  { value: 'eu', label: 'Euskera'   },
  { value: 'gl', label: 'Gallego'   },
];

const IDIOMA_VALUES = IDIOMAS.map(i => i.value);

const UBICACIONES = [
  { value: 'estanteria',   label: '📚 En mi estantería' },
  { value: 'ebook',        label: '📱 Lo tengo en ebook' },
  { value: 'prestado',     label: '🤝 Lo presté'         },
  { value: 'biblioteca',   label: '🏛️ Biblioteca'        },
  { value: 'me_prestaron', label: '🎁 Me lo prestaron'   },
  { value: 'vendido',      label: '💶 Lo vendí'          },
];

// ── Tipos ────────────────────────────────────────────────────────────────────
interface LibraryItem {
  id: number; nombre: string; emoji: string; color: string; total_books: number;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function LibroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [book,     setBook]     = useState<any>(null);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Campos editables
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

  // Bottom sheet bibliotecas
  const [showLibSheet,  setShowLibSheet]  = useState(false);
  const [libraries,     setLibraries]     = useState<LibraryItem[]>([]);
  const [bookLibIds,    setBookLibIds]    = useState<Set<number>>(new Set());
  const [loadingLibs,   setLoadingLibs]   = useState(false);
  const [togglingLibId, setTogglingLibId] = useState<number | null>(null);

  // useFocusEffect para refrescar al volver de bibliotecas
  const loadBook = useCallback(async () => {
    const { ok, data } = await api.getBooks();
    if (ok) {
      const books: any[] = data.data?.books || [];
      setAllBooks(books);
      const found = books.find(b => String(b.id) === String(id));
      if (found) {
        setBook(found);
        setEditEstado(found.estado        || 'pendiente');
        setEditValoracion(found.valoracion || 0);
        setEditPrioridad(found.prioridad  || '');
        setEditFechaInicio(found.fecha_inicio   || '');
        setEditFechaFin(found.fecha_fin         || '');
        setEditCategoria(found.category         || '');
        setEditIdioma(found.language            || '');
        setEditUbicacion(found.ubicacion        || 'estanteria');
        setEditPrestadoA(found.prestado_a       || '');
        setEditFechaPrestamo(found.fecha_prestamo || '');
        setEditPrecioVenta(found.precio_venta ? String(found.precio_venta) : '');
        setEditFechaVenta(found.fecha_venta     || '');
        setEditAlta(found.alta                  || '');
        setEditBaja(found.baja                  || '');
        setEditComentarios(found.comentarios    || '');
      }
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { loadBook(); }, [loadBook]));

  // ── Guardar ───────────────────────────────────────────────────────────────
  const saveBook = async () => {
    if (!book) return;
    setSaving(true);

    const eraLeido   = book.estado === 'leido';
    const ahoraLeido = editEstado === 'leido';

    // Auto fecha_fin al marcar leído
    const fechaFinFinal = (ahoraLeido && !editFechaFin)
      ? new Date().toISOString().split('T')[0]
      : editFechaFin || null;

    if (ahoraLeido && !editFechaFin) setEditFechaFin(fechaFinFinal!);

    const { ok, data } = await api.updateBook(book.id, {
      estado:          editEstado,
      valoracion:      editValoracion,
      prioridad:       editPrioridad       || null,
      fecha_inicio:    editFechaInicio     || null,
      fecha_fin:       fechaFinFinal,
      category:        editCategoria       || null,
      language:        editIdioma          || null,
      ubicacion:       editUbicacion,
      prestado_a:      editPrestadoA       || null,
      fecha_prestamo:  editFechaPrestamo   || null,
      precio_venta:    editPrecioVenta ? parseFloat(editPrecioVenta) : null,
      fecha_venta:     editFechaVenta      || null,
      alta:            editAlta            || null,
      baja:            editBaja            || null,
      comentarios:     editComentarios,
    });

    setSaving(false);

    if (ok) {
      // Notificaciones si acaba de marcar como leído
      if (!eraLeido && ahoraLeido) {
        await checkAndNotify(allBooks, { libroRecienTerminado: book.title });
      }
      Alert.alert('✅ Guardado', 'Los cambios se han guardado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', data?.message || 'No se pudo guardar.');
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const eliminarLibro = async () => {
    if (!book) return;

    // Comprobar si el libro está en alguna biblioteca
    const { ok: libOk, data: libData } = await api.getBookLibraries(book.id);
    const enBibliotecas: LibraryItem[] = libOk ? (libData.data?.libraries || []) : [];

    if (enBibliotecas.length > 0) {
      const nombres = enBibliotecas.map(l => `${l.emoji} ${l.nombre}`).join(', ');
      Alert.alert(
        '¿Eliminar libro?',
        `"${book.title}" está en ${enBibliotecas.length === 1 ? 'la biblioteca' : 'las bibliotecas'}: ${nombres}.\n\n¿Qué quieres hacer?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar solo de colección',
            onPress: async () => {
              setDeleting(true);
              const { ok } = await apiFetch(`/books/${book.id}`, { method: 'DELETE' });
              setDeleting(false);
              if (ok) router.back();
              else Alert.alert('Error', 'No se pudo eliminar.');
            },
          },
          {
            text: 'Eliminar de todo',
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              // El backend ya elimina las entradas de biblioteca en cascada al borrar el libro
              const { ok } = await apiFetch(`/books/${book.id}`, { method: 'DELETE' });
              setDeleting(false);
              if (ok) router.back();
              else Alert.alert('Error', 'No se pudo eliminar.');
            },
          },
        ],
      );
    } else {
      Alert.alert(
        '¿Eliminar libro?',
        `"${book.title}" se eliminará de tu colección permanentemente.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              const { ok } = await apiFetch(`/books/${book.id}`, { method: 'DELETE' });
              setDeleting(false);
              if (ok) router.back();
              else Alert.alert('Error', 'No se pudo eliminar.');
            },
          },
        ],
      );
    }
  };

  // ── Amazon ────────────────────────────────────────────────────────────────
  const abrirAmazon = () => {
    if (!book) return;
    const q = encodeURIComponent(`${book.title} ${book.author || ''}`.trim());
    Linking.openURL(`https://www.amazon.es/s?k=${q}&tag=${AMAZON_TAG}`);
  };

  // ── Bottom sheet bibliotecas ──────────────────────────────────────────────
  const abrirBibliotecas = async () => {
    if (!book) return;
    setShowLibSheet(true);
    setLoadingLibs(true);

    const [libsRes, bookLibsRes] = await Promise.all([
      api.getLibraries(),
      api.getBookLibraries(book.id),
    ]);

    if (libsRes.ok)    setLibraries(libsRes.data.data?.libraries || []);
    if (bookLibsRes.ok) {
      const ids: number[] = (bookLibsRes.data.data?.libraries || []).map((l: LibraryItem) => l.id);
      setBookLibIds(new Set(ids));
    }
    setLoadingLibs(false);
  };

  const toggleLibrary = async (lib: LibraryItem) => {
    if (!book || togglingLibId !== null) return;
    setTogglingLibId(lib.id);

    const inLib = bookLibIds.has(lib.id);
    const { ok, data } = inLib
      ? await api.removeBookFromLibrary(lib.id, book.id)
      : await api.addBookToLibrary(lib.id, book.id);

    if (ok) {
      setBookLibIds(prev => {
        const next = new Set(prev);
        inLib ? next.delete(lib.id) : next.add(lib.id);
        return next;
      });
    } else {
      Alert.alert('Error', data?.message || 'No se pudo actualizar la biblioteca.');
    }
    setTogglingLibId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
  );

  if (!book) return (
    <View style={s.centered}>
      <Text style={{ color: Colors.muted, fontSize: 16 }}>Libro no encontrado</Text>
      <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.back()}>
        <Text style={{ color: Colors.accent, fontWeight: '700' }}>← Volver</Text>
      </TouchableOpacity>
    </View>
  );

  const showPrioridad   = editEstado === 'pendiente' || editEstado === 'leyendo';
  const idiomaCustom    = editIdioma !== '' && !IDIOMA_VALUES.includes(editIdioma);
  const categoriaCustom = editCategoria !== '' && !CATEGORIAS.includes(editCategoria);

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{book.title}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Portada + info ── */}
          <View style={s.topRow}>
            {book.cover
              ? <Image source={{ uri: book.cover }} style={s.cover} />
              : <View style={[s.cover, s.nocover]}><Text style={{ fontSize: 36 }}>📚</Text></View>}
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.bookTitle}>{book.title}</Text>
              <Text style={s.bookAuthor}>{book.author || 'Autor desconocido'}</Text>
              {book.year ? <InfoRow icon="📅" label={book.year} /> : null}
            </View>
          </View>

          {book.description ? <ExpandableDesc text={book.description} /> : null}

          {/* ══ SECCIÓN: LECTURA ══ */}
          <SectionLabel title="Lectura" />

          <Text style={s.fLabel}>Estado</Text>
          <View style={s.pillRow}>
            {ESTADO_OPTIONS.map(o => (
              <TouchableOpacity key={o.value}
                style={[s.pill, editEstado === o.value && {
                  backgroundColor: o.color + '22', borderColor: o.color + '55',
                }]}
                onPress={() => setEditEstado(o.value)}>
                <Text style={[s.pillText, editEstado === o.value && { color: o.color }]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fLabel}>Valoración</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n}
                  onPress={() => setEditValoracion(editValoracion === n ? 0 : n)}>
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
                    <Text style={[s.pillText, editPrioridad === o.value && { color: Colors.accent }]}>
                      {o.label}
                    </Text>
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
          
          {/* ══ SECCIÓN: LIBRO ══ */}
          <SectionLabel title="Libro" />

          <Text style={s.fLabel}>Categoría</Text>
          <TextInput style={s.fInput}
            value={editCategoria}
            onChangeText={setEditCategoria}
            placeholder="Ej: Ficción, Biografía, Historia…"
            placeholderTextColor={Colors.muted} />
          {editCategoria === '' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, marginTop: -8 }}>
              {CATEGORIAS.map(c => (
                <TouchableOpacity key={c}
                  style={[s.pillSm]}
                  onPress={() => setEditCategoria(c)}>
                  <Text style={s.pillSmText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s.fLabel}>Idioma</Text>
          <TextInput style={s.fInput}
            value={editIdioma}
            onChangeText={setEditIdioma}
            placeholder="Ej: Español, Inglés, Català…"
            placeholderTextColor={Colors.muted} />

          {/* ══ SECCIÓN: UBICACIÓN ══ */}
          <SectionLabel title="¿Dónde está este libro?" />

          <View style={s.pillRow}>
            {UBICACIONES.map(o => (
              <TouchableOpacity key={o.value}
                style={[s.pill, editUbicacion === o.value && s.pillActive]}
                onPress={() => setEditUbicacion(o.value)}>
                <Text style={[s.pillText, editUbicacion === o.value && { color: Colors.accent }]}>
                  {o.label}
                </Text>
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

          {/* ══ SECCIÓN: COLECCIÓN ══ */}
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
          <TextInput
            style={[s.fInput, { minHeight: 100, paddingTop: 12, marginBottom: 20 }]}
            value={editComentarios} onChangeText={setEditComentarios}
            placeholder="Notas, opinión, cita favorita…" placeholderTextColor={Colors.muted}
            multiline numberOfLines={4} textAlignVertical="top" />

          {/* ── Botones de acción ── */}
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveBook} disabled={saving}>
            {saving
              ? <ActivityIndicator color={Colors.bg} />
              : <Text style={s.saveBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>

          {/* Añadir a biblioteca */}
          <TouchableOpacity style={s.libBtn} onPress={abrirBibliotecas}>
            <Text style={s.libBtnText}>📚 Añadir a biblioteca</Text>
          </TouchableOpacity>

          {/* Visible mi perfil público */}
          <TouchableOpacity
            style={[s.libBtn, {
              borderColor:     book.publico !== false ? Colors.accent + '33' : Colors.danger + '33',
              backgroundColor: book.publico !== false ? Colors.accent + '11' : Colors.danger + '11',
            }]}
            onPress={() => {
              const nuevo = !(book.publico !== false);
              api.updateBook(book.id, { publico: nuevo })
                .then(({ ok }) => { if (ok) setBook((prev: any) => ({ ...prev, publico: nuevo })); });
            }}>
            <Text style={[s.libBtnText, {
              color: book.publico !== false ? Colors.accent : Colors.danger
            }]}>
              {book.publico !== false ? '🌐 Visible en mi perfil público' : '🔒 Oculto del perfil público'}
            </Text>
          </TouchableOpacity>

          {/* Eliminar libro */}
          <TouchableOpacity style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
            onPress={eliminarLibro} disabled={deleting}>
            {deleting
              ? <ActivityIndicator color={Colors.danger} />
              : <Text style={s.deleteBtnText}>🗑 Eliminar libro</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom sheet: Mis Bibliotecas ── */}
      <Modal visible={showLibSheet} transparent animationType="slide"
        onRequestClose={() => setShowLibSheet(false)}>
        <Pressable style={s.overlay} onPress={() => setShowLibSheet(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>

            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Mis Bibliotecas</Text>
            <Text style={s.sheetSub}>Toca para añadir o quitar este libro</Text>

            {loadingLibs ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.accent} />
              </View>
            ) : libraries.length === 0 ? (
              <View style={s.sheetEmpty}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>📚</Text>
                <Text style={s.sheetEmptyText}>Aún no tienes bibliotecas</Text>
                <TouchableOpacity style={s.sheetCreateBtn}
                  onPress={() => { setShowLibSheet(false); router.push('/bibliotecas'); }}>
                  <Text style={s.sheetCreateBtnText}>Crear mi primera biblioteca →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {libraries.map(lib => {
                  const inLib    = bookLibIds.has(lib.id);
                  const toggling = togglingLibId === lib.id;
                  return (
                    <TouchableOpacity key={lib.id}
                      style={[s.libRow, inLib && {
                        backgroundColor: lib.color + '15',
                        borderColor:     lib.color + '55',
                      }]}
                      onPress={() => toggleLibrary(lib)}
                      disabled={toggling}
                      activeOpacity={0.7}>
                      <View style={[s.libRowEmoji, { backgroundColor: lib.color + '22' }]}>
                        <Text style={{ fontSize: 22 }}>{lib.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.libRowName, inLib && { color: lib.color }]}>
                          {lib.nombre}
                        </Text>
                        <Text style={s.libRowCount}>
                          {lib.total_books} {lib.total_books === 1 ? 'libro' : 'libros'}
                        </Text>
                      </View>
                      {toggling
                        ? <ActivityIndicator size="small" color={lib.color} />
                        : <View style={[s.libCheck,
                            inLib && { backgroundColor: lib.color, borderColor: lib.color }]}>
                            {inLib && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                          </View>}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity style={s.sheetNewBtn}
                  onPress={() => { setShowLibSheet(false); router.push('/bibliotecas'); }}>
                  <Text style={s.sheetNewBtnText}>+ Crear nueva biblioteca</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
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

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  centered:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 12,
                     paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 12,
                     borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:         { paddingRight: 4 },
  backText:        { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  headerTitle:     { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll:          { padding: Spacing.lg, paddingBottom: 60 },
  topRow:          { flexDirection: 'row', gap: 14, marginBottom: 14 },
  cover:           { width: 100, height: 148, borderRadius: Radius.md },
  nocover:         { backgroundColor: 'rgba(255,255,255,0.05)',
                     justifyContent: 'center', alignItems: 'center' },
  bookTitle:       { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  bookAuthor:      { fontSize: 14, color: Colors.muted },

  // Campos
  fLabel:          { fontSize: 12, color: Colors.muted, marginBottom: 6 },
  fInput:          { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                     borderWidth: 1, borderColor: Colors.border,
                     color: Colors.text, padding: 13, fontSize: 15, marginBottom: 14 },
  row2:            { flexDirection: 'row', gap: 10 },

  // Pills
  pillRow:         { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  pill:            { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full,
                     borderWidth: 1, borderColor: Colors.border },
  pillActive:      { backgroundColor: Colors.accent + '22', borderColor: Colors.accent + '55' },
  pillText:        { color: Colors.muted, fontSize: 14, fontWeight: '600' },
  pillSm:          { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full,
                     borderWidth: 1, borderColor: Colors.border },
  pillSmText:      { color: Colors.muted, fontSize: 12, fontWeight: '600' },

  // Amazon
  amazonSmallBtn:  { backgroundColor: '#FF990022', borderRadius: Radius.md, borderWidth: 1,
                     borderColor: '#FF9900', padding: 8, width: 68,
                     alignItems: 'center', justifyContent: 'center' },
  amazonSmallText: { color: '#FF9900', fontSize: 10, fontWeight: '800', marginTop: 2 },

  // Botones principales
  saveBtn:         { backgroundColor: Colors.accent, borderRadius: Radius.md,
                     padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText:     { color: Colors.bg, fontSize: 16, fontWeight: '800' },
  libBtn:          { backgroundColor: Colors.accent + '11', borderRadius: Radius.md,
                     borderWidth: 1, borderColor: Colors.accent + '33',
                     padding: 14, alignItems: 'center', marginBottom: 10 },
  libBtnText:      { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  deleteBtn:       { borderWidth: 1, borderColor: Colors.danger + '44',
                     borderRadius: Radius.md, padding: 14, alignItems: 'center' },
  deleteBtnText:   { color: Colors.danger, fontSize: 14, fontWeight: '700' },

  // Bottom sheet
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
                     borderWidth: 1, borderColor: Colors.border,
                     padding: Spacing.lg, paddingBottom: 40 },
  sheetHandle:     { width: 40, height: 4, backgroundColor: Colors.border,
                     borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:      { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  sheetSub:        { fontSize: 13, color: Colors.muted, marginBottom: 20 },
  libRow:          { flexDirection: 'row', alignItems: 'center', gap: 12,
                     backgroundColor: 'rgba(255,255,255,0.03)',
                     borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
                     padding: 14, marginBottom: 10 },
  libRowEmoji:     { width: 44, height: 44, borderRadius: 22,
                     alignItems: 'center', justifyContent: 'center' },
  libRowName:      { fontSize: 15, fontWeight: '700', color: Colors.text },
  libRowCount:     { fontSize: 12, color: Colors.muted, marginTop: 2 },
  libCheck:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                     borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  sheetEmpty:      { alignItems: 'center', paddingVertical: 30 },
  sheetEmptyText:  { color: Colors.muted, fontSize: 15, marginBottom: 16 },
  sheetCreateBtn:  { backgroundColor: Colors.accent, borderRadius: Radius.md,
                     paddingHorizontal: 20, paddingVertical: 12 },
  sheetCreateBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 14 },
  sheetNewBtn:     { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
                     borderStyle: 'dashed', padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  sheetNewBtnText: { color: Colors.muted, fontSize: 14, fontWeight: '600' },
});
