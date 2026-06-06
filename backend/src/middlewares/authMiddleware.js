const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // 1. Obtener la cabecera
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso Denegado: Cabecera de autorización no proporcionada' });
  }

  // 2. Extraer token del string "Bearer <token>"
  const token = authHeader.replace('Bearer ', '');

  try {
    // 3. Desencriptar usando el secreto del entorno
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET no configurado en variables de entorno.');
    const verifiedUser = jwt.verify(token, jwtSecret);
    
    // Inyectar el payload en request para que el controlador sepa quién lo llama
    req.user = verifiedUser;
    
    // Dejar pasar al siguiente controlador
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
  }
};
