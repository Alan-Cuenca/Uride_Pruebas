const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

function createTestPool() {
  const testPasswordHash = bcrypt.hashSync('SeguraPassword123!', 10);

  const testUsers = [
    {
      id: 1,
      nombre: 'Juan Pérez',
      email: 'juan.perez@uta.edu.ec',
      password_hash: testPasswordHash,
      rol: 'usuario',
      activo: true,
      verificado: true,
      carrera: 'Ingeniería de Software',
      telefono: '0999999999',
      foto_url: null,
      reputacion_promedio: 5,
      creado_en: new Date('2025-01-01T00:00:00.000Z'),
      zona_lat: -1.24908,
      zona_lon: -78.61675,
    },
    {
      id: 2,
      nombre: 'María García',
      email: 'maria.garcia@uta.edu.ec',
      password_hash: testPasswordHash,
      rol: 'usuario',
      activo: true,
      verificado: true,
      carrera: 'Ingeniería Civil',
      telefono: '0988888888',
      foto_url: null,
      reputacion_promedio: 4.8,
      creado_en: new Date('2025-02-01T00:00:00.000Z'),
      zona_lat: -1.251,
      zona_lon: -78.62,
    },
  ];

  function normalizeSql(sql) {
    return sql.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function buildProfile(user) {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      carrera: user.carrera,
      telefono: user.telefono,
      foto_url: user.foto_url,
      rol: user.rol,
      reputacion_promedio: user.reputacion_promedio,
      creado_en: user.creado_en,
      zona_lat: user.zona_lat,
      zona_lon: user.zona_lon,
      verificado: user.verificado,
      viajes_conductor: 0,
      viajes_pasajero: 0,
    };
  }

  return {
    async query(sql, params = []) {
      const normalizedSql = normalizeSql(sql);

      if (normalizedSql.includes('from usuarios where email = $1')) {
        const email = String(params[0] || '').trim().toLowerCase();
        const user = testUsers.find((entry) => entry.email.toLowerCase() === email);

        if (!user) {
          return { rows: [] };
        }

        if (normalizedSql.startsWith('select id, nombre from usuarios')) {
          return { rows: [{ id: user.id, nombre: user.nombre }] };
        }

        return {
          rows: [{
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            password_hash: user.password_hash,
            rol: user.rol,
            activo: user.activo,
          }],
        };
      }

      if (normalizedSql.includes('from usuarios where id = $1')) {
        const userId = Number(params[0]);
        const user = testUsers.find((entry) => entry.id === userId);

        if (!user) {
          return { rows: [] };
        }

        return { rows: [buildProfile(user)] };
      }

      return { rows: [] };
    },
    async connect(callback) {
      if (typeof callback === 'function') {
        callback(null, { release: () => {} }, () => {});
      }
      return { release: () => {} };
    },
    async end() {},
  };
}

if (process.env.NODE_ENV === 'test') {
  module.exports = createTestPool();
} else {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'uride'
  });

  // Comprobar conexión
  pool.connect((err, client, release) => {
    if (err) {
      return console.error('Error conectando a PostgreSQL (U-Ride BD):', err.stack);
    }
    console.log('✅ Conectado exitosamente a PostgreSQL (U-Ride BD)');
    release();
  });

  module.exports = pool;
}
