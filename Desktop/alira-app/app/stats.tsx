// app/stats.tsx
// Pantalla de estadísticas completas
// Free: totales, objetivo, géneros, gráfica anual
// Alira+: autores, idiomas, racha, mejor libro, personaje lector

import ScreenHeader from '@/components/ScreenHeader';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';


interface StatsData {
  total: number; leidos: number; leyendo: number; pendientes: number;
  leidos_este_anio: number; media_valoracion: number;
  top_generos: { nombre: string; total: number }[];
  por_anio: { anio: number; total: number }[];
  premium: boolean;
  // Alira+
  top_autores?: { nombre: string; total: number }[];
  top_idiomas?: { idioma: string; total: number }[];
  racha?: number;
  mejor_libro?: { titulo: string; autor: string; valoracion: number; cover: string } | null;
  anio_anterior?: number;
  personaje?: { nombre: string; emoji: string; frase: string };
}

export default function StatsScreen() {
  const [stats,    setStats]    = useState<StatsData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [objetivo, setObjetivo] = useState(12);
  const thisYear = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      api.getStats(),
      AsyncStorage.getItem('objetivo_anual'),
    ]).then(([res, obj]) => {
      if (res.ok) setStats(res.data.data);
      if (obj)    setObjetivo(parseInt(obj) || 12);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
  );

  if (!stats) return (
    <View style={s.centered}>
      <Text style={{ color: Colors.muted }}>No se pudieron cargar las estadísticas.</Text>
    </View>
  );

  const progreso  = Math.min(stats.leidos_este_anio / objetivo, 1);
  const maxAnio   = Math.max(...stats.por_anio.map(a => a.total), 1);
  const anioAnt   = stats.anio_anterior ?? 0;
  const diff      = stats.leidos_este_anio - anioAnt;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <ScreenHeader title="Estadísticas" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
       
       {/* ── RESUMEN ANUAL ── */}
        <TouchableOpacity
          style={s.resumenBanner}
          onPress={() => router.push(`/resumen/${thisYear}`)}
        >
          <View>
            <Text style={s.resumenTitle}>🎊 Tu {thisYear} en libros</Text>
            <Text style={s.resumenSub}>Ver tu resumen anual →</Text>
          </View>
          <Text style={{ fontSize: 32 }}>📖</Text>
        </TouchableOpacity>

        {/* ── STATS RÁPIDAS ── */}
        <View style={s.statsGrid}>
          <StatBox value={stats.total}    label="Total libros" color={Colors.accent} />
          <StatBox value={stats.leidos}   label="Leídos"       color={Colors.success} />
          <StatBox value={stats.leyendo}  label="Leyendo"      color='#ffd466' />
          <StatBox value={stats.media_valoracion > 0 ? `${stats.media_valoracion}⭐` : '—'}
                   label="Val. media" color={Colors.warning} />
        </View>

        {/* ── OBJETIVO ANUAL ── */}
        <Card title={`🎯 Objetivo ${thisYear}`}>
          <Text style={s.objSub}>
            {stats.leidos_este_anio} de {objetivo} libros leídos
          </Text>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progreso * 100}%` as any }]} />
          </View>
          <View style={s.progressRow}>
            <Text style={s.progressPct}>
              {Math.round(progreso * 100)}%{stats.leidos_este_anio >= objetivo ? ' 🎉 ¡Objetivo cumplido!' : ''}
            </Text>
            {stats.premium && anioAnt > 0 && (
              <Text style={[s.diffText, { color: diff >= 0 ? Colors.success : Colors.danger }]}>
                {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)} vs {thisYear - 1}
              </Text>
            )}
          </View>
        </Card>

        {/* ── LIBROS POR AÑO ── */}
        <Card title="📅 Libros leídos por año">
          <View style={s.barChart}>
            {stats.por_anio.map(({ anio, total }) => {
              const height = total > 0 ? Math.max((total / maxAnio) * 100, 8) : 4;
              return (
                <View key={anio} style={s.barCol}>
                  {total > 0 && <Text style={s.barVal}>{total}</Text>}
                  <View style={[s.bar, {
                    height,
                    backgroundColor: anio === thisYear ? Colors.accent : Colors.accent + '44',
                  }]} />
                  <Text style={s.barLabel}>{String(anio).slice(2)}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* ── GÉNEROS ── */}
        {stats.top_generos.length > 0 && (
          <Card title="🏷 Géneros más leídos">
            {stats.top_generos.map(({ nombre, total }, i) => (
              <RankRow key={nombre} rank={i + 1} label={nombre} count={total}
                max={stats.top_generos[0].total} color={Colors.accent} />
            ))}
          </Card>
        )}

        {/* ── AUTORES (Alira+) ── */}
        {stats.premium && (stats.top_autores?.length ?? 0) > 0 && (
          <Card title="✍️ Autores más leídos">
            {stats.top_autores!.map(({ nombre, total }, i) => (
              <RankRow key={nombre} rank={i + 1} label={nombre} count={total}
                max={stats.top_autores![0].total} color={Colors.success} />
            ))}
          </Card>
        )}

        {/* ── IDIOMAS (Alira+) ── */}
        {stats.premium && (stats.top_idiomas?.length ?? 0) > 1 && (
          <Card title="🌐 Idiomas">
            <View style={s.idiomasRow}>
              {stats.top_idiomas!.map(({ idioma, total }) => (
                <View key={idioma} style={s.idiomaChip}>
                  <Text style={s.idiomaLang}>{idioma.toUpperCase()}</Text>
                  <Text style={s.idiomaCount}>{total}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* ── RACHA (Alira+) ── */}
        {stats.premium && (stats.racha ?? 0) > 0 && (
          <Card>
            <View style={s.rachaRow}>
              <Text style={{ fontSize: 36 }}>🔥</Text>
              <View>
                <Text style={s.rachaNum}>{stats.racha} {stats.racha === 1 ? 'día' : 'días'}</Text>
                <Text style={s.rachaSub}>de racha lectora activa</Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── MEJOR LIBRO (Alira+) ── */}
        {stats.premium && stats.mejor_libro && (
          <Card title="⭐ Tu libro mejor valorado">
            <View style={s.mejorRow}>
              {stats.mejor_libro.cover
                ? <Image source={{ uri: stats.mejor_libro.cover }} style={s.mejorCover} />
                : <View style={[s.mejorCover, s.noCover]}><Text style={{ fontSize: 24 }}>📚</Text></View>}
              <View style={{ flex: 1 }}>
                <Text style={s.mejorTitle} numberOfLines={2}>{stats.mejor_libro.titulo}</Text>
                <Text style={s.mejorAutor}>{stats.mejor_libro.autor}</Text>
                <Text style={{ fontSize: 18, marginTop: 6 }}>
                  {'⭐'.repeat(stats.mejor_libro.valoracion)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── PERSONAJE LECTOR (Alira+) ── */}
        {stats.premium && stats.personaje && (
          <Card>
            <Text style={s.personajeLabel}>Tu personaje lector</Text>
            <View style={s.personajeRow}>
              <Text style={{ fontSize: 52 }}>{stats.personaje.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.personajeNombre}>{stats.personaje.nombre}</Text>
                <Text style={s.personajeFrase}>"{stats.personaje.frase}"</Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── LOCK Alira+ ── */}
        {!stats.premium && (
          <TouchableOpacity onPress={() => router.push('/premium')}>
            <View style={s.premiumCard}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>⭐</Text>
              <Text style={s.premiumCardTitle}>Desbloquea estadísticas completas</Text>
              <Text style={s.premiumCardSub}>
                Autores favoritos, idiomas, racha lectora,{'\n'}
                mejor libro y tu personaje lector con Alira+
              </Text>
              <View style={s.premiumCardBtn}>
                <Text style={s.premiumCardBtnText}>Ver Alira+ →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={cs.card}>
      {title && <Text style={cs.title}>{title}</Text>}
      {children}
    </View>
  );
}

function StatBox({ value, label, color }: { value: any; label: string; color: string }) {
  return (
    <View style={[cs.statBox, { borderColor: color + '33' }]}>
      <Text style={[cs.statVal, { color }]}>{value}</Text>
      <Text style={cs.statLabel}>{label}</Text>
    </View>
  );
}

function RankRow({ rank, label, count, max, color }: {
  rank: number; label: string; count: number; max: number; color: string;
}) {
  return (
    <View style={s.rankRow}>
      <Text style={s.rankNum}>{rank}</Text>
      <View style={{ flex: 1 }}>
        <View style={s.rankBarBg}>
          <View style={[s.rankBarFill, { width: `${(count / max) * 100}%` as any, backgroundColor: color + '88' }]} />
        </View>
        <Text style={s.rankLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={s.rankCount}>{count}</Text>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  scroll:      { padding: Spacing.lg, paddingBottom: 60 },

  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },

  objSub:      { fontSize: 13, color: Colors.muted, marginBottom: 10 },
  progressBg:  { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  progressFill:{ height: 10, backgroundColor: Colors.accent, borderRadius: 99 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressPct: { fontSize: 12, color: Colors.muted },
  diffText:    { fontSize: 12, fontWeight: '700' },

  barChart:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 8 },
  barCol:      { flex: 1, alignItems: 'center', gap: 4 },
  bar:         { width: '100%', borderRadius: 6, minHeight: 4 },
  barVal:      { fontSize: 11, color: Colors.text, fontWeight: '700' },
  barLabel:    { fontSize: 11, color: Colors.muted },

  rankRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rankNum:     { fontSize: 13, fontWeight: '800', color: Colors.muted, width: 18 },
  rankBarBg:   { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, marginBottom: 4, overflow: 'hidden' },
  rankBarFill: { height: 6, borderRadius: 99 },
  rankLabel:   { fontSize: 13, color: Colors.text },
  rankCount:   { fontSize: 13, fontWeight: '700', color: Colors.muted, minWidth: 24, textAlign: 'right' },

  idiomasRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  idiomaChip:  { backgroundColor: Colors.accent + '18', borderRadius: Radius.full, borderWidth: 1,
                 borderColor: Colors.accent + '33', paddingHorizontal: 12, paddingVertical: 6,
                 flexDirection: 'row', gap: 8, alignItems: 'center' },
  idiomaLang:  { color: Colors.accent, fontSize: 13, fontWeight: '700' },
  idiomaCount: { color: Colors.muted, fontSize: 12 },

  rachaRow:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rachaNum:    { fontSize: 26, fontWeight: '900', color: '#ffd466' },
  rachaSub:    { fontSize: 13, color: Colors.muted },

  mejorRow:    { flexDirection: 'row', gap: 14, alignItems: 'center' },
  mejorCover:  { width: 64, height: 96, borderRadius: 8 },
  noCover:     { backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  mejorTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text },
  mejorAutor:  { fontSize: 13, color: Colors.muted, marginTop: 3 },

  personajeLabel:  { fontSize: 11, color: Colors.muted, textTransform: 'uppercase',
                     letterSpacing: 0.8, marginBottom: 12 },
  personajeRow:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  personajeNombre: { fontSize: 20, fontWeight: '900', color: Colors.accent, marginBottom: 6 },
  personajeFrase:  { fontSize: 13, color: Colors.muted, fontStyle: 'italic' },

  premiumCard:     { backgroundColor: Colors.accent + '0d', borderRadius: Radius.lg,
                     borderWidth: 1, borderColor: Colors.accent + '33',
                     padding: Spacing.lg, alignItems: 'center', marginBottom: 14 },
  premiumCardTitle:{ fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  premiumCardSub:  { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  premiumCardBtn:  { backgroundColor: Colors.accent, borderRadius: Radius.md,
                     paddingHorizontal: 24, paddingVertical: 12 },
  premiumCardBtnText: { color: Colors.bg, fontWeight: '800', fontSize: 15 },
  resumenBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.accent + '18', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.accent + '33',
    padding: Spacing.md, marginBottom: 14,
  },
  resumenTitle: { fontSize: 16, fontWeight: '800', color: Colors.accent, marginBottom: 4 },
  resumenSub:   { fontSize: 13, color: Colors.muted },
});

const cs = StyleSheet.create({
  card:     { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1,
              borderColor: Colors.border, padding: Spacing.md, marginBottom: 14 },
  title:    { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  statBox:  { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: Radius.md, borderWidth: 1, padding: 12, alignItems: 'center' },
  statVal:  { fontSize: 22, fontWeight: '900' },
  statLabel:{ fontSize: 12, color: Colors.muted, marginTop: 3 },
});
