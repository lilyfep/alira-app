// app/(tabs)/perfil.tsx
// Paridad con perfil.html:
//   • Info del usuario (username, email, fecha registro, nº libros)
//   • Cambiar email (con confirmación de contraseña)
//   • Cambiar contraseña
//   • Zona de peligro: eliminar cuenta
//   • Plan premium badge

import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, clearSession } from '@/lib/api';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PerfilScreen() {
  const [profile, setProfile]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  // Cambiar email
  const [newEmail, setNewEmail]         = useState('');
  const [emailPass, setEmailPass]       = useState('');
  const [savingEmail, setSavingEmail]   = useState(false);

  // Cambiar contraseña
  const [passActual, setPassActual]     = useState('');
  const [passNuevo, setPassNuevo]       = useState('');
  const [passConfirm, setPassConfirm]   = useState('');
  const [savingPass, setSavingPass]     = useState(false);

  const loadProfile = useCallback(async () => {
    const { ok, data } = await api.getProfile();
    if (ok) setProfile(data.data);
    else if (data?.message === 'Sesión expirada') router.replace('/');
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    await clearSession();
    router.replace('/');
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPass) {
      Alert.alert('Faltan datos', 'Rellena el nuevo email y tu contraseña actual.');
      return;
    }
    setSavingEmail(true);
    const { ok, data } = await api.updateEmail(newEmail, emailPass);
    setSavingEmail(false);
    if (ok) {
      Alert.alert('Email actualizado', 'Revisa tu bandeja para verificarlo.');
      setNewEmail(''); setEmailPass('');
      loadProfile();
    } else {
      Alert.alert('Error', data?.message || 'No se pudo cambiar el email.');
    }
  };

  const handleChangePassword = async () => {
    if (!passActual || !passNuevo || !passConfirm) {
      Alert.alert('Faltan datos', 'Rellena todos los campos.');
      return;
    }
    if (passNuevo !== passConfirm) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden.');
      return;
    }
    if (passNuevo.length < 8) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSavingPass(true);
    const { ok, data } = await api.updatePassword(passActual, passNuevo);
    setSavingPass(false);
    if (ok) {
      Alert.alert('Listo', 'Contraseña cambiada correctamente.');
      setPassActual(''); setPassNuevo(''); setPassConfirm('');
    } else {
      Alert.alert('Error', data?.message || 'No se pudo cambiar la contraseña.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Eliminar cuenta',
      'Esta acción borrará todos tus libros y datos permanentemente. ¿Estás segura?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirma tu contraseña',
              'Introduce tu contraseña para confirmar',
              async (pass) => {
                if (!pass) return;
                const { ok, data } = await api.deleteAccount(pass);
                if (ok) {
                  await clearSession();
                  router.replace('/');
                } else {
                  Alert.alert('Error', data?.message || 'No se pudo eliminar la cuenta.');
                }
              },
              'secure-text'
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const user  = profile?.user;
  const stats = profile?.stats;
  const fechaReg = user?.fecha_registro
    ? new Date(user.fecha_registro).toLocaleDateString('es-ES')
    : '—';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.headerRow}>
          <Text style={s.pageTitle}>Mi perfil</Text>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Text style={s.logoutText}>🚪 Salir</Text>
          </TouchableOpacity>
        </View>

        {/* ── Info ───────────────────────────────── */}
        <Card title="Información">
          <InfoRow label="Usuario"       value={user?.nombre} />
          <InfoRow label="Email"         value={user?.email} />
          <InfoRow label="Miembro desde" value={fechaReg} />
          <InfoRow label="Libros"        value={String(stats?.total_books ?? 0)} />
          {user?.es_admin && (
            <View style={s.adminBadge}>
              <Text style={s.adminBadgeText}>⚡ Admin</Text>
            </View>
          )}
        </Card>

        {/* ── Cambiar email ───────────────────────── */}
        <Card title="Cambiar email">
          <TextInput style={s.input} placeholder="Nuevo email"
            placeholderTextColor={Colors.muted}
            value={newEmail} onChangeText={setNewEmail}
            keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={s.input} placeholder="Contraseña actual"
            placeholderTextColor={Colors.muted}
            value={emailPass} onChangeText={setEmailPass} secureTextEntry />
          <PrimaryBtn
            label="Cambiar email"
            loading={savingEmail}
            onPress={handleChangeEmail}
          />
        </Card>

        {/* ── Cambiar contraseña ─────────────────── */}
        <Card title="Cambiar contraseña">
          <TextInput style={s.input} placeholder="Contraseña actual"
            placeholderTextColor={Colors.muted}
            value={passActual} onChangeText={setPassActual} secureTextEntry />
          <TextInput style={s.input} placeholder="Nueva contraseña"
            placeholderTextColor={Colors.muted}
            value={passNuevo} onChangeText={setPassNuevo} secureTextEntry />
          <TextInput style={s.input} placeholder="Confirmar nueva contraseña"
            placeholderTextColor={Colors.muted}
            value={passConfirm} onChangeText={setPassConfirm} secureTextEntry />
          <PrimaryBtn
            label="Cambiar contraseña"
            loading={savingPass}
            onPress={handleChangePassword}
          />
        </Card>

        {/* ── Zona de peligro ───────────────────── */}
        <Card title="⚠️ Zona de peligro" danger>
          <Text style={s.dangerText}>
            Eliminar tu cuenta borrará todos tus libros y datos permanentemente.
            Esta acción no se puede deshacer.
          </Text>
          <TouchableOpacity style={s.dangerBtn} onPress={handleDeleteAccount}>
            <Text style={s.dangerBtnText}>Eliminar mi cuenta</Text>
          </TouchableOpacity>
        </Card>

        <Text style={s.footer}>Alira · Tu biblioteca personal</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function Card({ title, children, danger }: {
  title: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <View style={cardS.card}>
      <Text style={[cardS.title, danger && { color: Colors.danger }]}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={cardS.infoRow}>
      <Text style={cardS.infoLabel}>{label}</Text>
      <Text style={cardS.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function PrimaryBtn({ label, loading, onPress }: {
  label: string; loading: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[cardS.btn, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator color={Colors.bg} />
        : <Text style={cardS.btnText}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  scroll:    { padding: Spacing.lg, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between',
               alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  logoutBtn: { backgroundColor: Colors.card, borderRadius: Radius.sm,
               borderWidth: 1, borderColor: Colors.border,
               paddingHorizontal: 12, paddingVertical: 7 },
  logoutText:{ color: Colors.muted, fontSize: 13, fontWeight: '600' },
  input:     { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
               borderWidth: 1, borderColor: Colors.border,
               color: Colors.text, padding: 13, fontSize: 15, marginBottom: 10 },
  adminBadge:{ alignSelf: 'flex-start', backgroundColor: Colors.accent + '22',
               borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
               borderWidth: 1, borderColor: Colors.accent + '44', marginTop: 6 },
  adminBadgeText: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  dangerText:{ color: Colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  dangerBtn: { backgroundColor: Colors.danger + '22', borderRadius: Radius.md,
               borderWidth: 1, borderColor: Colors.danger + '44',
               padding: 14, alignItems: 'center' },
  dangerBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '800' },
  footer:    { textAlign: 'center', color: Colors.muted, fontSize: 12, marginTop: 16 },
});

const cardS = StyleSheet.create({
  card:      { backgroundColor: Colors.card, borderRadius: Radius.lg,
               borderWidth: 1, borderColor: Colors.border,
               padding: Spacing.md, marginBottom: 14 },
  title:     { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  infoRow:   { flexDirection: 'row', marginBottom: 10 },
  infoLabel: { color: Colors.muted, fontSize: 14, minWidth: 110 },
  infoValue: { color: Colors.text, fontWeight: '600', flex: 1, flexWrap: 'wrap' },
  btn:       { backgroundColor: Colors.accent + 'cc', borderRadius: Radius.md,
               padding: 13, alignItems: 'center', marginTop: 4 },
  btnText:   { color: Colors.bg, fontSize: 15, fontWeight: '800' },
});
