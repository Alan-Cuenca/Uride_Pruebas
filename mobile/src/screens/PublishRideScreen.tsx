import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
  TextInput, Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from '../components/MapWrapper';
import * as Location from 'expo-location';
import DateTimePickerCustom from '../components/DateTimePickerCustom';
import api from '../services/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

type Coordenada = { latitud: number; longitud: number } | null;

export default function PublishRideScreen({ navigation, route }: any) {
  const viajeEdit = route?.params?.viaje ?? null;
  const isEditMode = Boolean(viajeEdit);

  const [loading, setLoading]       = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(true);
  const [origen, setOrigen]         = useState<Coordenada>(null);
  const [destino, setDestino]       = useState<Coordenada>(null);
  const [modo, setModo]             = useState<'origen' | 'destino'>('origen');
  const [fechaDate, setFechaDate]   = useState(viajeEdit ? new Date(viajeEdit.fecha_salida) : new Date(Date.now() + 1000 * 60 * 60));
  const [cupos, setCupos]           = useState('');
  const [reglas, setReglas]         = useState('');
  const [costo, setCosto]           = useState('0');

  const [region, setRegion] = useState({
    latitude: -1.2543, longitude: -78.6229,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  useEffect(() => {
    if (isEditMode && viajeEdit) {
      const origenLat = Number(viajeEdit.origen_lat);
      const origenLon = Number(viajeEdit.origen_lon);
      const destinoLat = Number(viajeEdit.destino_lat);
      const destinoLon = Number(viajeEdit.destino_lon);

      if (!Number.isNaN(origenLat) && !Number.isNaN(origenLon)) {
        setOrigen({ latitud: origenLat, longitud: origenLon });
        setRegion({ latitude: origenLat, longitude: origenLon, latitudeDelta: 0.015, longitudeDelta: 0.015 });
      }
      if (!Number.isNaN(destinoLat) && !Number.isNaN(destinoLon)) {
        setDestino({ latitud: destinoLat, longitud: destinoLon });
      }

      if (viajeEdit.fecha_salida) setFechaDate(new Date(viajeEdit.fecha_salida));
      if (viajeEdit.cupos_disponibles !== undefined) setCupos(String(viajeEdit.cupos_disponibles));
      if (viajeEdit.notas_reglas) setReglas(String(viajeEdit.notas_reglas));
      if (viajeEdit.costo_contribucion !== undefined) setCosto(String(viajeEdit.costo_contribucion));
      setLoadingGPS(false);
      return;
    }

    (async () => {
      if (Platform.OS === 'web') {
        setRegion({ latitude: -1.2543, longitude: -78.6229, latitudeDelta: 0.015, longitudeDelta: 0.015 });
        setOrigen({ latitud: -1.2543, longitud: -78.6229 });
        setLoadingGPS(false);
        return;
      }
      
      const res = await Location.requestForegroundPermissionsAsync();
      if (res.status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se necesita ubicación para marcar el origen.');
        setLoadingGPS(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 });
      setOrigen({ latitud: loc.coords.latitude, longitud: loc.coords.longitude });
      setLoadingGPS(false);
    })();
  }, [isEditMode, viajeEdit]);

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    if (modo === 'origen') setOrigen({ latitud: latitude, longitud: longitude });
    else setDestino({ latitud: latitude, longitud: longitude });
  };

  const handlePublish = async () => {
    if (!origen || !destino) return Alert.alert('Error', 'Faltan coordenadas de origen o destino.');
    if (!cupos || parseInt(cupos) < 1) return Alert.alert('Error', 'Debe haber al menos 1 cupo.');
    if (!reglas.trim()) return Alert.alert('Error', 'Las reglas del viaje son obligatorias.');
    if (parseInt(cupos) <= 0) return Alert.alert('Cupos inválidos', 'Mínimo 1 cupo disponible.');
    if (fechaDate.getTime() < Date.now() - 60000) return Alert.alert('Fecha inválida', 'La fecha y hora de salida no puede estar en el pasado.');

    setLoading(true);
    try {
      const payload = {
        origenLat: origen.latitud, origenLon: origen.longitud,
        destinoLat: destino.latitud, destinoLon: destino.longitud,
        fecha_salida: fechaDate.toISOString().slice(0, 19),
        cupos_disponibles: parseInt(cupos),
        notas_reglas: reglas.trim(),
        costo_contribucion: parseFloat(costo) || 0,
      };

      const resp = isEditMode
        ? await api.put(`/viajes/${viajeEdit.id}`, payload)
        : await api.post('/viajes', payload);

      Alert.alert(
        isEditMode ? 'Viaje Actualizado' : 'Viaje Publicado',
        isEditMode
          ? 'Los cambios quedaron guardados correctamente.'
          : `Ruta #${resp.data.viaje.id} registrada. Los pasajeros ya pueden encontrarte.`,
        [{ text: 'Ver Viajes', onPress: () => navigation.navigate('Home') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || (isEditMode ? 'No se pudo actualizar.' : 'No se pudo publicar.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="car-sport" size={24} color={COLORS.secondary} />
          <Text style={styles.title}>{isEditMode ? 'Editar Viaje' : 'Publicar Viaje'}</Text>
        </View>
        <Text style={styles.subtitle}>
          {isEditMode ? 'Ajusta la ruta, las reglas y la capacidad del viaje' : 'Toca el mapa para marcar origen y destino de tu ruta'}
        </Text>

        {/* Selector de Modo */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            testID="btn_origen"
            style={[styles.modeBtn, modo === 'origen' && { borderColor: COLORS.secondary, backgroundColor: '#ECFDF5' }]}
            onPress={() => setModo('origen')}
          >
            <Ionicons name="location" size={16} color={modo === 'origen' ? COLORS.secondary : COLORS.lightGray} />
            <Text style={[styles.modeBtnText, { color: modo === 'origen' ? COLORS.secondary : COLORS.lightGray }]}>
              Origen {origen ? '✓' : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="btn_destino"
            style={[styles.modeBtn, modo === 'destino' && { borderColor: COLORS.danger, backgroundColor: '#FEF2F2' }]}
            onPress={() => setModo('destino')}
          >
            <Ionicons name="flag" size={16} color={modo === 'destino' ? COLORS.danger : COLORS.lightGray} />
            <Text style={[styles.modeBtnText, { color: modo === 'destino' ? COLORS.danger : COLORS.lightGray }]}>
              Destino {destino ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mapa */}
        <View style={styles.mapContainer}>
          {loadingGPS ? (
            <View style={styles.mapLoading}>
              <Ionicons name="locate-outline" size={32} color={COLORS.primary} />
              <Text style={styles.mapLoadingText}>Obteniendo ubicación GPS...</Text>
            </View>
          ) : (
            <MapView style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={region}
              onPress={handleMapPress} showsUserLocation showsMyLocationButton>
              {origen && (
                <Marker coordinate={{ latitude: origen.latitud, longitude: origen.longitud }}
                  title="Tu Origen" description="Punto de partida" pinColor={COLORS.secondary} />
              )}
              {destino && (
                <Marker coordinate={{ latitude: destino.latitud, longitude: destino.longitud }}
                  title="Destino" description="Campus u otra zona" pinColor={COLORS.danger} />
              )}
            </MapView>
          )}
        </View>

        {/* Chips de coordenadas */}
        <View style={styles.coordsRow}>
          <View style={[styles.coordBox, { borderColor: COLORS.secondary }]}>
            <View style={styles.coordHeader}>
              <Ionicons name="location-outline" size={14} color={COLORS.secondary} />
              <Text style={[styles.coordLabel, { color: COLORS.secondary }]}>Origen</Text>
            </View>
            <Text style={styles.coordValue}>
              {origen ? `${origen.latitud.toFixed(4)}, ${origen.longitud.toFixed(4)}` : 'Sin marcar'}
            </Text>
          </View>
          <View style={[styles.coordBox, { borderColor: COLORS.danger }]}>
            <View style={styles.coordHeader}>
              <Ionicons name="flag-outline" size={14} color={COLORS.danger} />
              <Text style={[styles.coordLabel, { color: COLORS.danger }]}>Destino</Text>
            </View>
            <Text style={styles.coordValue}>
              {destino ? `${destino.latitud.toFixed(4)}, ${destino.longitud.toFixed(4)}` : 'Sin marcar'}
            </Text>
          </View>
        </View>

        {/* Formulario */}
        <View style={styles.card}>
          <View style={styles.fieldHeader}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            <Text style={styles.fieldLabel}>Fecha y Hora de Salida</Text>
          </View>
          <DateTimePickerCustom value={fechaDate} onChange={setFechaDate} />

          <View style={styles.rowFields}>
            <View style={{ flex: 0.47 }}>
              <View style={styles.fieldHeader}>
                <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                <Text style={styles.fieldLabel}>Cupos</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="3" placeholderTextColor={COLORS.lightGray} keyboardType="numeric" value={cupos} onChangeText={setCupos} />
              </View>
            </View>
            <View style={{ flex: 0.47 }}>
              <View style={styles.fieldHeader}>
                <Ionicons name="cash-outline" size={16} color={COLORS.primary} />
                <Text style={styles.fieldLabel}>Aporte ($)</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.lightGray} keyboardType="numeric" value={costo} onChangeText={setCosto} />
              </View>
            </View>
          </View>
        </View>

        {/* RF9 — Reglas */}
        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.warning} />
            <Text style={styles.rulesTitle}>Reglas del Viaje</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Obligatorio</Text>
            </View>
          </View>
          <Text style={styles.rulesDesc}>Los pasajeros deben leer y aceptar estas reglas antes de unirse (RF9).</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ej: Puntualidad estricta. No fumar. No compartir datos personales. Respeto mutuo."
            placeholderTextColor="#B45309"
            multiline numberOfLines={4}
            value={reglas}
            onChangeText={setReglas}
          />
        </View>

        {/* Botón Publicar */}
        <TouchableOpacity 
          testID="submit_publish"
          style={styles.publishBtn} 
          onPress={handlePublish} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <View style={styles.btnInner}>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.publishBtnText}>{isEditMode ? 'Guardar Cambios' : 'Publicar Viaje'}</Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, marginTop: 4 },
  title: { fontFamily: FONTS.black, fontSize: 24, color: COLORS.dark },
  subtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.gray, marginBottom: 16 },

  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  modeBtnText: { fontFamily: FONTS.semiBold, fontSize: 13 },

  mapContainer: { height: 270, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 12, ...SHADOW.sm },
  map: { flex: 1 },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, gap: 12 },
  mapLoadingText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.gray },

  coordsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  coordBox: { flex: 1, backgroundColor: COLORS.card, padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5 },
  coordHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  coordLabel: { fontFamily: FONTS.bold, fontSize: 12 },
  coordValue: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.dark, fontVariant: ['tabular-nums'] },

  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 14, ...SHADOW.sm },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 6 },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.gray },
  rowFields: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  inputWrapper: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border },
  input: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.dark, padding: 12 },

  rulesCard: { backgroundColor: '#FFFBEB', borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#FCD34D' },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rulesTitle: { fontFamily: FONTS.bold, fontSize: 15, color: '#92400E', flex: 1 },
  requiredBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  requiredText: { fontFamily: FONTS.semiBold, fontSize: 11, color: '#B45309' },
  rulesDesc: { fontFamily: FONTS.regular, fontSize: 13, color: '#78350F', marginBottom: 12 },
  textArea: { backgroundColor: '#FEF3C7', borderRadius: RADIUS.md, padding: 14, fontFamily: FONTS.regular, fontSize: 14, color: '#92400E', minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: '#FCD34D' },

  publishBtn: { backgroundColor: COLORS.secondary, borderRadius: RADIUS.md, padding: 17, alignItems: 'center', marginBottom: 8, ...SHADOW.md },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  publishBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
});
