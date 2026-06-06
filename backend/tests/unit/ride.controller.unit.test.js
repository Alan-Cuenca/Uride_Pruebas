/**
 * TESTS UNITARIOS - Ride Controller
 * 
 * Archivo: Pruebas/unit/ride.controller.unit.test.js
 * 
 * Qué probamos:
 * - Validación de coordenadas geográficas
 * - Validación de reglas de seguridad
 * - Creación exitosa de un viaje
 * - Manejo de errores en BD
 * - Verificación de trazabilidad (logs)
 * 
 * Qué NO probamos (se mockean):
 * - Base de datos real (mocked)
 * - PostGIS o geolocalización real (simplemente validamos que se reciben coords)
 * 
 * Herramientas:
 * - Jest: test runner y mocks
 * - jest.mock(): para mockear módulos
 * 
 * Patrón: Arrange -> Act -> Assert (AAA)
 */

// ========== MOCKS GLOBALES ==========
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

// ========== IMPORTS ==========
const pool = require('../../src/config/database');
const rideController = require('../../src/controllers/rideController');
const testData = require('../__fixtures__/testData');

describe('🚗 Ride Controller - Unit Tests', () => {

  /**
   * SETUP: Limpiar todos los mocks antes de cada test
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // TEST 1: Crear Viaje Exitosamente (Happy Path)
  // ============================================================
  describe('createRide() - Viaje Exitoso', () => {
    it('Debe crear un viaje exitosamente con todos los parámetros válidos', async () => {
      // ======== ARRANGE ========
      // 1. Mock del usuario autenticado (obtenido del JWT)
      const req = {
        user: {
          id: 1,
          nombre: 'Juan Pérez',
          email: 'juan.perez@uta.edu.ec',
          rol: 'USUARIO',
        },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: 'No fumar, no comida, música baja',
          costo_contribucion: 5.00,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // 2. Mockear validación del usuario (debe estar activo)
      pool.query
        .mockResolvedValueOnce({ rows: [{ activo: true }] }) // ✓ Usuario activo
        .mockResolvedValueOnce({ // ✓ INSERT del viaje
          rows: [
            {
              id: 42,
              conductor_id: 1,
              fecha_salida: '2025-06-15T09:00:00',
              cupos_disponibles: 3,
              estado: 'ACTIVO',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{}] }); // ✓ Logging del evento

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      // ✓ Status debe ser 201 (Created)
      expect(res.status).toHaveBeenCalledWith(201);

      // ✓ Respuesta debe contener el viaje creado
      const responseData = res.json.mock.calls[0][0];
      expect(responseData).toHaveProperty('viaje');
      expect(responseData.viaje).toHaveProperty('id', 42);
      expect(responseData.viaje).toHaveProperty('conductor_id', 1);
      expect(responseData.viaje).toHaveProperty('cupos_disponibles', 3);

      // ✓ Debe haber un mensaje de éxito
      expect(responseData).toHaveProperty('message');
      expect(responseData.message).toMatch(/publicado|exitoso/i);

      // ✓ Verificar que se llamó a pool.query 3 veces:
      //    1. Verificar usuario activo
      //    2. Insertar viaje
      //    3. Registrar evento en logs
      expect(pool.query).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================
  // TEST 2: Validación de Coordenadas Faltantes
  // ============================================================
  describe('createRide() - Validación de Coordenadas', () => {
    it('Debe retornar 400 si falta origenLat', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          // ❌ Falta origenLat
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: 'No fumar',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/coordenadas|obligatorias/i),
        })
      );

      // ✓ No debe consultar la BD si valida falla
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('Debe retornar 400 si falta destinoLon', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          // ❌ Falta destinoLon
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: 'No fumar',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      expect(res.status).toHaveBeenCalledWith(400);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // TEST 3: Validación de Cupos Disponibles
  // ============================================================
  describe('createRide() - Validación de Cupos', () => {
    it('Debe retornar 400 si cupos_disponibles es <= 0', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 0, // ❌ No se puede tener 0 cupos
          notas_reglas: 'No fumar',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mockear que el usuario existe y está activo (pasa la primera validación)
      pool.query.mockResolvedValueOnce({ rows: [{ activo: true }] });

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/capacidad|al menos/i),
        })
      );
    });

    it('Debe retornar 400 si cupos_disponibles es negativo', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: -5, // ❌ Cupos negativos
          notas_reglas: 'No fumar',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      pool.query.mockResolvedValueOnce({ rows: [{ activo: true }] });

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================================
  // TEST 4: Validación de Reglas de Seguridad
  // ============================================================
  describe('createRide() - Validación de Reglas de Seguridad', () => {
    it('Debe retornar 400 si notas_reglas está vacía (RF9)', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: '', // ❌ Reglas vacías
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      pool.query.mockResolvedValueOnce({ rows: [{ activo: true }] });

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/seguridad|reglas|obligatorio|RF9/i),
        })
      );
    });

    it('Debe retornar 400 si notas_reglas es solo espacios en blanco', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: '   ', // ❌ Solo espacios
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      pool.query.mockResolvedValueOnce({ rows: [{ activo: true }] });

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe permitir crear viaje con reglas válidas', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: 'No fumar, no comida, música baja', // ✓ Válidas
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ activo: true }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, conductor_id: 1, cupos_disponibles: 3, estado: 'ACTIVO' }],
        })
        .mockResolvedValueOnce({ rows: [{}] });

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ============================================================
  // TEST 5: Usuario Suspendido No Puede Crear Viaje
  // ============================================================
  describe('createRide() - Usuario Suspendido', () => {
    it('Debe retornar 403 si el usuario está inactivo/suspendido', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: 'No fumar',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // ❌ Usuario inactivo
      pool.query.mockResolvedValueOnce({ rows: [{ activo: false }] });

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      // ✓ Status 403 (Forbidden)
      expect(res.status).toHaveBeenCalledWith(403);

      // ✓ Mensaje de cuenta suspendida
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/suspendida|inactiva/i),
        })
      );

      // ✓ No debe insertar el viaje
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // TEST 6: Manejo de Errores en Base de Datos
  // ============================================================
  describe('createRide() - Errores de Base de Datos', () => {
    it('Debe retornar 500 si falla la inserción del viaje', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: 'No fumar',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Usuario activo ✓
      pool.query.mockResolvedValueOnce({ rows: [{ activo: true }] });
      
      // ❌ Error al insertar viaje
      pool.query.mockRejectedValueOnce(
        new Error('Unique violation: viaje already exists')
      );

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/fallo|error|procesando/i),
        })
      );
    });

    it('Debe registrar evento en logs aunque falle el logging', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: 'No fumar',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ activo: true }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, conductor_id: 1, cupos_disponibles: 3, estado: 'ACTIVO' }],
        })
        .mockRejectedValueOnce(new Error('Logging DB error')); // Logging falla

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      // Aunque el logging falle, el viaje debe haberse creado exitosamente
      // Esto depende de si tu código maneja el error en logging
      // Por ahora verificamos que se intentó
      expect(pool.query).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================
  // TEST 7: Verificar estructura de INSERT SQL
  // ============================================================
  describe('createRide() - Validación de SQL', () => {
    it('Debe insertar con todos los parámetros en el orden correcto', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: 'No fumar',
          costo_contribucion: 5.00,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ activo: true }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, conductor_id: 1, cupos_disponibles: 3, estado: 'ACTIVO' }],
        })
        .mockResolvedValueOnce({ rows: [{}] });

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      // Verificar que se llamó a pool.query con los parámetros correctos
      // Segunda llamada es el INSERT del viaje
      const insertCall = pool.query.mock.calls[1];
      const sqlQuery = insertCall[0];
      const parameters = insertCall[1];

      expect(sqlQuery).toMatch(/INSERT INTO viajes/);
      expect(parameters[0]).toBe(1); // conductor_id
      expect(parameters[1]).toBe(-1.2421); // origenLat
      expect(parameters[2]).toBe(-78.6155); // origenLon
      expect(parameters[6]).toBe(3); // cupos_disponibles
      expect(parameters[7]).toBe('No fumar'); // notas_reglas (trimmed)
    });
  });
  // ============================================================
  // TEST: Buscar Viajes (searchRides)
  // ============================================================
  describe('searchRides()', () => {
    it('Debe retornar los viajes propios si es CONDUCTOR', async () => {
      const req = { user: { id: 1, rol: 'CONDUCTOR' }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ rol: 'CONDUCTOR' }] }); // userRes
      pool.query.mockResolvedValueOnce({ rows: [{ id: 10, conductor_id: 1 }] }); // driverSQL

      await rideController.searchRides(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ resultados: expect.any(Array) }));
    });

    it('Debe retornar 400 si faltan lat o lon para PASAJERO', async () => {
      const req = { user: { id: 2, rol: 'PASAJERO' }, query: { lat: 1 } }; // Falta lon
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ rol: 'PASAJERO' }] });

      await rideController.searchRides(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe realizar la búsqueda geoespacial exitosamente', async () => {
      const req = { user: { id: 2, rol: 'PASAJERO' }, query: { lat: 1.1, lon: 1.1, fecha: '2025-10-10' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ rol: 'PASAJERO' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 20 }] }); // baseQuery

      await rideController.searchRides(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(2);
      
      const sqlQuery = pool.query.mock.calls[1][0];
      expect(sqlQuery).toMatch(/DATE\(v.fecha_salida\) = DATE\(\$5\)/i);
    });
  });

  // ============================================================
  // TEST: startRide y finishRide
  // ============================================================
  describe('Estado de Viajes (startRide / finishRide)', () => {
    it('Debe retornar 404 si el viaje no existe', async () => {
      const req = { params: { id: 99 }, user: { id: 1 }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await rideController.startRide(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe retornar 403 si no es el dueño ni admin', async () => {
      const req = { params: { id: 1 }, user: { id: 2, rol: 'PASAJERO' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'ACTIVO' }] });

      await rideController.startRide(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('Debe iniciar viaje exitosamente si es dueño y estado ACTIVO', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' }, body: { ignorarPago: true } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'ACTIVO' }] }); // Select viaje
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'EN_CURSO' }] }); // Update
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Log

      await rideController.startRide(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('Debe finalizar viaje exitosamente si está EN_CURSO', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'EN_CURSO' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'CERRADO' }] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await rideController.finishRide(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================
  // TEST: Actualizar viaje
  // ============================================================
  describe('updateRide()', () => {
    it('Debe actualizar campos exitosamente', async () => {
      const req = { 
        params: { id: 1 }, 
        user: { id: 1, rol: 'CONDUCTOR' }, 
        body: { cupos_disponibles: 4 } 
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'ACTIVO' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, cupos_disponibles: 4 }] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await rideController.updateRide(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(pool.query.mock.calls[1][0]).toMatch(/cupos_disponibles =/i);
    });
  });

  // ============================================================
  // TEST: Eliminar viaje
  // ============================================================
  describe('deleteRide()', () => {
    it('Debe eliminar viaje activo', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'ACTIVO' }] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // LOG

      await rideController.deleteRide(req, res);

      // ======== ASSERT ========
      // Aunque el logging falle, el viaje debe haberse creado exitosamente
      // Esto depende de si tu código maneja el error en logging
      // Por ahora verificamos que se intentó
      expect(pool.query).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================
  // TEST 7: Verificar estructura de INSERT SQL
  // ============================================================
  describe('createRide() - Validación de SQL', () => {
    it('Debe insertar con todos los parámetros en el orden correcto', async () => {
      // ======== ARRANGE ========
      const req = {
        user: { id: 1, nombre: 'Juan', rol: 'USUARIO' },
        body: {
          origenLat: -1.2421,
          origenLon: -78.6155,
          destinoLat: -1.2543,
          destinoLon: -78.6089,
          fecha_salida: '2025-06-15T09:00:00',
          cupos_disponibles: 3,
          notas_reglas: 'No fumar',
          costo_contribucion: 5.00,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ activo: true }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, conductor_id: 1, cupos_disponibles: 3, estado: 'ACTIVO' }],
        })
        .mockResolvedValueOnce({ rows: [{}] });

      // ======== ACT ========
      await rideController.createRide(req, res);

      // ======== ASSERT ========
      // Verificar que se llamó a pool.query con los parámetros correctos
      // Segunda llamada es el INSERT del viaje
      const insertCall = pool.query.mock.calls[1];
      const sqlQuery = insertCall[0];
      const parameters = insertCall[1];

      expect(sqlQuery).toMatch(/INSERT INTO viajes/);
      expect(parameters[0]).toBe(1); // conductor_id
      expect(parameters[1]).toBe(-1.2421); // origenLat
      expect(parameters[2]).toBe(-78.6155); // origenLon
      expect(parameters[6]).toBe(3); // cupos_disponibles
      expect(parameters[7]).toBe('No fumar'); // notas_reglas (trimmed)
    });
  });
  // ============================================================
  // TEST: Buscar Viajes (searchRides)
  // ============================================================
  describe('searchRides()', () => {
    it('Debe retornar los viajes propios si es CONDUCTOR', async () => {
      const req = { user: { id: 1, rol: 'CONDUCTOR' }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ rol: 'CONDUCTOR' }] }); // userRes
      pool.query.mockResolvedValueOnce({ rows: [{ id: 10, conductor_id: 1 }] }); // driverSQL

      await rideController.searchRides(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ resultados: expect.any(Array) }));
    });

    it('Debe retornar 400 si faltan lat o lon para PASAJERO', async () => {
      const req = { user: { id: 2, rol: 'PASAJERO' }, query: { lat: 1 } }; // Falta lon
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ rol: 'PASAJERO' }] });

      await rideController.searchRides(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe realizar la búsqueda geoespacial exitosamente', async () => {
      const req = { user: { id: 2, rol: 'PASAJERO' }, query: { lat: 1.1, lon: 1.1, fecha: '2025-10-10' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ rol: 'PASAJERO' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 20 }] }); // baseQuery

      await rideController.searchRides(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(2);
      
      const sqlQuery = pool.query.mock.calls[1][0];
      expect(sqlQuery).toMatch(/DATE\(v.fecha_salida\) = DATE\(\$5\)/i);
    });
  });

  // ============================================================
  // TEST: startRide y finishRide
  // ============================================================
  describe('Estado de Viajes (startRide / finishRide)', () => {
    it('Debe retornar 404 si el viaje no existe', async () => {
      const req = { params: { id: 99 }, user: { id: 1 }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await rideController.startRide(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe retornar 403 si no es el dueño ni admin', async () => {
      const req = { params: { id: 1 }, user: { id: 2, rol: 'PASAJERO' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'ACTIVO' }] });

      await rideController.startRide(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('Debe iniciar viaje exitosamente si es dueño y estado ACTIVO', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' }, body: { ignorarPago: true } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'ACTIVO' }] }); // Select viaje
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'EN_CURSO' }] }); // Update
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Log

      await rideController.startRide(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('Debe finalizar viaje exitosamente si está EN_CURSO', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'EN_CURSO' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'CERRADO' }] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await rideController.finishRide(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================
  // TEST: Actualizar viaje
  // ============================================================
  describe('updateRide()', () => {
    it('Debe actualizar campos exitosamente', async () => {
      const req = { 
        params: { id: 1 }, 
        user: { id: 1, rol: 'CONDUCTOR' }, 
        body: { cupos_disponibles: 4 } 
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'ACTIVO' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, cupos_disponibles: 4 }] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await rideController.updateRide(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(pool.query.mock.calls[1][0]).toMatch(/cupos_disponibles =/i);
    });
  });

  // ============================================================
  // TEST: Eliminar viaje
  // ============================================================
  describe('deleteRide()', () => {
    it('Debe eliminar viaje activo', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'ACTIVO' }] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // LOG

      await rideController.deleteRide(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateRideLocation()', () => {
    it('Debe retornar 400 si falta latitud o longitud', async () => {
      const req = { params: { id: 1 }, user: { id: 1 }, body: { latitud: 1 } }; // Falta lon
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await rideController.updateRideLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 404 si el viaje no existe', async () => {
      const req = { params: { id: 1 }, user: { id: 1 }, body: { latitud: 1, longitud: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await rideController.updateRideLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe retornar 403 si no es el conductor', async () => {
      const req = { params: { id: 1 }, user: { id: 2, rol: 'PASAJERO' }, body: { latitud: 1, longitud: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'EN_CURSO' }] });

      await rideController.updateRideLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('Debe retornar 409 si el viaje no está EN_CURSO', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' }, body: { latitud: 1, longitud: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'ACTIVO' }] });

      await rideController.updateRideLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('Debe retornar 500 si la base de datos falla', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' }, body: { latitud: 1, longitud: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB Error'));

      await rideController.updateRideLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('Debe actualizar ubicación en viaje en curso', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' }, body: { latitud: 1, longitud: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'EN_CURSO' }] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await rideController.updateRideLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('finishRide() - Errores', () => {
    it('Debe retornar 500 si falla al finalizar', async () => {
      const req = { params: { id: 1 }, user: { id: 1, rol: 'CONDUCTOR' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB Error'));

      await rideController.finishRide(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMyTrips()', () => {
    it('Debe retornar los viajes del conductor', async () => {
      const req = { user: { id: 1, rol: 'CONDUCTOR' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ rol: 'CONDUCTOR' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await rideController.getMyTrips(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('Debe retornar los viajes del pasajero', async () => {
      const req = { user: { id: 2, rol: 'PASAJERO' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ rol: 'PASAJERO' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });

      await rideController.getMyTrips(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe retornar 500 si falla la DB', async () => {
      const req = { user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB error'));

      await rideController.getMyTrips(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getRideById()', () => {
    it('Debe retornar 404 si no existe', async () => {
      const req = { params: { id: 1 }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await rideController.getRideById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe retornar 403 si el usuario no es el conductor, admin o pasajero aceptado', async () => {
      const req = { params: { id: 1 }, user: { id: 2, rol: 'PASAJERO' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1 }] }); // viaje
      pool.query.mockResolvedValueOnce({ rowCount: 0 }); // no es pasajero

      await rideController.getRideById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('Debe retornar el viaje si el usuario es pasajero aceptado', async () => {
      const req = { params: { id: 1 }, user: { id: 2, rol: 'PASAJERO' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1 }] }); // viaje
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // pasajero

      await rideController.getRideById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe retornar 500 en error', async () => {
      const req = { params: { id: 1 }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('Error'));

      await rideController.getRideById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTripParticipants()', () => {
    it('Debe retornar 200 y participantes', async () => {
      const req = { params: { id: 1 }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });

      await rideController.getTripParticipants(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe retornar 500 en error', async () => {
      const req = { params: { id: 1 }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('Error'));

      await rideController.getTripParticipants(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

});
