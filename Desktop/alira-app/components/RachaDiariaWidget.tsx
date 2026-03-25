import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

interface RachaInfo {
  racha_actual: number;
  racha_max:    number;
  leido_hoy:    boolean;
}

export default function RachaDiariaWidget() {
  const [info,    setInfo]    = useState<RachaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const load = useCallback(async () => {
    const { ok, data } = await api.getRachaDiaria();
    if (ok) setInfo(data.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const bounce = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.12, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }),
    ]).start();
  };

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    bounce();
    const fn = info?.leido_hoy ? api.desmarcarLeerHoy : api.marcarLeerHoy;
    const { ok, data } = await fn();
    if (ok) setInfo(data.data);
    setLoading(false);
  };

  if (!info) return null;

  const { racha_actual, racha_max, leido_hoy } = info;
  const slots = Array.from({ length: 7 }, (_, i) => i < racha_actual);
  const flameColor = leido_hoy ? '#FF6B35' : Colors.muted;
  const cardBg     = leido_hoy ? '#FFF4EE' : Colors.card;
  const btnBg      = leido_hoy ? '#FF6B35' : Colors.accent;
  const btnLabel   = leido_hoy ? '✓ Leído hoy' : '📖 Marcar leído hoy';

  return (
    <View style={[s.card, { backgroundColor: cardBg }]}>
      <View style={s.topRow}>
        <Animated.Text style={[s.flame, { transform: [{ scale: scaleAnim }] }]}>
          {leido_hoy ? '🔥' : '💤'}
        </Animated.Text>

        <View style={s.counts}>
          <Text style={[s.rachaNum, { color: leido_hoy ? '#FF6B35' : Colors.muted }]}>
            {racha_actual}
            <Text style={s.rachaLabel}> días</Text>
          </Text>
          {racha_max > 0 && (
            <Text style={s.record}>🏆 Récord: {racha_max} días</Text>
          )}
        </View>

        <View style={s.dotsCol}>
          <Text style={s.dotsLabel}>Últimos 7 días</Text>
          <View style={s.dotsRow}>
            {slots.map((activo, i) => (
              <View key={i} style={[s.dot, { backgroundColor: activo ? flameColor : '#E0D8D0' }]} />
            ))}
          </View>
        </View>
      </View>

      <Text style={[s.mensaje, { color: leido_hoy ? '#C07030' : Colors.muted }]}>
        {leido_hoy
          ? racha_actual >= 7 ? '¡Semana completa! Eres imparable 🚀'
          : racha_actual >= 3 ? '¡Buena racha! Sigue así 💪'
          : '¡Ya leíste hoy! Mañana más 📚'
          : racha_actual > 0
          ? `Llevas ${racha_actual} día${racha_actual > 1 ? 's' : ''} — ¡no lo rompas hoy!`
          : 'Empieza tu racha lectora hoy'}
      </Text>

      <TouchableOpacity
        style={[s.btn, { backgroundColor: btnBg, opacity: loading ? 0.7 : 1 }]}
        onPress={handleToggle}
        activeOpacity={0.8}
        disabled={loading}
      >
        <Text style={s.btnText}>{btnLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  flame:     { fontSize: 36 },
  counts:    { flex: 1 },
  rachaNum:  { fontSize: 28, fontWeight: '800' },
  rachaLabel:{ fontSize: 16, fontWeight: '400' },
  record:    { fontSize: 11, color: Colors.muted, marginTop: 2 },
  dotsCol:   { alignItems: 'flex-end', gap: 4 },
  dotsLabel: { fontSize: 10, color: Colors.muted },
  dotsRow:   { flexDirection: 'row', gap: 4 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  mensaje:   { fontSize: 13, marginBottom: Spacing.sm },
  btn:       { borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});