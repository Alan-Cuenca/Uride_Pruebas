const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const emailService = require('../services/emailService');

/**
 * RF1: Registro de Usuarios
 * Validación Estricta: @uta.edu.ec
 */
exports.register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    // 1. Validaciones básicas de entrada
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // 2. Validación de Dominio (REGLA ACADÉMICA UTA)
    if (!email.trim().endsWith('@uta.edu.ec') && !email.trim().endsWith('@test.uta.edu.ec')) {
      return res.status(403).json({ 
        error: 'Pertenencia Institucional Inválida. El correo debe terminar en @uta.edu.ec' 
      });
    }

    // 3. Comprobar si el usuario/correo ya existe
    const verifySQL = 'SELECT id FROM usuarios WHERE email = $1';
    const existingUser = await pool.query(verifySQL, [email.trim()]);
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'El correo institucional ya está registrado en U-Ride' });
    }

    // 4. Generar código de verificación (6 dígitos)
    let verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const isTestAccount = email.trim().endsWith('@test.uta.edu.ec');

    // MOCK PARA MAESTRO E2E
    if (isTestAccount) {
      verificationCode = '123456';
    }

    // 5. Cifrado de Contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 6. Guardar en verificaciones_pendientes
    const datosUsuario = { nombre: nombre.trim(), password_hash: passwordHash };
    const insertPendienteSQL = `
      INSERT INTO verificaciones_pendientes (email, codigo, datos)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET codigo = EXCLUDED.codigo, datos = EXCLUDED.datos, creado_en = CURRENT_TIMESTAMP
    `;
    await pool.query(insertPendienteSQL, [email.trim(), verificationCode, JSON.stringify(datosUsuario)]);

    // 7. Enviar Correo
    if (!isTestAccount) {
      await emailService.sendVerificationCode(email.trim(), verificationCode, nombre.trim());
    }

    // 8. Retorno Exitoso de Petición
    return res.status(200).json({
      message: 'Código de verificación enviado al correo',
      requireVerification: true
    });

  } catch (error) {
    console.error('Error Crítico en Controlador de Registro:', error);
    return res.status(500).json({ error: 'Error del servidor procesando tu solicitud' });
  }
};

/**
 * RF1: Verificar Registro
 * Comprueba el código enviado al correo y crea la cuenta final.
 */
exports.verifyRegister = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código son requeridos' });
    }

    // 1. Buscar verificación pendiente
    const searchSQL = 'SELECT codigo, datos, creado_en FROM verificaciones_pendientes WHERE email = $1';
    const result = await pool.query(searchSQL, [email.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay un registro pendiente para este correo o ya fue verificado.' });
    }

    const { codigo, datos, creado_en } = result.rows[0];

    // 2. Comprobar tiempo de expiración (15 minutos)
    const fifteenMinutes = 15 * 60 * 1000;
    if (new Date() - new Date(creado_en) > fifteenMinutes) {
      return res.status(400).json({ error: 'El código de verificación ha expirado. Por favor, regístrate de nuevo.' });
    }

    // 3. Validar código
    if (codigo !== code.toString().trim()) {
      return res.status(400).json({ error: 'Código de verificación incorrecto.' });
    }

    // 4. Crear el usuario final en la tabla usuarios
    const insertUserSQL = `
      INSERT INTO usuarios (nombre, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, nombre, email, rol
    `;
    const userResult = await pool.query(insertUserSQL, [datos.nombre, email.trim(), datos.password_hash]);

    // 5. Eliminar la verificación pendiente
    await pool.query('DELETE FROM verificaciones_pendientes WHERE email = $1', [email.trim()]);

    return res.status(201).json({
      message: 'Estudiante registrado y verificado correctamente en U-Ride',
      usuario: userResult.rows[0]
    });

  } catch (error) {
    console.error('Error verificando registro:', error);
    return res.status(500).json({ error: 'Error del servidor verificando el código' });
  }
};

/**
 * RF1 & RNF1: Inicio de Sesión Seguro
 * Validación bcrypt y Emisión de JWT
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan credenciales obligatorias' });
    }

    // 1. Buscar Estudiante
    const searchSQL = 'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1';
    const result = await pool.query(searchSQL, [email.trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas o cuenta deshabilitada' });
    }

    const usuario = result.rows[0];

    // 2. Verificar Contraseña Cifrada (Bcrypt)
    const isValid = await bcrypt.compare(password, usuario.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // 3. Generar JWT (Payload incluye id y rol)
    const payload = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol
    };

    // Firmar Token usando variable .env (1 día expira loggeado)
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // 4. Retorno Seguro
    return res.status(200).json({
      message: 'Inicio de Sesión Exitoso',
      token: token,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo
      },
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo
      }
    });

  } catch (error) {
    console.error('Error Crítico en Controlador de Login:', error);
    return res.status(500).json({ error: 'Error del Servidor conectando sesión' });
  }
};

/**
 * RF: Solicitar recuperación de contraseña
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    // 1. Verificar si el usuario existe
    const searchSQL = 'SELECT id, nombre FROM usuarios WHERE email = $1';
    const result = await pool.query(searchSQL, [email.trim()]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No existe una cuenta con este correo' });
    }
    
    const usuario = result.rows[0];

    // 2. Generar código de verificación
    let recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
    const isTestAccount = email.trim().endsWith('@test.uta.edu.ec');

    // MOCK PARA MAESTRO E2E
    if (isTestAccount) {
      recoveryCode = '123456';
    }

    // 3. Guardar en recuperaciones_contrasena
    const insertSQL = `
      INSERT INTO recuperaciones_contrasena (email, codigo)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET codigo = EXCLUDED.codigo, creado_en = CURRENT_TIMESTAMP
    `;
    await pool.query(insertSQL, [email.trim(), recoveryCode]);

    // 4. Enviar correo
    if (!isTestAccount) {
      await emailService.sendPasswordRecoveryCode(email.trim(), recoveryCode, usuario.nombre);
    }

    return res.status(200).json({ message: 'Código de recuperación enviado al correo' });

  } catch (error) {
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({ error: 'Error procesando solicitud de recuperación' });
  }
};

/**
 * RF: Restablecer contraseña con código
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // 1. Buscar código
    const searchSQL = 'SELECT codigo, creado_en FROM recuperaciones_contrasena WHERE email = $1';
    const result = await pool.query(searchSQL, [email.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay una solicitud de recuperación para este correo' });
    }

    const { codigo, creado_en } = result.rows[0];

    // 2. Verificar expiración (15 minutos)
    const fifteenMinutes = 15 * 60 * 1000;
    if (new Date() - new Date(creado_en) > fifteenMinutes) {
      return res.status(400).json({ error: 'El código de recuperación ha expirado' });
    }

    // 3. Validar código
    if (codigo !== code.toString().trim()) {
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    // 4. Cifrar nueva contraseña y actualizar
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE email = $2', [passwordHash, email.trim()]);

    // 5. Eliminar solicitud
    await pool.query('DELETE FROM recuperaciones_contrasena WHERE email = $1', [email.trim()]);

    return res.status(200).json({ message: 'Contraseña restablecida exitosamente' });

  } catch (error) {
    console.error('Error en resetPassword:', error);
    return res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};
