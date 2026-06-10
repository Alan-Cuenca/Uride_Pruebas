import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

export default function RateScreen({ route, navigation }: any) {
  const { viaje_id, evaluado_id, nombre_evaluado } = route.params || {};
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);

  const labels = ['', 'Muy malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

  const handleSubmit = async () => {
    if (calificacion === 0) return Alert.alert('Selecciona una calificación', 'Toca las estrellas para calificar.');
    setLoading(true);
    try {
      await api.post('/calificaciones', { viaje_id, evaluado_id, calificacion, comentario });
      Alert.alert('Evaluación enviada', `Tu calificación afecta la reputación de ${nombre_evaluado}.`,
        [{ text: 'Listo', onPress: () => {
          // notify caller to refresh lists if provided
          try { route.params?.onRated && route.params.onRated(); } catch(e) {}
          navigation.goBack();
        } }]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo enviar la evaluación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Calificar Compañero</Text>
        <Text style={styles.sub}>RF8 · Evaluación de <Text style={{ fontFamily: FONTS.bold, color: COLORS.dark }}>{nombre_evaluado ?? 'tu compañero'}</Text></Text>

        <View style={styles.card}>
          {/* Estrellas grandes */}
          <Text style={styles.starLabel}>¿Cómo fue la experiencia?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity testID={`star_${star}`} key={star} onPress={() => setCalificacion(star)} activeOpacity={0.75}>
                <Ionicons
                  name={calificacion >= star ? 'star' : 'star-outline'}
                  size={48}
                  color={calificacion >= star ? '#F59E0B' : COLORS.border}
                />
              </TouchableOpacity>
            ))}
          </View>
          {calificacion > 0 && (
            <Text style={styles.starHint}>{labels[calificacion]}</Text>
          )}

          {/* Comentario */}
          <Text style={styles.label}>Comentario (opcional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="¿Qué te pareció el viaje?"
            placeholderTextColor={COLORS.lightGray}
            multiline={true}
            numberOfLines={4}
            value={comentario}
            onChangeText={setComentario}
          />

          <TouchableOpacity style={[styles.submitBtn, calificacion === 0 && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading || calificacion === 0}>
            <View style={styles.btnInner}>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>{loading ? 'Enviando...' : 'Enviar Evaluación'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  backText: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.primary },
  title: { fontFamily: FONTS.black, fontSize: 26, color: COLORS.dark, marginBottom: 4 },
  sub: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.gray, marginBottom: 28 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 24, ...SHADOW.sm },
  starLabel: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.dark, marginBottom: 16, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  starHint: { fontFamily: FONTS.bold, fontSize: 16, color: '#F59E0B', textAlign: 'center', marginBottom: 24 },
  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.gray, marginBottom: 8, marginTop: 8 },
  textArea: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, fontFamily: FONTS.regular, fontSize: 15, color: COLORS.dark, minHeight: 100, textAlignVertical: 'top', borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 24 },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 15, alignItems: 'center', ...SHADOW.md },
  submitBtnDisabled: { opacity: 0.5 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },
});
