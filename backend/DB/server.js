const express = require("express");
const path = require("path");
const pool = require("./db");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "frontend", "login", "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "frontend", "studentdashboard", "dashboard.html"));
});

app.post("/api/signup", async (req, res) => {
  const { first_name, last_name, username, email, password, role } = req.body;

  if (!first_name || !last_name || !username || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const existing = await conn.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Email or username already exists." });
    }

    await conn.query(
      "INSERT INTO users (first_name, last_name, username, email, password, role) VALUES (?, ?, ?, ?, ?, ?)",
      [first_name, last_name, username, email, password, role]
    );

    return res.json({ message: "Signup successful." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  } finally {
    if (conn) conn.release();
  }
});

app.post("/api/login", async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ message: "Login and password required." });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [login, login]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    return res.json({ message: "Login successful." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  } finally {
    if (conn) conn.release();
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});