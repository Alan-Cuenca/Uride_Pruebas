import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuthStore } from '../store/userStore';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const loginAction = useAuthStore(state => state.login);

  const handleLogin = async () => {
    if (!email.trim().endsWith('@uta.edu.ec') && !email.trim().endsWith('@test.uta.edu.ec')) {
      Alert.alert('Dominio Inválido', 'Debes usar tu cuenta @uta.edu.ec o @test.uta.edu.ec');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post('/auth/login', { email: email.trim(), password });
      await loginAction(resp.data.token, resp.data.usuario);
    } catch (error: any) {
      Alert.alert('Error de Acceso', error.response?.data?.error || 'No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* Fondo decorativo */}
      <View style={styles.topBlob} />

      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="car-sport" size={32} color="#fff" />
          </View>
          <Text style={styles.logoText}>U-Ride</Text>
        </View>
        <Text style={styles.tagline}>Movilidad estudiantil segura</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bienvenido de vuelta</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              testID="email_input"
              style={styles.input}
              placeholder="correo@uta.edu.ec"
              placeholderTextColor={COLORS.lightGray}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setEmail}
              value={email}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              testID="password_input"
              style={[styles.input, { flex: 1 }]}
              placeholder="Contraseña"
              placeholderTextColor={COLORS.lightGray}
              secureTextEntry={!showPass}
              onChangeText={setPassword}
              value={password}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.lightGray} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.btnInner}>
                <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                <Text style={styles.btnText}>Iniciar Sesión</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity testID="forgot_password_btn" style={styles.link} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="register_btn" style={[styles.link, { marginTop: 10 }]} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>¿Sin cuenta? <Text style={styles.linkBold}>Regístrate</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topBlob: { position: 'absolute', top: -60, left: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: COLORS.primary, opacity: 0.25 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  logoIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, ...SHADOW.md },
  logoText: { fontFamily: FONTS.black, fontSize: 38, color: '#fff', letterSpacing: -1 },
  tagline: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.lightGray, marginBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 24, ...SHADOW.lg },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.dark, marginBottom: 24 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1.5, borderColor: COLORS.border },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: FONTS.regular, fontSize: 15, color: COLORS.dark, paddingVertical: 14 },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: 'center', marginTop: 8, ...SHADOW.md },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.gray },
  linkBold: { fontFamily: FONTS.bold, color: COLORS.primary },
});
