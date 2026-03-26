
// components/RachaDiariaWidget.tsx

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated, Modal, Pressable, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

interface RachaDiariaInfo {
  racha_actual: number;
  racha_max:    number;
  leido_hoy:    boolean;
}

interface MesInfo {
  year: number; month: number; hoy: number;
  dias_marcados: number[]; total_mes: number;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun',
                      'Jul','Ago','Sep','Oct','Nov','Dic'];

const HITOS = [3, 7, 14, 30, 60, 100, 200, 365];

function proximoHito(racha: number): number {
  return HITOS.find(h => h > racha) ?? 365;
}

// ── Badge compacto para el header ─────────────────────────────────────────────
interface BadgeProps {
  onPress: () => void;
}

// ── Modal completo estilo Duolingo ────────────────────────────────────────────
interface ModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RachaDiariaModal({ visible, onClose }: ModalProps) {
  const [info,    setInfo]    = useState<RachaDiariaInfo | null>(null);
  const [mes,     setMes]     = useState<MesInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      api.getRachaDiaria(),
      api.getRachaDiariaMes(),
    ]);
    if (r1.ok) setInfo(r1.data.data);
    if (r2.ok) setMes(r2.data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const bounce = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true, speed: 20 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const handleToggle = async () => {
    if (!info || marking) return;
    setMarking(true);
    bounce();
    const fn = info.leido_hoy ? api.desmarcarLeerHoy : api.marcarLeerHoy;
    const { ok, data } = await fn();
    if (ok) {
      setInfo(data.data);
      // Recargar mes para actualizar calendario
      const r = await api.getRachaDiariaMes();
      if (r.ok) setMes(r.data.data);
    }
    setMarking(false);
  };

  const hito = info ? proximoHito(info.racha_actual) : 7;
  const pctHito = info ? Math.min(info.racha_actual / hito, 1) : 0;
  const fireColor = info?.leido_hoy ? '#FF6B35' : '#888';
  const headerBg  = info?.leido_hoy ? '#1A0A00' : '#111';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={m.sheet} onPress={e => e.stopPropagation()}>

          {/* ── HEADER estilo Duolingo ── */}
          <View style={[m.header, { backgroundColor: headerBg }]}>
            <TouchableOpacity style={m.closeBtn} onPress={onClose}>
              <Text style={m.closeTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={m.headerTitle}>Racha de lectura</Text>
            <TouchableOpacity style={m.statsBtn} onPress={() => { onClose(); router.push('/stats'); }}>
              <Text style={m.statsBtnTxt}>Ver stats →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            {/* ── HERO: número de días ── */}
            <View style={[m.hero, { backgroundColor: headerBg }]}>
              <Animated.Text style={[m.heroFire, { transform: [{ scale: scaleAnim }] }]}>
                {info?.leido_hoy ? '🔥' : '💤'}
              </Animated.Text>
              <Text style={[m.heroNum, { color: fireColor }]}>
                {info?.racha_actual ?? 0}
              </Text>
              <Text style={m.heroLabel}>
                {(info?.racha_actual ?? 0) === 1 ? 'día de racha' : 'días de racha'}
              </Text>
              {info && info.racha_max > 0 && (
                <Text style={m.heroRecord}>🏆 Récord: {info.racha_max} días</Text>
              )}
            </View>

            {/* ── BOTÓN MARCAR ── */}
            <View style={m.section}>
              <TouchableOpacity
                style={[m.markBtn, {
                  backgroundColor: info?.leido_hoy ? 'rgba(255,107,53,0.15)' : Colors.accent,
                  borderWidth: info?.leido_hoy ? 1.5 : 0,
                  borderColor: info?.leido_hoy ? '#FF6B35' : 'transparent',
                  opacity: marking ? 0.7 : 1,
                }]}
                onPress={handleToggle}
                disabled={marking}
                activeOpacity={0.8}
              >
                <Text style={[m.markBtnText, { color: info?.leido_hoy ? '#FF6B35' : Colors.bg }]}>
                  {info?.leido_hoy ? '✓ Ya leíste hoy' : '📖 Marcar leído hoy'}
                </Text>
              </TouchableOpacity>
              {!info?.leido_hoy && (
                <Text style={m.markSub}>
                  {info && info.racha_actual > 0
                    ? `¡No rompas tu racha de ${info.racha_actual} días!`
                    : 'Empieza tu racha lectora hoy'}
                </Text>
              )}
            </View>

            {/* ── PRÓXIMO HITO ── */}
            {info && (
              <View style={m.section}>
                <Text style={m.sectionTitle}>🎯 Próximo hito</Text>
                <View style={m.hitoRow}>
                  <Text style={m.hitoActual}>{info.racha_actual}</Text>
                  <View style={m.hitoBg}>
                    <View style={[m.hitoFill, {
                      width: `${pctHito * 100}%` as any,
                      backgroundColor: fireColor,
                    }]} />
                  </View>
                  <Text style={m.hitoMeta}>{hito}</Text>
                </View>
                <Text style={m.hitoSub}>
                  {hito - (info.racha_actual)} {hito - info.racha_actual === 1 ? 'día' : 'días'} para llegar a {hito} 🔥
                </Text>
              </View>
            )}

            {/* ── CALENDARIO ── */}
            {mes && (
              <View style={m.section}>
                <View style={m.calHeader}>
                  <Text style={m.sectionTitle}>📅 {MESES[mes.month - 1]} {mes.year}</Text>
                  <View style={m.calStats}>
                    <View style={m.calStat}>
                      <Text style={m.calStatNum}>{mes.total_mes}</Text>
                      <Text style={m.calStatLabel}>días leídos</Text>
                    </View>
                  </View>
                </View>
                <CalendarioDias mes={mes} fireColor={fireColor} />
              </View>
            )}

            {/* ── HISTORIAL DE MESES ── */}
            {mes && (
              <View style={m.section}>
                <Text style={m.sectionTitle}>📆 Historial</Text>
                <HistorialMeses mesActual={mes} />
              </View>
            )}

            {/* ── ESCUDOS (placeholder para futuro) ── */}
            <View style={[m.section, m.escudoCard]}>
              <Text style={m.escudoIcon}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={m.escudoTitle}>Protectores de racha</Text>
                <Text style={m.escudoSub}>Invita 3 amigos que se suscriban y gana un escudo que protege tu racha si un día no lees.</Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Calendario de días ────────────────────────────────────────────────────────
function CalendarioDias({ mes, fireColor }: {
  mes: MesInfo;
  fireColor: string;
}) {
  const diasEnMes = new Date(mes.year, mes.month, 0).getDate();
  const primerDia = new Date(mes.year, mes.month - 1, 1).getDay();
  const offset    = primerDia === 0 ? 6 : primerDia - 1;

  const dias: (number | null)[] = [];
  for (let i = 0; i < offset; i++) dias.push(null);
  for (let i = 1; i <= diasEnMes; i++) dias.push(i);

  // Agrupar por semanas para mostrar rachas continuas
  return (
    <View style={cal.wrap}>
      {['L','M','X','J','V','S','D'].map(d => (
        <Text key={d} style={cal.dayLabel}>{d}</Text>
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
            ]}>
              {dia}
            </Text>
            {marcado && <Text style={cal.flame}>🔥</Text>}
            {esHoy && !marcado && <View style={[cal.todayDot, { backgroundColor: Colors.accent }]} />}
          </View>
        );
      })}
    </View>
  );
}

