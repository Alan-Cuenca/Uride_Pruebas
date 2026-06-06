/**
 * Fixtures - Datos de Prueba Reutilizables
 * 
 * Aquí definimos objetos y datos que se usan
 * en múltiples tests para mantener consistencia
 */

// ========== USUARIOS ==========
exports.validUser = {
  nombre: 'Juan Pérez',
  email: 'juan.perez@uta.edu.ec',
  password: 'SeguraPassword123!',
};

exports.validUserTester = {
  id: 1,
  nombre: 'Juan Pérez',
  email: 'juan.perez@uta.edu.ec',
  rol: 'usuario',
  verificado: true,
  created_at: new Date(),
};

exports.invalidEmailUser = {
  nombre: 'Pedro García',
  email: 'pedro@gmail.com', // ❌ No es @uta.edu.ec
  password: 'SecurePass123!',
};

exports.missingFieldsUser = {
  nombre: 'Ana López',
  // ❌ Falta email y password
};

exports.invalidPasswordUser = {
  nombre: 'Carlos González',
  email: 'carlos@uta.edu.ec',
  password: '123', // ❌ Contraseña muy corta
};

// ========== TOKENS JWT ==========
exports.validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibm9tYnJlIjoiSnVhbiBQw6lyZXoiLCJlbWFpbCI6Imp1YW4ucGVyZXpAdXRhLmVkdS5lYyIsImlhdCI6MTcxNDAwMDAwMH0.test';

exports.expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibm9tYnJlIjoiSnVhbiBQw6lyZXoiLCJlbWFpbCI6Imp1YW4ucGVyZXpAdXRhLmVkdS5lYyIsImV4cCI6MTcwMDAwMDAwMH0.expired';

exports.invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';

// ========== CREDENCIALES DE LOGIN ==========
exports.validLoginCredentials = {
  email: 'juan.perez@uta.edu.ec',
  password: 'SeguraPassword123!',
};

exports.wrongPasswordLogin = {
  email: 'juan.perez@uta.edu.ec',
  password: 'ClaveFalsa123', // ❌ Contraseña incorrecta
};

exports.nonExistentUserLogin = {
  email: 'noexiste@uta.edu.ec',
  password: 'AnyPassword123!',
};

// ========== VIAJES ==========
exports.validRide = {
  usuario_id: 1,
  origen: 'Ambato Centro',
  destino: 'Campus UTA',
  fecha_salida: '2025-06-15T09:00:00',
  asientos_disponibles: 3,
  precio_por_asiento: 5.00,
  descripcion: 'Viaje seguro y puntual',
};

exports.invalidRide = {
  usuario_id: 1,
  origen: '', // ❌ Origen vacío
  destino: 'Campus UTA',
  fecha_salida: '2025-06-15T09:00:00',
  asientos_disponibles: -1, // ❌ Negativo
  precio_por_asiento: 'invalido', // ❌ Debe ser número
};

// ========== RESEÑAS ==========
exports.validReview = {
  viaje_id: 1,
  usuario_resena_id: 2,
  calificacion: 5,
  comentario: 'Excelente experiencia, conductor puntual y seguro',
};

exports.invalidReview = {
  viaje_id: 1,
  usuario_resena_id: 2,
  calificacion: 6, // ❌ Debe ser entre 1-5
  comentario: '', // ❌ Comentario vacío
};

// ========== REPORTES ==========
exports.validReport = {
  usuario_reporta_id: 1,
  usuario_reportado_id: 2,
  viaje_id: 1,
  razon: 'Conducta inapropiada',
  descripcion: 'El conductor manejó de forma agresiva',
  gravedad: 'media',
};

exports.invalidReport = {
  usuario_reporta_id: 1,
  usuario_reportado_id: 1, // ❌ No puede reportarse a sí mismo
  viaje_id: 1,
  razon: '', // ❌ Razón vacía
  gravedad: 'alta',
};

// ========== PAGOS ==========
exports.validPayment = {
  usuario_id: 1,
  viaje_id: 1,
  monto: 25.00,
  metodo: 'tarjeta',
  moneda: 'USD',
};

exports.invalidPayment = {
  usuario_id: 1,
  viaje_id: 1,
  monto: -10.00, // ❌ Monto negativo
  metodo: 'efectivo_invalido', // ❌ Método no permitido
};
