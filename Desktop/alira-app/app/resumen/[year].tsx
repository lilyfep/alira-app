// app/resumen.tsx
// Resumen anual tipo "Wrapped" — slides animadas con scroll vertical
// Free: total, objetivo, géneros, mes activo, día favorito
// Alira+: autor, mejor libro, libro rápido/lento, idiomas, comparativa año anterior

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ResumenData {
  year: number;
  total: number;
  empty?: boolean;
  premium: boolean;
  media_valoracion: number;
  mes_mas_activo: { mes: string; total: number } | null;
  top_generos: { nombre: string; total: number }[];
  por_mes: { mes: string; total: number }[];
  racha_maxima: number;
  objetivo: number;
  pct_objetivo: number;
  comprados: number;
  media_dias_lectura: number | null;
  dia_favorito: string | null;
  libro_rapido: { titulo: string; autor: string; dias: number; cover: string } | null;
  // Premium
  autor_favorito?: { nombre: string; total: number } | null;
  top_autores?: { nombre: string; total: number }[];
  mejor_libro?: { titulo: string; autor: string; valoracion: number; cover: string } | null;
  libro_lento?: { titulo: string; autor: string; dias: number; cover: string } | null;
  top_idiomas?: { idioma: string; total: number }[];
  año_anterior?: { total: number };
}

// ── Paleta de slides ──────────────────────────────────────────────────────────
const SLIDE_COLORS = [
  { bg: '#0b1220', accent: '#7aa2ff' },  // 0 – portada
  { bg: '#0f1f14', accent: '#22c55e' },  // 1 – total libros
  { bg: '#1a0f20', accent: '#c084fc' },  // 2 – objetivo
  { bg: '#1f1508', accent: '#f59e0b' },  // 3 – mes activo
  { bg: '#0d1a1f', accent: '#38bdf8' },  // 4 – géneros
  { bg: '#1f0d0d', accent: '#f87171' },  // 5 – autor / lock
  { bg: '#0d1320', accent: '#7aa2ff' },  // 6 – mejor libro / lock
  { bg: '#0f1a14', accent: '#4ade80' },  // 7 – velocidad
  { bg: '#1a1508', accent: '#fbbf24' },  // 8 – día favorito
  { bg: '#0b1220', accent: '#a5b4fc' },  // 9 – cierre
];

// ── Componente de slide base ──────────────────────────────────────────────────
function Slide({
  index, active, bg, accent, children,
}: {
  index: number; active: boolean; bg: string; accent: string; children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.timing(opacity,     { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(translateY,  { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(30);
    }
  }, [active]);

  return (
    <View style={[ss.slide, { backgroundColor: bg, width: W, height: H }]}>
      {/* Decoración fondo */}
      <View style={[ss.circle1, { backgroundColor: accent + '18' }]} />
      <View style={[ss.circle2, { backgroundColor: accent + '0c' }]} />
      <Animated.View style={[ss.slideContent, { opacity, transform: [{ translateY }] }]}>
        {children}
      </Animated.View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ResumenScreen() {
  const [data,     setData]     = useState<ResumenData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [objetivo, setObjetivo] = useState(12);
  const [active,   setActive]   = useState(0);
  const flatRef = useRef<FlatList>(null);
  const { year } = useLocalSearchParams<{ year: string }>();
  const thisYear = parseInt(year) || new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      api.getResumenAnual(thisYear),
      AsyncStorage.getItem('objetivo_anual'),
    ]).then(([res, obj]) => {
      if (res.ok) setData(res.data.data);
      if (obj)    setObjetivo(parseInt(obj) || 12);
      setLoading(false);
    });
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActive(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );

  if (!data || data.empty) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>📚</Text>
      <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
        Sin libros en {thisYear}
      </Text>
      <Text style={{ color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
        Marca libros como leídos para ver tu resumen anual.
      </Text>
      <TouchableOpacity style={[ss.btn, { backgroundColor: Colors.accent }]} onPress={() => router.back()}>
        <Text style={[ss.btnText, { color: Colors.bg }]}>Volver</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Construcción de slides ────────────────────────────────────────────────────
  const slides = buildSlides(data, objetivo, thisYear);

  const goNext = () => {
    if (active < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: active + 1, animated: true });
    } else {
      router.back();
    }
  };
  const goPrev = () => {
    if (active > 0) flatRef.current?.scrollToIndex({ index: active - 1, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={flatRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal={false}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item, index }) => (
          <Slide index={index} active={active === index} bg={item.bg} accent={item.accent}>
            {item.content}
          </Slide>
        )}
      />

      {/* Dots de navegación */}
      <View style={ss.dotsContainer}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[ss.dot, {
              backgroundColor: i === active
                ? SLIDE_COLORS[Math.min(i, SLIDE_COLORS.length - 1)].accent
                : 'rgba(255,255,255,0.2)',
              width: i === active ? 20 : 6,
            }]}
          />
        ))}
      </View>

      {/* Botón volver */}
      <TouchableOpacity style={ss.closeBtn} onPress={() => router.back()}>
        <Text style={ss.closeBtnText}>✕</Text>
      </TouchableOpacity>

      {/* Tap zones */}
      <TouchableOpacity style={ss.tapLeft}  onPress={goPrev} activeOpacity={1} />
      <TouchableOpacity style={ss.tapRight} onPress={goNext} activeOpacity={1} />
    </View>
  );
}

