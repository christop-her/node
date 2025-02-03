const { Pool } = require('pg');
// require('.env').config();

const pool = new Pool({
  user: 'root', // Replace with your PostgreSQL username
  host: 'oregon-postgres.render.com', // PostgreSQL host on Render
  database: 'expire_db_qrqg', // Replace with your PostgreSQL database name
  password: 'JEe1piCBZMcqtNMs9xCgi51uYArDHSRt', // Replace with your PostgreSQL password
  port: 5432, // PostgreSQL port
  ssl: {
    rejectUnauthorized: false, // This allows SSL without verifying the certificate
  }
});

module.exports = pool;
