jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const pool = require('../../src/config/database');
const userController = require('../../src/controllers/userController');

describe('👤 User Controller - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // TEST: Obtener Perfil (getProfile)
  // ============================================================
  describe('getProfile()', () => {
    it('Debe retornar 404 si el usuario no existe', async () => {
      const req = { user: { id: 999 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await userController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });

    it('Debe retornar 200 y el perfil si el usuario existe', async () => {
      const req = { user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      const mockPerfil = { id: 1, nombre: 'Estudiante', viajes_conductor: 5 };
      pool.query.mockResolvedValueOnce({ rows: [mockPerfil] });

      await userController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        perfil: mockPerfil,
        user: mockPerfil
      }));
    });

    it('Debe retornar 500 si hay error en BD', async () => {
      const req = { user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB Error'));

      await userController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================================
  // TEST: Actualizar Perfil (updateProfile)
  // ============================================================
  describe('updateProfile()', () => {
    it('Debe retornar 400 si no se envían campos para actualizar', async () => {
      const req = { user: { id: 1 }, body: {}, file: null };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/campos/i) }));
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('Debe actualizar el perfil correctamente con todos los campos (foto, coordenadas y rol)', async () => {
      const req = {
        user: { id: 1 },
        body: { carrera: 'Software', telefono: '0999999999', latitud: 1.1, longitud: -1.1, rol: 'CONDUCTOR' },
        file: { filename: 'avatar.jpg' }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      const mockPerfil = { id: 1, carrera: 'Software', rol: 'CONDUCTOR' };
      pool.query.mockResolvedValueOnce({ rows: [mockPerfil] });

      await userController.updateProfile(req, res);

      expect(pool.query).toHaveBeenCalledTimes(1);
      
      // Verifica que el query SQL haya concatenado correctamente los campos
      const sqlCall = pool.query.mock.calls[0][0];
      const sqlValues = pool.query.mock.calls[0][1];
      
      expect(sqlCall).toMatch(/carrera/i);
      expect(sqlCall).toMatch(/telefono/i);
      expect(sqlCall).toMatch(/foto_url/i);
      expect(sqlCall).toMatch(/zona_lat/i);
      expect(sqlCall).toMatch(/zona_lon/i);
      expect(sqlCall).toMatch(/rol/i);

      // El último parámetro de values debe ser el userId (1)
      expect(sqlValues[sqlValues.length - 1]).toBe(1);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String),
        perfil: mockPerfil
      }));
    });

    it('Debe ignorar el rol si el rol enviado es inválido y actualizar solo lo válido', async () => {
      const req = {
        user: { id: 1 },
        body: { carrera: 'Sistemas', rol: 'HACKER' }, // Rol no permitido
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, carrera: 'Sistemas' }] });

      await userController.updateProfile(req, res);

      expect(pool.query).toHaveBeenCalledTimes(1);
      const sqlCall = pool.query.mock.calls[0][0];
      
      // No debe contener 'rol' en el SQL update
      expect(sqlCall).not.toMatch(/rol =/i);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Debe retornar 500 si falla la base de datos', async () => {
      const req = { user: { id: 1 }, body: { carrera: 'Sistemas' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValueOnce(new Error('DB Error Update'));

      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

});
