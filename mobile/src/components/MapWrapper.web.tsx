import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const MapView = (props: any) => (
  <TouchableOpacity 
    activeOpacity={0.9}
    style={[{ backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }, props.style]} 
    testID="mock_map_view"
    onPress={(e) => {
      // Simulamos el evento de react-native-maps
      if (props.onPress) {
        props.onPress({
          nativeEvent: {
            coordinate: {
              latitude: -1.25 + (Math.random() * 0.01),
              longitude: -78.62 + (Math.random() * 0.01)
            }
          }
        });
      }
    }}
  >
    <Text style={{ color: '#6B7280' }}>[Mapa Simulado para Pruebas Web]</Text>
    {props.children}
  </TouchableOpacity>
);

export const Marker = (props: any) => (
  <View style={{ display: 'none' }} testID="mock_marker" />
);

export const PROVIDER_GOOGLE = 'google';

export default MapView;
