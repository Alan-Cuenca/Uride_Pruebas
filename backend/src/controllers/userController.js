const pool = require('../config/database');

/**
 * RF2: Gestión del Perfil del Estudiante
 * Actualizar: carrera, teléfono, foto, coordenadas de zona, y ROL
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { carrera, telefono, latitud, longitud, rol } = req.body;
    
    const fotoUrl = req.file ? `/uploads/perfiles/${req.file.filename}` : null;

    const updates = [];
    const values = [];
    let parameterIndex = 1;

    if (carrera) {
      updates.push(`carrera = $${parameterIndex++}`);
      values.push(carrera);
    }
    if (telefono) {
      updates.push(`telefono = $${parameterIndex++}`);
      values.push(telefono);
    }
    if (fotoUrl) {
      updates.push(`foto_url = $${parameterIndex++}`);
      values.push(fotoUrl);
    }
    
    // Motor Matemático Haversine Compatible
    if (latitud && longitud) {
      updates.push(`zona_lat = $${parameterIndex++}, zona_lon = $${parameterIndex++}`);
      values.push(latitud, longitud);
    }

    // RF: Permitir cambiar de rol entre PASAJERO y CONDUCTOR
    if (rol && ['PASAJERO', 'CONDUCTOR'].includes(rol)) {
      updates.push(`rol = $${parameterIndex++}`);
      values.push(rol);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar.' });
    }

    values.push(userId);
    const updateSQL = `
      WITH updated AS (
        UPDATE usuarios 
        SET ${updates.join(', ')} 
        WHERE id = $${parameterIndex} 
        RETURNING id, nombre, email, carrera, telefono, foto_url, rol, reputacion_promedio, zona_lat, zona_lon
      )
      SELECT u.*, 
        (SELECT COUNT(*) FROM viajes WHERE conductor_id = u.id) as viajes_conductor,
        (SELECT COUNT(*) FROM solicitudes WHERE pasajero_id = u.id AND estado = 'ACEPTADO') as viajes_pasajero
      FROM updated u
    `;

    const result = await pool.query(updateSQL, values);

    return res.status(200).json({
      message: 'Perfil actualizado correctamente',
      perfil: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando perfil BD:', error);
    return res.status(500).json({ error: 'Error del servidor procesando la actualización de perfil' });
  }
};

/**
 * RF2: Obtener Perfil Propio
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT id, nombre, email, carrera, telefono, foto_url, rol, reputacion_promedio, creado_en, zona_lat, zona_lon,
             (SELECT COUNT(*) FROM viajes WHERE conductor_id = usuarios.id) as viajes_conductor,
             (SELECT COUNT(*) FROM solicitudes WHERE pasajero_id = usuarios.id AND estado = 'ACEPTADO') as viajes_pasajero
      FROM usuarios WHERE id = $1
    `, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const perfil = result.rows[0];
    return res.status(200).json({
      perfil,
      user: perfil,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo perfil.' });
  }
};
