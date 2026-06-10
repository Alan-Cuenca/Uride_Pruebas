const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uride'
});

async function run() {
  try {
    const res = await pool.query("SELECT * FROM usuarios WHERE email = 'nuevo_estudiante_1780865740177@test.uta.edu.ec'");
    console.log("DB Result:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
