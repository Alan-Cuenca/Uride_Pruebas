jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const pool = require('../../src/config/database');
const reportController = require('../../src/controllers/reportController');

describe('🚩 Report Controller - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReport()', () => {
    it('Debe retornar 400 si falta el motivo', async () => {
      const req = { user: { id: 1 }, body: { denunciado_id: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await reportController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/motivo/i) }));
    });

    it('Debe retornar 400 si se auto-reporta', async () => {
      const req = { user: { id: 1 }, body: { denunciado_id: 1, motivo: 'Mal comportamiento' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await reportController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/auto-reportarte/i) }));
    });

    it('Debe retornar 201 y crear el reporte exitosamente sin archivo', async () => {
      const req = { user: { id: 1 }, body: { denunciado_id: 2, motivo: 'Conducía rápido' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ id: 10, estado: 'ABIERTO' }] }); // Insert reporte
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Log evento

      await reportController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(pool.query).toHaveBeenCalledTimes(2);
      
      const insertCall = pool.query.mock.calls[0];
      expect(insertCall[1][3]).toBeNull(); // evidenciaUrl es null
    });

    it('Debe retornar 201 y crear el reporte exitosamente con archivo', async () => {
      const req = { 
        user: { id: 1 }, 
        body: { denunciado_id: 2, motivo: 'Conducía rápido' },
        file: { filename: 'captura.png' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ id: 10, estado: 'ABIERTO' }] }); 
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); 

      await reportController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const insertCall = pool.query.mock.calls[0];
      expect(insertCall[1][3]).toBe('/uploads/evidencias/captura.png'); // evidenciaUrl
    });

    it('Debe retornar 500 si la base de datos falla', async () => {
      const req = { user: { id: 1 }, body: { denunciado_id: 2, motivo: 'Test' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB Error'));

      await reportController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getInfracciones()', () => {
    it('Debe retornar 200 y las infracciones', async () => {
      const req = { user: { id: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, motivo: 'Test' }] });

      await reportController.getInfracciones(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ infracciones: expect.any(Array) }));
    });

    it('Debe retornar 500 si falla', async () => {
      const req = { user: { id: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB Error'));

      await reportController.getInfracciones(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

});
