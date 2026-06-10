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

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!email.trim().endsWith('@uta.edu.ec') && !email.trim().endsWith('@test.uta.edu.ec')) {
      return Alert.alert('Dominio inválido', 'Ingresa tu correo institucional @uta.edu.ec o @test.uta.edu.ec');
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setStep(2);
      Alert.alert('✅ Código Enviado', 'Revisa tu bandeja de entrada o spam. El código expira en 15 minutos.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo enviar el código.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || code.length !== 6) {
      return Alert.alert('Código inválido', 'Ingresa el código de 6 dígitos.');
    }
    if (!newPassword || newPassword !== confirmPassword) {
      return Alert.alert('Error', 'Las contraseñas no coinciden.');
    }
    if (newPassword.length < 6) {
      return Alert.alert('Contraseña débil', 'Mínimo 6 caracteres.');
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim(), code: code.trim(), newPassword });
      Alert.alert('✅ Contraseña Restablecida', 'Tu contraseña ha sido actualizada exitosamente.',
        [{ text: 'Ir al Login', onPress: () => navigation.navigate('Login') }]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.topBlob} />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back-circle" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.logoText}>Recuperación</Text>
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.cardTitle}>¿Olvidaste tu contraseña?</Text>
              <Text style={styles.cardSub}>Ingresa tu correo institucional y te enviaremos un código para restablecerla.</Text>

              <Field 
                testID="email_input"
                icon="mail-outline" 
                placeholder="correo@uta.edu.ec" 
                keyboard="email-address" 
                value={email} 
                onChange={setEmail} 
              />
              
              <TouchableOpacity style={styles.btn} onPress={handleRequestCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnInner}>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.btnText}>Enviar Código</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Restablecer Contraseña</Text>
              <Text style={styles.cardSub}>Ingresa el código enviado a tu correo institucional y tu nueva contraseña.</Text>

              <Field 
                testID="code_input"
                icon="key-outline" 
                placeholder="Código de 6 dígitos" 
                keyboard="numeric" 
                value={code} 
                onChange={setCode} 
              />
              <Field 
                testID="new_password_input"
                icon="lock-closed-outline" 
                placeholder="Nueva Contraseña" 
                secure 
                value={newPassword} 
                onChange={setNewPassword} 
              />
              <Field 
                testID="confirm_new_password_input"
                icon="checkmark-circle-outline" 
                placeholder="Confirmar Contraseña" 
                secure 
                value={confirmPassword} 
                onChange={setConfirmPassword} 
              />

              <TouchableOpacity style={styles.btn} onPress={handleResetPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.btnInner}>
                    <Ionicons name="save" size={20} color="#fff" />
                    <Text style={styles.btnText}>Guardar Nueva Contraseña</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.lightGray, marginTop: 10 }]} onPress={() => setStep(1)} disabled={loading}>
                <Text style={[styles.btnText, { color: COLORS.dark }]}>Regresar</Text>
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
  logoText: { fontFamily: FONTS.black, fontSize: 32, color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 24, ...SHADOW.lg },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.dark, marginBottom: 8 },
  cardSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.gray, marginBottom: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1.5, borderColor: COLORS.border },
  inputIcon: { marginRight: 10 },
  input: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.dark, paddingVertical: 14 },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 16, alignItems: 'center', marginTop: 8, ...SHADOW.md },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
});
