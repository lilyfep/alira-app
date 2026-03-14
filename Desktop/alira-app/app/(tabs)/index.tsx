import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';

const API_URL = 'https://web-production-cfc01.up.railway.app/api/v1';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor introduce tu email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('✅ Bienvenida', `Hola ${data.data.user.username}!`);
      } else {
        Alert.alert('Error', data.message || 'Credenciales incorrectas.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo conectar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle} />
          <Text style={styles.logoText}>alira</Text>
        </View>
        <Text style={styles.subtitle}>Tu biblioteca personal</Text>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#4a5568"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#4a5568"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Iniciar sesión</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>¿No tienes cuenta? </Text>
          <TouchableOpacity>
            <Text style={styles.registerLink}>Regístrate</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8, gap: 8 },
  logoCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: '#4B4FE8', backgroundColor: 'white' },
  logoText: { fontSize: 24, fontWeight: '700', color: '#ffffff', letterSpacing: 1 },
  subtitle: { textAlign: 'center', color: '#6b7280', fontSize: 15, marginBottom: 48 },
  form: { gap: 12 },
  input: { backgroundColor: '#161b22', borderRadius: 12, padding: 16, color: '#ffffff', fontSize: 15, borderWidth: 1, borderColor: '#21262d' },
  button: { backgroundColor: '#4B4FE8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  forgotButton: { alignItems: 'center', marginTop: 4 },
  forgotText: { color: '#6B8EF5', fontSize: 14 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 48 },
  registerText: { color: '#6b7280', fontSize: 14 },
  registerLink: { color: '#6B8EF5', fontSize: 14, fontWeight: '600' },
});