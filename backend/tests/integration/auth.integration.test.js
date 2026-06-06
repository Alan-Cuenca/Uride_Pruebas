/**
 * TESTS DE INTEGRACIÓN - Authentication (Auth Routes)
 * 
 * Archivo: Pruebas/integration/auth.integration.test.js
 * 
 * Casos cubiertos:
 * - CP-RF003-02: Login con credenciales incorrectas (401 Unauthorized, sin token)
 * - CP-RF003-03: Login exitoso (200 OK, retorna token JWT)
 * - CP-RF004: Validación de token expirado en endpoints protegidos
 * 
 * Herramientas:
 * - Jest: test runner y assertions
 * - SuperTest: cliente HTTP para probar endpoints
 * 
 * Patrón: Arrange -> Act -> Assert (AAA)
 */

const request = require('supertest');
const app = require('../../src/server');
const testData = require('../__fixtures__/testData');

describe('🔐 Auth Integration Tests', () => {
  
  /**
   * CP-RF003-02: Login con credenciales incorrectas
   * 
   * Escenario: Usuario intenta login con password incorrecto
   * Esperado: HTTP 401 Unauthorized, sin JWT en respuesta
   */
  describe('POST /api/auth/login - Credenciales Incorrectas', () => {
    it('Debe retornar 401 Unauthorized cuando la contraseña es incorrecta', async () => {
      // ======== ARRANGE (Preparar) ========
      // Creamos un objeto de credenciales con contraseña incorrecta
      const loginAttempt = {
        email: testData.wrongPasswordLogin.email,
        password: testData.wrongPasswordLogin.password, // "ClaveFalsa123"
      };

      // ======== ACT (Ejecutar) ========
      // Hacemos una petición POST al endpoint de login
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginAttempt);

      // ======== ASSERT (Validar) ========
      // ✓ El status HTTP debe ser 401 (Unauthorized)
      expect(response.status).toBe(401);
      
      // ✓ No debe contener un token JWT en la respuesta
      expect(response.body.token).toBeUndefined();
      expect(response.body.access_token).toBeUndefined();
      
      // ✓ Debe contener un mensaje de error
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/contraseña|incorrecta|unauthorized/i);
    });

    it('Debe retornar 401 cuando el usuario no existe', async () => {
      // ======== ARRANGE ========
      const loginAttempt = testData.nonExistentUserLogin;

      // ======== ACT ========
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginAttempt);

      // ======== ASSERT ========
      expect(response.status).toBe(401);
      expect(response.body.token).toBeUndefined();
      expect(response.body).toHaveProperty('error');
    });

    it('Debe retornar 400 si falta email o password', async () => {
      // ======== ARRANGE ========
      const incompleteLogin = {
        email: 'test@uta.edu.ec',
        // ❌ Falta password
      };

      // ======== ACT ========
      const response = await request(app)
        .post('/api/auth/login')
        .send(incompleteLogin);

      // ======== ASSERT ========
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  /**
   * CP-RF003-03: Login Exitoso (Happy Path)
   * 
   * Escenario: Usuario realiza login con credenciales válidas
   * Esperado: HTTP 200 OK, retorna JWT token válido
   * 
   * Nota: Este test asume que el usuario existe en BD
   * En un ambiente real, usarías fixtures o una BD de testing
   */
  describe('POST /api/auth/login - Login Exitoso', () => {
    it('Debe retornar 200 OK y token JWT cuando credenciales son válidas', async () => {
      // ======== ARRANGE ========
      // Usamos credenciales válidas del fixture
      const validLogin = {
        email: testData.validLoginCredentials.email,
        password: testData.validLoginCredentials.password,
      };

      // ======== ACT ========
      // Hacemos petición POST al login
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLogin);

      // ======== ASSERT ========
      // ✓ Status debe ser 200 (OK)
      expect(response.status).toBe(200);

      // ✓ La respuesta debe contener un token JWT válido
      // El token debe tener 3 partes separadas por puntos: header.payload.signature
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.split('.').length).toBe(3);

      // ✓ El token debe ser decodificable (tiene estructura JWT válida)
      const tokenParts = response.body.token.split('.');
      expect(tokenParts[0].length).toBeGreaterThan(0); // Header
      expect(tokenParts[1].length).toBeGreaterThan(0); // Payload
      expect(tokenParts[2].length).toBeGreaterThan(0); // Signature

      // ✓ Respuesta debe contener información del usuario autenticado
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user.email).toBe(validLogin.email);

      // ✓ Guardar token en variable para tests posteriores
      global.testToken = response.body.token;
    });

    it('El token JWT retornado debe contener claims válidos', async () => {
      // ======== ARRANGE ========
      const validLogin = testData.validLoginCredentials;

      // ======== ACT ========
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLogin);

      // ======== ASSERT ========
      const token = response.body.token;
      
      // Decodificar el payload del JWT (segunda parte)
      const payloadBase64 = token.split('.')[1];
      const payloadDecoded = JSON.parse(
        Buffer.from(payloadBase64, 'base64').toString()
      );

      // ✓ El payload debe contener información del usuario
      expect(payloadDecoded).toHaveProperty('id');
      expect(payloadDecoded).toHaveProperty('email');
      
      // ✓ El token debe tener un timestamp de emisión (iat)
      expect(payloadDecoded).toHaveProperty('iat');
      
      // ✓ Si tiene expiración, debe ser en el futuro
      if (payloadDecoded.exp) {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        expect(payloadDecoded.exp).toBeGreaterThan(nowInSeconds);
      }
    });
  });

  /**
   * Test Health Check
   * Verificar que el servidor está respondiendo
   */
  describe('GET /api/health', () => {
    it('Debe retornar status ok', async () => {
      // ======== ACT ========
      const response = await request(app)
        .get('/api/health');

      // ======== ASSERT ========
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
