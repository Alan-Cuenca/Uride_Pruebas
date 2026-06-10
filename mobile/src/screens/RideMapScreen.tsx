import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from '../components/MapWrapper';
import * as Location from 'expo-location';
import api from '../services/api';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

type PositionObj = { latitude: number; longitude: number } | null;

export default function RideMapScreen({ route, navigation }: any) {
  const { viajeId, rol } = route.params;
  const isPassenger = rol === 'PASAJERO';

  const [loading, setLoading] = useState(true);
  const [viaje, setViaje] = useState<any>(null);
  const [origen, setOrigen] = useState<PositionObj>(null);
  const [destino, setDestino] = useState<PositionObj>(null);
  const [vehicle, setVehicle] = useState<PositionObj>(null);

  const mapRef = useRef<MapView | null>(null);

  const fetchInitialDetails = async () => {
    try {
      const resp = await api.get(`/viajes/${viajeId}`);
      const v = resp.data.viaje;
      setViaje(v);

      const oLat = parseFloat(v.origen_lat);
      const oLon = parseFloat(v.origen_lon);
      const dLat = parseFloat(v.destino_lat);
      const dLon = parseFloat(v.destino_lon);

      if (!isNaN(oLat) && !isNaN(oLon)) setOrigen({ latitude: oLat, longitude: oLon });
      if (!isNaN(dLat) && !isNaN(dLon)) setDestino({ latitude: dLat, longitude: dLon });

      // Initial vehicle location
      if (v.driver_lat && v.driver_lon) {
        setVehicle({ latitude: parseFloat(v.driver_lat), longitude: parseFloat(v.driver_lon) });
      } else {
        setVehicle({ latitude: oLat, longitude: oLon }); // fallback to origin
      }

      setLoading(false);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo cargar el detalle de la ruta.');
      navigation.goBack();
    }
  };

  useEffect(() => {
    fetchInitialDetails();
  }, [viajeId]);

  useEffect(() => {
    if (loading || !origen || !destino) return;

    let subscriber: Location.LocationSubscription | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const startTracking = async () => {
      if (isPassenger) {
        // Passenger: poll driver location from backend every 5 seconds
        pollInterval = setInterval(async () => {
          try {
            const resp = await api.get(`/viajes/${viajeId}`);
            const v = resp.data.viaje;
            if (v.driver_lat && v.driver_lon) {
              const currentPos = {
                latitude: parseFloat(v.driver_lat),
                longitude: parseFloat(v.driver_lon)
              };
              setVehicle(currentPos);
            }
          } catch (err) {
            console.log('Error polling vehicle location:', err);
          }
        }, 5000);

      } else {
        // Conductor: request location permissions and watch GPS in real-time
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso GPS requerido', 'Se necesitan permisos de ubicación para rastrear tu trayecto.');
          return;
        }

        try {
          // Send initial GPS coordinate
          const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const initialPos = { latitude: currentLoc.coords.latitude, longitude: currentLoc.coords.longitude };
          setVehicle(initialPos);
          await api.put(`/viajes/${viajeId}/ubicacion`, {
            latitud: initialPos.latitude,
            longitud: initialPos.longitude
          });

          // Set up watchPosition
          subscriber = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 6000,
              distanceInterval: 10
            },
            async (newLoc) => {
              const currentPos = {
                latitude: newLoc.coords.latitude,
                longitude: newLoc.coords.longitude
              };
              setVehicle(currentPos);
              try {
                await api.put(`/viajes/${viajeId}/ubicacion`, {
                  latitud: currentPos.latitude,
                  longitud: currentPos.longitude
                });
              } catch (err) {
                console.log('Error updating driver location:', err);
              }
            }
          );
        } catch (err) {
          console.log('Error starting driver tracking:', err);
        }
      }
    };

    startTracking();

    return () => {
      if (subscriber) subscriber.remove();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [loading, origen, isPassenger]);

  const fitAllMarkers = () => {
    if (!mapRef.current || !origen || !destino) return;
    const markers = [origen, destino];
    if (vehicle) markers.push(vehicle);

    mapRef.current.fitToCoordinates(markers, {
      edgePadding: { top: 120, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  };

  useEffect(() => {
    if (!loading && origen && destino) {
      setTimeout(() => fitAllMarkers(), 800);
    }
  }, [loading]);

  const isVehicleAtOrigin = Boolean(
    origen && vehicle &&
    Math.abs(vehicle.latitude - origen.latitude) < 0.00005 &&
    Math.abs(vehicle.longitude - origen.longitude) < 0.00005
  );

  const displayedVehiclePos = isVehicleAtOrigin && vehicle
    ? { latitude: vehicle.latitude + 0.00008, longitude: vehicle.longitude + 0.00008 }
    : vehicle;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando mapa de trayecto...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Back button and title overlay */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Viaje en Curso 🚗</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {isPassenger ? `Conductor: ${viaje?.conductor}` : 'Transmitiendo GPS en ruta'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.fitBtn, { marginRight: 8, borderColor: COLORS.danger }]} 
              onPress={() => navigation.navigate('MainTabs', { screen: 'Report', params: { viajeId } })}
            >
              <Ionicons name="warning-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.fitBtn} onPress={fitAllMarkers}>
              <Ionicons name="scan-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Map View */}
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: origen?.latitude ?? -1.2543,
              longitude: origen?.longitude ?? -78.6229,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            }}
            showsUserLocation={false}
          >
            {origen && (
              <Marker coordinate={origen} pinColor={COLORS.secondary} anchor={{ x: 0.5, y: 1.0 }}>
                <View style={styles.markerContainer}>
                  <Ionicons name="location" size={32} color={COLORS.secondary} />
                </View>
              </Marker>
            )}

            {destino && (
              <Marker coordinate={destino} pinColor={COLORS.danger} anchor={{ x: 0.5, y: 1.0 }}>
                <View style={styles.markerContainer}>
                  <Ionicons name="flag" size={32} color={COLORS.danger} />
                </View>
              </Marker>
            )}

            {displayedVehiclePos && (
              <Marker coordinate={displayedVehiclePos} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.carMarker}>
                  <Ionicons name="car-sport" size={20} color="#fff" />
                </View>
              </Marker>
            )}
          </MapView>

          {/* Bottom Panel Overlay */}
          <View style={styles.bottomOverlay}>
            <View style={styles.bottomPill}>
              <Ionicons name="compass" size={20} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bottomLabel}>Punto de Destino</Text>
                <Text style={styles.bottomValue} numberOfLines={1}>
                  {viaje?.destino_lat && viaje?.destino_lon 
                    ? `${parseFloat(viaje.destino_lat).toFixed(5)}, ${parseFloat(viaje.destino_lon).toFixed(5)}`
                    : 'Destino Universitario U-Ride'}
                </Text>
              </View>
            </View>

            {isPassenger ? (
              <View style={styles.statusBox}>
                <ActivityIndicator size="small" color={COLORS.secondary} style={{ marginRight: 8 }} />
                <Text style={styles.statusText}>Rastreando ubicación del conductor en tiempo real...</Text>
              </View>
            ) : (
              <View style={[styles.statusBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="radio" size={16} color={COLORS.secondary} style={{ marginRight: 8 }} />
                <Text style={[styles.statusText, { color: COLORS.secondary }]}>Transmitiendo GPS U-Ride activo...</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 12 },
  loadingText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.gray },
  map: { flex: 1 },
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOW.md
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.dark },
  headerSub: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.gray, marginTop: 1 },
  fitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  carMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.md
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    ...SHADOW.lg
  },
  bottomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.md
  },
  bottomLabel: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gray, textTransform: 'uppercase' },
  bottomValue: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.dark, marginTop: 1 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: RADIUS.md
  },
  statusText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary }
});
