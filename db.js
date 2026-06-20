 require("dotenv").config();

const mysql = require('mysql2');

console.log("DB HOST:", process.env.MYSQLHOST || process.env.DB_HOST);
console.log("DB PORT:", process.env.MYSQLPORT || process.env.DB_PORT);

const db = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  port: process.env.MYSQLPORT || process.env.DB_PORT,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 60000,
});

setInterval(() => {
  db.query('SELECT 1', (err) => {
    if (err) {
      console.log("Ping DB failed:", err.message);
    } else {
      console.log("DB ping OK");
    }
  });
}, 30000);

db.getConnection((err, connection) => {
  if (err) {
    console.log("erreur connexion DB:", err);
  } else {
    console.log("connecte a MySQL Railway");
    connection.release();
  }
});

module.exports = db;