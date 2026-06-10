import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert, StatusBar, Platform, TextInput, TouchableWithoutFeedback } from 'react-native';
import DateTimePickerCustom from '../components/DateTimePickerCustom';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuthStore } from '../store/userStore';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/design';

export default function HomeScreen({ navigation }: any) {
  const logout = useAuthStore(state => state.logout);
  const user   = useAuthStore(state => state.user);
  const [viajes, setViajes]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedViaje, setSelectedViaje] = useState<any>(null);

  // Filters state
  const [filterModal, setFilterModal] = useState(false);
  const [radioKm, setRadioKm] = useState(3);
  const [filterDate, setFilterDate] = useState<Date | null>(null);

  const isOwnRide = Boolean(selectedViaje && user?.id && selectedViaje.conductor_id === user.id);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const radioMeters = radioKm * 1000;
      let url = `/viajes?lat=-1.259&lon=-78.631&radio=${radioMeters}`;
      if (filterDate) {
        const year = filterDate.getFullYear();
        const month = String(filterDate.getMonth() + 1).padStart(2, '0');
        const day = String(filterDate.getDate()).padStart(2, '0');
        url += `&fecha=${year}-${month}-${day}`;
      }
      const resp = await api.get(url);
      setViajes(resp.data.resultados || []);
    } catch { /* sin conexión */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRides(); }, []);

  const openModal = (viaje: any) => { setSelectedViaje(viaje); setModalVisible(true); };

  const handleEditRide = () => {
    if (!selectedViaje) return;
    setModalVisible(false);
    navigation.navigate('PublishRide', { viaje: selectedViaje });
  };

  const handleStartRide = async (ignorarPago = false) => {
    if (!selectedViaje) return;
    try {
      const resp = await api.patch(`/viajes/${selectedViaje.id}/iniciar`, { ignorarPago });
      
      if (resp.data.requiereConfirmacionPago) {
        const nombres = resp.data.pasajerosSinPago.join('\n- ');
        
        if (Platform.OS === 'web') {
          if (window.confirm(`Los siguientes pasajeros aún no han realizado su aporte:\n\n- ${nombres}\n\n¿Deseas iniciar el viaje de todas formas?`)) {
            handleStartRide(true);
          }
          return;
        }

        Alert.alert(
          'Pasajeros sin pago ⚠️',
          `Los siguientes pasajeros aún no han realizado su aporte:\n\n- ${nombres}\n\n¿Deseas iniciar el viaje de todas formas?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Sí, iniciar viaje', 
              style: 'destructive',
              onPress: () => handleStartRide(true) 
            }
          ]
        );
        return;
      }

      Alert.alert('Viaje iniciado', 'El estado cambió a EN_CURSO.');
      setModalVisible(false);
      fetchRides();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo iniciar el viaje.');
    }
  };

  const handleFinishRide = async () => {
    if (!selectedViaje) return;
    try {
      await api.patch(`/viajes/${selectedViaje.id}/finalizar`);
      Alert.alert('Viaje finalizado', 'El estado cambió a CERRADO.');
      setModalVisible(false);
      fetchRides();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo finalizar el viaje.');
    }
  };

  const handleDeleteRide = () => {
    if (!selectedViaje) return;
    
    if (Platform.OS === 'web') {
      if (window.confirm('Eliminar viaje\nEsta acción eliminará el viaje y las solicitudes asociadas.')) {
        api.delete(`/viajes/${selectedViaje.id}`).then(() => {
          Alert.alert('Viaje eliminado', 'La publicación fue borrada correctamente.');
          setModalVisible(false);
          fetchRides();
        }).catch((err: any) => {
          Alert.alert('Error', err.response?.data?.error || 'No se pudo eliminar el viaje.');
        });
      }
      return;
    }

    Alert.alert(
      'Eliminar viaje',
      'Esta acción eliminará el viaje y las solicitudes asociadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/viajes/${selectedViaje.id}`);
              Alert.alert('Viaje eliminado', 'La publicación fue borrada correctamente.');
              setModalVisible(false);
              fetchRides();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'No se pudo eliminar el viaje.');
            }
          },
        },
      ]
    );
  };

  const handleRequest = async () => {
    try {
      await api.post('/solicitudes', { viaje_id: selectedViaje.id });
      Alert.alert('🎉 Solicitud Enviada', 'El conductor revisará tu solicitud pronto.');
      setModalVisible(false);
      fetchRides();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo enviar.');
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateChip = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' })}`;
  };

  const RideCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>{item.conductor?.charAt(0) ?? '?'}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardDriver}>{item.conductor}</Text>
          <View style={styles.starsRow}>
            {[1,2,3,4,5].map(s => (
              <Ionicons key={s} name="star" size={12} color={s <= Math.round(item.reputacion_conductor) ? '#F59E0B' : '#E2E8F0'} />
            ))}
            <Text style={styles.repText}> {item.reputacion_conductor}</Text>
          </View>
        </View>
        <View style={styles.costBadge}>
          <Text style={styles.costText}>${item.costo_contribucion}</Text>
        </View>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detailChip}>
          <Ionicons name="people-outline" size={14} color={COLORS.primary} />
          <Text style={styles.detailChipText}>{item.cupos_disponibles} cupos</Text>
        </View>
        <View style={styles.detailChip}>
          <Ionicons name="navigate-outline" size={14} color={COLORS.secondary} />
          <Text style={styles.detailChipText}>{Math.round(item.metros_de_distancia)}m</Text>
        </View>
        <View style={styles.detailChip}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
          <Text style={styles.detailChipText}>{formatDateChip(item.fecha_salida)}</Text>
        </View>
        <View style={styles.detailChip}>
          <Ionicons name="time-outline" size={14} color="#D97706" />
          <Text style={styles.detailChipText}>{formatTime(item.fecha_salida)}</Text>
        </View>
        {user?.rol === 'CONDUCTOR' && item.estado && (
          <View style={[styles.detailChip, { backgroundColor: item.estado === 'ACTIVO' ? '#ECFDF5' : '#FEF2F2' }]}>
            <Ionicons name={item.estado === 'ACTIVO' ? "checkmark-circle-outline" : "close-circle-outline"} size={14} color={item.estado === 'ACTIVO' ? COLORS.secondary : COLORS.danger} />
            <Text style={[styles.detailChipText, { color: item.estado === 'ACTIVO' ? COLORS.secondary : COLORS.danger }]}>{item.estado}</Text>
          </View>
        )}
      </View>
      {item.ya_solicitado ? (
        <View style={[styles.joinBtn, { backgroundColor: COLORS.lightGray }]}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={styles.joinBtnText}>Solicitud Enviada</Text>
        </View>
      ) : (
        <View style={styles.joinBtn}>
          <Ionicons name={user?.rol === 'CONDUCTOR' ? "information-circle-outline" : "add-circle-outline"} size={16} color="#fff" />
          <Text style={styles.joinBtnText}>
            {user?.rol === 'CONDUCTOR' ? 'Ver detalles' : 'Ver reglas y unirse'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.nombre?.split(' ')[0]} 👋</Text>
          <Text style={styles.headerTitle}>{user?.rol === 'CONDUCTOR' ? 'Tus Viajes Publicados' : 'Viajes en tu zona'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {user?.rol !== 'CONDUCTOR' && (
            <TouchableOpacity style={styles.refreshBtn} onPress={() => setFilterModal(true)} accessibilityLabel="Abrir filtros">
              <Ionicons name="filter-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {/* Pull-to-refresh will handle reloading; removed refresh button */}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={viajes}
          keyExtractor={item => (item as any).id.toString()}
          renderItem={({ item }) => <RideCard item={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchRides}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="car-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>Sin viajes a 3km esta noche</Text>
              <Text style={styles.emptySubText}>Inténtalo en otro momento o publica el tuyo</Text>
            </View>
          }
        />
      )}

      {/* Modal RF9 — Reglas Obligatorias */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Ionicons name="shield-checkmark-outline" size={28} color={COLORS.warning} />
                <Text style={styles.modalTitle}>Acuerdos del Viaje</Text>
              </View>
              <Text style={styles.modalSub}>
                Lee las reglas de <Text style={{ fontFamily: FONTS.bold }}>{selectedViaje?.conductor}</Text> antes de unirte:
              </Text>
              <View style={styles.tripSummary}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryPill}>
                    <Ionicons name="people-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.summaryText}>{selectedViaje?.cupos_disponibles ?? 0} cupos</Text>
                  </View>
                  <View style={styles.summaryPill}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.secondary} />
                    <Text style={styles.summaryText}>${selectedViaje?.costo_contribucion ?? 0}</Text>
                  </View>
                </View>
                <Text style={styles.summaryDetail}>Origen: {selectedViaje?.origen_lat ?? '--'}, {selectedViaje?.origen_lon ?? '--'}</Text>
                <Text style={styles.summaryDetail}>Destino: {selectedViaje?.destino_lat ?? '--'}, {selectedViaje?.destino_lon ?? '--'}</Text>
                {selectedViaje?.estado && (
                  <Text style={[styles.summaryDetail, { color: selectedViaje.estado === 'ACTIVO' ? COLORS.secondary : COLORS.danger }]}>
                    Estado: {selectedViaje.estado}
                  </Text>
                )}
              </View>
              <View style={styles.rulesBox}>
                <Text style={styles.rulesText}>{selectedViaje?.notas_reglas}</Text>
              </View>
              <View style={styles.modalBtns}>
                {isOwnRide ? (
                  <View style={{ width: '100%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <TouchableOpacity style={[styles.cancelBtn, { flex: 0.48, opacity: selectedViaje?.estado === 'ACTIVO' ? 1 : 0.5 }]} onPress={handleDeleteRide} disabled={selectedViaje?.estado !== 'ACTIVO'}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        <Text style={styles.cancelText}>Eliminar</Text>
                      </TouchableOpacity>
                      {selectedViaje?.estado === 'ACTIVO' ? (
                        <TouchableOpacity style={[styles.acceptBtn, { flex: 0.48, marginLeft: 8 }]} onPress={() => handleStartRide(false)}>
                          <Ionicons name="play-circle-outline" size={18} color="#fff" />
                          <Text style={styles.acceptText}>Iniciar</Text>
                        </TouchableOpacity>
                      ) : selectedViaje?.estado === 'EN_CURSO' ? (
                        <TouchableOpacity style={[styles.acceptBtn, { flex: 0.48, marginLeft: 8, backgroundColor: COLORS.danger }]} onPress={handleFinishRide}>
                          <Ionicons name="stop-circle-outline" size={18} color="#fff" />
                          <Text style={styles.acceptText}>Finalizar</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={[styles.acceptBtn, { flex: 0.48, marginLeft: 8, opacity: 0.6 }]} disabled>
                          <Ionicons name="play-circle-outline" size={18} color="#fff" />
                          <Text style={styles.acceptText}>Iniciar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {selectedViaje?.estado === 'EN_CURSO' ? (
                      <TouchableOpacity style={[styles.editBtn, { backgroundColor: COLORS.primary }]} onPress={() => { setModalVisible(false); navigation.navigate('RideMap', { viajeId: selectedViaje.id, rol: 'CONDUCTOR' }); }}>
                        <Ionicons name="map-outline" size={18} color="#fff" />
                        <Text style={[styles.acceptText, { marginLeft: 10 }]}>Ver Mapa de Trayecto</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.editBtn, { opacity: selectedViaje?.estado === 'ACTIVO' ? 1 : 0.5 }]} onPress={handleEditRide} disabled={selectedViaje?.estado !== 'ACTIVO'}>
                        <Ionicons name="create-outline" size={18} color="#fff" />
                        <Text style={[styles.acceptText, { marginLeft: 10 }]}>Editar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                      <Text style={styles.cancelText}>{selectedViaje?.ya_solicitado ? 'Cerrar' : 'Rechazar'}</Text>
                    </TouchableOpacity>
                    {selectedViaje?.ya_solicitado ? (
                      <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: COLORS.lightGray }]} disabled>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.acceptText}>Solicitud Enviada</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.acceptBtn} onPress={handleRequest}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.acceptText}>Aceptar y Unirse</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Filtros */}
      <Modal visible={filterModal} transparent animationType="slide" onRequestClose={() => setFilterModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setFilterModal(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Ionicons name="options-outline" size={28} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Filtrar Viajes</Text>
              </View>
              
              <Text style={styles.label}>Distancia Máxima (km)</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {[1, 3, 5, 10].map(km => (
                  <TouchableOpacity 
                    key={km} 
                    style={[styles.chip, radioKm === km && styles.chipActive]} 
                    onPress={() => setRadioKm(km)}
                  >
                    <Text style={[styles.chipText, radioKm === km && styles.chipTextActive]}>{km} km</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 6 }}>
                <Text style={[styles.label, { marginBottom: 0, marginTop: 0 }]}>Fecha (Opcional)</Text>
                {filterDate && (
                  <TouchableOpacity onPress={() => setFilterDate(null)}>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.danger }}>Borrar Fecha</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {filterDate ? (
                <DateTimePickerCustom value={filterDate} onChange={setFilterDate} />
              ) : (
                <TouchableOpacity style={styles.inputRow} onPress={() => setFilterDate(new Date())}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                  <Text style={[styles.inputDate, { color: COLORS.lightGray }]}>Sin fecha (Mostrar todos)</Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setFilterDate(null); setRadioKm(3); }}>
                  <Text style={[styles.cancelText, { color: COLORS.gray }]}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => { setFilterModal(false); fetchRides(); }}>
                  <Text style={styles.acceptText}>Aplicar Filtros</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 10) + 6 : 10, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: COLORS.border },
  greeting: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.gray },
  headerTitle: { fontFamily: FONTS.black, fontSize: 24, color: COLORS.dark },
  refreshBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, marginBottom: 14, padding: 16, ...SHADOW.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarSmall: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarSmallText: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff' },
  cardDriver: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.dark },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  repText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.gray },
  costBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  costText: { fontFamily: FONTS.bold, color: COLORS.secondary, fontSize: 14 },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  detailChipText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.dark },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, padding: 12, borderRadius: RADIUS.md },
  joinBtnText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.gray, marginTop: 16 },
  emptySubText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.lightGray, marginTop: 6, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  modalTitle: { fontFamily: FONTS.black, fontSize: 22, color: COLORS.dark },
  modalSub: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.gray, marginBottom: 16 },
  rulesBox: { backgroundColor: '#FFFBEB', padding: 16, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#F59E0B', marginBottom: 24 },
  rulesText: { fontFamily: FONTS.medium, fontSize: 15, color: '#78350F', lineHeight: 22 },
  tripSummary: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, gap: 8 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border },
  summaryText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.dark },
  summaryDetail: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.gray },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: RADIUS.md, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  cancelText: { fontFamily: FONTS.bold, color: COLORS.danger },
  acceptBtn: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.secondary, ...SHADOW.md },
  acceptText: { fontFamily: FONTS.bold, color: '#fff' },
  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.gray, marginBottom: 8, marginTop: 6 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontFamily: FONTS.medium, color: COLORS.dark },
  chipTextActive: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 20 },
  inputDate: { flex: 1, paddingVertical: 12, fontFamily: FONTS.regular, fontSize: 15, color: COLORS.dark },
  editBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.secondary, marginTop: 12 },
});
