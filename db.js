 require("dotenv").config();

const mysql = require('mysql2');

console.log("MYSQL_URL:", process.env.MYSQL_URL ? "defini" : "non defini");

const db = mysql.createPool(process.env.MYSQL_URL || {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.log("erreur connexion DB:", err.message);
  } else {
    console.log("connecte a MySQL Railway");
    connection.release();
  }
});

module.exports = db;