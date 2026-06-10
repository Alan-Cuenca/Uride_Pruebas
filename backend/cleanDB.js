const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uride'
});

async function clean() {
  try {
    await db.query('DELETE FROM reportes');
    await db.query('DELETE FROM solicitudes');
    await db.query('DELETE FROM viajes');
    console.log("BASE DE DATOS LIMPIA: Reportes, solicitudes y viajes eliminados.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
clean();
