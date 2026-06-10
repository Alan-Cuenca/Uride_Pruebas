const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const users = [
      { nombre: 'Conductor Test', email: 'conductor@test.uta.edu.ec', pass: 'DemoClave123*', rol: 'CONDUCTOR' },
      { nombre: 'Pasajero Test', email: 'pasajero@test.uta.edu.ec', pass: 'DemoClave123*', rol: 'PASAJERO' }
    ];
    
    for (let u of users) {
      const hash = await bcrypt.hash(u.pass, 10);
      await pool.query(
        'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash', 
        [u.nombre, u.email, hash, u.rol]
      );
    }
    console.log('✅ Usuarios E2E (Conductor y Pasajero) sembrados correctamente.');

    // 2. Obtener los IDs de los usuarios sembrados
    const conductorRes = await pool.query('SELECT id FROM usuarios WHERE email = $1', ['conductor@test.uta.edu.ec']);
    const pasajeroRes = await pool.query('SELECT id FROM usuarios WHERE email = $1', ['pasajero@test.uta.edu.ec']);
    
    if (conductorRes.rows.length > 0 && pasajeroRes.rows.length > 0) {
      const conductorId = conductorRes.rows[0].id;
      const pasajeroId = pasajeroRes.rows[0].id;

      // 3. Limpiar datos de pruebas anteriores para este conductor y pasajero
      await pool.query('DELETE FROM solicitudes WHERE pasajero_id = $1', [pasajeroId]);
      await pool.query('DELETE FROM viajes WHERE conductor_id = $1', [conductorId]);

      // Generar múltiples datos para evitar que se agoten rápido al correr las pruebas varias veces
      for (let i = 1; i <= 3; i++) {
        // 4. Crear Viaje de Prueba Activo (Sin Solicitudes - Ideal para Flujo 05)
        const viajeSQL = `
          INSERT INTO viajes (
            conductor_id, origen_lat, origen_lon, destino_lat, destino_lon, 
            fecha_salida, cupos_disponibles, notas_reglas, costo_contribucion, estado
          ) VALUES ($1, -1.248, -78.626, -1.268, -78.625, CURRENT_TIMESTAMP + INTERVAL '${i} day', 3, 'Prueba Automática E2E (Flujo 05) #${i}', 1.50, 'ACTIVO')
          RETURNING id
        `;
        await pool.query(viajeSQL, [conductorId]);
        
        // 5. Crear Viaje con Solicitud PENDIENTE (Ideal para Flujo 06)
        const viajePendienteSQL = `
          INSERT INTO viajes (
            conductor_id, origen_lat, origen_lon, destino_lat, destino_lon, 
            fecha_salida, cupos_disponibles, notas_reglas, costo_contribucion, estado
          ) VALUES ($1, -1.248, -78.626, -1.268, -78.625, CURRENT_TIMESTAMP + INTERVAL '${i + 1} day', 3, 'Prueba Automática E2E (Flujo 06) #${i}', 1.50, 'ACTIVO')
          RETURNING id
        `;
        const viajePendienteRes = await pool.query(viajePendienteSQL, [conductorId]);
        await pool.query(
          "INSERT INTO solicitudes (viaje_id, pasajero_id, estado) VALUES ($1, $2, 'PENDIENTE')",
          [viajePendienteRes.rows[0].id, pasajeroId]
        );

        // 6. Crear Viaje con Solicitud ACEPTADA (Ideal para Flujo 07 y posteriores)
        const viajeAceptadoSQL = `
          INSERT INTO viajes (
            conductor_id, origen_lat, origen_lon, destino_lat, destino_lon, 
            fecha_salida, cupos_disponibles, notas_reglas, costo_contribucion, estado
          ) VALUES ($1, -1.248, -78.626, -1.268, -78.625, CURRENT_TIMESTAMP + INTERVAL '${i + 2} days', 2, 'Viaje Aceptado E2E (Flujos 07+) #${i}', 1.50, 'ACTIVO')
          RETURNING id
        `;
        const viajeAceptadoRes = await pool.query(viajeAceptadoSQL, [conductorId]);
        await pool.query(
          "INSERT INTO solicitudes (viaje_id, pasajero_id, estado) VALUES ($1, $2, 'ACEPTADO')",
          [viajeAceptadoRes.rows[0].id, pasajeroId]
        );
      }
      
      console.log('✅ Viajes y Solicitudes sembradas correctamente para pruebas E2E independientes (Flujos 05, 06, 07+). Se inyectaron múltiples registros limpios.');
    }

  } catch (error) {
    console.error('❌ Error sembrando usuarios:', error);
  } finally {
    process.exit(0);
  }
}

seed();