// ── Builder de slides ─────────────────────────────────────────────────────────
function buildSlides(d: ResumenData, objetivo: number, year: number) {
  const P = SLIDE_COLORS;
  const slides: { bg: string; accent: string; content: React.ReactNode }[] = [];

  // 0 – Portada
  slides.push({
    ...P[0],
    content: (
      <View style={ss.centerCol}>
        <Text style={{ fontSize: 64, marginBottom: 12 }}>📖</Text>
        <Text style={[ss.bigLabel, { color: P[0].accent }]}>Tu año en libros</Text>
        <Text style={[ss.heroNum, { color: '#fff' }]}>{year}</Text>
        <Text style={[ss.sub, { marginTop: 8 }]}>Desliza para ver tu resumen</Text>
      </View>
    ),
  });

  // 1 – Total libros
  const diff = d.año_anterior ? d.total - d.año_anterior.total : null;
  slides.push({
    ...P[1],
    content: (
      <View style={ss.centerCol}>
        <Text style={[ss.caption, { color: P[1].accent }]}>Este año leíste</Text>
        <Text style={[ss.heroNum, { color: P[1].accent }]}>{d.total}</Text>
        <Text style={[ss.bigLabel, { color: '#fff' }]}>{d.total === 1 ? 'libro' : 'libros'}</Text>
        {d.comprados > 0 && (
          <Text style={[ss.sub, { marginTop: 20 }]}>
            📦 Añadiste {d.comprados} libro{d.comprados !== 1 ? 's' : ''} a tu colección
          </Text>
        )}
        {d.premium && diff !== null && (
          <View style={[ss.badge, { backgroundColor: P[1].accent + '22', borderColor: P[1].accent + '44', marginTop: 20 }]}>
            <Text style={{ color: P[1].accent, fontWeight: '700', fontSize: 15 }}>
              {diff > 0 ? `▲ ${diff} más que en ${year - 1}` : diff < 0 ? `▼ ${Math.abs(diff)} menos que en ${year - 1}` : `Igual que en ${year - 1}`}
            </Text>
          </View>
        )}
      </View>
    ),
  });

  // 2 – Objetivo
  const pct = Math.min(d.pct_objetivo, 100);
  const cumplido = d.total >= d.objetivo;
  slides.push({
    ...P[2],
    content: (
      <View style={ss.centerCol}>
        <Text style={[ss.caption, { color: P[2].accent }]}>Tu objetivo era</Text>
        <Text style={[ss.heroNum, { color: P[2].accent }]}>{d.objetivo}</Text>
        <Text style={[ss.bigLabel, { color: '#fff' }]}>libros</Text>
        <View style={[ss.progressBg, { marginTop: 32, width: W * 0.72 }]}>
          <View style={[ss.progressFill, { width: `${pct}%` as any, backgroundColor: P[2].accent }]} />
        </View>
        <Text style={[ss.sub, { marginTop: 10, fontSize: 20, fontWeight: '800', color: P[2].accent }]}>
          {pct}%
        </Text>
        {cumplido && (
          <Text style={[ss.sub, { color: '#fff', marginTop: 10, fontSize: 16 }]}>🎉 ¡Objetivo cumplido!</Text>
        )}
      </View>
    ),
  });

  // 3 – Mes más activo
  if (d.mes_mas_activo) {
    slides.push({
      ...P[3],
      content: (
        <View style={ss.centerCol}>
          <Text style={[ss.caption, { color: P[3].accent }]}>Tu mes más lector</Text>
          <Text style={[ss.heroNum, { color: P[3].accent }]}>{d.mes_mas_activo.mes}</Text>
          <Text style={[ss.sub, { color: '#fff', marginTop: 8, fontSize: 18 }]}>
            {d.mes_mas_activo.total} libro{d.mes_mas_activo.total !== 1 ? 's' : ''} en ese mes
          </Text>
          {d.racha_maxima > 0 && (
            <View style={[ss.badge, { backgroundColor: '#ffd46622', borderColor: '#ffd46644', marginTop: 28 }]}>
              <Text style={{ color: '#ffd466', fontWeight: '700', fontSize: 15 }}>
                🔥 Racha máxima: {d.racha_maxima} día{d.racha_maxima !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {d.dia_favorito && (
            <Text style={[ss.sub, { marginTop: 16 }]}>
              📅 Terminabas libros los {d.dia_favorito}s
            </Text>
          )}
        </View>
      ),
    });
  }

  // 4 – Géneros
  if (d.top_generos.length > 0) {
    const maxG = d.top_generos[0].total;
    slides.push({
      ...P[4],
      content: (
        <View style={[ss.centerCol, { alignItems: 'flex-start', paddingHorizontal: 32 }]}>
          <Text style={[ss.caption, { color: P[4].accent, alignSelf: 'center' }]}>Tus géneros favoritos</Text>
          <View style={{ width: '100%', marginTop: 32, gap: 20 }}>
            {d.top_generos.map(({ nombre, total }, i) => (
              <View key={nombre}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                    {['🥇','🥈','🥉'][i]} {nombre}
                  </Text>
                  <Text style={{ color: P[4].accent, fontWeight: '800' }}>{total}</Text>
                </View>
                <View style={[ss.progressBg, { height: 8 }]}>
                  <View style={[ss.progressFill, {
                    width: `${(total / maxG) * 100}%` as any,
                    backgroundColor: P[4].accent,
                    height: 8,
                  }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ),
    });
  }

  // 5 – Autor favorito (premium) o lock
  if (d.premium && d.autor_favorito) {
    slides.push({
      ...P[5],
      content: (
        <View style={ss.centerCol}>
          <Text style={[ss.caption, { color: P[5].accent }]}>Tu autor del año</Text>
          <Text style={[ss.heroNum, { color: P[5].accent, fontSize: 36, lineHeight: 46, textAlign: 'center', marginTop: 16 }]}>
            {d.autor_favorito.nombre}
          </Text>
          <Text style={[ss.sub, { color: '#fff', marginTop: 16, fontSize: 18 }]}>
            {d.autor_favorito.total} libro{d.autor_favorito.total !== 1 ? 's' : ''} leídos
          </Text>
          {d.top_autores && d.top_autores.length > 1 && (
            <View style={{ marginTop: 32, width: '100%', paddingHorizontal: 32, gap: 10 }}>
              {d.top_autores.slice(1, 4).map(({ nombre, total }) => (
                <View key={nombre} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: Colors.muted, fontSize: 14 }} numberOfLines={1}>{nombre}</Text>
                  <Text style={{ color: P[5].accent, fontSize: 14, fontWeight: '700' }}>{total}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ),
    });
  } else if (!d.premium) {
    slides.push({
      ...P[5],
      content: <LockSlide accent={P[5].accent} text="Tu autor favorito del año" />,
    });
  }

  // 6 – Mejor libro (premium) o lock
  if (d.premium && d.mejor_libro) {
    slides.push({
      ...P[6],
      content: (
        <View style={ss.centerCol}>
          <Text style={[ss.caption, { color: P[6].accent }]}>Tu libro del año</Text>
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            {d.mejor_libro.cover
              ? <Image source={{ uri: d.mejor_libro.cover }} style={ss.bigCover} />
              : <View style={[ss.bigCover, { backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 40 }}>📚</Text>
                </View>}
          </View>
          <Text style={[ss.bigLabel, { color: '#fff', marginTop: 20, textAlign: 'center', paddingHorizontal: 24 }]} numberOfLines={2}>
            {d.mejor_libro.titulo}
          </Text>
          <Text style={[ss.sub, { marginTop: 6, fontSize: 15 }]}>{d.mejor_libro.autor}</Text>
          <Text style={{ fontSize: 28, marginTop: 12 }}>
            {'⭐'.repeat(d.mejor_libro.valoracion)}
          </Text>
        </View>
      ),
    });
  } else if (!d.premium) {
    slides.push({
      ...P[6],
      content: <LockSlide accent={P[6].accent} text="Tu libro favorito del año" />,
    });
  }

  // 7 – Velocidad lectora
  if (d.media_dias_lectura !== null || d.libro_rapido) {
    slides.push({
      ...P[7],
      content: (
        <View style={ss.centerCol}>
          <Text style={[ss.caption, { color: P[7].accent }]}>Tu ritmo lector</Text>
          {d.media_dias_lectura !== null && (
            <>
              <Text style={[ss.heroNum, { color: P[7].accent }]}>{d.media_dias_lectura}</Text>
              <Text style={[ss.bigLabel, { color: '#fff' }]}>días por libro</Text>
              <Text style={[ss.sub, { marginTop: 6 }]}>de media</Text>
            </>
          )}
          {d.libro_rapido && (
            <View style={[ss.badge, { backgroundColor: P[7].accent + '18', borderColor: P[7].accent + '33', marginTop: 28, width: W * 0.8 }]}>
              <Text style={{ color: P[7].accent, fontWeight: '700', fontSize: 13, marginBottom: 4 }}>⚡ Más rápido</Text>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }} numberOfLines={1}>{d.libro_rapido.titulo}</Text>
              <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>{d.libro_rapido.dias} día{d.libro_rapido.dias !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {d.premium && d.libro_lento && (
            <View style={[ss.badge, { backgroundColor: '#f8717118', borderColor: '#f8717133', marginTop: 14, width: W * 0.8 }]}>
              <Text style={{ color: '#f87171', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>🐢 Más lento</Text>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }} numberOfLines={1}>{d.libro_lento.titulo}</Text>
              <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>{d.libro_lento.dias} días</Text>
            </View>
          )}
        </View>
      ),
    });
  }

  // 8 – Idiomas (premium) o cierre directamente
  if (d.premium && d.top_idiomas && d.top_idiomas.length > 0) {
    slides.push({
      ...P[8],
      content: (
        <View style={ss.centerCol}>
          <Text style={[ss.caption, { color: P[8].accent }]}>Leíste en</Text>
          <Text style={[ss.heroNum, { color: P[8].accent }]}>{d.top_idiomas.length}</Text>
          <Text style={[ss.bigLabel, { color: '#fff' }]}>{d.top_idiomas.length === 1 ? 'idioma' : 'idiomas'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28, justifyContent: 'center', paddingHorizontal: 24 }}>
            {d.top_idiomas.map(({ idioma, total }) => (
              <View key={idioma} style={[ss.badge, { backgroundColor: P[8].accent + '18', borderColor: P[8].accent + '33' }]}>
                <Text style={{ color: P[8].accent, fontWeight: '800', fontSize: 14 }}>{idioma.toUpperCase()}</Text>
                <Text style={{ color: Colors.muted, fontSize: 13, marginLeft: 6 }}>{total}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    });
  }

  // Último slide – Cierre
  const lastP = P[9];
  slides.push({
    ...lastP,
    content: (
      <View style={ss.centerCol}>
        <Text style={{ fontSize: 64, marginBottom: 20 }}>🎊</Text>
        <Text style={[ss.caption, { color: lastP.accent }]}>Así fue tu {year}</Text>
        <Text style={[ss.bigLabel, { color: '#fff', textAlign: 'center', lineHeight: 40, marginTop: 10 }]}>
          {d.total} libro{d.total !== 1 ? 's' : ''}{'\n'}
          <Text style={{ color: lastP.accent }}>{d.media_valoracion > 0 ? `${d.media_valoracion}⭐ de media` : ''}</Text>
        </Text>
        <Text style={[ss.sub, { marginTop: 20, textAlign: 'center', lineHeight: 22 }]}>
          Gracias por leer con Alira este año.{'\n'}¡Que el próximo sea aún mejor! 📚
        </Text>
        <TouchableOpacity
          style={[ss.btn, { backgroundColor: lastP.accent, marginTop: 40 }]}
          onPress={() => router.back()}
        >
          <Text style={[ss.btnText, { color: Colors.bg }]}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    ),
  });

  return slides;
}

// ── Lock slide ────────────────────────────────────────────────────────────────
function LockSlide({ accent, text }: { accent: string; text: string }) {
  return (
    <View style={[ss.centerCol, { paddingHorizontal: 32 }]}>
      <Text style={{ fontSize: 52, marginBottom: 16 }}>🔒</Text>
      <Text style={[ss.caption, { color: accent }]}>Solo Alira+</Text>
      <Text style={[ss.bigLabel, { color: '#fff', textAlign: 'center', marginTop: 8 }]}>{text}</Text>
      <Text style={[ss.sub, { textAlign: 'center', marginTop: 12, lineHeight: 22 }]}>
        Actualiza a Alira+ para desbloquear estadísticas avanzadas.
      </Text>
      <TouchableOpacity
        style={[ss.btn, { backgroundColor: accent, marginTop: 32 }]}
        onPress={() => router.push('/premium')}
      >
        <Text style={[ss.btnText, { color: Colors.bg }]}>Ver Alira+ →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  slide:       { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  slideContent:{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  circle1:     { position: 'absolute', width: W * 1.4, height: W * 1.4, borderRadius: W * 0.7,
                 top: -W * 0.5, right: -W * 0.4 },
  circle2:     { position: 'absolute', width: W * 1.0, height: W * 1.0, borderRadius: W * 0.5,
                 bottom: -W * 0.3, left: -W * 0.3 },

  centerCol:   { alignItems: 'center', justifyContent: 'center', width: '100%' },

  caption:     { fontSize: 14, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase',
                 marginBottom: 8 },
  heroNum:     { fontSize: 88, fontWeight: '900', lineHeight: 96 },
  bigLabel:    { fontSize: 26, fontWeight: '800', color: '#fff' },
  sub:         { fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  progressBg:  { height: 12, backgroundColor: 'rgba(255,255,255,0.1)',
                 borderRadius: 99, overflow: 'hidden' },
  progressFill:{ height: 12, borderRadius: 99 },

  badge:       { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full,
                 borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },

  bigCover:    { width: 130, height: 190, borderRadius: Radius.md,
                 shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                 shadowOpacity: 0.5, shadowRadius: 16 },

  btn:         { borderRadius: Radius.full, paddingHorizontal: 32, paddingVertical: 14 },
  btnText:     { fontWeight: '800', fontSize: 16 },

  // Nav
  dotsContainer: { position: 'absolute', right: 16, top: '50%', transform: [{ translateY: -50 }],
                   gap: 6, alignItems: 'center' },
  dot:           { height: 6, borderRadius: 99, transition: 'width 0.3s' } as any,

  closeBtn:    { position: 'absolute', top: 52, right: 20,
                 backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99,
                 width: 36, height: 36, justifyContent: 'center', alignItems: 'center',  zIndex: 10 },
  closeBtnText:{ color: '#fff', fontSize: 14, fontWeight: '700' },

  tapLeft:     { position: 'absolute', left: 0, top: 0, width: W * 0.3, height: H },
  tapRight:    { position: 'absolute', right: 0, top: 0, width: W * 0.3, height: H },
});
