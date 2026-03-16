// app/(tabs)/perfil.tsx
// Dashboard de estadísticas + info de perfil + ajustes de cuenta

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, clearSession } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Book {
  id: number; title: string; author: string; estado: string;
  valoracion: number; category: string; fecha_fin: string; year: string;
}

// ── Helpers de stats ──────────────────────────────────────────────────────────
function calcStats(books: Book[], objetivo: number) {
  const leidos = books.filter(b => b.estado === 'leido');
  const thisYear = new Date().getFullYear();

  // Leídos por año
  const porAnio: Record<number, number> = {};
  leidos.forEach(b => {
    const y = b.fecha_fin
      ? new Date(b.fecha_fin).getFullYear()
      : b.year ? parseInt(b.year) : null;
    if (y && y >= thisYear - 4) porAnio[y] = (porAnio[y] || 0) + 1;
  });

  // Géneros top 5
  const generos: Record<string, number> = {};
  leidos.forEach(b => {
    if (b.category) generos[b.category] = (generos[b.category] || 0) + 1;
  });
  const topGeneros = Object.entries(generos).sort((a,b) => b[1]-a[1]).slice(0,5);

  // Autores top 5
  const autores: Record<string, number> = {};
  leidos.forEach(b => {
    if (b.author) autores[b.author] = (autores[b.author] || 0) + 1;
  });
  const topAutores = Object.entries(autores).sort((a,b) => b[1]-a[1]).slice(0,5);

  // Valoración media
  const conVal = leidos.filter(b => b.valoracion > 0);
  const mediaVal = conVal.length
    ? conVal.reduce((s,b) => s + b.valoracion, 0) / conVal.length
    : 0;

  // Progreso año actual
  const leidosEsteAnio = leidos.filter(b => {
    if (!b.fecha_fin) return false;
    return new Date(b.fecha_fin).getFullYear() === thisYear;
  }).length;

  return { leidos: leidos.length, porAnio, topGeneros, topAutores, mediaVal, leidosEsteAnio };
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PerfilScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [books, setBooks]     = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [objetivo, setObjetivo] = useState('12');
  const [editingObj, setEditingObj] = useState(false);

  // Cambiar email
  const [newEmail,    setNewEmail]    = useState('');
  const [emailPass,   setEmailPass]   = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Cambiar contraseña
  const [passActual,  setPassActual]  = useState('');
  const [passNuevo,   setPassNuevo]   = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [savingPass,  setSavingPass]  = useState(false);

  const loadData = useCallback(async () => {
    const [profRes, booksRes, savedObj] = await Promise.all([
      api.getProfile(),
      api.getBooks(),
      AsyncStorage.getItem('objetivo_anual'),
    ]);
    if (profRes.ok)  setProfile(profRes.data.data);
    if (booksRes.ok) setBooks(booksRes.data.data?.books || []);
    if (savedObj)    setObjetivo(savedObj);
    if (profRes.data?.message === 'Sesión expirada') router.replace('/');
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveObjetivo = async (val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n > 0) {
      await AsyncStorage.setItem('objetivo_anual', String(n));
      setObjetivo(String(n));
    }
    setEditingObj(false);
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    await clearSession();
    router.replace('/login');
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPass) { Alert.alert('Faltan datos', 'Rellena el nuevo email y tu contraseña.'); return; }
    setSavingEmail(true);
    const { ok, data } = await api.updateEmail(newEmail, emailPass);
    setSavingEmail(false);
    if (ok) { Alert.alert('✅ Listo', 'Email actualizado. Verifica tu bandeja.'); setNewEmail(''); setEmailPass(''); }
    else Alert.alert('Error', data?.message || 'No se pudo cambiar el email.');
  };

  const handleChangePassword = async () => {
    if (!passActual || !passNuevo || !passConfirm) { Alert.alert('Faltan datos', 'Rellena todos los campos.'); return; }
    if (passNuevo !== passConfirm) { Alert.alert('Error', 'Las contraseñas nuevas no coinciden.'); return; }
    if (passNuevo.length < 8) { Alert.alert('Error', 'Mínimo 8 caracteres.'); return; }
    setSavingPass(true);
    const { ok, data } = await api.updatePassword(passActual, passNuevo);
    setSavingPass(false);
    if (ok) { Alert.alert('✅ Listo', 'Contraseña cambiada.'); setPassActual(''); setPassNuevo(''); setPassConfirm(''); }
    else Alert.alert('Error', data?.message || 'No se pudo cambiar la contraseña.');
  };

  const handleDeleteAccount = () => {
    Alert.alert('⚠️ Eliminar cuenta',
      'Se borrarán todos tus libros y datos permanentemente.',
      [{ text: 'Cancelar', style: 'cancel' },
       { text: 'Eliminar', style: 'destructive', onPress: () =>
          Alert.prompt('Confirma tu contraseña', '', async (pass) => {
            if (!pass) return;
            const { ok, data } = await api.deleteAccount(pass);
            if (ok) { await clearSession(); router.replace('/login'); }
            else Alert.alert('Error', data?.message || 'Contraseña incorrecta.');
          }, 'secure-text')
       }]);
  };

  if (loading) return (
    <View style={s.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
  );

  const user  = profile?.user;
  const stats = calcStats(books, parseInt(objetivo) || 12);
  const objNum = parseInt(objetivo) || 12;
  const progreso = Math.min(stats.leidosEsteAnio / objNum, 1);
  const thisYear = new Date().getFullYear();
  const maxAnio  = Math.max(...Object.values(stats.porAnio), 1);
  const años     = Array.from({ length: 5 }, (_, i) => thisYear - 4 + i);
  const fechaReg = user?.fecha_registro
    ? new Date(user.fecha_registro).toLocaleDateString('es-ES') : '—';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.headerRow}>
          <Text style={s.pageTitle}>👤 Mi perfil</Text>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Text style={s.logoutText}>🚪 Salir</Text>
          </TouchableOpacity>
        </View>

        {/* ── DASHBOARD ─────────────────────────────────────────────────── */}

        {/* Objetivo anual */}
        <Card>
          <View style={s.objRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.objTitle}>🎯 Objetivo {thisYear}</Text>
              <Text style={s.objSub}>
                {stats.leidosEsteAnio} de {objNum} libros leídos
              </Text>
            </View>
            <TouchableOpacity onPress={() => setEditingObj(true)} style={s.editObjBtn}>
              <Text style={{ color: Colors.accent, fontSize: 13, fontWeight: '700' }}>
                {editingObj ? '' : `Cambiar`}
              </Text>
            </TouchableOpacity>
          </View>

          {editingObj ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TextInput style={[s.input, { flex: 1 }]}
                value={objetivo} onChangeText={setObjetivo}
                keyboardType="number-pad" placeholder="Ej: 20"
                placeholderTextColor={Colors.muted} autoFocus />
              <TouchableOpacity style={s.saveSmallBtn} onPress={() => saveObjetivo(objetivo)}>
                <Text style={{ color: Colors.bg, fontWeight: '800' }}>OK</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Barra de progreso */}
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${progreso * 100}%` as any }]} />
          </View>
          <Text style={s.progressPct}>
            {Math.round(progreso * 100)}% completado{stats.leidosEsteAnio >= objNum ? ' 🎉' : ''}
          </Text>

          <TouchableOpacity
            style={{ backgroundColor: Colors.accent + '16', borderRadius: Radius.md,
                    borderWidth: 1, borderColor: Colors.accent + '33',
                    padding: 14, alignItems: 'center', marginTop: 12 }}
            onPress={() => router.push(`/resumen/${new Date().getFullYear()}`)}>
            <Text style={{ color: Colors.accent, fontSize: 15, fontWeight: '700' }}>
              📖 Ver resumen {new Date().getFullYear()}
            </Text>
          </TouchableOpacity>
        </Card>
        {/* Acceso a Premium */}
        <TouchableOpacity
          style={{ backgroundColor: Colors.warning + '16', borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.warning + '33',
                  padding: 14, alignItems: 'center', marginBottom: 14 }}
          onPress={() => router.push('/(tabs)/premium')}>
          <Text style={{ color: Colors.warning, fontSize: 15, fontWeight: '700' }}>
            ⭐ Alira+ — Ver planes
          </Text>
        </TouchableOpacity>

        {/* Acceso a Admin — solo visible si es admin */}
        {user?.es_admin && (
          <TouchableOpacity
            style={{ backgroundColor: Colors.accent + '16', borderRadius: Radius.md,
                    borderWidth: 1, borderColor: Colors.accent + '33',
                    padding: 14, alignItems: 'center', marginBottom: 14 }}
            onPress={() => router.push('/(tabs)/admin')}>
            <Text style={{ color: Colors.accent, fontSize: 15, fontWeight: '700' }}>
              ⚡ Panel Admin
            </Text>
          </TouchableOpacity>
        )}

        {/* Stats rápidas */}
        <View style={s.statsGrid}>
          <StatBox value={books.length}        label="Total libros"    color={Colors.accent} />
          <StatBox value={stats.leidos}         label="Leídos"         color={Colors.success} />
          <StatBox value={books.filter(b=>b.estado==='leyendo').length}  label="Leyendo"  color='#7aa2ff' />
          <StatBox value={stats.mediaVal > 0 ? `${stats.mediaVal.toFixed(1)}⭐` : '—'}
                   label="Val. media" color={Colors.warning} />
        </View>

        {/* Libros por año */}
        {Object.keys(stats.porAnio).length > 0 && (
          <Card title="📅 Libros leídos por año">
            <View style={s.barChart}>
              {años.map(y => {
                const count = stats.porAnio[y] || 0;
                const height = count > 0 ? Math.max((count / maxAnio) * 100, 8) : 4;
                return (
                  <View key={y} style={s.barCol}>
                    {count > 0 && <Text style={s.barVal}>{count}</Text>}
                    <View style={[s.bar, {
                      height,
                      backgroundColor: y === thisYear ? Colors.accent : Colors.accent + '44',
                    }]} />
                    <Text style={s.barLabel}>{String(y).slice(2)}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Géneros */}
        {stats.topGeneros.length > 0 && (
          <Card title="🏷 Géneros más leídos">
            {stats.topGeneros.map(([genero, count], i) => (
              <View key={genero} style={s.rankRow}>
                <Text style={s.rankNum}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <View style={s.rankBarBg}>
                    <View style={[s.rankBarFill, {
                      width: `${(count / stats.topGeneros[0][1]) * 100}%` as any,
                      backgroundColor: Colors.accent + '88',
                    }]} />
                  </View>
                  <Text style={s.rankLabel}>{genero}</Text>
                </View>
                <Text style={s.rankCount}>{count}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Autores */}
        {stats.topAutores.length > 0 && (
          <Card title="✍️ Autores más leídos">
            {stats.topAutores.map(([autor, count], i) => (
              <View key={autor} style={s.rankRow}>
                <Text style={s.rankNum}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <View style={s.rankBarBg}>
                    <View style={[s.rankBarFill, {
                      width: `${(count / stats.topAutores[0][1]) * 100}%` as any,
                      backgroundColor: Colors.success + '88',
                    }]} />
                  </View>
                  <Text style={s.rankLabel} numberOfLines={1}>{autor}</Text>
                </View>
                <Text style={s.rankCount}>{count}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* ── INFO ─────────────────────────────────────────────────────── */}
        <Card title="Información">
          <InfoRow label="Usuario"       value={user?.nombre} />
          <InfoRow label="Email"         value={user?.email} />
          <InfoRow label="Miembro desde" value={fechaReg} />
        </Card>

        {/* ── CAMBIAR EMAIL ─────────────────────────────────────────────── */}
        <Card title="Cambiar email">
          <TextInput style={s.input} placeholder="Nuevo email"
            placeholderTextColor={Colors.muted} value={newEmail}
            onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={s.input} placeholder="Contraseña actual"
            placeholderTextColor={Colors.muted} value={emailPass}
            onChangeText={setEmailPass} secureTextEntry />
          <PrimaryBtn label="Cambiar email" loading={savingEmail} onPress={handleChangeEmail} />
        </Card>

        {/* ── CAMBIAR CONTRASEÑA ────────────────────────────────────────── */}
        <Card title="Cambiar contraseña">
          <TextInput style={s.input} placeholder="Contraseña actual"
            placeholderTextColor={Colors.muted} value={passActual}
            onChangeText={setPassActual} secureTextEntry />
          <TextInput style={s.input} placeholder="Nueva contraseña"
            placeholderTextColor={Colors.muted} value={passNuevo}
            onChangeText={setPassNuevo} secureTextEntry />
          <TextInput style={s.input} placeholder="Confirmar nueva contraseña"
            placeholderTextColor={Colors.muted} value={passConfirm}
            onChangeText={setPassConfirm} secureTextEntry />
          <PrimaryBtn label="Cambiar contraseña" loading={savingPass} onPress={handleChangePassword} />
        </Card>

        {/* ── ZONA DE PELIGRO ───────────────────────────────────────────── */}
        <Card title="⚠️ Zona de peligro" danger>
          <Text style={s.dangerText}>
            Eliminar tu cuenta borrará todos tus libros y datos permanentemente.
            Esta acción no se puede deshacer.
          </Text>
          <TouchableOpacity style={s.dangerBtn} onPress={handleDeleteAccount}>
            <Text style={s.dangerBtnText}>Eliminar mi cuenta</Text>
          </TouchableOpacity>
        </Card>

        {/* Legal */}
        <Card title="Legal">
          <LegalLink label="Aviso Legal"              url="https://www.aliraspace.com/aviso-legal" />
          <LegalLink label="Política de Privacidad"   url="https://www.aliraspace.com/privacidad" />
          <LegalLink label="Términos y Condiciones"   url="https://www.aliraspace.com/terminos" />
          <LegalLink label="Política de Cookies"      url="https://www.aliraspace.com/cookies" />
          </Card>

        <Text style={s.footer}>Alira · Tu biblioteca personal</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function Card({ title, children, danger }: { title?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <View style={cs.card}>
      {title && <Text style={[cs.title, danger && { color: Colors.danger }]}>{title}</Text>}
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

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={cs.infoRow}>
      <Text style={cs.infoLabel}>{label}</Text>
      <Text style={cs.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function PrimaryBtn({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[cs.btn, loading && { opacity: 0.6 }]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={Colors.bg} /> : <Text style={cs.btnText}>{label}</Text>}
    </TouchableOpacity>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url)}
      style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}
    >
      <Text style={{ color: Colors.muted, fontSize: 14 }}>{label} →</Text>
    </TouchableOpacity>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  scroll:     { padding: Spacing.lg, paddingBottom: 60 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle:  { fontSize: 22, fontWeight: '800', color: Colors.text },
  logoutBtn:  { backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1,
                borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 7 },
  logoutText: { color: Colors.muted, fontSize: 13, fontWeight: '600' },

  // Objetivo
  objRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  objTitle:   { fontSize: 16, fontWeight: '800', color: Colors.text },
  objSub:     { fontSize: 13, color: Colors.muted, marginTop: 2 },
  editObjBtn: { paddingLeft: 8 },
  progressBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  progressFill:{ height: 10, backgroundColor: Colors.accent, borderRadius: 99 },
  progressPct: { fontSize: 12, color: Colors.muted },

  // Stats grid
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },

  // Bar chart
  barChart:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 8 },
  barCol:     { flex: 1, alignItems: 'center', gap: 4 },
  bar:        { width: '100%', borderRadius: 6, minHeight: 4 },
  barVal:     { fontSize: 11, color: Colors.text, fontWeight: '700' },
  barLabel:   { fontSize: 11, color: Colors.muted },

  // Rank rows
  rankRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rankNum:    { fontSize: 13, fontWeight: '800', color: Colors.muted, width: 18 },
  rankBarBg:  { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99,
                marginBottom: 4, overflow: 'hidden' },
  rankBarFill:{ height: 6, borderRadius: 99 },
  rankLabel:  { fontSize: 13, color: Colors.text },
  rankCount:  { fontSize: 13, fontWeight: '700', color: Colors.muted, minWidth: 24, textAlign: 'right' },

  // Forms
  input:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                borderWidth: 1, borderColor: Colors.border,
                color: Colors.text, padding: 13, fontSize: 15, marginBottom: 10 },
  saveSmallBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md,
                  paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },

  dangerText: { color: Colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  dangerBtn:  { backgroundColor: Colors.danger + '22', borderRadius: Radius.md, borderWidth: 1,
                borderColor: Colors.danger + '44', padding: 14, alignItems: 'center' },
  dangerBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '800' },
  footer:     { textAlign: 'center', color: Colors.muted, fontSize: 12, marginTop: 16 },

  objLabel:   { fontSize: 13, color: Colors.muted },
});

const cs = StyleSheet.create({
  card:      { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1,
               borderColor: Colors.border, padding: Spacing.md, marginBottom: 14 },
  title:     { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  statBox:   { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.03)',
               borderRadius: Radius.md, borderWidth: 1, padding: 12, alignItems: 'center' },
  statVal:   { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 12, color: Colors.muted, marginTop: 3 },
  infoRow:   { flexDirection: 'row', marginBottom: 10 },
  infoLabel: { color: Colors.muted, fontSize: 14, minWidth: 110 },
  infoValue: { color: Colors.text, fontWeight: '600', flex: 1, flexWrap: 'wrap' },
  btn:       { backgroundColor: Colors.accent + 'cc', borderRadius: Radius.md,
               padding: 13, alignItems: 'center', marginTop: 4 },
  btnText:   { color: Colors.bg, fontSize: 15, fontWeight: '800' },
});
