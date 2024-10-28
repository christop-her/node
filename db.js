const { Pool } = require('pg');
// require('.env').config();

const pool = new Pool({
  user: 'root', // Replace with your PostgreSQL username
  host: 'oregon-postgres.render.com', // PostgreSQL host on Render
  database: 'test_db_fiee', // Replace with your PostgreSQL database name
  password: 'AnZuajfuL6ggESUYHAyJraPrO2TUuRsy', // Replace with your PostgreSQL password
  port: 5432, // PostgreSQL port
  ssl: {
    rejectUnauthorized: false, // This allows SSL without verifying the certificate
  }
});

module.exports = pool;
