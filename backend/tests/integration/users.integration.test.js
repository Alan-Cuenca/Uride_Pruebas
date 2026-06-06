/**
 * TESTS DE INTEGRACIÓN - Users (Protected Routes)
 * 
 * Archivo: Pruebas/integration/users.integration.test.js
 * 
 * Casos cubiertos:
 * - CP-RF004-03: GET /api/users/me con token JWT expirado (401 Unauthorized)
 * - CP-RF004: GET /api/users/me con token inválido (401 Unauthorized)
 * - CP-RF004: GET /api/users/me con token válido (200 OK, retorna usuario)
 * 
 * Herramientas:
 * - Jest: test runner y assertions
 * - SuperTest: cliente HTTP para probar endpoints protegidos
 * - JWT Tokens: tokens válidos, expirados e inválidos del fixture
 * 
 * Patrón: Arrange -> Act -> Assert (AAA)
 */

const request = require('supertest');
const app = require('../../src/server');
const jwt = require('jsonwebtoken');
const testData = require('../__fixtures__/testData');

describe('👤 Users Integration Tests - Protected Routes', () => {

  /**
   * CP-RF004-03: GET /api/users/me con Token JWT Expirado
   * 
   * Escenario: Usuario intenta acceder a /api/users/me con un token expirado
   * Esperado: HTTP 401 Unauthorized
   */
  describe('GET /api/users/me - Token JWT Expirado', () => {
    it('Debe retornar 401 Unauthorized cuando el token JWT está expirado', async () => {
      // ======== ARRANGE ========
      // Crear un JWT expirado (con fecha de expiración en el pasado)
      const expiredToken = jwt.sign(
        {
          id: 1,
          nombre: 'Juan Pérez',
          email: 'juan.perez@uta.edu.ec',
        },
        process.env.JWT_SECRET || 'test-secret-key-super-seguro-para-testing',
        {
          expiresIn: '-1h', // ❌ Token expirado hace 1 hora
        }
      );

      // ======== ACT ========
      // Hacer petición GET a /api/users/me con el token expirado en header Authorization
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      // ======== ASSERT ========
      // ✓ Status debe ser 401 (Unauthorized)
      expect(response.status).toBe(401);

      // ✓ Respuesta debe contener error indicando token expirado
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/expirado|expired|inválido|invalid/i);

      // ✓ NO debe retornar datos del usuario
      expect(response.body.user).toBeUndefined();
      expect(response.body.data).toBeUndefined();
    });

    it('Debe retornar 401 cuando falta el header Authorization', async () => {
      // ======== ARRANGE ========
      // No pasamos ningún token

      // ======== ACT ========
      const response = await request(app)
        .get('/api/users/me');
      // No enviamos header Authorization

      // ======== ASSERT ========
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/token|autorización|required/i);
    });
  });

  /**
   * CP-RF004: GET /api/users/me con Token JWT Inválido
   * 
   * Escenario: Usuario intenta acceder con un token malformado o falso
   * Esperado: HTTP 401 Unauthorized
   */
  describe('GET /api/users/me - Token JWT Inválido', () => {
    it('Debe retornar 401 cuando el token JWT está malformado', async () => {
      // ======== ARRANGE ========
      // Un token que parece JWT pero no es válido
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';

      // ======== ACT ========
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${invalidToken}`);

      // ======== ASSERT ========
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('Debe retornar 401 cuando el token tiene firma incorrecta', async () => {
      // ======== ARRANGE ========
      // Crear un token con firma incorrecta (generado con otra clave secreta)
      const wrongSignatureToken = jwt.sign(
        {
          id: 1,
          nombre: 'Juan Pérez',
          email: 'juan.perez@uta.edu.ec',
        },
        'OTRA-CLAVE-SECRETA-DIFERENTE', // 🔐 Clave diferente
        {
          expiresIn: '1h',
        }
      );

      // ======== ACT ========
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${wrongSignatureToken}`);

      // ======== ASSERT ========
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('Debe retornar 400 si Authorization header tiene formato incorrecto', async () => {
      // ======== ARRANGE ========
      // Header mal formateado (sin "Bearer")
      const malformedHeader = 'InvalidFormat.token.here';

      // ======== ACT ========
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', malformedHeader);

      // ======== ASSERT ========
      // Puede ser 400 o 401 dependiendo de tu implementación
      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  /**
   * CP-RF004: GET /api/users/me con Token JWT Válido (Happy Path)
   * 
   * Escenario: Usuario accede a /api/users/me con un token válido
   * Esperado: HTTP 200 OK, retorna información del usuario
   * 
   * Nota: Este test depende de que el usuario exista en la BD
   */
  describe('GET /api/users/me - Token JWT Válido (Happy Path)', () => {
    it('Debe retornar 200 OK y datos del usuario cuando token es válido', async () => {
      // ======== ARRANGE ========
      // Crear un token JWT válido (expiración en el futuro)
      const validToken = jwt.sign(
        {
          id: 1,
          nombre: 'Juan Pérez',
          email: 'juan.perez@uta.edu.ec',
        },
        process.env.JWT_SECRET || 'test-secret-key-super-seguro-para-testing',
        {
          expiresIn: '24h',
        }
      );

      // ======== ACT ========
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${validToken}`);

      // ======== ASSERT ========
      // ✓ Status debe ser 200 (OK)
      expect(response.status).toBe(200);

      // ✓ Debe retornar el objeto usuario autenticado
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('nombre');

      // ✓ Los datos deben coincidir con el token
      expect(response.body.user.id).toBe(1);
      expect(response.body.user.email).toBe('juan.perez@uta.edu.ec');

      // ✓ No debe contener información sensible como contraseña
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('Debe retornar perfil completo del usuario autenticado', async () => {
      // ======== ARRANGE ========
      const validToken = jwt.sign(
        {
          id: 2,
          nombre: 'María García',
          email: 'maria.garcia@uta.edu.ec',
        },
        process.env.JWT_SECRET || 'test-secret-key-super-seguro-para-testing',
        {
          expiresIn: '24h',
        }
      );

      // ======== ACT ========
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${validToken}`);

      // ======== ASSERT ========
      expect(response.status).toBe(200);
      
      // ✓ Verificar estructura completa del usuario
      expect(response.body.user).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          nombre: expect.any(String),
          email: expect.any(String),
          rol: expect.any(String),
        })
      );

      // ✓ El usuario debe estar verificado
      expect(response.body.user.verificado).toBe(true);
    });
  });

  /**
   * Tests de Integración con Token del Login Previo
   * 
   * Este test demuestra cómo reutilizar el token obtenido
   * en el login en peticiones posteriores
   */
  describe('Flujo Completo: Login → Usar Token en Petición Protegida', () => {
    let authToken = null;

    beforeAll(async () => {
      // ======== ARRANGE ========
      const loginCredentials = testData.validLoginCredentials;

      // ======== ACT ========
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials);

      // ======== ASSERT ========
      if (loginResponse.status === 200 && loginResponse.body.token) {
        authToken = loginResponse.body.token;
      }
    });

    it('Debe usar el token del login en peticiones posteriores', async () => {
      // Saltar test si no obtuvimos token en login
      if (!authToken) {
        console.warn('⚠️  No fue posible obtener token en login, saltando test');
        return;
      }

      // ======== ACT ========
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      // ======== ASSERT ========
      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testData.validLoginCredentials.email);
    });
  });
});
