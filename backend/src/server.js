require('dotenv').config();
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const path = require('path');

// Middleware Setup
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Inyectar Rutina Extra Sockets Tracker
if (process.env.NODE_ENV !== 'test') {
  require('./sockets/trackerSocket')(io);
}

// Inyectar Motor de Cron Jobs
if (process.env.NODE_ENV !== 'test') {
  require('./config/cronJobs')();
}

// Rutas base
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'U-Ride API Running' });
});

// Importación y Uso de Modulos/Rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const rideRoutes = require('./routes/rideRoutes');
const requestRoutes = require('./routes/requestRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', rideRoutes);
app.use('/api', requestRoutes);
app.use('/api', reviewRoutes);
app.use('/api', reportRoutes);
app.use('/api', adminRoutes);
app.use('/api', paymentRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
  console.log(`Servidor Integrado HTTP+Socket corriendo puerto: ${PORT}`);
});
}

module.exports = app; // Exportado para Supertest
