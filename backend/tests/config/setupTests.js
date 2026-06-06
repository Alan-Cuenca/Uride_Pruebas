/**
 * Setup Global para Pruebas Jest
 * 
 * Se ejecuta ANTES de todas las pruebas
 * Utilizado para:
 * - Configurar variables de entorno
 * - Aumentar timeout de Jest
 * - Configurar mocks globales
 */

// Establecer NODE_ENV en testing
process.env.NODE_ENV = 'test';
process.env.PORT = 5001;
process.env.JWT_SECRET = 'test-secret-key-super-seguro-para-testing';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || 5432;
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DB_NAME = process.env.DB_NAME || 'uride_test';

// Suppress console messages en tests
const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  // Opcional: Descomentar si quieres silenciar logs
  // console.error = jest.fn();
  // console.log = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
});
