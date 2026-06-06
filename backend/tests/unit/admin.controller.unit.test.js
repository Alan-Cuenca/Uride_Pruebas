jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const pool = require('../../src/config/database');
const adminController = require('../../src/controllers/adminController');

describe('🛡️ Admin Controller - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // TEST: Obtener Reportes (getAllReports)
  // ============================================================
  describe('getAllReports()', () => {
    it('Debe retornar 200 y una lista de reportes', async () => {
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      const mockReportes = [
        { id: 1, motivo: 'Falta respeto', estado: 'ABIERTO', autor_denuncia: 'A', persona_denunciada: 'B' }
      ];
      pool.query.mockResolvedValueOnce({ rows: mockReportes });

      await adminController.getAllReports(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ reportes: mockReportes }));
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('Debe retornar 500 si la base de datos falla', async () => {
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB Error'));

      await adminController.getAllReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
  });

  // ============================================================
  // TEST: Suspender Usuario (suspendUser)
  // ============================================================
  describe('suspendUser()', () => {
    it('Debe retornar 404 si el usuario no existe', async () => {
      const req = { params: { usuario_id: 999 }, user: { id: 1 } }; // admin_id = 1
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await adminController.suspendUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(pool.query).toHaveBeenCalledTimes(1); // UPDATE
    });

    it('Debe retornar 200, suspender usuario e insertar log de evento', async () => {
      const req = { params: { usuario_id: 2 }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      // 1. UPDATE usuarios
      pool.query.mockResolvedValueOnce({ rows: [{ id: 2, nombre: 'Suspendido', activo: false }] });
      // 2. INSERT log
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await adminController.suspendUser(req, res);

      expect(pool.query).toHaveBeenCalledTimes(2);
      
      const sqlLog = pool.query.mock.calls[1][0];
      const sqlLogValues = pool.query.mock.calls[1][1];
      expect(sqlLog).toMatch(/INSERT INTO logs_eventos/i);
      expect(sqlLogValues[0]).toBe(1); // admin_id
      expect(sqlLogValues[1]).toBe('SUSPENSION_ADMINISTRATIVA');
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String),
        data: expect.objectContaining({ activo: false })
      }));
    });

    it('Debe retornar 500 si falla la inserción de log u update', async () => {
      const req = { params: { usuario_id: 2 }, user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB Error'));

      await adminController.suspendUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================================
  // TEST: Resolver Reporte (resolveReport)
  // ============================================================
  describe('resolveReport()', () => {
    it('Debe resolver el reporte correctamente (con resolución)', async () => {
      const req = { 
        params: { reporte_id: 10 },
        body: { nuevo_estado: 'RESUELTO', resolucion_admin: 'El usuario ha sido advertido.' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      const mockReport = { id: 10, estado: 'RESUELTO', resolucion_admin: 'El usuario ha sido advertido.' };
      pool.query.mockResolvedValueOnce({ rows: [mockReport] });

      await adminController.resolveReport(req, res);

      expect(pool.query).toHaveBeenCalledTimes(1);
      
      const sqlCall = pool.query.mock.calls[0][0];
      const sqlValues = pool.query.mock.calls[0][1];
      expect(sqlCall).toMatch(/UPDATE reportes SET/i);
      expect(sqlValues).toEqual(['RESUELTO', 'El usuario ha sido advertido.', 10]);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ticket: mockReport }));
    });

    it('Debe resolver el reporte correctamente (sin resolución explicit)', async () => {
      const req = { 
        params: { reporte_id: 10 },
        body: { nuevo_estado: 'DESESTIMADO' } // Sin resolucion_admin
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ id: 10, estado: 'DESESTIMADO', resolucion_admin: null }] });

      await adminController.resolveReport(req, res);

      const sqlValues = pool.query.mock.calls[0][1];
      expect(sqlValues[1]).toBeNull(); // resolucion_admin || null
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe retornar 500 si falla la base de datos', async () => {
      const req = { 
        params: { reporte_id: 10 },
        body: { nuevo_estado: 'RESUELTO' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB Error'));

      await adminController.resolveReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

});
