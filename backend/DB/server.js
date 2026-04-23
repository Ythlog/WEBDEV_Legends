const express = require("express");
const path = require("path");
const pool = require("./db");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
//send ng code sa email, ito lalabas sa email
function sendVerificationEmail(email, code, type) {
    const subject = type === 'signup' ? 'Verify your EduHub account' : 'Password Reset Code';
    const text = `Your verification code is: ${code}. Valid for 5 minutes.`;
    return transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: text
    });
}

// mga codes na ginegenerate madedelete every hour
setInterval(async () => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("DELETE FROM verification_codes WHERE expires_at < NOW() OR used = 1");
    } catch (err) {
        console.error("Cleanup error:", err);
    } finally {
        if (conn) conn.release();
    }
}, 3600000);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "frontend", "login", "login.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "frontend", "studentdashboard", "dashboard.html"));
});

//Send verification code sa signup naman
app.post("/api/send-signup-code", async (req, res) => {
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 5 * 60000);

        await conn.query(
            "INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, 'signup', ?)",
            [email, code, expiresAt]
        );

        await sendVerificationEmail(email, code, 'signup');

        res.json({
            message: "Verification code sent!",
            tempData: { first_name, last_name, username, email, hashedPassword, role }
        });
    } catch (err) {
        res.status(500).json({ message: "Server error." });
    } finally {
        if (conn) conn.release();
    }
});

// Verify signup code and create account
app.post("/api/verify-signup", async (req, res) => {
    const { email, code, tempData } = req.body;

    let conn;
    try {
        conn = await pool.getConnection();

        const codes = await conn.query(
            "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = 'signup' AND used = 0 AND expires_at > NOW()",
            [email, code]
        );

        if (codes.length === 0) {
            return res.status(400).json({ message: "Invalid or expired code." });
        }

        await conn.query("UPDATE verification_codes SET used = 1 WHERE id = ?", [codes[0].id]);

        await conn.query(
            "INSERT INTO users (first_name, last_name, username, email, password, role, is_verified, verified_at) VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())",
            [tempData.first_name, tempData.last_name, tempData.username, email, tempData.hashedPassword, tempData.role]
        );

        res.json({ message: "Account verified and created successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Server error." });
    } finally {
        if (conn) conn.release();
    }
});

// Send reset code for forgot password
app.post("/api/send-reset-code", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required." });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const users = await conn.query("SELECT id FROM users WHERE email = ?", [email]);

        if (users.length === 0) {
            return res.status(404).json({ message: "No account found with this email." });
        }

        await conn.query(
            "UPDATE verification_codes SET used = 1 WHERE email = ? AND type = 'reset' AND used = 0",
            [email]
        );

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 5 * 60000);

        await conn.query(
            "INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, 'reset', ?)",
            [email, code, expiresAt]
        );

        await sendVerificationEmail(email, code, 'reset');

        res.json({ message: "Password reset code sent!" });
    } catch (err) {
        res.status(500).json({ message: "Server error." });
    } finally {
        if (conn) conn.release();
    }
});

// Verify reset code and change password
app.post("/api/reset-password", async (req, res) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const codes = await conn.query(
            "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = 'reset' AND used = 0 AND expires_at > NOW()",
            [email, code]
        );

        if (codes.length === 0) {
            return res.status(400).json({ message: "Invalid or expired code." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await conn.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);
        await conn.query("UPDATE verification_codes SET used = 1 WHERE id = ?", [codes[0].id]);

        res.json({ message: "Password reset successful!" });
    } catch (err) {
        res.status(500).json({ message: "Server error." });
    } finally {
        if (conn) conn.release();
    }
});

// Login
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
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        res.json({ message: "Login successful." });
    } catch (err) {
        res.status(500).json({ message: "Server error." });
    } finally {
        if (conn) conn.release();
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});