const pool = require('../../src/config/database');
const requestController = require('../../src/controllers/requestController');

jest.mock('../../src/config/database', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    query: jest.fn(),
    connect: jest.fn(() => mockClient),
  };
});

describe('🎟️ Request Controller - Unit Tests', () => {
  
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = pool.connect();
    // clearAllMocks cleans the mockClient calls as well because it's returned by connect()
  });

  // ============================================================
  // TEST: createRequest
  // ============================================================
  describe('createRequest()', () => {
    it('Debe retornar 403 si el usuario está suspendido', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ activo: false }] });

      await requestController.createRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('Debe retornar 400 si el viaje no existe o está lleno', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ activo: true }] });
      pool.query.mockResolvedValueOnce({ rows: [] }); // Viaje no existe

      await requestController.createRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 400 si el pasajero es el mismo conductor', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ activo: true }] });
      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, cupos_disponibles: 3 }] });

      await requestController.createRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 409 si ya existe una solicitud', async () => {
      const req = { user: { id: 2 }, body: { viaje_id: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ activo: true }] });
      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, cupos_disponibles: 3 }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 55 }] }); // Solicitud ya existe

      await requestController.createRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('Debe crear la solicitud exitosamente', async () => {
      const req = { user: { id: 2 }, body: { viaje_id: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ activo: true }] });
      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, cupos_disponibles: 3 }] });
      pool.query.mockResolvedValueOnce({ rows: [] }); // No hay solicitud previa
      pool.query.mockResolvedValueOnce({ rows: [{ id: 55, estado: 'PENDIENTE' }] }); // Insert

      await requestController.createRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(pool.query).toHaveBeenCalledTimes(4);
    });
  });

  // ============================================================
  // TEST: updateRequestStatus (Transacciones)
  // ============================================================
  describe('updateRequestStatus()', () => {
    it('Debe retornar 400 si el estado es inválido', async () => {
      const req = { user: { id: 1 }, params: { id: 55 }, body: { estado: 'CUALQUIERA' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await requestController.updateRequestStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe rechazar la solicitud si no es el conductor del viaje (ROLLBACK)', async () => {
      const req = { user: { id: 2 }, params: { id: 55 }, body: { estado: 'ACEPTADO' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ status_actual: 'PENDIENTE', conductor_id: 1 }] }); // FOR UPDATE
      mockClient.query.mockResolvedValueOnce(); // ROLLBACK

      await requestController.updateRequestStatus(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('Debe aceptar la solicitud, restar cupos y hacer COMMIT', async () => {
      const req = { user: { id: 1 }, params: { id: 55 }, body: { estado: 'ACEPTADO' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ status_actual: 'PENDIENTE', conductor_id: 1, viaje_id: 10, cupos_disponibles: 3 }] 
      }); // FOR UPDATE
      mockClient.query.mockResolvedValueOnce(); // UPDATE cupos
      mockClient.query.mockResolvedValueOnce(); // INSERT log
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 55, estado: 'ACEPTADO' }] }); // UPDATE solicitud
      mockClient.query.mockResolvedValueOnce(); // COMMIT

      await requestController.updateRequestStatus(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('Debe retornar 500 y hacer ROLLBACK si hay un error en BD', async () => {
      const req = { user: { id: 1 }, params: { id: 55 }, body: { estado: 'ACEPTADO' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

      await requestController.updateRequestStatus(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // ============================================================
  // TEST: Listados (getDriverRequests, getPassengerRequests, etc)
  // ============================================================
  describe('Listados de Solicitudes', () => {
    it('getDriverRequests debe retornar 200', async () => {
      const req = { user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      pool.query.mockResolvedValueOnce({ rows: [] });

      await requestController.getDriverRequests(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getPassengerRequests debe retornar 200', async () => {
      const req = { user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      pool.query.mockResolvedValueOnce({ rows: [] });

      await requestController.getPassengerRequests(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getPassengerToRate debe retornar 200', async () => {
      const req = { user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      pool.query.mockResolvedValueOnce({ rows: [] });

      await requestController.getPassengerToRate(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getDriverToRate debe retornar 200', async () => {
      const req = { user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      pool.query.mockResolvedValueOnce({ rows: [] });

      await requestController.getDriverToRate(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================
  // TEST: cancelRequest (Transacciones)
  // ============================================================
  describe('cancelRequest()', () => {
    it('Debe cancelar una solicitud pendiente exitosamente sin devolver cupo', async () => {
      const req = { user: { id: 2 }, params: { id: 55 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 55, pasajero_id: 2, estado: 'PENDIENTE', viaje_estado: 'ACTIVO' }] 
      }); // FOR UPDATE
      mockClient.query.mockResolvedValueOnce(); // DELETE
      mockClient.query.mockResolvedValueOnce(); // COMMIT

      await requestController.cancelRequest(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe cancelar una solicitud aceptada y devolver cupo', async () => {
      const req = { user: { id: 2 }, params: { id: 55 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 55, pasajero_id: 2, estado: 'ACEPTADO', viaje_id: 10, viaje_estado: 'ACTIVO' }] 
      }); // FOR UPDATE
      mockClient.query.mockResolvedValueOnce(); // UPDATE cupos
      mockClient.query.mockResolvedValueOnce(); // INSERT log
      mockClient.query.mockResolvedValueOnce(); // DELETE
      mockClient.query.mockResolvedValueOnce(); // COMMIT

      await requestController.cancelRequest(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe retornar 400 si el viaje ya inició', async () => {
      const req = { user: { id: 2 }, params: { id: 55 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 55, pasajero_id: 2, viaje_estado: 'EN_CURSO' }] 
      }); // FOR UPDATE

      await requestController.cancelRequest(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

});
