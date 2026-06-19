require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// ================= MIDDLEWARE JWT =================
function authMiddleware(req, res, next) {

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
}
console.log("🔥 CLINIQUE diabet.care.me// SERVER BIEN VENU");

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const db = require("./db");
///////////////////////pour email
 //const nodemailer = require("nodemailer");

//const transporter = nodemailer.createTransport({
  //service: "gmail",
  //auth: {
    //user: process.env.GMAIL_USER,
    //pass: process.env.GMAIL_PASS
  //}
//});

/////
//nouveau transporter  
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// test SMTP
transporter.verify((err) => {
  if (err) {
    console.log("❌ SMTP ERROR:", err);
  } else {
    console.log("✅ SMTP READY");
  }
});
/////fin nouveau trans
function sendAcceptanceEmail(email, name, password) {

  const mailOptions = {
    from: `"Clinique" <diabet.care.me@gmail.com>`,
    to: email,
    subject: "Compte accepté - Clinique",
    html: `
      <h2>Bienvenue ${name}</h2>
      <p>Votre compte a été accepté.</p>
      <p><b>Email :</b> ${email}</p>
      <p><b>Mot de passe :</b> ${password}</p>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log("❌ EMAIL ERROR:", err);
    } else {
      console.log("📧 EMAIL SENT:", info.response);
    }
  });
}
////////////////////////////////////////////

const app = express();
// ✅ Servir les fichiers statiques (admin.html)
app.use(express.static("public"));

// ✅ Heure de démarrage du serveur
const startTime = Date.now();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});
////teste 
 app.get("/test-email", async (req, res) => {

  try {
    await transporter.sendMail({
      from: `"Clinique" <diabet.care.me@gmail.com>`,
      to: "diabet.care.me@gmail.com",
      subject: "Test email",
      text: "Email fonctionne 👍"
    });

    res.send("Email envoyé ✅");

  } catch (err) {
    console.log(err);
    res.send("Erreur email ❌");
  }
});

////
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ SMTP ERROR:", error);
  } else {
    console.log("✅ SMTP READY");
  }
});
// ================= ONLINE USERS =================
const onlineUsers = {};

// ================= SOCKET =================
io.on("connection", (socket) => {

  console.log("✅ utilisateur connecté");

  socket.on("user_connected", (username) => {

    socket.username = username;
    onlineUsers[username] = socket.id;

    console.log("🟢 CONNECT:", username);
    io.emit("online_users", Object.keys(onlineUsers));
  });

  socket.on("join_room", (room) => {
    socket.join(room);
  });

  socket.on("send_message", (data) => {

    db.query(
      `
      INSERT INTO messages
      (sender_id, receiver_id, message, created_at)
      VALUES (
        (SELECT id FROM users WHERE name=?),
        (SELECT id FROM users WHERE name=?),
        ?,
        NOW()
      )
      `,
      [data.sender, data.receiver, data.message],
      (err) => {
        if (err) console.log("❌ DB:", err);
      }
    );

    io.to(data.room).emit("receive_message", data);

    io.emit("new_message_notification", data);
  });

  socket.on("disconnect", () => {

    if (socket.username) {
      delete onlineUsers[socket.username];
    }

    io.emit("online_users", Object.keys(onlineUsers));
  });

});
//==================GET USER PHOTO======================
app.get("/get_user_photo/:name",authMiddleware, (req, res) => {

  const name = req.params.name;

  db.query(
    `
    SELECT photo
    FROM users
    WHERE name=?
    `,
    [name],

    (err, result) => {

      if (err) {

        return res.json({
          success: false
        });
      }

      if (result.length === 0) {

        return res.json({
          success: false
        });
      }

      res.json({
        success: true,
        photo: result[0].photo
      });
    }
  );
});
app.get("/get_user_photo/:name",authMiddleware, (req, res) => {

  const name = req.params.name;

  db.query(
    `
    SELECT photo
    FROM users
    WHERE name=?
    `,
    [name],

    (err, result) => {

      if (err) {

        console.log(err);

        return res.json({
          success: false
        });
      }

      if (result.length === 0) {

        return res.json({
          success: false
        });
      }

      res.json({
        success: true,
        photo: result[0].photo
      });
    }
  );
});
// ================= REGISTER REQUEST (CORRIGÉ) =================
app.post("/register_request", (req, res) => {

  console.log("🔥 REGISTER REQUEST:", req.body);

  const {
    name,
    phone,
    email,
    role,
    photo
  } = req.body;

  // ✅ vérifier users
  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],

    (err, usersResult) => {

      if (usersResult.length > 0) {

        return res.json({
          success: false,
          message: "Cet email existe déjà"
        });
      }

      // ✅ vérifier pending_users
      db.query(
        "SELECT * FROM pending_users WHERE email=?",
        [email],

        (err2, pendingResult) => {

          if (pendingResult.length > 0) {

            return res.json({
              success: false,
              message: "Vous avez déjà envoyé une demande avec cette @email"
            });
          }

          // ✅ insertion
          db.query(
            `
            INSERT INTO pending_users
            (name, phone, email, role, photo, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
            `,
            [name, phone, email, role, photo],

            (err3) => {

              if (err3) {

                console.log(err3);

                return res.json({
                  success: false
                });
              }

              console.log("🟡 USER ADDED TO PENDING");

              res.json({
                success: true,
                message: "Demande envoyée"
              });
            }
          );
        }
      );
    }
  );
});

// ================= LOGIN =================
app.post("/login", (req, res) => {

  const { email, password } = req.body;

  console.log("📧 EMAIL:", email);
  console.log("🔑 PASSWORD REÇU:", password);

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],
    async (err, result) => {
       if (err) {
      console.log("❌ ERREUR SQL:", err);
      return res.json({ success: false });
    }

      console.log("👤 USER TROUVÉ:", result);

      if (err || result.length === 0) {
        return res.json({ success: false });
      }

      const user = result[0];

      console.log("🔒 HASH EN DB:", user.password);

      const match = await bcrypt.compare(password, user.password);

      console.log("✅ MATCH:", match);

      if (!match) {
        return res.json({ success: false });
      }

       const token = jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

res.json({
  success: true,
  token: token,
  user: user
});
    }
  );
});

// ================= PATIENTS =================
app.get("/patients",authMiddleware, (req, res) => {

  db.query(

    "SELECT name, IFNULL(photo,'') as photo FROM users WHERE role='patient'",

    (err, result) => {

      if (err) {

        console.log(err);

        return res.json({
          success: false
        });
      }

      console.log(result);

      res.json({
        success: true,
        patients: result
      });
    }
  );
});

// ================= APPOINTMENT =================
app.post("/create_appointment", (req, res) => {

  const {
    patient_name,
    doctor_name,
    appointment_date,
    appointment_time
  } = req.body;

  db.query(
    `
    INSERT INTO appointments
    (patient_name, doctor_name, appointment_date, appointment_time)
    VALUES (?, ?, ?, ?)
    `,
    [
      patient_name,
      doctor_name,
      appointment_date,
      appointment_time
    ],
    (err) => {

      if (err) {
        console.log(err);
        return res.json({ success: false });
      }

      res.json({ success: true });
    }
  );
});
//=================✅ GET demandes=================
app.get("/pending_users", authMiddleware,(req, res) => {          
                                                   
  db.query(
    "SELECT * FROM pending_users ORDER BY id DESC",
    (err, result) => {

      if (err) {
        console.log(err);
        return res.json([]);
      }

      res.json(result);
    }
  );
 
});
//=================✅ API ACCEPTER=================
app.post("/approve_user", async (req, res) => {

  const { id, password } = req.body;

  const generatedPassword =
    password || Math.random().toString(36).slice(-8);

  db.query(
    "SELECT * FROM pending_users WHERE id=?",
    [id],
    async (err, result) => {  // ← ajouter async ici

      if (err || result.length === 0) {
        return res.json({ success: false });
      }

      const user = result[0];

      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      db.query(
        `
        INSERT INTO users
        (name, phone, email, password, role, photo)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          user.name,
          user.phone,
          user.email,
          hashedPassword,
          user.role,
          user.photo
        ],
        (err2) => {

          if (err2) {
            console.log(err2);
            return res.json({ success: false });
          }

          db.query("DELETE FROM pending_users WHERE id=?", [id]);

          sendAcceptanceEmail(
            user.email,
            user.name,
            generatedPassword
          );

          res.json({
            success: true,
            password: generatedPassword
          });
        }
      );
    }
  );
});
//=================✅ API REFUSER=================
app.post("/reject_user", (req, res) => {

  const { id } = req.body;

  db.query(
    "DELETE FROM pending_users WHERE id=?",
    [id],
    (err) => {

      if (err) {
        return res.json({
          success: false
        });
      }

      res.json({
        success: true
      });
    }
  );

});
app.get("/appointments",authMiddleware, (req, res) => {

  db.query(`
    SELECT *
    FROM appointments
    ORDER BY appointment_date ASC, appointment_time ASC
  `, (err, result) => {

    if (err) {
      console.log(err);
      return res.json([]);
    }

    res.json(result);
  });
});
// ================= GET PENDING APPOINTMENTS =================

