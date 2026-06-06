const reviewController = require('../../src/controllers/reviewController');
const pool = require('../../src/config/database');

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

describe('⭐ Review Controller - Unit Tests', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = pool.connect();
  });

  describe('createReview()', () => {
    it('Debe retornar 400 si faltan parámetros obligatorios', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10 } }; // Falta evaluado_id y calificacion
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('Debe retornar 400 si la calificación está fuera de rango', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10, evaluado_id: 2, calificacion: 6 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 400 si el usuario intenta autocalificarse', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10, evaluado_id: 1, calificacion: 5 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 409 si ya existe una evaluación duplicada', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10, evaluado_id: 2, calificacion: 5 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // dupCheck

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(mockClient.query).toHaveBeenCalledTimes(1); // Solo dupCheck, no BEGIN
    });

    it('Debe retornar 404 si el viaje no existe', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10, evaluado_id: 2, calificacion: 5 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // dupCheck
      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // viajeRes
      mockClient.query.mockResolvedValueOnce(); // ROLLBACK

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('Debe retornar 409 si el viaje no está CERRADO', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10, evaluado_id: 2, calificacion: 5 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // dupCheck
      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ estado: 'EN_CURSO' }] }); // viajeRes
      mockClient.query.mockResolvedValueOnce(); // ROLLBACK

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('Debe crear la reseña exitosamente (Pasajero evalúa a Conductor)', async () => {
      const req = { user: { id: 2 }, body: { viaje_id: 10, evaluado_id: 1, calificacion: 5, comentario: 'Excelente' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // dupCheck
      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'CERRADO' }] }); // viajeRes
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 99 }] }); // partRes (Pasajero participó)
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 50 }] }); // insertRes
      mockClient.query.mockResolvedValueOnce({ rows: [{ reputacion_promedio: 4.9 }] }); // engineSQL
      mockClient.query.mockResolvedValueOnce(); // COMMIT

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ nuevo_score_estudiante: 4.9 }));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('Debe crear la reseña exitosamente (Conductor evalúa a Pasajero)', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10, evaluado_id: 2, calificacion: 4, comentario: 'Buen pasajero' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // dupCheck
      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'CERRADO' }] }); // viajeRes
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 99 }] }); // partRes (Pasajero evaluado participó)
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 51 }] }); // insertRes
      mockClient.query.mockResolvedValueOnce({ rows: [{ reputacion_promedio: 4.8 }] }); // engineSQL
      mockClient.query.mockResolvedValueOnce(); // COMMIT

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ nuevo_score_estudiante: 4.8 }));
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('Debe retornar 403 si el evaluador (Pasajero) no participó en el viaje', async () => {
      const req = { user: { id: 2 }, body: { viaje_id: 10, evaluado_id: 1, calificacion: 5 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // dupCheck
      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'CERRADO' }] }); // viajeRes
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // partRes Vacio

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('Debe retornar 403 si el evaluado (Pasajero) no participó en el viaje', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10, evaluado_id: 2, calificacion: 5 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockResolvedValueOnce({ rows: [] }); // dupCheck
      mockClient.query.mockResolvedValueOnce(); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ conductor_id: 1, estado: 'CERRADO' }] }); // viajeRes
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // partRes Vacio

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('Debe retornar 500 y hacer ROLLBACK si hay un error', async () => {
      const req = { user: { id: 1 }, body: { viaje_id: 10, evaluado_id: 2, calificacion: 5 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
