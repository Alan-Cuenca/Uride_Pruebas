import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// IP WiFi de la PC donde corre el backend Node.js.
// Android físico no puede usar 'localhost' — debe usar la IP de la red local.
// En Web (Cypress) sí podemos y debemos usar localhost.
const api = axios.create({
  baseURL: Platform.OS === 'web' ? 'http://localhost:5000/api' : 'http://10.0.2.2:5000/api',
  timeout: 10000,
});

// Interceptor: Inyectar Mágicamente el Token JWT en todas las consultas para no tener que mandarlo a mano.
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@uride_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
