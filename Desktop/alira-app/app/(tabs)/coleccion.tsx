// app/(tabs)/coleccion.tsx
// "Tu Biblioteca" — estilo Spotify/Wallapop
// Pestaña Libros: pills estado + barra Filtros|Ordenar + lista con aire + Excel
// Pestaña Mis Bibliotecas: grid de carpetas personalizadas

import RachaWidget from '@/components/RachaWidget';
import { Colors, ESTADO_META, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Image, Linking,
  Modal, Pressable, RefreshControl, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
const RachaDiariaModal = require('@/components/RachaDiariaWidget').default;

interface Book {
  id: number; title: string; author: string; cover: string;
  estado: string; valoracion: number; ubicacion: string;
  prestado_a: string; category: string; language: string;
  year: string; baja: string;
}

interface Library {
  id: number; nombre: string; emoji: string; color: string; total_books: number;
}

const ESTADO_PILLS = [
  { value: 'leyendo',   label: '📖 Leyendo'   },
  { value: 'leido',     label: '🎓 Leídos'     },
  { value: 'pendiente', label: '⏳ Pendientes' },
];

const SORT_OPTIONS = [
  { value: 'reciente',    label: 'Más recientes'       },
  { value: 'titulo',      label: 'Título A → Z'        },
  { value: 'autor',       label: 'Autor A → Z'         },
  { value: 'valoracion',  label: 'Mejor valorados'     },
  { value: 'anio_desc',   label: 'Año: más reciente'   },
  { value: 'anio_asc',    label: 'Año: más antiguo'    },
];

const UBICACIONES = [
  { value: 'estanteria',   label: '📚 Estantería'      },
  { value: 'ebook',        label: '📱 Ebook'           },
  { value: 'prestado',     label: '🤝 Prestado'        },
  { value: 'biblioteca',   label: '🏛️ Biblioteca'      },
  { value: 'me_prestaron', label: '🎁 Me lo prestaron' },
  { value: 'vendido',      label: '💶 Vendido'         },
];

const EMOJIS = ['📚','📖','✨','🌟','❤️','🔥','🎯','🏆','🌙','☀️','🎭','🎪','🌈','💫','🦋','🌺'];
const COLORS = ['#7aa2ff','#ff6b9d','#ffd466','#64c878','#ff9900','#c084fc','#38bdf8','#fb7185'];

export default function ColeccionScreen() {
  const [tab,        setTab]        = useState<'libros' | 'bibliotecas'>('libros');
  const [books,      setBooks]      = useState<Book[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [search,        setSearch]        = useState('');
  const [filterEstados, setFilterEstados] = useState<string[]>([]);
  const [filterCat,     setFilterCat]     = useState('');
  const [filterLang,    setFilterLang]    = useState('');
  const [filterUbic,    setFilterUbic]    = useState('');
  const [filterVal,     setFilterVal]     = useState(0);
  const [filterAnioMin, setFilterAnioMin] = useState('');
  const [filterAnioMax, setFilterAnioMax] = useState('');
  const [sortBy,        setSortBy]        = useState('reciente');
  const [vista,         setVista]         = useState<'lista' | 'grid'>('lista');

  // Modales
  const [showFilters,     setShowFilters]     = useState(false);
  const [showSort,        setShowSort]        = useState(false);

  // Bibliotecas
  const [libraries,     setLibraries]     = useState<Library[]>([]);
  const [loadingLibs,   setLoadingLibs]   = useState(false);
  const [showCreateLib, setShowCreateLib] = useState(false);
  const [newNombre,     setNewNombre]     = useState('');
  const [newEmoji,      setNewEmoji]      = useState('📚');
  const [newColor,      setNewColor]      = useState('#7aa2ff');
  const [savingLib,     setSavingLib]     = useState(false);

  const tabAnim = useRef(new Animated.Value(0)).current;

  const loadBooks = useCallback(async () => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) { router.replace('/login'); return; }
    const { ok, data } = await api.getBooks();
    if (ok) setBooks(data.data?.books || []);
    else if (data?.message === 'Sesión expirada') router.replace('/login');
  }, []);

  const loadLibraries = useCallback(async () => {
    setLoadingLibs(true);
    const { ok, data } = await api.getLibraries();
    if (ok) setLibraries(data.data?.libraries || []);
    setLoadingLibs(false);
  }, []);

  useEffect(() => {
    loadBooks().finally(() => setLoading(false));
    AsyncStorage.getItem('vista_coleccion').then(v => {
      if (v === 'grid' || v === 'lista') setVista(v as 'grid' | 'lista');
    });
  }, [loadBooks]);

  useFocusEffect(useCallback(() => { loadLibraries(); }, [loadLibraries]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadBooks(), loadLibraries()]);
    setRefreshing(false);
  }, [loadBooks, loadLibraries]);

  const switchTab = (t: 'libros' | 'bibliotecas') => {
    setTab(t);
    Animated.spring(tabAnim, {
      toValue: t === 'libros' ? 0 : 1,
      useNativeDriver: false, tension: 80, friction: 12,
    }).start();
  };

  const toggleVista = async () => {
    const nueva = vista === 'lista' ? 'grid' : 'lista';
    setVista(nueva);
    await AsyncStorage.setItem('vista_coleccion', nueva);
  };

  // Opciones dinámicas
  const categories = [...new Set(books.map(b => b.category).filter(Boolean))].sort();
  const languages  = [...new Set(books.map(b => b.language).filter(Boolean))].sort();

  const toggleEstado = (v: string) =>
    setFilterEstados(prev => prev.includes(v) ? prev.filter(e => e !== v) : [...prev, v]);

  const resetFilters = () => {
    setFilterCat(''); setFilterLang(''); setFilterUbic('');
    setFilterVal(0); setFilterAnioMin(''); setFilterAnioMax('');
  };

  const activeFilterCount = [
    filterCat, filterLang, filterUbic,
    filterVal > 0 ? 'val' : '',
    filterAnioMin, filterAnioMax,
  ].filter(Boolean).length;

  const filtered = books
    .filter(b => {
      const q = search.toLowerCase();
      if (q && !b.title.toLowerCase().includes(q) &&
              !(b.author || '').toLowerCase().includes(q) &&
              !(b.comentarios || '').toLowerCase().includes(q)) return false;
      if (filterEstados.length > 0 && !filterEstados.includes(b.estado)) return false;
      if (filterCat  && b.category  !== filterCat)  return false;
      if (filterLang && b.language  !== filterLang) return false;
      if (filterUbic && b.ubicacion !== filterUbic) return false;
      if (filterVal > 0 && (b.valoracion || 0) < filterVal) return false;
      if (filterAnioMin && parseInt(b.year) < parseInt(filterAnioMin)) return false;
      if (filterAnioMax && parseInt(b.year) > parseInt(filterAnioMax)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'titulo')     return a.title.localeCompare(b.title);
      if (sortBy === 'autor')      return (a.author || '').localeCompare(b.author || '');
      if (sortBy === 'valoracion') return (b.valoracion || 0) - (a.valoracion || 0);
      if (sortBy === 'anio_desc')  return parseInt(b.year || '0') - parseInt(a.year || '0');
      if (sortBy === 'anio_asc')   return parseInt(a.year || '0') - parseInt(b.year || '0');
      return 0;
    });

  const stats = {
    total:     books.length,
    leidos:    books.filter(b => b.estado === 'leido').length,
    leyendo:   books.filter(b => b.estado === 'leyendo').length,
    pendiente: books.filter(b => b.estado === 'pendiente').length,
  };

  const createLib = async () => {
    if (!newNombre.trim()) { Alert.alert('Falta el nombre', 'Ponle nombre a tu biblioteca.'); return; }
    setSavingLib(true);
    const { ok, data } = await api.createLibrary(newNombre.trim(), newEmoji, newColor);
    setSavingLib(false);
    if (ok) {
      setShowCreateLib(false);
      setNewNombre(''); setNewEmoji('📚'); setNewColor('#7aa2ff');
      loadLibraries();
    } else {
      Alert.alert('Error', data?.message || 'No se pudo crear.');
    }
  };

  const renderBook = ({ item }: { item: Book }) => {
    const meta = ESTADO_META[item.estado] || { color: Colors.muted, label: item.estado };
    return (
      <TouchableOpacity style={s.bookRow}
        onPress={() => router.push(`/libro/${item.id}`)} activeOpacity={0.7}>
        <View style={s.bookCoverWrap}>
          {item.cover
            ? <Image source={{ uri: item.cover }} style={s.bookCover} />
            : <View style={[s.bookCover, s.noCover]}><Text style={{ fontSize: 20 }}>📚</Text></View>}
          <View style={[s.stateDot, { backgroundColor: meta.color }]} />
        </View>
        <View style={s.bookMeta}>
          <Text style={s.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.bookAuthor} numberOfLines={1}>{item.author || 'Autor desconocido'}</Text>
          <View style={s.bookTags}>
            <View style={[s.stateBadge, { backgroundColor: meta.color + '22' }]}>
              <Text style={[s.stateBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.valoracion > 0 && <Text style={s.stars}>{'⭐'.repeat(item.valoracion)}</Text>}
            {item.category ? <Text style={s.catTag}>{item.category}</Text> : null}
          </View>
          {item.ubicacion === 'prestado' && item.prestado_a
            ? <Text style={s.prestadoTag}>🤝 {item.prestado_a}</Text> : null}
        </View>
        <Text style={s.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderBookGrid = ({ item }: { item: Book }) => {
    const meta = ESTADO_META[item.estado] || { color: Colors.muted };
    return (
      <TouchableOpacity style={s.gridCard}
        onPress={() => router.push(`/libro/${item.id}`)} activeOpacity={0.75}>
        {item.cover
          ? <Image source={{ uri: item.cover }} style={s.gridCover} />
          : <View style={[s.gridCover, s.noCover]}><Text style={{ fontSize: 28 }}>📚</Text></View>}
        <View style={[s.gridDot, { backgroundColor: meta.color }]} />
        <View style={s.gridInfo}>
          <Text style={s.gridTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.gridAuthor} numberOfLines={1}>{item.author}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
  );

  const indicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1], outputRange: ['2%', '52%'],
  });
  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Recientes';
  const hasAnyFilter = activeFilterCount > 0 || filterEstados.length > 0 || search.length > 0;

  return (
    <SafeAreaView style={s.container}>

      {/* HEADER */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Tu Biblioteca</Text>
          <Text style={s.headerSub}>
            {stats.total} libros · {stats.leyendo} leyendo · {stats.leidos} leídos
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/rachas')}>
            <RachaWidget compact />
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn}
            onPress={() => tab === 'bibliotecas' ? setShowCreateLib(true) : router.push('/(tabs)/buscar')}>
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TABS */}
      <View style={s.tabsWrap}>
        <View style={s.tabsRow}>
          <TouchableOpacity style={s.tabBtn} onPress={() => switchTab('libros')}>
            <Text style={[s.tabLabel, tab === 'libros' && s.tabLabelActive]}>Libros</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tabBtn} onPress={() => switchTab('bibliotecas')}>
            <Text style={[s.tabLabel, tab === 'bibliotecas' && s.tabLabelActive]}>Mis Bibliotecas</Text>
          </TouchableOpacity>
        </View>
        <View style={s.tabIndicatorTrack}>
          <Animated.View style={[s.tabIndicator, { left: indicatorLeft }]} />
        </View>
      </View>
      
      {/* ══ PESTAÑA LIBROS ══ */}
      {tab === 'libros' && (
        <>
          {/* Buscador */}
          <View style={s.searchRow}>
            <View style={s.searchWrap}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput style={s.searchInput}
                placeholder="Buscar título o autor..."
                placeholderTextColor={Colors.muted}
                value={search} onChangeText={setSearch}
                autoCorrect={false} autoCapitalize="none" />
              {search.length > 0 &&
                <TouchableOpacity onPress={() => setSearch('')} style={s.searchClear}>
                  <Text style={{ color: Colors.muted, fontSize: 15 }}>✕</Text>
                </TouchableOpacity>}
            </View>
          </View>

          {/* Pills estado — deseleccionados = todos */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.pillsRow} style={{ flexGrow: 0, minHeight: 46 }}>
            {ESTADO_PILLS.map(f => {
              const active = filterEstados.includes(f.value);
              const meta   = ESTADO_META[f.value] || { color: Colors.muted };
              return (
                <TouchableOpacity key={f.value}
                  style={[s.pill, active && {
                    backgroundColor: meta.color + '33',
                    borderColor: meta.color,
                    borderWidth: 2,
                  }]}
                  onPress={() => toggleEstado(f.value)}>
                  <Text style={{ 
                    color: active ? meta.color : '#a9b7d6', 
                    fontSize: 13, 
                    fontWeight: '700',
                    opacity: 1
                  }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Barra Filtros | Ordenar | Vista */}
          <View style={s.filterBar}>
            <TouchableOpacity style={s.filterBarBtn} onPress={() => setShowFilters(true)}>
              <Text style={s.filterBarIcon}>⚙️</Text>
              <Text style={[s.filterBarText, activeFilterCount > 0 && { color: Colors.accent }]}>
                Filtros
              </Text>
              {activeFilterCount > 0 && (
                <View style={s.filterBadge}>
                  <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={s.filterBarDivider} />

            <TouchableOpacity style={s.filterBarBtn} onPress={() => setShowSort(true)}>
              <Text style={s.filterBarIcon}>↕</Text>
              <Text style={s.filterBarText} numberOfLines={1}>{sortLabel}</Text>
            </TouchableOpacity>

            <View style={s.filterBarDivider} />

            <TouchableOpacity
              style={[s.filterBarBtn, { flex: 0, paddingHorizontal: 16 }]}
              onPress={toggleVista}>
              <Text style={{ fontSize: 16, color: Colors.text }}>{vista === 'lista' ? '⊞' : '☰'}</Text>
            </TouchableOpacity>
          </View>

          {/* Contador */}
          <View style={s.countRow}>
            <Text style={s.countText}>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>{filtered.length}</Text>
              {filtered.length !== stats.total && (
                <Text style={{ color: Colors.muted }}> de {stats.total}</Text>
              )}
              <Text style={{ color: Colors.muted }}>
                {' '}{filtered.length === 1 ? 'libro' : 'libros'}
              </Text>
            </Text>
            {hasAnyFilter && (
              <TouchableOpacity onPress={() => {
                resetFilters(); setSearch(''); setFilterEstados([]);
              }}>
                <Text style={s.clearText}>Limpiar todo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Lista / Grid */}
          {filtered.length === 0
            ? <View style={s.emptyWrap}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>📖</Text>
                <Text style={s.emptyTitle}>Sin resultados</Text>
                {hasAnyFilter && (
                  <TouchableOpacity style={{ marginTop: 12 }}
                    onPress={() => { resetFilters(); setSearch(''); setFilterEstados([]); }}>
                    <Text style={{ color: Colors.accent, fontWeight: '700' }}>Limpiar filtros</Text>
                  </TouchableOpacity>
                )}
              </View>
            : <FlatList
                data={filtered}
                keyExtractor={i => i.id.toString()}
                renderItem={vista === 'lista' ? renderBook : renderBookGrid}
                numColumns={vista === 'grid' ? 2 : 1}
                key={vista}
                columnWrapperStyle={vista === 'grid'
                  ? { gap: 10, paddingHorizontal: Spacing.lg } : undefined}
                contentContainerStyle={{
                  paddingHorizontal: vista === 'lista' ? Spacing.lg : 0,
                  paddingBottom: 100,
                }}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                    tintColor={Colors.accent} />}
                removeClippedSubviews
                maxToRenderPerBatch={12}
                windowSize={10}
                initialNumToRender={10}
                ListFooterComponent={
                  <TouchableOpacity style={s.excelBtn}
                    onPress={() => Alert.alert(
                      'Exportar colección',
                      'Se abrirá tu navegador para descargar el Excel.',
                      [{ text: 'Cancelar', style: 'cancel' },
                       { text: 'Exportar', onPress: () =>
                          Linking.openURL('https://www.aliraspace.com/export.xlsx') }],
                    )}>
                    <Text style={s.excelBtnText}>⬇ Exportar como Excel</Text>
                  </TouchableOpacity>
                }
              />}
        </>
      )}

      {/* ══ PESTAÑA BIBLIOTECAS ══ */}
      {tab === 'bibliotecas' && (
        <ScrollView contentContainerStyle={s.libsScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              tintColor={Colors.accent} />}>
          {loadingLibs && libraries.length === 0
            ? <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 60 }} />
            : libraries.length === 0
              ? <View style={s.emptyWrap}>
                  <Text style={{ fontSize: 52, marginBottom: 16 }}>📚</Text>
                  <Text style={s.emptyTitle}>Crea tu primera biblioteca</Text>
                  <Text style={s.emptySub}>
                    Organiza tus libros como quieras —{'\n'}
                    géneros, momentos, estados de ánimo...
                  </Text>
                  <TouchableOpacity style={s.emptyCreateBtn} onPress={() => setShowCreateLib(true)}>
                    <Text style={s.emptyCreateBtnText}>+ Crear biblioteca</Text>
                  </TouchableOpacity>
                </View>
              : <View style={s.libsGrid}>
                  {libraries.map(lib => (
                    <TouchableOpacity key={lib.id}
                      style={[s.libCard, { borderColor: lib.color + '44' }]}
                      onPress={() => router.push(`/bibliotecas/${lib.id}`)}
                      activeOpacity={0.75}>
                      <View style={[s.libEmoji, { backgroundColor: lib.color + '22' }]}>
                        <Text style={{ fontSize: 30 }}>{lib.emoji}</Text>
                      </View>
                      <Text style={s.libName} numberOfLines={2}>{lib.nombre}</Text>
                      <Text style={s.libCount}>
                        {lib.total_books} {lib.total_books === 1 ? 'libro' : 'libros'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={s.libCardNew} onPress={() => setShowCreateLib(true)}>
                    <Text style={s.libCardNewIcon}>+</Text>
                    <Text style={s.libCardNewText}>Nueva{'\n'}biblioteca</Text>
                  </TouchableOpacity>
                </View>}
        </ScrollView>
      )}

      {/* MODAL: FILTROS */}
      <Modal visible={showFilters} transparent animationType="slide"
        onRequestClose={() => setShowFilters(false)}>
        <Pressable style={s.overlay} onPress={() => setShowFilters(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Filtros</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={{ color: Colors.accent, fontWeight: '700', fontSize: 14 }}>Limpiar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>

              {categories.length > 0 && (
                <>
                  <Text style={s.sheetLabel}>Categoría</Text>
                  <View style={s.sheetChips}>
                    <FChip label="Todas" active={filterCat === ''} onPress={() => setFilterCat('')} />
                    {categories.map(c => (
                      <FChip key={c} label={c} active={filterCat === c}
                        onPress={() => setFilterCat(filterCat === c ? '' : c)} />
                    ))}
                  </View>
                </>
              )}

              {languages.length > 0 && (
                <>
                  <Text style={s.sheetLabel}>Idioma</Text>
                  <View style={s.sheetChips}>
                    <FChip label="Todos" active={filterLang === ''} onPress={() => setFilterLang('')} />
                    {languages.map(l => (
                      <FChip key={l} label={l.toUpperCase()} active={filterLang === l}
                        onPress={() => setFilterLang(filterLang === l ? '' : l)} />
                    ))}
                  </View>
                </>
              )}

              <Text style={s.sheetLabel}>Ubicación</Text>
              <View style={s.sheetChips}>
                <FChip label="Todas" active={filterUbic === ''} onPress={() => setFilterUbic('')} />
                {UBICACIONES.map(u => (
                  <FChip key={u.value} label={u.label} active={filterUbic === u.value}
                    onPress={() => setFilterUbic(filterUbic === u.value ? '' : u.value)} />
                ))}
              </View>

              <Text style={s.sheetLabel}>Valoración mínima</Text>
              <View style={s.starsRow}>
                {[0,1,2,3,4,5].map(n => (
                  <TouchableOpacity key={n}
                    style={[s.starBtn, filterVal === n && s.starBtnActive]}
                    onPress={() => setFilterVal(n)}>
                    <Text style={[s.starBtnText, filterVal === n && { color: Colors.accent }]}>
                      {n === 0 ? 'Todas' : '⭐'.repeat(n)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.sheetLabel}>Año de publicación</Text>
              <View style={s.anioRow}>
                <TextInput style={s.anioInput} value={filterAnioMin}
                  onChangeText={setFilterAnioMin} placeholder="Desde"
                  placeholderTextColor={Colors.muted}
                  keyboardType="number-pad" maxLength={4} />
                <Text style={{ color: Colors.muted, fontSize: 16 }}>—</Text>
                <TextInput style={s.anioInput} value={filterAnioMax}
                  onChangeText={setFilterAnioMax} placeholder="Hasta"
                  placeholderTextColor={Colors.muted}
                  keyboardType="number-pad" maxLength={4} />
              </View>

            </ScrollView>
            <TouchableOpacity style={s.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={s.applyBtnText}>
                Ver {filtered.length} {filtered.length === 1 ? 'libro' : 'libros'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: ORDENAR */}
      <Modal visible={showSort} transparent animationType="slide"
        onRequestClose={() => setShowSort(false)}>
        <Pressable style={s.overlay} onPress={() => setShowSort(false)}>
          <Pressable style={[s.sheet, { paddingBottom: 50 }]} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={[s.sheetTitle, { marginBottom: 20 }]}>Ordenar por</Text>
            {SORT_OPTIONS.map(o => (
              <TouchableOpacity key={o.value} style={s.sortRow}
                onPress={() => { setSortBy(o.value); setShowSort(false); }}>
                <Text style={[s.sortRowLabel, sortBy === o.value && { color: Colors.accent }]}>
                  {o.label}
                </Text>
                {sortBy === o.value &&
                  <Text style={{ color: Colors.accent, fontSize: 18, fontWeight: '900' }}>🎓</Text>}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: CREAR BIBLIOTECA */}
      <Modal visible={showCreateLib} transparent animationType="slide"
        onRequestClose={() => setShowCreateLib(false)}>
        <Pressable style={s.overlay} onPress={() => setShowCreateLib(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Nueva biblioteca</Text>
            <Text style={s.sheetLabel}>Nombre</Text>
            <TextInput style={s.sheetInput} value={newNombre} onChangeText={setNewNombre}
              placeholder="Ej: Favoritos, Verano 2026..."
              placeholderTextColor={Colors.muted} autoFocus maxLength={50} />
            <Text style={s.sheetLabel}>Emoji</Text>
            <View style={s.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e}
                  style={[s.emojiBtn, newEmoji === e && { backgroundColor: Colors.accent + '33' }]}
                  onPress={() => setNewEmoji(e)}>
                  <Text style={{ fontSize: 24 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.sheetLabel}>Color</Text>
            <View style={s.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c}
                  style={[s.colorBtn, { backgroundColor: c },
                    newColor === c && { borderWidth: 3, borderColor: Colors.text }]}
                  onPress={() => setNewColor(c)} />
              ))}
            </View>
            <View style={[s.libPreview, { borderColor: newColor + '44' }]}>
              <View style={[s.libEmoji, { backgroundColor: newColor + '22' }]}>
                <Text style={{ fontSize: 26 }}>{newEmoji}</Text>
              </View>
              <Text style={[s.libName, { fontSize: 15 }]}>{newNombre || 'Mi biblioteca'}</Text>
            </View>
            <TouchableOpacity style={[s.applyBtn, savingLib && { opacity: 0.6 }]}
              onPress={createLib} disabled={savingLib}>
              {savingLib
                ? <ActivityIndicator color={Colors.bg} />
                : <Text style={s.applyBtnText}>Crear biblioteca</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    
    </SafeAreaView>        
  );
}

function FChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[fc.chip, active && fc.active]} onPress={onPress}>
      <Text style={[fc.text, active && fc.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
const fc = StyleSheet.create({
  chip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
                borderWidth: 1, borderColor: Colors.border },
  active:     { backgroundColor: Colors.accent + '22', borderColor: Colors.accent + '55' },
  text:       { color: Colors.muted, fontSize: 13, fontWeight: '600' },
  textActive: { color: Colors.accent },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: Colors.text },
  headerSub:   { fontSize: 12, color: Colors.muted, marginTop: 3 },
  addBtn:      { width: 36, height: 36, borderRadius: 18,
                 backgroundColor: 'rgba(255,255,255,0.1)',
                 alignItems: 'center', justifyContent: 'center' },
  addBtnText:  { color: Colors.text, fontSize: 22, fontWeight: '300', lineHeight: 34 },

  tabsWrap:          { paddingHorizontal: Spacing.lg, marginBottom: 14 },
  tabsRow:           { flexDirection: 'row' },
  tabBtn:            { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabLabel:          { fontSize: 15, fontWeight: '600', color: Colors.muted },
  tabLabelActive:    { color: Colors.text, fontWeight: '800' },
  tabIndicatorTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  tabIndicator:      { position: 'absolute', height: 2, width: '46%',
                       backgroundColor: Colors.accent, borderRadius: 1 },

  searchRow:   { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: 12 },
  searchWrap:  { flex: 1, flexDirection: 'row', alignItems: 'center',
                 backgroundColor: Colors.card, borderRadius: Radius.md,
                 borderWidth: 1, borderColor: Colors.border },
  searchIcon:  { paddingLeft: 12, fontSize: 14 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14,
                 paddingVertical: 11, paddingHorizontal: 8 },
  searchClear: { paddingRight: 12, paddingVertical: 8 },

  pillsRow:    { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 12 },
  pill:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                 borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
                 backgroundColor: 'rgba(255,255,255,0.08)' },
  pillText:    { color: '#e8eefc', fontSize: 13, fontWeight: '700' },

  // Barra Filtros | Ordenar
  filterBar:        { flexDirection: 'row', alignItems: 'center',
                      marginHorizontal: Spacing.lg, marginBottom: 10,
                      backgroundColor: Colors.card, borderRadius: Radius.md,
                      borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  filterBarBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'center', gap: 6, paddingVertical: 13 },
  filterBarIcon:    { fontSize: 14 },
  filterBarText:    { fontSize: 14, fontWeight: '600', color: Colors.text },
  filterBarDivider: { width: 1, height: 20, backgroundColor: Colors.border },
  filterBadge:      { backgroundColor: Colors.accent, borderRadius: 99,
                      minWidth: 18, height: 18, alignItems: 'center',
                      justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText:  { color: Colors.bg, fontSize: 10, fontWeight: '800' },

  countRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
               paddingHorizontal: Spacing.lg, marginBottom: 6 },
  countText: { fontSize: 13, color: Colors.muted },
  clearText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  bookRow:       { flexDirection: 'row', alignItems: 'center',
                   paddingVertical: 13, paddingHorizontal: 4,
                   borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  bookCoverWrap: { position: 'relative', marginRight: 14 },
  bookCover:     { width: 58, height: 86, borderRadius: 7 },
  noCover:       { backgroundColor: 'rgba(255,255,255,0.06)',
                   justifyContent: 'center', alignItems: 'center' },
  stateDot:      { position: 'absolute', bottom: 4, right: 4,
                   width: 10, height: 10, borderRadius: 5,
                   borderWidth: 1.5, borderColor: Colors.bg },
  bookMeta:      { flex: 1, gap: 4 },
  bookTitle:     { fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 21 },
  bookAuthor:    { fontSize: 13, color: Colors.muted },
  bookTags:      { flexDirection: 'row', alignItems: 'center',
                   gap: 6, marginTop: 4, flexWrap: 'wrap' },
  stateBadge:    { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  stateBadgeText:{ fontSize: 11, fontWeight: '600' },
  stars:         { fontSize: 10, letterSpacing: -1 },
  catTag:        { fontSize: 11, color: Colors.muted,
                   backgroundColor: 'rgba(255,255,255,0.07)',
                   borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  prestadoTag:   { fontSize: 11, color: '#ffd466', marginTop: 2 },
  chevron:       { color: Colors.muted, fontSize: 22, paddingLeft: 8 },

  gridCard:   { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg,
                borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: 'hidden' },
  gridCover:  { width: '100%', height: 170 },
  gridDot:    { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5 },
  gridInfo:   { padding: 8 },
  gridTitle:  { fontSize: 12, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  gridAuthor: { fontSize: 11, color: Colors.muted },

  excelBtn:     { alignItems: 'center', paddingVertical: 20 },
  excelBtnText: { color: Colors.muted, fontSize: 13, fontWeight: '600' },

  libsScroll:       { padding: Spacing.lg, paddingBottom: 80 },
  libsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  libCard:          { width: '47%', backgroundColor: Colors.card, borderRadius: Radius.lg,
                      borderWidth: 1, padding: 16, alignItems: 'center', gap: 8 },
  libCardNew:       { width: '47%', borderRadius: Radius.lg, borderWidth: 1,
                      borderColor: Colors.border, borderStyle: 'dashed',
                      padding: 16, alignItems: 'center', justifyContent: 'center',
                      gap: 4, minHeight: 120 },
  libCardNewIcon:   { fontSize: 28, color: Colors.muted },
  libCardNewText:   { color: Colors.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  libEmoji:         { width: 60, height: 60, borderRadius: 30,
                      alignItems: 'center', justifyContent: 'center' },
  libName:          { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  libCount:         { fontSize: 12, color: Colors.muted },
  libPreview:       { flexDirection: 'row', alignItems: 'center', gap: 12,
                      backgroundColor: Colors.bg, borderRadius: Radius.lg,
                      borderWidth: 1, padding: 14, marginBottom: 20 },

  emptyWrap:          { flex: 1, alignItems: 'center', justifyContent: 'center',
                        paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle:         { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub:           { color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyCreateBtn:     { backgroundColor: Colors.accent, borderRadius: Radius.md,
                        paddingHorizontal: 24, paddingVertical: 13 },
  emptyCreateBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 15 },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
                 borderWidth: 1, borderColor: Colors.border,
                 padding: Spacing.lg, paddingBottom: 40, maxHeight: '85%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border,
                 borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHead:   { flexDirection: 'row', justifyContent: 'space-between',
                 alignItems: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 20, fontWeight: '800', color: Colors.text },
  sheetLabel:  { fontSize: 11, fontWeight: '700', color: Colors.muted,
                 textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  sheetChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sheetInput:  { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                 borderWidth: 1, borderColor: Colors.border,
                 color: Colors.text, padding: 13, fontSize: 16, marginBottom: 16 },
  emojiGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  emojiBtn:    { width: 44, height: 44, borderRadius: 10,
                 alignItems: 'center', justifyContent: 'center' },
  colorRow:    { flexDirection: 'row', gap: 10, marginBottom: 20 },
  colorBtn:    { width: 32, height: 32, borderRadius: 16 },
  applyBtn:    { backgroundColor: Colors.accent, borderRadius: Radius.md,
                 padding: 15, alignItems: 'center', marginTop: 8 },
  applyBtnText:{ color: Colors.bg, fontSize: 16, fontWeight: '800' },

  sortRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingVertical: 16, borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255,255,255,0.06)' },
  sortRowLabel: { fontSize: 16, color: Colors.text, fontWeight: '600' },

  starsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  starBtn:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
                 borderWidth: 1, borderColor: Colors.border },
  starBtnActive:{ backgroundColor: Colors.accent + '22', borderColor: Colors.accent + '55' },
  starBtnText: { color: Colors.muted, fontSize: 13, fontWeight: '600' },

  anioRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  anioInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
               borderWidth: 1, borderColor: Colors.border,
               color: Colors.text, padding: 11, fontSize: 15, textAlign: 'center' },
});
