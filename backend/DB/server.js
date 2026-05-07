const express = require("express");
const path = require("path");
const pool = require("./db");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// Verify environment variables are loaded
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "✓ Loaded" : "✗ Missing");
console.log("EMAIL_APP_PASSWORD:", process.env.EMAIL_APP_PASSWORD ? "✓ Loaded" : "✗ Missing");
console.log("DB_HOST:", process.env.DB_HOST ? "✓ Loaded" : "✗ Missing");

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

function sendVerificationEmail(email, code, type) {
    let subject;
    if (type === 'signup') {
        subject = 'Verify your EduHub account';
    } else if (type === 'change_password') {
        subject = 'Change Your EduHub Password';
    } else {
        subject = 'Password Reset Code';
    }
    const text = `Your verification code is: ${code}. Valid for 5 minutes.`;
    return transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: text
    });
}

// Cleanup expired codes every hour
setInterval(async () => {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query("DELETE FROM verification_codes WHERE expires_at < NOW() OR used = 1");
        console.log("Cleanup: Deleted", result.affectedRows, "expired codes");
    } catch (err) {
        console.error("Cleanup error:", err.message);
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
app.get("/teacher-dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "frontend", "teacherdashboard", "teacherdb.html"));
});
// =====================================================
// ✅ FIXED API: CLASSES WITH DUE DATES
// =====================================================
app.get("/api/classes", async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        const classes = await conn.query(
            "SELECT id, title, subject_code, professor, created_at FROM classes ORDER BY id"
        );

        const classesWithData = [];

        for (const cls of classes) {

            const materials = await conn.query(
                "SELECT id, class_id, title, description, pdf_url, sort_order, due_date, created_at FROM materials WHERE class_id = ? ORDER BY sort_order",
                [cls.id]
            );

            const quizzes = await conn.query(
                "SELECT id, class_id, title, description, link, link_label, due_date, created_at FROM quizzes WHERE class_id = ? ORDER BY id",
                [cls.id]
            );

            classesWithData.push({
                id: cls.id,
                title: cls.title,
                subject_code: cls.subject_code,
                professor: cls.professor,
                created_at: cls.created_at,

                materials: materials.map(m => ({
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    pdfUrl: m.pdf_url,
                    dueDate: m.due_date
                        ? new Date(m.due_date).toISOString()
                        : null
                })),

                quizzes: quizzes.map(q => ({
                    id: q.id,
                    title: q.title,
                    description: q.description,
                    link: q.link,
                    linkLabel: q.link_label,
                    dueDate: q.due_date
                        ? new Date(q.due_date).toISOString()
                        : null
                }))
            });
        }

        res.json(classesWithData);

    } catch (err) {
        console.error("Get classes error:", err);
        console.error("SQL Message:", err.sqlMessage);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});


