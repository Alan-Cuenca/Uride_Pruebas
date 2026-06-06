const adminMiddleware = require('../../src/middlewares/adminMiddleware');

describe('🛡️ Admin Middleware - Unit Tests', () => {

  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  it('Debe retornar 403 si req.user no está definido', () => {
    // Escenario donde authMiddleware falló en inyectar el usuario (raro pero posible)
    adminMiddleware(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/Prohibido/i) })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('Debe retornar 403 si el rol del usuario no es ADMINISTRADOR', () => {
    mockReq.user = { rol: 'ESTUDIANTE' };

    adminMiddleware(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/Permisos/i) })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('Debe llamar a next() si el rol es ADMINISTRADOR', () => {
    mockReq.user = { rol: 'ADMINISTRADOR' };

    adminMiddleware(mockReq, mockRes, nextFunction);

    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

});
