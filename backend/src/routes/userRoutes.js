const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Controladores y Middlewares
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Configuración de Multer para Guardado de Fotos (RF2)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/perfiles/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5000000 }, // 5 MB de tope
});

// [PUT] /api/perfil -> Alias en español (usado por la App Móvil)
router.put('/perfil', authMiddleware, upload.single('foto'), userController.updateProfile);

// [PUT] /api/profile -> Alias en inglés (compatibilidad)
router.put('/profile', authMiddleware, upload.single('foto'), userController.updateProfile);

// [GET] /api/perfil -> Ver perfil propio
router.get('/perfil', authMiddleware, userController.getProfile);

// [GET] /api/users/me -> Compatibilidad con pruebas de integración
router.get('/users/me', authMiddleware, userController.getProfile);

module.exports = router;