// =====================================================
// ✅ COMPLETIONS (DB)
// =====================================================
app.get("/api/completions", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT item_type, item_id FROM task_completions WHERE user_id = ?",
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error("completions error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// Mark as done
app.post("/api/mark-done", async (req, res) => {
    const { userId, itemType, itemId } = req.body;
    if (!userId || !itemType || !itemId) {
        return res.status(400).json({ message: "Missing fields" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            `INSERT INTO task_completions (user_id, item_type, item_id)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE completed_at = NOW()`,
            [userId, itemType, itemId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("mark-done error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// Mark as undone
app.post("/api/mark-undone", async (req, res) => {
    const { userId, itemType, itemId } = req.body;
    if (!userId || !itemType || !itemId) {
        return res.status(400).json({ message: "Missing fields" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "DELETE FROM task_completions WHERE user_id = ? AND item_type = ? AND item_id = ?",
            [userId, itemType, itemId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("mark-undone error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// ========================= SIGNUP =========================
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
        console.error("Send signup code error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// ========================= VERIFY =========================
app.post("/api/verify-signup", async (req, res) => {
    const { email, code, tempData } = req.body;

    if (!email || !code || !tempData) {
        return res.status(400).json({ message: "Missing required fields." });
    }

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
        console.error("Verify signup error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// ========================= RESET PASSWORD =========================
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
        console.error("Send reset code error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// ========================= RESET =========================
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
        console.error("Reset password error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// ========================= LOGIN =========================
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

        if (!user.is_verified) {
            return res.status(401).json({ message: "Please verify your email first." });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        res.json({
            message: "Login successful.",
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// ========================= UPDATE PROFILE =========================
app.put("/api/update-profile", async (req, res) => {
    const { userId, firstName, lastName, username, email } = req.body;

    if (!userId || !firstName || !lastName || !username || !email) {
        return res.status(400).json({ message: "All fields are required." });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Check if username or email is already taken by another user
        const existing = await conn.query(
            "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
            [username, email, userId]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: "Username or email already taken." });
        }

        await conn.query(
            "UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ? WHERE id = ?",
            [firstName, lastName, username, email, userId]
        );

        res.json({ 
            message: "Profile updated successfully.",
            user: {
                id: userId,
                first_name: firstName,
                last_name: lastName,
                username: username,
                email: email
            }
        });

    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});
// ========================= SEND CHANGE PASSWORD CODE =========================
app.post("/api/send-change-password-code", async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required." });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const users = await conn.query("SELECT id, email FROM users WHERE id = ?", [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        const user = users[0];

        // Invalidate old codes
        await conn.query(
            "UPDATE verification_codes SET used = 1 WHERE email = ? AND type = 'change_password' AND used = 0",
            [user.email]
        );

        const code = generateCode();
        const expiresAt = new Date(Date.now() + 5 * 60000);

        await conn.query(
            "INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, 'change_password', ?)",
            [user.email, code, expiresAt]
        );

        await sendVerificationEmail(user.email, code, 'change_password');

        res.json({ message: "Verification code sent to your email!" });
    } catch (err) {
        console.error("Send change password code error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// ========================= CHANGE PASSWORD WITH CODE =========================
app.put("/api/change-password", async (req, res) => {
    const { userId, code, newPassword } = req.body;

    if (!userId || !code || !newPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // Get user email
        const users = await conn.query("SELECT id, email FROM users WHERE id = ?", [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        const user = users[0];

        // Verify code
        const codes = await conn.query(
            "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = 'change_password' AND used = 0 AND expires_at > NOW()",
            [user.email, code]
        );

        if (codes.length === 0) {
            return res.status(400).json({ message: "Invalid or expired code." });
        }

        // Mark code as used
        await conn.query("UPDATE verification_codes SET used = 1 WHERE id = ?", [codes[0].id]);

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await conn.query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, userId]
        );

        res.json({ message: "Password changed successfully." });

    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// ========================= ANNOUNCEMENTS =========================
// Get all announcements (for student dashboard)
app.get("/api/announcements", async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT id, title, body, audience, created_at FROM announcements ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error("Get announcements error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// Get teacher's own announcements (for teacher dashboard)
app.get("/api/teacher-announcements", async (req, res) => {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ message: "Missing teacherId" });

    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT id, title, body, audience, created_at FROM announcements WHERE teacher_id = ? ORDER BY created_at DESC",
            [teacherId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Get teacher announcements error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// Create announcement
app.post("/api/announcements", async (req, res) => {
    const { teacherId, title, body, audience } = req.body;
    if (!teacherId || !title || !body) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "INSERT INTO announcements (teacher_id, title, body, audience) VALUES (?, ?, ?, ?)",
            [teacherId, title, body, audience || 'All Classes']
        );
        res.json({ message: "Announcement posted successfully." });
    } catch (err) {
        console.error("Create announcement error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// Update announcement
app.put("/api/announcements/:id", async (req, res) => {
    const { id } = req.params;
    const { title, body, audience } = req.body;
    if (!title || !body) {
        return res.status(400).json({ message: "Title and body are required." });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "UPDATE announcements SET title = ?, body = ?, audience = ? WHERE id = ?",
            [title, body, audience || 'All Classes', id]
        );
        res.json({ message: "Announcement updated successfully." });
    } catch (err) {
        console.error("Update announcement error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// Delete announcement
app.delete("/api/announcements/:id", async (req, res) => {
    const { id } = req.params;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("DELETE FROM announcements WHERE id = ?", [id]);
        res.json({ message: "Announcement deleted successfully." });
    } catch (err) {
        console.error("Delete announcement error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});