// app/rachas.tsx
// Página de rachas — diaria primero, mensual después

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, SafeAreaView, ScrollView,
  Share, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun',
                      'Jul','Ago','Sep','Oct','Nov','Dic'];
const HITOS = [3, 7, 14, 30, 60, 100, 200, 365];

interface RachaDiariaInfo {
  racha_actual: number; racha_max: number; leido_hoy: boolean;
}
interface MesInfo {
  year: number; month: number; hoy: number;
  dias_marcados: number[]; total_mes: number;
}
interface RachaMensualData {
  racha: number; mes_actual_salvado: boolean;
  leidos_este_mes: number; objetivo_mes: number;
  dias_restantes: number;
  historial: {
    year: number; month: number; objetivo: number;
    leidos: number; completado: boolean; actual: boolean; futuro: boolean;
  }[];
}

export default function RachasScreen() {
  const [rachaD,   setRachaD]   = useState<RachaDiariaInfo | null>(null);
  const [mes,      setMes]      = useState<MesInfo | null>(null);
  const [rachaM,   setRachaM]   = useState<RachaMensualData | null>(null);
  const [objetivo, setObjetivo] = useState(1);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [marking,  setMarking]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [referral, setReferral] = useState<{
    referral_code: string;
    total_referidos: number;
    shields: number;
    historial: { tipo: string; motivo: string; shields_restantes: number; fecha: string }[];
  } | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const load = useCallback(async () => {
    const [r1, r2, r3, r4] = await Promise.all([
      api.getRachaDiaria(),
      api.getRachaDiariaMes(),
      api.getRachaMensual(),
      api.getReferralInfo(),
    ]);
    if (r1.ok) setRachaD(r1.data.data);
    if (r2.ok) setMes(r2.data.data);
    if (r3.ok) { setRachaM(r3.data.data); setObjetivo(r3.data.data.objetivo_mes); }
    if (r4.ok) setReferral(r4.data.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const bounce = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true, speed: 20 }),
      Animated.spring(scaleAnim, { toValue: 1,   useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const handleToggle = async () => {
    if (!rachaD || marking) return;
    setMarking(true);
    bounce();
    const fn = rachaD.leido_hoy ? api.desmarcarLeerHoy : api.marcarLeerHoy;
    const { ok, data } = await fn();
    if (ok) setRachaD(data.data);
    const r = await api.getRachaDiariaMes();
    if (r.ok) setMes(r.data.data);
    setMarking(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const hoy = new Date();
    await api.setObjetivoMensual(hoy.getFullYear(), hoy.getMonth() + 1, objetivo);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    const r = await api.getRachaMensual();
    if (r.ok) setRachaM(r.data.data);
  };

  if (loading) return (
    <SafeAreaView style={s.container}>
      <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
    </SafeAreaView>
  );

  const hito     = rachaD ? (HITOS.find(h => h > rachaD.racha_actual) ?? 365) : 7;
  const pctHito  = rachaD ? Math.min(rachaD.racha_actual / hito, 1) : 0;
  const fireColor = rachaD?.leido_hoy ? '#FF6B35' : rachaD && rachaD.racha_actual > 0 ? '#C07830' : Colors.muted;
  const pctMes   = rachaM ? Math.min(rachaM.leidos_este_mes / rachaM.objetivo_mes, 1) : 0;
  const enRiesgo = rachaM ? !rachaM.mes_actual_salvado && rachaM.dias_restantes <= 7 : false;
  const mesNombre = MESES[new Date().getMonth()];

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mis Rachas</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ══ RACHA DIARIA ══ */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>🔥 Racha diaria</Text>

          {/* Hero */}
          <View style={[s.heroCard, { borderColor: rachaD?.leido_hoy ? '#FF6B3540' : Colors.border }]}>
            <Animated.Text style={[s.heroFire, { transform: [{ scale: scaleAnim }] }]}>
              {rachaD?.leido_hoy ? '🔥' : '💤'}
            </Animated.Text>
            <View style={s.heroInfo}>
              <Text style={[s.heroNum, { color: fireColor }]}>
                {rachaD?.racha_actual ?? 0}
                <Text style={s.heroNumLabel}> días</Text>
              </Text>
              {rachaD && rachaD.racha_max > 0 && (
                <Text style={s.heroRecord}>🏆 Récord: {rachaD.racha_max} días</Text>
              )}
            </View>
          </View>

          {/* Botón marcar */}
          <TouchableOpacity
            style={[s.markBtn, {
              backgroundColor: rachaD?.leido_hoy ? 'rgba(255,107,53,0.12)' : Colors.accent,
              borderWidth: rachaD?.leido_hoy ? 1.5 : 0,
              borderColor: '#FF6B35',
              opacity: marking ? 0.7 : 1,
            }]}
            onPress={handleToggle}
            disabled={marking}
            activeOpacity={0.8}
          >
            <Text style={[s.markBtnText, { color: rachaD?.leido_hoy ? '#FF6B35' : Colors.bg }]}>
              {rachaD?.leido_hoy ? '✓ Ya leíste hoy' : '📖 Marcar leído hoy'}
            </Text>
          </TouchableOpacity>

          {!rachaD?.leido_hoy && rachaD && rachaD.racha_actual > 0 && (
            <Text style={s.markSub}>¡No rompas tu racha de {rachaD.racha_actual} días!</Text>
          )}

          {/* Próximo hito */}
          {rachaD && (
            <View style={s.hitoCard}>
              <Text style={s.hitoTitle}>🎯 Próximo hito: {hito} días</Text>
              <View style={s.hitoRow}>
                <Text style={[s.hitoNum, { color: fireColor }]}>{rachaD.racha_actual}</Text>
                <View style={s.hitoBg}>
                  <View style={[s.hitoFill, { width: `${pctHito * 100}%` as any, backgroundColor: fireColor }]} />
                </View>
                <Text style={s.hitoNum}>{hito}</Text>
              </View>
              <Text style={s.hitoSub}>
                {hito - rachaD.racha_actual} {hito - rachaD.racha_actual === 1 ? 'día' : 'días'} para llegar a {hito} 🔥
              </Text>
            </View>
          )}

          {/* Calendario */}
          {mes && (
            <View style={s.calCard}>
              <View style={s.calHeader}>
                <Text style={s.calTitle}>📅 {MESES[mes.month - 1]} {mes.year}</Text>
                <Text style={[s.calDias, { color: fireColor }]}>{mes.total_mes} días leídos</Text>
              </View>
              <CalendarioDias mes={mes} fireColor={fireColor} />
            </View>
          )}

         {/* ══ ESCUDOS Y REFERIDOS ══ */}
        <View style={s.section}>
         {referral && (
           <>
             {/* Escudos disponibles */}
             <View style={[s.heroCard, { borderColor: referral.shields > 0 ? 'rgba(100,180,255,0.3)' : Colors.border }]}>
               <Text style={{ fontSize: 48 }}>{referral.shields > 0 ? '🛡️' : '🔓'}</Text>
               <View style={s.heroInfo}>
                 <Text style={[s.heroNum, { color: referral.shields > 0 ? '#64B4FF' : Colors.muted }]}>
                   {referral.shields}
                   <Text style={s.heroNumLabel}> {referral.shields === 1 ? 'escudo' : 'escudos'}</Text>
                 </Text>
                 <Text style={s.heroRecord}>
                   {referral.shields > 0 ? 'Tu racha está protegida 💪' : 'Invita amigos para conseguir escudos'}
                 </Text>
               </View>
             </View>

             {/* Código de referido */}
             <View style={s.refCard}>
               <Text style={s.refTitle}>Tu código de referido</Text>
               <TouchableOpacity
                 style={s.refCode}
                 onPress={() => Share.share({
                  message: `🔥 Llevo ${rachaD?.racha_actual ?? 0} días seguidos leyendo y no pienso parar. ¿Te unes al reto? Usa mi código ${referral.referral_code} en Alira y empieza tu racha 📚 https://aliraspace.com`,
                 })}
               >
                 <Text style={s.refCodeText}>{referral.referral_code}</Text>
                 <Text style={s.refCodeShare}>Compartir →</Text>
               </TouchableOpacity>
               <Text style={s.refSub}>
                 {referral.total_referidos} {referral.total_referidos === 1 ? 'amigo invitado' : 'amigos invitados'} · Cada amigo = 1 escudo 🛡️
               </Text>
             </View>

             {/* Historial */}
             {referral.historial.length > 0 && (
               <View style={s.mesesCard}>
                 <Text style={s.mesesTitle}>Historial de escudos</Text>
                 {referral.historial.map((h, i) => (
                   <View key={i} style={s.hisRow}>
                     <Text style={{ fontSize: 18 }}>{h.tipo === 'ganado' ? '🛡️' : '✨'}</Text>
                     <View style={{ flex: 1 }}>
                       <Text style={[s.hisMotivo, { color: h.tipo === 'ganado' ? '#64B4FF' : Colors.success }]}>
                         {h.tipo === 'ganado' ? '+ Escudo ganado' : '+ Racha protegida'}
                       </Text>
                       <Text style={s.hisFecha}>{h.motivo}</Text>
                     </View>
                     <Text style={[s.hisNum, { color: h.tipo === 'ganado' ? '#64B4FF' : Colors.muted }]}>
                       {h.shields_restantes} 🛡️
                     </Text>
                   </View>
                 ))}
               </View>
             )}
           </>
         )}
        </View>

        {/* Divisor */}
        <View style={s.divider} />

        {/* ══ RACHA MENSUAL ══ */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>📚 Racha mensual</Text>

          {/* Hero mensual */}
          <View style={[s.heroCard, { borderColor: rachaM?.mes_actual_salvado ? '#ffd46640' : Colors.border }]}>
            <Text style={s.heroFire}>{rachaM?.mes_actual_salvado ? '🔥' : enRiesgo ? '⚠️' : '📖'}</Text>
            <View style={s.heroInfo}>
              <Text style={[s.heroNum, { color: rachaM?.mes_actual_salvado ? '#ffd466' : enRiesgo ? Colors.danger : Colors.accent }]}>
                {rachaM?.racha ?? 0}
                <Text style={s.heroNumLabel}> {rachaM?.racha === 1 ? 'mes' : 'meses'}</Text>
              </Text>
              <Text style={s.heroRecord}>
                {rachaM?.mes_actual_salvado ? '✅ Este mes completado' : enRiesgo ? `⚠️ Quedan ${rachaM?.dias_restantes} días` : `${rachaM?.leidos_este_mes}/${rachaM?.objetivo_mes} libros este mes`}
              </Text>
            </View>
          </View>

          {/* Progreso mes */}
          {rachaM && (
            <View style={s.progCard}>
              <Text style={s.progTitle}>Progreso de {mesNombre}</Text>
              <View style={s.progBg}>
                <View style={[s.progFill, {
                  width: `${pctMes * 100}%` as any,
                  backgroundColor: rachaM.mes_actual_salvado ? '#ffd466' : enRiesgo ? Colors.danger : Colors.accent,
                }]} />
              </View>
              <Text style={s.progLabel}>{rachaM.leidos_este_mes} de {rachaM.objetivo_mes} libro{rachaM.objetivo_mes !== 1 ? 's' : ''}</Text>
            </View>
          )}

          {/* Objetivo */}
          <View style={s.objCard}>
            <Text style={s.objTitle}>Objetivo para {mesNombre}</Text>
            <Text style={s.objSub}>¿Cuántos libros quieres leer este mes?</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                style={[s.stepBtn, objetivo <= 1 && { opacity: 0.3 }]}
                onPress={() => setObjetivo(Math.max(1, objetivo - 1))}
                disabled={objetivo <= 1}
              >
                <Text style={s.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.stepValue}>{objetivo}</Text>
              <TouchableOpacity
                style={[s.stepBtn, objetivo >= 20 && { opacity: 0.3 }]}
                onPress={() => setObjetivo(Math.min(20, objetivo + 1))}
                disabled={objetivo >= 20}
              >
                <Text style={s.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={Colors.bg} />
                : <Text style={s.saveBtnText}>{saved ? '✅ Guardado' : 'Guardar objetivo'}</Text>}
            </TouchableOpacity>
          </View>

          {/* 12 meses */}
          {rachaM && (
            <View style={s.mesesCard}>
              <Text style={s.mesesTitle}>Últimos 12 meses</Text>
              {[rachaM.historial.slice(0, 6), rachaM.historial.slice(6, 12)].map((fila, fi) => (
                <View key={fi} style={s.mesesFila}>
                  {fila.map((m) => (
                    <View key={`${m.year}-${m.month}`} style={s.mesBadge}>
                      <View style={[
                        s.mesBadgeCircle,
                        m.completado && s.mesBadgeOk,
                        m.actual && s.mesBadgeActual,
                        m.futuro && { opacity: 0.25 },
                      ]}>
                        <Text style={[s.mesBadgeText, m.completado && { color: '#ffd466' }, m.actual && { color: Colors.accent }]}>
                          {m.completado ? '🔥' : m.actual ? `${m.leidos}/${m.objetivo}` : m.futuro ? '' : '○'}
                        </Text>
                      </View>
                      <Text style={[s.mesBadgeLabel, m.futuro && { opacity: 0.3 }]}>
                        {MESES_CORTOS[m.month - 1]}
                      </Text>
                      {m.completado && <Text style={s.mesBadgeCount}>{m.leidos}</Text>}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
       </View>

       <View style={{ height: 40 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Calendario ────────────────────────────────────────────────────────────────
function CalendarioDias({ mes, fireColor }: { mes: MesInfo; fireColor: string }) {
  const diasEnMes = new Date(mes.year, mes.month, 0).getDate();
  const primerDia = new Date(mes.year, mes.month - 1, 1).getDay();
  const offset    = primerDia === 0 ? 6 : primerDia - 1;
  const dias: (number | null)[] = [];
  for (let i = 0; i < offset; i++) dias.push(null);
  for (let i = 1; i <= diasEnMes; i++) dias.push(i);

  return (
    <View style={cal.grid}>
      {['L','M','X','J','V','S','D'].map(d => (
        <Text key={d} style={cal.label}>{d}</Text>
      ))}
      {dias.map((dia, i) => {
        if (!dia) return <View key={`e-${i}`} style={cal.cell} />;
        const marcado  = mes.dias_marcados.includes(dia);
        const esHoy    = dia === mes.hoy;
        const esFuturo = dia > mes.hoy;
        return (
          <View key={dia} style={[
            cal.cell,
            marcado  && { backgroundColor: fireColor + '25', borderColor: fireColor + '60', borderWidth: 1 },
            esHoy && !marcado && { borderWidth: 1.5, borderColor: Colors.accent },
            esFuturo && { opacity: 0.3 },
          ]}>
            <Text style={[
              cal.cellText,
              marcado  && { color: fireColor, fontWeight: '800' },
              esHoy && !marcado && { color: Colors.accent, fontWeight: '800' },
            ]}>{dia}</Text>
            {marcado && <Text style={cal.flame}>🔥</Text>}
            {esHoy && !marcado && <View style={[cal.dot, { backgroundColor: Colors.accent }]} />}
          </View>
        );
      })}
    </View>
  );
}

const cal = StyleSheet.create({
  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 0 },
  label: { width: 40, textAlign: 'center', fontSize: 10,
           fontWeight: '700', color: Colors.muted, marginBottom: 6 },
  cell:  { width: 40, height: 40, borderRadius: 8,
           alignItems: 'center', justifyContent: 'center',
           backgroundColor: 'rgba(255,255,255,0.04)' },
  cellText: { fontSize: 12, fontWeight: '500', color: Colors.muted },
  flame:    { fontSize: 8, position: 'absolute', bottom: 1, right: 2 },
  dot:      { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 3 },
  
});

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:    { paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: Spacing.lg, paddingVertical: 14,
                 borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { paddingVertical: 4 },
  backTxt:     { color: Colors.accent, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.text },

  section:      { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: Colors.muted,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },

  divider: { height: 1, backgroundColor: Colors.border,
             marginHorizontal: Spacing.lg, marginVertical: Spacing.lg },

  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 16,
              backgroundColor: Colors.card, borderRadius: Radius.lg,
              borderWidth: 1, padding: 20, marginBottom: 14 },
  heroFire: { fontSize: 48 },
  heroInfo: { flex: 1 },
  heroNum:  { fontSize: 42, fontWeight: '900' },
  heroNumLabel: { fontSize: 18, fontWeight: '400', color: Colors.muted },
  heroRecord:   { fontSize: 12, color: Colors.muted, marginTop: 2 },

  markBtn:     { borderRadius: Radius.lg, paddingVertical: 16,
                 alignItems: 'center', marginBottom: 8 },
  markBtnText: { fontSize: 16, fontWeight: '800' },
  markSub:     { textAlign: 'center', fontSize: 12, color: Colors.muted, marginBottom: 14 },

  hitoCard:  { backgroundColor: Colors.card, borderRadius: Radius.lg,
               borderWidth: 1, borderColor: Colors.border,
               padding: 16, marginBottom: 14 },
  hitoTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  hitoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  hitoNum:   { fontSize: 13, fontWeight: '800', color: Colors.muted, minWidth: 28 },
  hitoBg:    { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.08)',
               borderRadius: 99, overflow: 'hidden' },
  hitoFill:  { height: 10, borderRadius: 99 },
  hitoSub:   { fontSize: 12, color: Colors.muted },

  calCard:   { backgroundColor: Colors.card, borderRadius: Radius.lg,
               borderWidth: 1, borderColor: Colors.border,
               padding: 16, marginBottom: 14, alignItems: 'center' },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between',
               alignItems: 'center', marginBottom: 14, alignSelf: 'stretch' },
  calTitle:  { fontSize: 14, fontWeight: '700', color: Colors.text },
  calDias:   { fontSize: 13, fontWeight: '800' },

  escudoCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14,
                 backgroundColor: Colors.card, borderRadius: Radius.lg,
                 borderWidth: 1, borderColor: Colors.border, padding: 16 },
  escudoIcon:  { fontSize: 32 },
  escudoTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  escudoSub:   { fontSize: 12, color: Colors.muted, lineHeight: 18 },

  progCard:  { backgroundColor: Colors.card, borderRadius: Radius.lg,
               borderWidth: 1, borderColor: Colors.border,
               padding: 16, marginBottom: 14 },
  progTitle: { fontSize: 13, fontWeight: '700', color: Colors.muted,
               textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  progBg:    { height: 10, backgroundColor: 'rgba(255,255,255,0.08)',
               borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  progFill:  { height: 10, borderRadius: 99 },
  progLabel: { fontSize: 12, color: Colors.muted },

  objCard:   { backgroundColor: Colors.card, borderRadius: Radius.lg,
               borderWidth: 1, borderColor: Colors.border,
               padding: 16, marginBottom: 14 },
  objTitle:  { fontSize: 13, fontWeight: '700', color: Colors.muted,
               textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  objSub:    { fontSize: 13, color: Colors.muted, marginBottom: 16 },
  stepper:   { flexDirection: 'row', alignItems: 'center',
               justifyContent: 'center', gap: 24, marginBottom: 16 },
  stepBtn:   { width: 48, height: 48, borderRadius: 24,
               backgroundColor: Colors.accent + '22',
               borderWidth: 1, borderColor: Colors.accent + '44',
               justifyContent: 'center', alignItems: 'center' },
  stepBtnText: { fontSize: 24, fontWeight: '700', color: Colors.accent },
  stepValue:   { fontSize: 48, fontWeight: '900', color: Colors.text,
                 minWidth: 60, textAlign: 'center' },
  saveBtn:     { backgroundColor: Colors.accent, borderRadius: Radius.md,
                 padding: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '800' },

  mesesCard:  { backgroundColor: Colors.card, borderRadius: Radius.lg,
                borderWidth: 1, borderColor: Colors.border, padding: 16 },
  mesesTitle: { fontSize: 13, fontWeight: '700', color: Colors.muted,
                textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  mesesFila:  { flexDirection: 'row', gap: 8, marginBottom: 12 },
  mesBadge:   { flex: 1, alignItems: 'center' },
  mesBadgeCircle: { width: 44, height: 44, borderRadius: 22,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: 1, borderColor: Colors.border },
  mesBadgeOk:    { backgroundColor: 'rgba(255,212,102,0.15)',
                   borderColor: 'rgba(255,212,102,0.4)' },
  mesBadgeActual:{ backgroundColor: Colors.accent + '18',
                   borderColor: Colors.accent + '44' },
  mesBadgeText:  { fontSize: 12, fontWeight: '600', color: Colors.muted },
  mesBadgeLabel: { fontSize: 10, color: Colors.muted, marginTop: 4 },
  mesBadgeCount: { fontSize: 9, color: '#ffd466', fontWeight: '700' },
  refCard:      { backgroundColor: Colors.card, borderRadius: Radius.lg,
                  borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 14 },
  refTitle:     { fontSize: 12, fontWeight: '700', color: Colors.muted,
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  refCode:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: 'rgba(100,180,255,0.08)', borderRadius: Radius.md,
                  borderWidth: 1, borderColor: 'rgba(100,180,255,0.25)',
                  paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10 },
  refCodeText:  { fontSize: 22, fontWeight: '900', color: '#64B4FF', letterSpacing: 2 },
  refCodeShare: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  refSub:       { fontSize: 12, color: Colors.muted, lineHeight: 18 },
  hisRow:       { flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  hisMotivo:    { fontSize: 13, fontWeight: '700' },
  hisFecha:     { fontSize: 11, color: Colors.muted, marginTop: 2 },
  hisNum:       { fontSize: 13, fontWeight: '800' },
});
