const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uride'
});

async function run() {
  try {
    const res = await pool.query("SELECT id, estado, cupos_disponibles, fecha_salida FROM viajes ORDER BY id DESC LIMIT 5");
    console.log("Viajes:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