app.get("/pending_appointments", authMiddleware,(req, res) => {

  db.query(

    `
    SELECT *
    FROM appointments
    WHERE status='pending'
    ORDER BY id DESC
    `,

    (err, result) => {

      if (err) {

        console.log(err);

        return res.json([]);
      }

      res.json(result);
    }
  );
});

// ================= ACCEPT APPOINTMENT =================

app.post("/accept_appointment", (req, res) => {

  const { id } = req.body;

  db.query(

    `
    UPDATE appointments
    SET status='accepted'
    WHERE id=?
    `,

    [id],

    (err) => {

      if (err) {

        console.log(err);

        return res.json({
          success: false
        });
      }

      res.json({
        success: true
      });
    }
  );
});

// ================= REJECT APPOINTMENT =================

app.post("/reject_appointment", (req, res) => {

  const { id } = req.body;

  db.query(

    `
    UPDATE appointments
    SET status='rejected'
    WHERE id=?
    `,

    [id],

    (err) => {

      if (err) {

        console.log(err);

        return res.json({
          success: false
        });
      }

      res.json({
        success: true
      });
    }
  );
});


//==================save photo======================
app.post("/update_photo", (req, res) => {

  const { name, photo } = req.body;

  console.log("🔥 NAME:", name);
  console.log("📸 PHOTO SIZE:", photo?.length);

  db.query(
    `
    UPDATE users
    SET photo=?
    WHERE name=?
    `,
    [photo, name],

    (err) => {
      if (err) {
        console.log("❌ DB ERROR:", err);
        return res.json({ success: false });
      }

      console.log("✅ PHOTO UPDATED SUCCESSFULLY");

      res.json({ success: true });
    }
  );
});
app.get("/", (req, res) => {
  res.send("SERVER OK");
});
// ================= GET MESSAGES HISTORY =================
app.get("/messages/:user1/:user2", authMiddleware,(req, res) => {

  const { user1, user2 } = req.params;

  db.query(
    `
    SELECT
      m.message,
      m.created_at,
      u1.name AS sender_name,
      u2.name AS receiver_name
    FROM messages m
    JOIN users u1 ON m.sender_id = u1.id
    JOIN users u2 ON m.receiver_id = u2.id
    WHERE
      (u1.name=? AND u2.name=?)
      OR
      (u1.name=? AND u2.name=?)
    ORDER BY m.created_at ASC
    `,
    [user1, user2, user2, user1],

    (err, result) => {

      if (err) {
        console.log("❌ HISTORY ERROR:", err);
        return res.json([]);
      }

      res.json(result);
    }
  );
});
// ================= GLYCEMIE =================

