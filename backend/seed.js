require('dotenv').config();
const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log("Iniciando inyección de datos de prueba (Seed)...");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('MiClaveSegura123', salt);

    // 1. Insertar Administrador
    await pool.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES ('Admin Prueba', 'admin@uta.edu.ec', $1, 'ADMINISTRADOR')
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash]);

    // 2. Insertar Estudiantes (Denunciante y Denunciado)
    await pool.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES 
      ('Juan Pasajero', 'juan@uta.edu.ec', $1, 'PASAJERO'),
      ('Pedro Conductor', 'pedro@uta.edu.ec', $1, 'CONDUCTOR')
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash]);

    // Obtener IDs
    const admin = await pool.query("SELECT id FROM usuarios WHERE email = 'admin@uta.edu.ec'");
    const juan = await pool.query("SELECT id FROM usuarios WHERE email = 'juan@uta.edu.ec'");
    const pedro = await pool.query("SELECT id FROM usuarios WHERE email = 'pedro@uta.edu.ec'");

    const juanId = juan.rows[0].id;
    const pedroId = pedro.rows[0].id;

    // 3. Crear Viaje de prueba
    await pool.query(`
      INSERT INTO viajes (conductor_id, origen_lat, origen_lon, destino_lat, destino_lon, fecha_salida, cupos_disponibles, notas_reglas, costo_contribucion)
      VALUES ($1, -1.248, -78.625, -1.260, -78.610, NOW() - INTERVAL '1 day', 3, 'No comer en el auto', 1.50)
    `, [pedroId]);

    const viaje = await pool.query("SELECT id FROM viajes ORDER BY id DESC LIMIT 1");
    const viajeId = viaje.rows[0].id;

    // 4. Crear Reportes de Prueba para que aparezcan en el Dashboard
    await pool.query(`
      INSERT INTO reportes (denunciante_id, denunciado_id, viaje_id, motivo, evidencia_url, estado)
      VALUES 
      ($1, $2, $3, 'El conductor manejaba a exceso de velocidad cerca de la universidad.', '/uploads/evidencia_1.jpg', 'ABIERTO'),
      ($2, $1, $3, 'El pasajero no pagó su contribución acordada.', null, 'RESUELTO')
    `, [juanId, pedroId, viajeId]);

    console.log("✅ Datos de prueba insertados exitosamente.");
    
    // Mostramos las credenciales para Cypress
    console.log("------------------------------------------");
    console.log("Credenciales de Admin para Cypress:");
    console.log("Email: admin@uta.edu.ec");
    console.log("Clave: MiClaveSegura123");
    console.log("------------------------------------------");

  } catch (err) {
    console.error("❌ Error insertando datos:", err);
  } finally {
    process.exit();
  }
}

seedDatabase();
