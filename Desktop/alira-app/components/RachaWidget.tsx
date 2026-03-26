// components/RachaWidget.tsx
// Widget de racha mensual tipo Duolingo
// Uso en stats.tsx:   <RachaWidget />
// Uso en coleccion.tsx o home: <RachaWidget compact />

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface MesHistorial {
  year: number; month: number; objetivo: number;
  leidos: number; completado: boolean; actual: boolean; futuro: boolean;
}

interface RachaData {
  racha: number;
  mes_actual_salvado: boolean;
  leidos_este_mes: number;
  objetivo_mes: number;
  dias_restantes: number;
  historial: MesHistorial[];
}

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface Props {
  compact?: boolean; // true = solo el badge de fuego para la home
}

export default function RachaWidget({ compact = false }: Props) {
  const [data,       setData]       = useState<RachaData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [objetivo,   setObjetivo]   = useState(1);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [rachaD,     setRachaD]     = useState<{racha_actual: number; leido_hoy: boolean} | null>(null);

  const load = async () => {
    setLoading(true);
    const { ok, data: d } = await api.getRachaMensual();
    if (ok) {
      setData(d.data);
      setObjetivo(d.data.objetivo_mes);
    }
    setLoading(false);
    const { ok: okD, data: dD } = await api.getRachaDiaria();
    if (okD) setRachaD(dD.data);

  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const hoy = new Date();
    await api.setObjetivoMensual(hoy.getFullYear(), hoy.getMonth() + 1, objetivo);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  };

  const handleLeerHoy = async () => {
    const fn = rachaD?.leido_hoy ? api.desmarcarLeerHoy : api.marcarLeerHoy;
    const { ok, data: d } = await fn();
    if (ok) setRachaD(d.data);
  };
  

  if (loading) return (
    <View style={[s.container, compact && s.compact]}>
      <ActivityIndicator size="small" color={Colors.accent} />
    </View>
  );

  if (!data) return null;

  const pct     = Math.min(data.leidos_este_mes / data.objetivo_mes, 1);
  const enRiesgo = !data.mes_actual_salvado && data.dias_restantes <= 7;
  const fireColor = data.mes_actual_salvado ? '#ffd466' : enRiesgo ? '#ff5b6e' : Colors.muted;

  // ── Modo compacto (badge para header) ────────────────────────────────────

if (compact) {
  return (
    <>
      <View style={s.badgeRow}>
        <TouchableOpacity style={s.badge} onPress={() => setModalOpen(true)}>
          <Text style={[s.badgeFire, { color: fireColor }]}>🔥</Text>
          <Text style={[s.badgeNum, { color: fireColor }]}>{data.racha}</Text>
        </TouchableOpacity>
        {rachaD !== null && (
          <TouchableOpacity
            style={[s.badge, { 
              backgroundColor: rachaD.leido_hoy 
                ? 'rgba(255,107,53,0.15)' 
                : rachaD.racha_actual > 0 
                  ? 'rgba(255,255,255,0.08)' 
                  : 'rgba(255,255,255,0.04)' 
            }]}
            onPress={handleLeerHoy}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.badgeFire}>
              {rachaD.leido_hoy ? '📖' : rachaD.racha_actual > 0 ? '💤' : '😴'}
            </Text>
            <Text style={[s.boadgeNum, { color: rachaD.leido_hoy ? '#FF6B35' : rachaD.racha_actual > 0 ? Colors.text : Colors.muted }]}>
              {rachaD.racha_actual}d
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <RachaModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        data={data}
        objetivo={objetivo}
        setObjetivo={setObjetivo}
        onSave={handleSave}
        saving={saving}
        saved={saved}
        fireColor={fireColor}
        pct={pct}
        enRiesgo={enRiesgo}
      />
    </>
  );
}

  // ── Modo completo (para stats) ────────────────────────────────────────────
  return (
    <>
      <TouchableOpacity style={s.card} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
        {/* Fila principal */}
        <View style={s.mainRow}>
          <View style={s.fireWrap}>
            <Text style={[s.fireBig, { color: fireColor }]}>🔥</Text>
            <Text style={[s.rachaNum, { color: fireColor }]}>{data.racha}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rachaLabel}>
              {data.racha === 1 ? 'mes de racha' : 'meses de racha'}
            </Text>
            <Text style={s.rachaSub}>
              {data.mes_actual_salvado
                ? '✅ Este mes completado'
                : enRiesgo
                  ? `⚠️ Quedan ${data.dias_restantes} días`
                  : `📖 ${data.leidos_este_mes}/${data.objetivo_mes} libros este mes`}
            </Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </View>

        {/* Barra de progreso del mes */}
        <View style={s.progressBg}>
          <View style={[s.progressFill, {
            width: `${pct * 100}%` as any,
            backgroundColor: data.mes_actual_salvado ? '#ffd466' : enRiesgo ? '#ff5b6e' : Colors.accent,
          }]} />
        </View>
        <Text style={s.progressLabel}>
          {data.leidos_este_mes} de {data.objetivo_mes} libro{data.objetivo_mes !== 1 ? 's' : ''} este mes
          {data.mes_actual_salvado ? ' 🎉' : ` · ${data.dias_restantes} días restantes`}
        </Text>

        {/* Badges de los últimos 12 meses */}
        <View style={s.badgesRow}>
          {[data.historial.slice(0, 6), data.historial.slice(6, 12)].map((fila, fi) => (
            <View key={fi} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
              {fila.map((mes) => (
                <View
                  key={`${mes.year}-${mes.month}`}
                  style={[
                    s.mesBadge,
                    mes.completado && s.mesBadgeOk,
                    mes.actual && s.mesBadgeActual,
                    mes.futuro && s.mesBadgeFuturo,
                  ]}
                >
                  <Text style={[
                    s.mesBadgeText,
                    mes.completado && { color: '#ffd466' },
                    mes.actual && { color: Colors.accent },
                    mes.futuro && { color: Colors.muted + '44' },
                  ]}>
                    {mes.completado ? '🔥' : mes.actual ? `${mes.leidos}/${mes.objetivo}` : mes.futuro ? '·' : '○'}
                  </Text>
                  <Text style={[
                    s.mesBadgeLabel,
                    mes.futuro && { color: Colors.muted + '44' },
                  ]}>
                    {MESES_CORTOS[mes.month - 1]}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </TouchableOpacity>

      <RachaModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        data={data}
        objetivo={objetivo}
        setObjetivo={setObjetivo}
        onSave={handleSave}
        saving={saving}
        saved={saved}
        fireColor={fireColor}
        pct={pct}
        enRiesgo={enRiesgo}
      />
    </>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function RachaModal({ visible, onClose, data, objetivo, setObjetivo, onSave,
  saving, saved, fireColor, pct, enRiesgo, mes }: {
  visible: boolean; onClose: () => void; data: RachaData;
  objetivo: number; setObjetivo: (n: number) => void;
  onSave: () => void; saving: boolean; saved: boolean;
  fireColor: string; pct: number; enRiesgo: boolean;
}) {

  const hoy = new Date();
  const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][hoy.getMonth()];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
     <Pressable style={ms.overlay} onPress={onClose}>
       <Pressable style={ms.sheet} onPress={e => e.stopPropagation()}>
         <View style={ms.handleRow}>
           <View style={ms.handle} />
           <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
             <Text style={ms.closeTxt}>✕</Text>
           </TouchableOpacity>
         </View>
         <ScrollView 
           showsVerticalScrollIndicator={false}
           bounces={false}
           nestedScrollEnabled={true}
           style={{ flex: 1 }}
           contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
           onScrollEndDrag={(e) => {
             if (e.nativeEvent.contentOffset.y < -50) onClose();
           }}         
         >
            {/* Header del modal */}
          <View style={ms.head}>
            <Text style={[ms.fire, { color: fireColor }]}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={ms.title}>{data.racha} {data.racha === 1 ? 'mes' : 'meses'} de racha</Text>
              <Text style={ms.sub}>
                {data.mes_actual_salvado
                  ? '¡Objetivo mensual cumplido!'
                  : enRiesgo
                    ? `⚠️ Solo quedan ${data.dias_restantes} días`
                    : `${data.dias_restantes} días restantes en ${mesNombre}`}
              </Text>
            </View>
          </View>

          {/* Progreso mes actual */}
          <View style={ms.section}>
            <Text style={ms.sectionTitle}>Progreso de {mesNombre}</Text>
            <View style={ms.progressBg}>
              <View style={[ms.progressFill, {
                width: `${pct * 100}%` as any,
                backgroundColor: data.mes_actual_salvado ? '#ffd466' : enRiesgo ? '#ff5b6e' : Colors.accent,
              }]} />
            </View>
            <Text style={ms.progressLabel}>
              {data.leidos_este_mes} de {data.objetivo_mes} libro{data.objetivo_mes !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Configurar objetivo */}
          <View style={ms.section}>
            <Text style={ms.sectionTitle}>Objetivo para {mesNombre}</Text>
            <Text style={ms.sectionSub}>¿Cuántos libros quieres leer este mes?</Text>
            <View style={ms.stepper}>
              <TouchableOpacity
                style={[ms.stepBtn, objetivo <= 1 && ms.stepBtnDisabled]}
                onPress={() => setObjetivo(Math.max(1, objetivo - 1))}
                disabled={objetivo <= 1}
              >
                <Text style={ms.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={ms.stepValue}>{objetivo}</Text>
              <TouchableOpacity
                style={[ms.stepBtn, objetivo >= 20 && ms.stepBtnDisabled]}
                onPress={() => setObjetivo(Math.min(20, objetivo + 1))}
                disabled={objetivo >= 20}
              >
                <Text style={ms.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[ms.saveBtn, saving && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={Colors.bg} />
                : <Text style={ms.saveBtnText}>{saved ? '✅ Guardado' : 'Guardar objetivo'}</Text>}
            </TouchableOpacity>
          </View>

          {/* Historial badges */}
          <View>
            {[data.historial.slice(0, 6), data.historial.slice(6, 12)].map((fila, fi) => (
                <View key={fi} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {fila.map((mes) => (
                    <View key={`${mes.year}-${mes.month}`} style={ms.hisMes}>
                    <View style={[
                        ms.hisBadge,
                        mes.completado && ms.hisBadgeOk,
                        mes.actual && ms.hisBadgeActual,
                    ]}>
                        <Text style={ms.hisEmoji}>
                        {mes.completado ? '🔥' : mes.actual ? `${mes.leidos}/${mes.objetivo}` : mes.futuro ? '·' : '○'}
                        </Text>
                    </View>
                    <Text style={[ms.hisLabel, mes.futuro && { opacity: 0.3 }]}>
                        {MESES_CORTOS[mes.month - 1]}
                    </Text>
                    {mes.completado && (
                        <Text style={ms.hisCount}>{mes.leidos}</Text>
                    )}
                    </View>
                ))}
                </View>
            ))}
            </View>
        
         </ScrollView>
       </Pressable>
      </Pressable>
    </Modal>
  );
}

function CalendarioDias({ mes }: {
  mes: { year: number; month: number; hoy: number; dias_marcados: number[]; total_mes: number }
}) {
  const diasEnMes = new Date(mes.year, mes.month, 0).getDate();
  const primerDia = new Date(mes.year, mes.month - 1, 1).getDay();
  const offset = primerDia === 0 ? 6 : primerDia - 1; // lunes primero

  const dias = [];
  for (let i = 0; i < offset; i++) dias.push(null);
  for (let i = 1; i <= diasEnMes; i++) dias.push(i);

  return (
    <View style={cal.grid}>
      {['L','M','X','J','V','S','D'].map(d => (
        <Text key={d} style={cal.dayLabel}>{d}</Text>
      ))}
      {dias.map((dia, i) => {
        if (!dia) return <View key={`e-${i}`} style={cal.cell} />;
        const marcado = mes.dias_marcados.includes(dia);
        const esHoy   = dia === mes.hoy;
        return (
          <View key={dia} style={[
            cal.cell,
            marcado && cal.cellMarcado,
            esHoy && !marcado && cal.cellHoy,
          ]}>
            <Text style={[
              cal.cellText,
              marcado && cal.cellTextMarcado,
              esHoy && !marcado && cal.cellTextHoy,
            ]}>
              {dia}
            </Text>
            {marcado && <Text style={cal.flame}>🔥</Text>}
          </View>
        );
      })}
    </View>
  );
}

const cal = StyleSheet.create({
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  dayLabel:        { width: '13%', textAlign: 'center', fontSize: 10,
                     fontWeight: '700', color: Colors.muted, marginBottom: 4 },
  cell:            { width: '13%', aspectRatio: 1, borderRadius: 8,
                     alignItems: 'center', justifyContent: 'center',
                     backgroundColor: 'rgba(255,255,255,0.04)' },
  cellMarcado:     { backgroundColor: 'rgba(255,107,53,0.2)',
                     borderWidth: 1, borderColor: 'rgba(255,107,53,0.4)' },
  cellHoy:         { borderWidth: 1.5, borderColor: Colors.accent },
  cellText:        { fontSize: 11, fontWeight: '600', color: Colors.muted },
  cellTextMarcado: { color: '#FF6B35', fontWeight: '800' },
  cellTextHoy:     { color: Colors.accent, fontWeight: '800' },
  flame:           { fontSize: 8, position: 'absolute', bottom: 1, right: 2 },
});

// ── Estilos widget ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:  { justifyContent: 'center', alignItems: 'center', padding: 8 },
  compact:    { flexDirection: 'row', alignItems: 'center' },

  badge:      { flexDirection: 'row', alignItems: 'center', gap: 3,
                paddingHorizontal: 10, paddingVertical: 5,
                backgroundColor: 'rgba(255,212,102,0.12)',
                borderRadius: Radius.full, borderWidth: 1,
                borderColor: 'rgba(255,212,102,0.25)' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeFire:  { fontSize: 16 },
  badgeNum:   { fontSize: 15, fontWeight: '900' },

  card:       { backgroundColor: Colors.card, borderRadius: Radius.lg,
                borderWidth: 1, borderColor: Colors.border,
                padding: Spacing.md, marginBottom: 14 },
  mainRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  fireWrap:   { alignItems: 'center', width: 52 },
  fireBig:    { fontSize: 32 },
  rachaNum:   { fontSize: 24, fontWeight: '900', lineHeight: 26 },
  rachaLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rachaSub:   { fontSize: 12, color: Colors.muted, marginTop: 2 },
  chevron:    { color: Colors.muted, fontSize: 22 },

  progressBg:   { height: 8, backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: 8, borderRadius: 99 },
  progressLabel:{ fontSize: 12, color: Colors.muted, marginBottom: 14 },

  badgesRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mesBadge:     { alignItems: 'center', width: 36 },
  mesBadgeOk:   {},
  mesBadgeActual: {},
  mesBadgeFuturo: { opacity: 0.3 },
  mesBadgeText: { fontSize: 16 },
  mesBadgeLabel:{ fontSize: 9, color: Colors.muted, marginTop: 2 },
});

// ── Estilos modal ─────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
              borderWidth: 1, borderColor: Colors.border,
              height: '92%' },
  handle:   { width: 40, height: 4, backgroundColor: Colors.border,
              borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  handleRow:{ flexDirection: 'row', justifyContent: 'center',
              alignItems: 'center', marginBottom: 20, position: 'relative' },
  closeBtn: { position: 'absolute', right: 0, width: 32, height: 32,
              borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: Colors.muted, fontSize: 14, fontWeight: '700' },

  head:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  fire:     { fontSize: 44 },
  title:    { fontSize: 22, fontWeight: '900', color: Colors.text },
  sub:      { fontSize: 13, color: Colors.muted, marginTop: 3 },

  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.muted,
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  sectionSub:   { fontSize: 13, color: Colors.muted, marginBottom: 12 },

  progressBg:   { height: 10, backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: 10, borderRadius: 99 },
  progressLabel:{ fontSize: 13, color: Colors.muted },

  stepper:      { flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'center', gap: 24, marginBottom: 16 },
  stepBtn:      { width: 48, height: 48, borderRadius: 24,
                  backgroundColor: Colors.accent + '22',
                  borderWidth: 1, borderColor: Colors.accent + '44',
                  justifyContent: 'center', alignItems: 'center' },
  stepBtnDisabled: { opacity: 0.3 },
  stepBtnText:  { fontSize: 24, fontWeight: '700', color: Colors.accent },
  stepValue:    { fontSize: 48, fontWeight: '900', color: Colors.text, minWidth: 60, textAlign: 'center' },

  saveBtn:      { backgroundColor: Colors.accent, borderRadius: Radius.md,
                  padding: 15, alignItems: 'center' },
  saveBtnText:  { color: Colors.bg, fontSize: 16, fontWeight: '800' },

  historialRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  hisMes:       { alignItems: 'center', width: 44 },
  hisBadge:     { width: 40, height: 40, borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  justifyContent: 'center', alignItems: 'center',
                  borderWidth: 1, borderColor: Colors.border },
  hisBadgeOk:   { backgroundColor: 'rgba(255,212,102,0.15)',
                  borderColor: 'rgba(255,212,102,0.4)' },
  hisBadgeActual:{ backgroundColor: Colors.accent + '18',
                   borderColor: Colors.accent + '44' },
  hisEmoji:     { fontSize: 18 },
  hisLabel:     { fontSize: 11, color: Colors.muted, marginTop: 4 },
  hisCount:     { fontSize: 10, color: '#ffd466', fontWeight: '700' },
});