// Ajouter mesure
app.post("/add_glycemie", authMiddleware, (req, res) => {
  const { patient_name, valeur, note } = req.body;

  db.query(
    `INSERT INTO glycemie (patient_name, valeur, note) VALUES (?, ?, ?)`,
    [patient_name, valeur, note],
    (err) => {
      if (err) {
        console.log(err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

// Récupérer mesures
app.get("/glycemie/:patient_name", authMiddleware, (req, res) => {
  const { patient_name } = req.params;

  db.query(
    `SELECT * FROM glycemie WHERE patient_name=? ORDER BY date_mesure DESC`,
    [patient_name],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.json([]);
      }
      res.json(result);
    }
  );
});

// ================= ANALYSES =================

// Ajouter analyse
app.post("/add_analyse", authMiddleware, (req, res) => {
  const { patient_name, type_analyse, resultat, note } = req.body;

  db.query(
    `INSERT INTO analyses (patient_name, type_analyse, resultat, note) VALUES (?, ?, ?, ?)`,
    [patient_name, type_analyse, resultat, note],
    (err) => {
      if (err) {
        console.log(err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

// Récupérer analyses
app.get("/analyses/:patient_name", authMiddleware, (req, res) => {
  const { patient_name } = req.params;

  db.query(
    `SELECT * FROM analyses WHERE patient_name=? ORDER BY date_analyse DESC`,
    [patient_name],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.json([]);
      }
      res.json(result);
    }
  );
});
// ================= UPDATE GLYCEMIE =================
app.put("/update_glycemie/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { valeur, note } = req.body;

  db.query(
    `UPDATE glycemie SET valeur=?, note=? WHERE id=?`,
    [valeur, note, id],
    (err) => {
      if (err) {
        console.log(err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

// ================= DELETE GLYCEMIE =================
app.delete("/delete_glycemie/:id", authMiddleware, (req, res) => {
  const { id } = req.params;

  db.query(
    `DELETE FROM glycemie WHERE id=?`,
    [id],
    (err) => {
      if (err) {
        console.log(err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

// ================= UPDATE ANALYSE =================
app.put("/update_analyse/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { resultat, note } = req.body;

  db.query(
    `UPDATE analyses SET resultat=?, note=? WHERE id=?`,
    [resultat, note, id],
    (err) => {
      if (err) {
        console.log(err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

// ================= DELETE ANALYSE =================
app.delete("/delete_analyse/:id", authMiddleware, (req, res) => {
  const { id } = req.params;

  db.query(
    `DELETE FROM analyses WHERE id=?`,
    [id],
    (err) => {
      if (err) {
        console.log(err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

// ================= ADMIN STATUS =================
app.get("/admin/status", (req, res) => {

  const uptimeMs = Date.now() - startTime;
  const minutes = Math.floor(uptimeMs / 60000);
  const hours = Math.floor(minutes / 60);

  res.json({
    port: process.env.PORT || 3000,
    uptime: `${hours}h ${minutes % 60}min`,
    users: Object.keys(onlineUsers)
  });
});

// ================= ADMIN STOP =================
app.post("/admin/stop", (req, res) => {

  res.json({ success: true });

  console.log("🔴 SERVEUR ARRÊTÉ PAR L'ADMIN");

  setTimeout(() => {
    process.exit(0);
  }, 500);
});
// ================= SERVER START =================
server.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
});