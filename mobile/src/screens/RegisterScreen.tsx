import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

const Field = ({ icon, placeholder, value, onChange, secure, keyboard, testID }: any) => {
  const [showPass, setShowPass] = useState(false);
  
  return (
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={20} color={COLORS.primary} style={styles.inputIcon} />
      <TextInput
        testID={testID}
        style={[styles.input, { flex: 1 }]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.lightGray}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secure && !showPass}
        keyboardType={keyboard || 'default'}
        value={value}
        onChangeText={onChange}
      />
      {secure && (
        <TouchableOpacity onPress={() => setShowPass(!showPass)}>
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.lightGray} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function RegisterScreen({ navigation }: any) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState(1);
  const [code, setCode]           = useState('');

  const handleRegister = async () => {
    if (!nombre.trim() || !email.trim() || !password || !confirmar)
      return Alert.alert('Campos vacíos', 'Completa todos los campos.');
    if (!email.trim().endsWith('@uta.edu.ec') && !email.trim().endsWith('@test.uta.edu.ec'))
      return Alert.alert('Dominio inválido', 'Usa tu correo @uta.edu.ec o @test.uta.edu.ec');
    if (password !== confirmar)
      return Alert.alert('Contraseñas distintas', 'Las contraseñas no coinciden.');
    if (password.length < 6)
      return Alert.alert('Contraseña débil', 'Mínimo 6 caracteres.');

    setLoading(true);
    try {
      await api.post('/auth/register', { nombre: nombre.trim(), email: email.trim(), password });
      setStep(2);
      Alert.alert('✅ Código Enviado', 'Revisa tu bandeja de entrada o spam. El código expira en 15 minutos.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo registrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim() || code.length !== 6)
      return Alert.alert('Código inválido', 'Ingresa el código de 6 dígitos.');

    setLoading(true);
    try {
      await api.post('/auth/verify-register', { email: email.trim(), code: code.trim() });
      Alert.alert('✅ Cuenta Creada', `Bienvenido, ${nombre.trim()}! Ya puedes iniciar sesión.`,
        [{ text: 'Ir al Login', onPress: () => navigation.navigate('Login') }]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Código incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.topBlob} />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="car-sport" size={28} color="#fff" />
          </View>
          <Text style={styles.logoText}>U-Ride</Text>
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.cardTitle}>Crea tu cuenta</Text>
              <Text style={styles.cardSub}>Solo para estudiantes verificados UTA</Text>

              <Field 
                testID="nombre_input"
                icon="person-outline" 
                placeholder="Nombre completo" 
                value={nombre} 
                onChange={setNombre} 
              />
              <Field 
                testID="email_input"
                icon="mail-outline" 
                placeholder="correo@uta.edu.ec" 
                keyboard="email-address" 
                value={email} 
                onChange={setEmail} 
              />
              <Field 
                testID="password_input"
                icon="lock-closed-outline" 
                placeholder="Contraseña" 
                secure 
                value={password} 
                onChange={setPassword} 
              />
              <Field 
                testID="confirm_password_input"
                icon="checkmark-circle-outline" 
                placeholder="Confirmar Contraseña" 
                secure 
                value={confirmar} 
                onChange={setConfirmar} 
              />

              <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnInner}>
                    <Ionicons name="person-add" size={20} color="#fff" />
                    <Text style={styles.btnText}>Continuar</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>¿Ya tienes cuenta? <Text style={styles.linkBold}>Inicia Sesión →</Text></Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Verifica tu correo</Text>
              <Text style={styles.cardSub}>Ingresa el código enviado a {email}</Text>

              <Field icon="key-outline" placeholder="Código de 6 dígitos" value={code} onChange={setCode} keyboard="number-pad" />

              <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnInner}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.btnText}>Crear Cuenta</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.lightGray, marginTop: 10 }]} onPress={() => setStep(1)} disabled={loading}>
                <Text style={[styles.btnText, { color: COLORS.dark }]}>Regresar y Editar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topBlob: { position: 'absolute', top: -60, left: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: COLORS.primary, opacity: 0.25 },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  logoIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, ...SHADOW.md },
  logoText: { fontFamily: FONTS.black, fontSize: 32, color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 24, ...SHADOW.lg },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.dark, marginBottom: 4 },
  cardSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.gray, marginBottom: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1.5, borderColor: COLORS.border },
  inputIcon: { marginRight: 10 },
  input: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.dark, paddingVertical: 14 },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: 'center', marginTop: 8, ...SHADOW.md },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.gray },
  linkBold: { fontFamily: FONTS.bold, color: COLORS.primary },
});
