import { Platform } from 'react-native';
import WebMapView, { Marker as WebMarker, PROVIDER_GOOGLE as WebProvider } from './MapWrapper.web';

let MapView, Marker, PROVIDER_GOOGLE;

if (Platform.OS === 'web') {
  MapView = WebMapView;
  Marker = WebMarker;
  PROVIDER_GOOGLE = WebProvider;
} else {
  const NativeMaps = require('react-native-maps');
  MapView = NativeMaps.default;
  Marker = NativeMaps.Marker;
  PROVIDER_GOOGLE = NativeMaps.PROVIDER_GOOGLE;
}

export default MapView;
export { Marker, PROVIDER_GOOGLE };
