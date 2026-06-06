const mockStripeInstance = {
  charges: {
    create: jest.fn()
  }
};

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('stripe', () => {
  return jest.fn(() => mockStripeInstance);
});

const pool = require('../../src/config/database');
const paymentController = require('../../src/controllers/paymentController');

describe('💳 Payment Controller - Unit Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processStripePayment()', () => {
    it('Debe retornar 400 si faltan parámetros de la tarjeta', async () => {
      const req = { user: { id: 1 }, body: { solicitudId: 10 } }; // Faltan tarjeta
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await paymentController.processStripePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe retornar 404 si la solicitud no existe', async () => {
      const req = { 
        user: { id: 1 }, 
        body: { solicitudId: 10, cardNumber: '4242', expMonth: '12', expYear: '2025', cvc: '123' } 
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [] });

      await paymentController.processStripePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Debe retornar 403 si el usuario no es el dueño de la solicitud', async () => {
      const req = { 
        user: { id: 2 }, 
        body: { solicitudId: 10, cardNumber: '4242', expMonth: '12', expYear: '2025', cvc: '123' } 
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ pasajero_id: 1 }] });

      await paymentController.processStripePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('Debe retornar 400 si la solicitud no está ACEPTADA', async () => {
      const req = { 
        user: { id: 1 }, 
        body: { solicitudId: 10, cardNumber: '4242', expMonth: '12', expYear: '2025', cvc: '123' } 
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ pasajero_id: 1, solicitud_estado: 'PENDIENTE' }] });

      await paymentController.processStripePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('Debe marcar como completado directamente si el costo es 0', async () => {
      const req = { 
        user: { id: 1 }, 
        body: { solicitudId: 10, cardNumber: '4242', expMonth: '12', expYear: '2025', cvc: '123' } 
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ 
        rows: [{ pasajero_id: 1, solicitud_estado: 'ACEPTADO', pago_estado: 'PENDIENTE', costo_contribucion: '0.00' }] 
      });
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Update a 0

      await paymentController.processStripePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(mockStripeInstance.charges.create).not.toHaveBeenCalled();
    });

    it('Debe procesar exitosamente con Stripe y actualizar DB', async () => {
      const req = { 
        user: { id: 1 }, 
        body: { solicitudId: 10, cardNumber: '4242 4242 4242 4242', expMonth: '12', expYear: '2025', cvc: '123' } 
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ 
        rows: [{ pasajero_id: 1, solicitud_estado: 'ACEPTADO', pago_estado: 'PENDIENTE', costo_contribucion: '5.00' }] 
      });

      mockStripeInstance.charges.create.mockResolvedValueOnce({ status: 'succeeded', id: 'ch_12345' });

      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Update DB
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Log DB

      await paymentController.processStripePayment(req, res);

      expect(mockStripeInstance.charges.create).toHaveBeenCalledWith(expect.objectContaining({
        amount: 500, // 5.00 * 100
        currency: 'usd'
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('Debe retornar 400 si Stripe declina la tarjeta', async () => {
      const req = { 
        user: { id: 1 }, 
        body: { solicitudId: 10, cardNumber: '4000 0000 0000 0027', expMonth: '12', expYear: '2025', cvc: '123' } 
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ 
        rows: [{ pasajero_id: 1, solicitud_estado: 'ACEPTADO', pago_estado: 'PENDIENTE', costo_contribucion: '5.00' }] 
      });

      mockStripeInstance.charges.create.mockResolvedValueOnce({ status: 'failed' });

      await paymentController.processStripePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('declareOfflinePayment()', () => {
    it('Debe declarar el pago offline y quedar PENDIENTE_APROBACION', async () => {
      const req = { user: { id: 1 }, body: { solicitudId: 10, metodo: 'EFECTIVO' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ 
        rows: [{ pasajero_id: 1, solicitud_estado: 'ACEPTADO', pago_estado: 'PENDIENTE', costo_contribucion: '2.50' }] 
      });
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Update
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Log

      await paymentController.declareOfflinePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('Debe retornar 400 si el método no es válido', async () => {
      const req = { user: { id: 1 }, body: { solicitudId: 10, metodo: 'CHEQUE' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await paymentController.declareOfflinePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('confirmReceipt()', () => {
    it('Debe confirmar la recepción del pago por parte del conductor', async () => {
      const req = { user: { id: 2, rol: 'CONDUCTOR' }, params: { solicitudId: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ 
        rows: [{ conductor_id: 2, pago_estado: 'PENDIENTE_APROBACION', metodo_pago: 'EFECTIVO' }] 
      });
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Update COMPLETADO
      pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Log

      await paymentController.confirmReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('Debe retornar 403 si un usuario distinto intenta confirmar', async () => {
      const req = { user: { id: 3, rol: 'USUARIO' }, params: { solicitudId: 10 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ rows: [{ conductor_id: 2 }] });

      await paymentController.confirmReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getDriverPayments()', () => {
    it('Debe calcular las ganancias correctamente', async () => {
      const req = { user: { id: 2 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockResolvedValueOnce({ 
        rows: [
          { monto_pagado: '5.00', pago_estado: 'COMPLETADO' },
          { monto_pagado: '2.50', pago_estado: 'COMPLETADO' },
          { monto_pagado: '1.00', pago_estado: 'PENDIENTE' },
          { monto_pagado: null, pago_estado: 'COMPLETADO' } // For robustness
        ] 
      });

      await paymentController.getDriverPayments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ganancias_totales: 7.50
      }));
    });
  });
});
