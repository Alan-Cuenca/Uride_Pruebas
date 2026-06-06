/**
 * TESTS UNITARIOS - Auth Controller
 * 
 * Archivo: Pruebas/unit/auth.controller.unit.test.js
 * 
 * Qué probamos:
 * - Lógica PURA del controlador
 * - Respuestas HTTP correctas
 * - Validación de inputs
 * 
 * Qué NO probamos (se mockean):
 * - Base de datos (mocked)
 * - Bcrypt (mocked)
 * - JWT (si fuera necesario)
 * - Email service (mocked)
 * 
 * Ventajas de Tests Unitarios:
 * ✓ Rápidos (no necesitan BD real)
 * ✓ Aislados (no afectan otros tests)
 * ✓ Determinísticos (siempre igual resultado)
 * ✓ Focalizados en lógica de negocio
 * 
 * Herramientas:
 * - Jest: test runner y mocks
 * - jest.mock(): para mockear módulos
 * 
 * Patrón: Arrange -> Act -> Assert (AAA)
 */

// ========== MOCKS GLOBALES ==========
// Mockear el módulo de base de datos ANTES de importar el controlador
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

// Mockear bcryptjs
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mockear jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

// Mockear emailService
jest.mock('../../src/services/emailService', () => ({
  sendVerificationCode: jest.fn(),
}));

// ========== IMPORTS ==========
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../src/config/database');
const emailService = require('../../src/services/emailService');
const authController = require('../../src/controllers/authController');
const testData = require('../__fixtures__/testData');

