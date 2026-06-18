require("dotenv").config();

const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

db.getConnection((err, connection) => {
  if (err) {
    console.log("❌ erreur connexion DB:", err);
  } else {
    console.log("✅ connecté à MySQL Railway (pool)");
    connection.release();
  }
});

module.exports = db;