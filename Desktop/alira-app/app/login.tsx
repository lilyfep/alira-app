// app/login.tsx  — fuera de (tabs), sin tab bar
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api, saveTokens } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView,
  Platform, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

type Screen = 'login' | 'register' | 'forgot';

export default function LoginScreen() {
  const [screen, setScreen]     = useState<Screen>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchScreen = (s: Screen) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setScreen(s), 120);
  };

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Faltan datos', 'Introduce tu email y contraseña.'); return; }
    setLoading(true);
    const { ok, data } = await api.login(email, password);
    setLoading(false);
    if (ok) {
      await saveTokens(data.data.access_token, data.data.refresh_token);
      await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
      router.replace('/(tabs)/buscar');
    } else {
      Alert.alert('Error', data?.message || 'Credenciales incorrectas.');
    }
  };

  const handleRegister = async () => {
    if (!username || !email || !password) { Alert.alert('Faltan datos', 'Rellena todos los campos.'); return; }
    if (password.length < 8) { Alert.alert('Contraseña corta', 'Mínimo 8 caracteres.'); return; }
    setLoading(true);
    const { ok, data } = await api.register(username, email, password);
    setLoading(false);
    if (ok) {
      Alert.alert('Cuenta creada 🎉', 'Revisa tu email para verificarla.',
        [{ text: 'Entendido', onPress: () => switchScreen('login') }]);
    } else {
      Alert.alert('Error', data?.message || 'No se pudo crear la cuenta.');
    }
  };

  const handleForgot = async () => {
    if (!email) { Alert.alert('Falta el email', 'Introduce tu email.'); return; }
    setLoading(true);
    const { ok, data } = await api.forgotPassword(email);
    setLoading(false);
    Alert.alert('Email enviado', data?.message || 'Si ese email existe recibirás instrucciones.',
      [{ text: 'OK', onPress: () => switchScreen('login') }]);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.logoWrap}>
            <View style={s.logoCircle} />
            <Text style={s.logoText}>alira</Text>
          </View>
          <Text style={s.tagline}>Tu biblioteca personal</Text>

          <Animated.View style={[s.card, { opacity: fadeAnim }]}>
            {screen === 'login' && (
              <>
                <Text style={s.cardTitle}>Bienvenida de nuevo</Text>
                <TextInput style={s.input} placeholder="Email" placeholderTextColor={Colors.muted}
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={s.input} placeholder="Contraseña" placeholderTextColor={Colors.muted}
                  value={password} onChangeText={setPassword} secureTextEntry />
                <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color={Colors.bg} /> : <Text style={s.btnText}>Entrar</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.linkBtn} onPress={() => switchScreen('forgot')}>
                  <Text style={s.linkText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </>
            )}
            {screen === 'register' && (
              <>
                <Text style={s.cardTitle}>Crear cuenta</Text>
                <Text style={s.hint}>📧 Recibirás un email de verificación.</Text>
                <TextInput style={s.input} placeholder="Usuario" placeholderTextColor={Colors.muted}
                  value={username} onChangeText={setUsername} autoCapitalize="none" />
                <TextInput style={s.input} placeholder="Email" placeholderTextColor={Colors.muted}
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={s.input} placeholder="Contraseña (mín. 8)" placeholderTextColor={Colors.muted}
                  value={password} onChangeText={setPassword} secureTextEntry />
                <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
                  {loading ? <ActivityIndicator color={Colors.bg} /> : <Text style={s.btnText}>Crear cuenta</Text>}
                </TouchableOpacity>
              </>
            )}
            {screen === 'forgot' && (
              <>
                <Text style={s.cardTitle}>Recuperar contraseña</Text>
                <Text style={s.hint}>Introduce tu email y te enviaremos un enlace.</Text>
                <TextInput style={s.input} placeholder="Email" placeholderTextColor={Colors.muted}
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TouchableOpacity style={s.btn} onPress={handleForgot} disabled={loading}>
                  {loading ? <ActivityIndicator color={Colors.bg} /> : <Text style={s.btnText}>Enviar enlace</Text>}
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          <View style={s.footer}>
            {screen === 'login'
              ? <><Text style={s.footerText}>¿No tienes cuenta? </Text>
                  <TouchableOpacity onPress={() => switchScreen('register')}>
                    <Text style={s.footerLink}>Regístrate</Text>
                  </TouchableOpacity></>
              : <><Text style={s.footerText}>¿Ya tienes cuenta? </Text>
                  <TouchableOpacity onPress={() => switchScreen('login')}>
                    <Text style={s.footerLink}>Entrar</Text>
                  </TouchableOpacity></>
            }
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  scroll:     { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: 40 },
  logoWrap:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 },
  logoCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: Colors.accent, backgroundColor: Colors.text },
  logoText:   { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: 1.5 },
  tagline:    { textAlign: 'center', color: Colors.muted, fontSize: 14, marginBottom: 40 },
  card:       { backgroundColor: Colors.card, borderRadius: Radius.xl,
                borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: 12 },
  cardTitle:  { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  hint:       { color: Colors.muted, fontSize: 13, lineHeight: 20 },
  input:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.md,
                borderWidth: 1, borderColor: Colors.border, color: Colors.text, padding: 14, fontSize: 15 },
  btn:        { backgroundColor: Colors.accent + 'cc', borderRadius: Radius.md,
                padding: 15, alignItems: 'center', marginTop: 4 },
  btnText:    { color: Colors.bg, fontSize: 16, fontWeight: '800' },
  linkBtn:    { alignItems: 'center', paddingVertical: 4 },
  linkText:   { color: Colors.accent, fontSize: 14 },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: Colors.muted, fontSize: 14 },
  footerLink: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
});