describe('🔐 Auth Controller - Unit Tests', () => {

  /**
   * SETUP: Limpiar todos los mocks antes de cada test
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // TEST 1: Login con Contraseña Incorrecta
  // ============================================================
  describe('login() - Contraseña Incorrecta', () => {
    it('Debe retornar 401 Unauthorized cuando la contraseña no coincide', async () => {
      // ======== ARRANGE ========
      // 1. Crear objetos mock para request y response
      const req = {
        body: {
          email: testData.validLoginCredentials.email,
          password: 'ClaveFalsa123',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(), // Encadenamiento fluido
        json: jest.fn(),
      };

      // 2. Mockear la respuesta de la BD (usuario existe)
      const mockUser = {
        id: 1,
        nombre: 'Juan Pérez',
        email: testData.validLoginCredentials.email,
        password_hash: '$2a$10$hashedPasswordExample',
        rol: 'usuario',
        activo: true,
      };

      // pool.query retorna { rows: [...] }
      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      // 3. Mockear bcrypt.compare para retornar FALSE (password no coincide)
      bcrypt.compare.mockResolvedValueOnce(false);

      // ======== ACT ========
      // Llamar al método login del controlador
      await authController.login(req, res);

      // ======== ASSERT ========
      // ✓ res.status debe haber sido llamado con 401
      expect(res.status).toHaveBeenCalledWith(401);

      // ✓ res.json debe haber sido llamado con un objeto error
      expect(res.json).toHaveBeenCalledWith({
        error: expect.stringMatching(/credenciales|incorrectas/i),
      });

      // ✓ No debe haber llamado a jwt.sign (no se genera token)
      expect(jwt.sign).not.toHaveBeenCalled();

      // ✓ Verificar que bcrypt.compare fue llamado correctamente
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'ClaveFalsa123',
        mockUser.password_hash
      );
    });
  });

  // ============================================================
  // TEST 2: Login con Usuario Inexistente
  // ============================================================
  describe('login() - Usuario No Existe', () => {
    it('Debe retornar 401 cuando el usuario no existe en la BD', async () => {
      // ======== ARRANGE ========
      const req = {
        body: {
          email: 'noexiste@uta.edu.ec',
          password: 'AnyPassword123!',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mockear respuesta vacía de BD (usuario no encontrado)
      pool.query.mockResolvedValueOnce({ rows: [] }); // ❌ Sin resultados

      // ======== ACT ========
      await authController.login(req, res);

      // ======== ASSERT ========
      // ✓ Status debe ser 401 (no se revela si es usuario o contraseña)
      expect(res.status).toHaveBeenCalledWith(401);

      // ✓ No debe llamar a bcrypt.compare (usuario no existe)
      expect(bcrypt.compare).not.toHaveBeenCalled();

      // ✓ No debe generar JWT
      expect(jwt.sign).not.toHaveBeenCalled();

      // ✓ pool.query debe haber sido llamado UNA sola vez (búsqueda del usuario)
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // TEST 3: Login Exitoso (Happy Path)
  // ============================================================
  describe('login() - Login Exitoso', () => {
    it('Debe retornar 200 OK con JWT token cuando credenciales son válidas', async () => {
      // ======== ARRANGE ========
      const req = {
        body: testData.validLoginCredentials,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // 1. Mockear usuario en BD
      const mockUser = {
        id: 1,
        nombre: 'Juan Pérez',
        email: testData.validLoginCredentials.email,
        password_hash: '$2a$10$hashedPasswordExample',
        rol: 'usuario',
        activo: true,
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      // 2. Mockear bcrypt.compare para retornar TRUE (contraseña válida)
      bcrypt.compare.mockResolvedValueOnce(true);

      // 3. Mockear JWT.sign para retornar un token válido
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockPayload.mockSignature';
      jwt.sign.mockReturnValue(mockToken);

      // ======== ACT ========
      await authController.login(req, res);

      // ======== ASSERT ========
      // ✓ Status debe ser 200 (OK)
      expect(res.status).toHaveBeenCalledWith(200);

      // ✓ res.json debe haber sido llamado con objeto que contiene token
      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData).toHaveProperty('token');
      expect(responseData.token).toBe(mockToken);

      // ✓ Debe retornar información del usuario
      expect(responseData).toHaveProperty('user');
      expect(responseData.user).toHaveProperty('id');
      expect(responseData.user.email).toBe(testData.validLoginCredentials.email);

      // ✓ jwt.sign debe haber sido llamado con el usuario como payload
      expect(jwt.sign).toHaveBeenCalled();
      const jwtPayload = jwt.sign.mock.calls[0][0];
      expect(jwtPayload).toHaveProperty('id', mockUser.id);
      expect(jwtPayload).toHaveProperty('email', mockUser.email);

      // ✓ Contraseña NO debe estar en la respuesta
      expect(responseData.user).not.toHaveProperty('password_hash');
    });
  });

  // ============================================================
  // TEST 4: Validación de Inputs (Campos Faltantes)
  // ============================================================
  describe('login() - Validación de Inputs', () => {
    it('Debe retornar 400 Bad Request si falta email', async () => {
      // ======== ARRANGE ========
      const req = {
        body: {
          password: 'AnyPassword123!',
          // ❌ Falta email
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // ======== ACT ========
      await authController.login(req, res);

      // ======== ASSERT ========
      // ✓ Status 400
      expect(res.status).toHaveBeenCalledWith(400);

      // ✓ No debe consultar la BD
      expect(pool.query).not.toHaveBeenCalled();

      // ✓ No debe generar token
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('Debe retornar 400 Bad Request si falta password', async () => {
      // ======== ARRANGE ========
      const req = {
        body: {
          email: 'test@uta.edu.ec',
          // ❌ Falta password
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // ======== ACT ========
      await authController.login(req, res);

      // ======== ASSERT ========
      expect(res.status).toHaveBeenCalledWith(400);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TEST 5: Manejo de Errores
  // ============================================================
  describe('login() - Manejo de Errores', () => {
    it('Debe retornar 500 Internal Server Error si la BD falla', async () => {
      // ======== ARRANGE ========
      const req = {
        body: testData.validLoginCredentials,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mockear error en BD
      pool.query.mockRejectedValueOnce(
        new Error('Connection refused - DB error')
      );

      // ======== ACT ========
      await authController.login(req, res);

      // ======== ASSERT ========
      // ✓ Status debe ser 500
      expect(res.status).toHaveBeenCalledWith(500);

      // ✓ Respuesta debe contener error
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );

      // ✓ No debe generar token en caso de error
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('Debe manejar errores en bcrypt.compare gracefully', async () => {
      // ======== ARRANGE ========
      const req = {
        body: testData.validLoginCredentials,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockUser = {
        id: 1,
        nombre: 'Juan Pérez',
        email: testData.validLoginCredentials.email,
        password_hash: '$2a$10$hashedPasswordExample',
        rol: 'usuario',
        activo: true,
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Mockear error en bcrypt
      bcrypt.compare.mockRejectedValueOnce(new Error('Bcrypt error'));

      // ======== ACT ========
      await authController.login(req, res);

      // ======== ASSERT ========
      // Debe retornar un error (status 500)
      expect(res.status).toHaveBeenCalledWith(500);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TEST 6: Verificar que el JWT se genera con la configuración correcta
  // ============================================================
  describe('login() - JWT Configuration', () => {
    it('JWT debe ser generado con expiración correcta', async () => {
      // ======== ARRANGE ========
      const req = {
        body: testData.validLoginCredentials,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockUser = {
        id: 1,
        nombre: 'Juan Pérez',
        email: testData.validLoginCredentials.email,
        password_hash: '$2a$10$hashedPasswordExample',
        rol: 'usuario',
        activo: true,
      };

      pool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockReturnValue('mock-token');

      // ======== ACT ========
      await authController.login(req, res);

      // ======== ASSERT ========
      // ✓ jwt.sign debe haber sido llamado con 3 argumentos:
      // 1. payload (objeto con datos del usuario)
      // 2. secret (clave secreta)
      // 3. options (expiración, etc.)
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          expiresIn: expect.any(String), // ej: '24h'
        })
      );
    });
  });
  // ============================================================
  // TEST: Registro de Usuario (register)
  // ============================================================
  describe('register()', () => {
    const validRegisterData = {
      nombre: 'Nuevo Estudiante',
      email: 'nuevo@uta.edu.ec',
      password: 'password123'
    };

    it('Debe retornar 400 si faltan campos', async () => {
      const req = { body: { nombre: 'Test', email: 'test@uta.edu.ec' } }; // Falta password
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('Debe retornar 403 si el correo no es @uta.edu.ec', async () => {
      const req = { body: { ...validRegisterData, email: 'invalido@gmail.com' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('Debe retornar 409 si el correo ya existe en usuarios', async () => {
      const req = { body: validRegisterData };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Simula que existe

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(emailService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('Debe registrar exitosamente, guardar en verificaciones_pendientes y enviar email', async () => {
      const req = { body: validRegisterData };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      // 1. SELECT usuarios (vacío)
      pool.query.mockResolvedValueOnce({ rows: [] });
      // 2. bcrypt
      bcrypt.genSalt.mockResolvedValueOnce('salt');
      bcrypt.hash.mockResolvedValueOnce('hashedPassword');
      // 3. INSERT verificaciones_pendientes
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await authController.register(req, res);

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(emailService.sendVerificationCode).toHaveBeenCalledWith(
        'nuevo@uta.edu.ec', 
        expect.any(String), 
        'Nuevo Estudiante'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================
  // TEST: Verificar Registro (verifyRegister)
  // ============================================================
  describe('verifyRegister()', () => {
    it('Debe retornar 400 si falta email o código', async () => {
      const req = { body: { email: 'test@uta.edu.ec' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await authController.verifyRegister(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 404 si no hay registro pendiente', async () => {
      const req = { body: { email: 'test@uta.edu.ec', code: '123456' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await authController.verifyRegister(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe retornar 400 si el código expiró (>15 min)', async () => {
      const req = { body: { email: 'test@uta.edu.ec', code: '123456' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      // Simular fecha de hace 20 minutos
      const fechaAntigua = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      pool.query.mockResolvedValueOnce({ 
        rows: [{ codigo: '123456', datos: {}, creado_en: fechaAntigua }] 
      });

      await authController.verifyRegister(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/expirado/i) }));
    });

    it('Debe retornar 400 si el código no coincide', async () => {
      const req = { body: { email: 'test@uta.edu.ec', code: '123456' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ 
        rows: [{ codigo: '654321', datos: {}, creado_en: new Date().toISOString() }] 
      });

      await authController.verifyRegister(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/incorrecto/i) }));
    });

    it('Debe verificar exitosamente, insertar usuario y eliminar pendiente', async () => {
      const req = { body: { email: 'test@uta.edu.ec', code: '123456' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      const datosMock = { nombre: 'Test', password_hash: 'hash123' };
      
      // 1. SELECT verificaciones_pendientes
      pool.query.mockResolvedValueOnce({ 
        rows: [{ codigo: '123456', datos: datosMock, creado_en: new Date().toISOString() }] 
      });
      // 2. INSERT usuarios
      pool.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, nombre: 'Test', email: 'test@uta.edu.ec', rol: 'usuario' }] 
      });
      // 3. DELETE verificaciones_pendientes
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await authController.verifyRegister(req, res);

      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String),
        usuario: expect.any(Object)
      }));
    });
  });

  // ============================================================
  // TEST: Recuperar Contraseña (forgotPassword)
  // ============================================================
  describe('forgotPassword()', () => {
    it('Debe retornar 400 si no se envía email', async () => {
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await authController.forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 404 si el correo no existe en la BD', async () => {
      const req = { body: { email: 'noexiste@uta.edu.ec' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await authController.forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe generar código, guardarlo y enviar email exitosamente', async () => {
      const req = { body: { email: 'existe@uta.edu.ec' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      // 1. SELECT usuario
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Usuario' }] });
      // 2. INSERT/UPDATE recuperaciones
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      
      // Mockear servicio de email
      const emailServiceMock = require('../../src/services/emailService');
      emailServiceMock.sendPasswordRecoveryCode = jest.fn().mockResolvedValueOnce(true);

      await authController.forgotPassword(req, res);

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(emailServiceMock.sendPasswordRecoveryCode).toHaveBeenCalledWith('existe@uta.edu.ec', expect.any(String), 'Usuario');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================
  // TEST: Restablecer Contraseña (resetPassword)
  // ============================================================
  describe('resetPassword()', () => {
    it('Debe retornar 400 si faltan campos', async () => {
      const req = { body: { email: 'test@uta.edu.ec', code: '123456' } }; // Falta newPassword
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await authController.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 400 si la contraseña es menor a 6 caracteres', async () => {
      const req = { body: { email: 'test@uta.edu.ec', code: '123456', newPassword: '123' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await authController.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 404 si no hay código pendiente para el correo', async () => {
      const req = { body: { email: 'test@uta.edu.ec', code: '123456', newPassword: 'password' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await authController.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe cambiar la contraseña exitosamente', async () => {
      const req = { body: { email: 'test@uta.edu.ec', code: '123456', newPassword: 'newpassword123' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      // 1. SELECT recuperaciones_contrasena
      pool.query.mockResolvedValueOnce({ 
        rows: [{ codigo: '123456', creado_en: new Date().toISOString() }] 
      });
      // 2. bcrypt hash
      bcrypt.genSalt.mockResolvedValueOnce('salt');
      bcrypt.hash.mockResolvedValueOnce('hashedNewPassword');
      // 3. UPDATE usuarios
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      // 4. DELETE recuperaciones_contrasena
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await authController.resetPassword(req, res);

      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 'salt');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

});