const cal = StyleSheet.create({
  wrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  dayLabel:  { width: '13.5%', textAlign: 'center', fontSize: 10,
               fontWeight: '700', color: Colors.muted, marginBottom: 6 },
  cell:      { width: '13.5%', aspectRatio: 1, borderRadius: 8,
               alignItems: 'center', justifyContent: 'center',
               backgroundColor: 'rgba(255,255,255,0.04)' },
  cellText:  { fontSize: 12, fontWeight: '500', color: Colors.muted },
  flame:     { fontSize: 8, position: 'absolute', bottom: 1, right: 2 },
  todayDot:  { width: 4, height: 4, borderRadius: 2,
               position: 'absolute', bottom: 3 },
});

// ── Historial de meses con días leídos ───────────────────────────────────────
function HistorialMeses({ mesActual }: { mesActual: MesInfo }) {
  // Generamos los últimos 6 meses
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    let m = mesActual.month - i;
    let y = mesActual.year;
    while (m <= 0) { m += 12; y--; }
    meses.push({ year: y, month: m, esActual: i === 0 });
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={his.row}>
        {meses.map(({ year, month, esActual }) => {
          const diasMes = esActual ? mesActual.total_mes : 0;
          const totalDias = new Date(year, month, 0).getDate();
          const pct = diasMes / totalDias;
          return (
            <View key={`${year}-${month}`} style={his.mes}>
              <View style={his.barWrap}>
                <View style={[his.barFill, {
                  height: `${Math.max(pct * 100, 4)}%` as any,
                  backgroundColor: esActual ? '#FF6B35' : Colors.accent + '66',
                }]} />
              </View>
              <Text style={[his.label, esActual && { color: '#FF6B35', fontWeight: '700' }]}>
                {MESES_CORTOS[month - 1]}
              </Text>
              {esActual && (
                <Text style={his.count}>{diasMes}d</Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const his = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 80, paddingBottom: 4 },
  mes:     { alignItems: 'center', width: 44 },
  barWrap: { width: 28, height: 60, backgroundColor: 'rgba(255,255,255,0.06)',
             borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  label:   { fontSize: 10, color: Colors.muted, marginTop: 4 },
  count:   { fontSize: 9, color: '#FF6B35', fontWeight: '700' },
});

// ── Estilos modal ─────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
             borderWidth: 1, borderColor: Colors.border, maxHeight: '92%' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: Spacing.lg, paddingTop: 20, paddingBottom: 16,
                 borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  closeBtn:    { width: 32, height: 32, borderRadius: 16,
                 backgroundColor: 'rgba(255,255,255,0.08)',
                 alignItems: 'center', justifyContent: 'center' },
  closeTxt:    { color: Colors.muted, fontSize: 14, fontWeight: '700' },
  statsBtn:    { paddingHorizontal: 10, paddingVertical: 6 },
  statsBtnTxt: { color: Colors.accent, fontSize: 13, fontWeight: '700' },

  hero:      { alignItems: 'center', paddingVertical: 28, paddingBottom: 32 },
  heroFire:  { fontSize: 64, marginBottom: 8 },
  heroNum:   { fontSize: 72, fontWeight: '900', lineHeight: 76 },
  heroLabel: { fontSize: 18, fontWeight: '600', color: Colors.muted, marginTop: 4 },
  heroRecord:{ fontSize: 12, color: Colors.muted, marginTop: 8 },

  section:   { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: Colors.muted,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },

  markBtn:     { borderRadius: Radius.lg, paddingVertical: 16,
                 alignItems: 'center', marginBottom: 8 },
  markBtnText: { fontSize: 16, fontWeight: '800' },
  markSub:     { textAlign: 'center', fontSize: 12, color: Colors.muted },

  hitoRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  hitoActual: { fontSize: 14, fontWeight: '800', color: Colors.text, minWidth: 28 },
  hitoBg:     { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 99, overflow: 'hidden' },
  hitoFill:   { height: 10, borderRadius: 99 },
  hitoMeta:   { fontSize: 14, fontWeight: '800', color: Colors.muted, minWidth: 32, textAlign: 'right' },
  hitoSub:    { fontSize: 12, color: Colors.muted },

  calHeader:  { flexDirection: 'row', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 14 },
  calStats:   { flexDirection: 'row', gap: 16 },
  calStat:    { alignItems: 'center' },
  calStatNum: { fontSize: 18, fontWeight: '900', color: '#FF6B35' },
  calStatLabel:{ fontSize: 10, color: Colors.muted },

  escudoCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14,
                 backgroundColor: 'rgba(255,255,255,0.04)',
                 marginHorizontal: Spacing.lg, borderRadius: Radius.lg,
                 padding: 16, borderWidth: 1, borderColor: Colors.border },
  escudoIcon:  { fontSize: 32 },
  escudoTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  escudoSub:   { fontSize: 12, color: Colors.muted, lineHeight: 18 },
});
