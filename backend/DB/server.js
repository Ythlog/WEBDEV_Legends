const express = require("express");
const path = require("path");
const pool = require("./db");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const app = express();

// Verify environment variables
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "✓ Loaded" : "✗ Missing");
console.log("EMAIL_APP_PASSWORD:", process.env.EMAIL_APP_PASSWORD ? "✓ Loaded" : "✗ Missing");
console.log("DB_HOST:", process.env.DB_HOST ? "✓ Loaded" : "✗ Missing");

// Configure multer for profile picture uploads
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "..", "..", "frontend", "uploads", "profile-pictures");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + ext);
    }
});

// Configure multer for material/assignment/quiz file uploads
const materialStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "..", "..", "frontend", "uploads", "materials");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'material-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images, PDF, DOC, PPT, and TXT files are allowed'));
    }
};

const uploadProfile = multer({ 
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

const uploadMaterial = multer({ 
    storage: materialStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});

// Nodemailer transporter
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

// =====================================================
// SERVE ALL MATERIAL FILES INLINE
// =====================================================

const MIME_MAP = {
    'pdf':  'application/pdf',
    'txt':  'text/plain; charset=utf-8',
    'png':  'image/png',
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif':  'image/gif',
    'webp': 'image/webp',
    'svg':  'image/svg+xml',
    'doc':  'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt':  'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xls':  'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

app.use('/uploads/materials', (req, res, next) => {
    const cleanPath  = decodeURIComponent(req.path.split('?')[0]);
    const filePath   = path.join(__dirname, "..", "..", "frontend", "uploads", "materials", cleanPath);

    if (!fs.existsSync(filePath)) {
        return next();
    }

    const ext         = cleanPath.toLowerCase().split('.').pop();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const filename    = path.basename(filePath);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.sendFile(filePath);
});

app.use('/uploads', express.static(path.join(__dirname, "..", "..", "frontend", "uploads")));

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
// STUDENT: JOIN SECTION WITH ENROLLMENT CODE
// =====================================================

app.get("/api/section-by-code", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: "Enrollment code is required" });

    let conn;
    try {
        conn = await pool.getConnection();
        
        const sections = await conn.query(
            `SELECT s.id as section_id, s.name as section_name, s.enrollment_code,
                    c.id as class_id, c.title as class_title, c.professor, c.subject_code
             FROM sections s
             JOIN classes c ON s.class_id = c.id
             WHERE s.enrollment_code = ?`,
            [code.toUpperCase()]
        );
        
        if (sections.length === 0) {
            return res.status(404).json({ message: "Invalid enrollment code" });
        }
        
        res.json(sections[0]);
    } catch (err) {
        console.error("Get section by code error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/join-section", async (req, res) => {
    const { enrollmentCode, studentId } = req.body;
    if (!enrollmentCode || !studentId) {
        return res.status(400).json({ message: "Enrollment code and student ID are required" });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const user = await conn.query("SELECT role FROM users WHERE id = ?", [studentId]);
        if (user.length === 0 || user[0].role !== 'student') {
            return res.status(403).json({ message: "Only students can join classes." });
        }
        
        const sectionInfo = await conn.query(
            "SELECT id FROM sections WHERE enrollment_code = ?",
            [enrollmentCode.toUpperCase()]
        );
        
        if (sectionInfo.length === 0) {
            return res.status(404).json({ message: "Invalid enrollment code" });
        }
        
        const sectionId = sectionInfo[0].id;
        
        const existing = await conn.query(
            "SELECT * FROM section_students WHERE section_id = ? AND student_id = ?",
            [sectionId, studentId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ message: "You are already enrolled in this section" });
        }
        
        await conn.query(
            "INSERT INTO section_students (section_id, student_id, status) VALUES (?, ?, 'enrolled')",
            [sectionId, studentId]
        );
        
        res.json({ 
            success: true, 
            message: "Successfully joined the class section!",
            section_id: sectionId
        });
    } catch (err) {
        console.error("Join section error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/my-classes", async (req, res) => {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: "Student ID is required" });

    let conn;
    try {
        conn = await pool.getConnection();

        const enrollments = await conn.query(
            `SELECT DISTINCT c.id as class_id, c.title, c.subject_code, c.professor, c.class_code,
                    s.id as section_id, s.name as section_name, s.code as section_code
             FROM classes c
             JOIN sections s ON c.id = s.class_id
             JOIN section_students ss ON s.id = ss.section_id
             WHERE ss.student_id = ? AND (ss.is_archived = 0 OR ss.is_archived IS NULL)
             ORDER BY c.id`,
            [studentId]
        );

        const classesWithData = [];
        for (const enrollment of enrollments) {
            const materials = await conn.query(
                "SELECT id, title, description, pdf_url, due_date FROM materials WHERE section_id = ? ORDER BY sort_order",
                [enrollment.section_id]
            );
            const quizzes = await conn.query(
                "SELECT id, title, description, link, link_label, due_date FROM quizzes WHERE section_id = ? ORDER BY id",
                [enrollment.section_id]
            );
            const assignments = await conn.query(
                "SELECT id, title, description, link, due_date, points FROM assignments WHERE section_id = ? ORDER BY id",
                [enrollment.section_id]
            );

            classesWithData.push({
                id: enrollment.class_id,
                title: enrollment.title,
                subject_code: enrollment.subject_code,
                professor: enrollment.professor,
                class_code: enrollment.class_code,
                section_id: enrollment.section_id,
                section_name: enrollment.section_name,
                section_code: enrollment.section_code,
                materials,
                quizzes,
                assignments
            });
        }

        res.json(classesWithData);
    } catch (err) {
        console.error("Get my classes error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// COMPLETIONS API
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

app.post("/api/mark-done", async (req, res) => {
    const { userId, itemType, itemId, submissionUrl } = req.body;
    
    if (!userId || !itemType || !itemId) {
        return res.status(400).json({ message: "Missing fields" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const existing = await conn.query(
            "SELECT id FROM task_completions WHERE user_id = ? AND item_type = ? AND item_id = ?",
            [userId, itemType, itemId]
        );
        
        if (existing.length > 0) {
            if (submissionUrl) {
                await conn.query(
                    "UPDATE task_completions SET completed_at = NOW(), submission_url = ? WHERE user_id = ? AND item_type = ? AND item_id = ?",
                    [submissionUrl, userId, itemType, itemId]
                );
            } else {
                await conn.query(
                    "UPDATE task_completions SET completed_at = NOW() WHERE user_id = ? AND item_type = ? AND item_id = ?",
                    [userId, itemType, itemId]
                );
            }
        } else {
            if (submissionUrl) {
                await conn.query(
                    "INSERT INTO task_completions (user_id, item_type, item_id, completed_at, submission_url) VALUES (?, ?, ?, NOW(), ?)",
                    [userId, itemType, itemId, submissionUrl]
                );
            } else {
                await conn.query(
                    "INSERT INTO task_completions (user_id, item_type, item_id, completed_at) VALUES (?, ?, ?, NOW())",
                    [userId, itemType, itemId]
                );
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error("mark-done error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

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

// =====================================================
// AUTHENTICATION ENDPOINTS
// =====================================================

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

// =====================================================
// PROFILE ENDPOINTS
// =====================================================

app.put("/api/update-profile", async (req, res) => {
    const { userId, firstName, lastName, username, email } = req.body;

    if (!userId || !firstName || !lastName || !username || !email) {
        return res.status(400).json({ message: "All fields are required." });
    }

    let conn;
    try {
        conn = await pool.getConnection();

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

app.post("/api/upload-profile-picture", uploadProfile.single('profilePicture'), async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }
    
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        const oldPicture = await conn.query("SELECT profile_picture FROM users WHERE id = ?", [userId]);
        if (oldPicture.length > 0 && oldPicture[0].profile_picture) {
            const oldFilePath = path.join(__dirname, "..", "..", "frontend", "uploads", "profile-pictures", oldPicture[0].profile_picture);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }
        
        await conn.query(
            "UPDATE users SET profile_picture = ? WHERE id = ?",
            [req.file.filename, userId]
        );
        
        res.json({ 
            message: "Profile picture uploaded successfully",
            filename: req.file.filename
        });
    } catch (err) {
        console.error("Upload profile picture error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/remove-profile-picture", async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        const user = await conn.query("SELECT profile_picture FROM users WHERE id = ?", [userId]);
        if (user.length > 0 && user[0].profile_picture) {
            const oldFilePath = path.join(__dirname, "..", "..", "frontend", "uploads", "profile-pictures", user[0].profile_picture);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }
        
        await conn.query("UPDATE users SET profile_picture = NULL WHERE id = ?", [userId]);
        
        res.json({ message: "Profile picture removed successfully" });
    } catch (err) {
        console.error("Remove profile picture error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/profile-picture", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT profile_picture FROM users WHERE id = ?", [userId]);
        if (rows.length === 0) return res.status(404).json({ message: "User not found" });
        res.json({ profile_picture: rows[0].profile_picture || null });
    } catch (err) {
        console.error("Get profile picture error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

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

app.put("/api/change-password", async (req, res) => {
    const { userId, code, newPassword } = req.body;

    if (!userId || !code || !newPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const users = await conn.query("SELECT id, email FROM users WHERE id = ?", [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        const user = users[0];

        const codes = await conn.query(
            "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = 'change_password' AND used = 0 AND expires_at > NOW()",
            [user.email, code]
        );

        if (codes.length === 0) {
            return res.status(400).json({ message: "Invalid or expired code." });
        }

        await conn.query("UPDATE verification_codes SET used = 1 WHERE id = ?", [codes[0].id]);

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

// =====================================================
// ANNOUNCEMENTS API
// =====================================================

app.get("/api/announcements", async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT id, teacher_id, title, body, audience, created_at FROM announcements ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error("Get announcements error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

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

// =====================================================
// STUDENT ANNOUNCEMENTS API (FILTERED BY ENROLLMENT)
// =====================================================

app.get("/api/student/announcements", async (req, res) => {
    const { studentId } = req.query;
    
    if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const enrolledSections = await conn.query(
            `SELECT section_id
             FROM section_students
             WHERE student_id = ? AND status = 'enrolled'`,
            [studentId]
        );
        
        const sectionIds = enrolledSections.map(s => s.section_id);
        
        if (sectionIds.length === 0) {
            return res.json([]);
        }
        
        const allAnnouncements = await conn.query(
            "SELECT id, teacher_id, title, body, audience, created_at FROM announcements ORDER BY created_at DESC"
        );
        
        const filteredAnnouncements = allAnnouncements.filter(announcement => {
            if (!announcement.audience ||
                announcement.audience === 'All Classes' ||
                announcement.audience === 'all' ||
                announcement.audience === '') {
                return true;
            }
            
            const audienceSectionIds = announcement.audience
                .split(',')
                .map(s => {
                    const cleaned = s.trim().replace('section_', '');
                    return parseInt(cleaned);
                })
                .filter(id => !isNaN(id));
            
            return audienceSectionIds.some(audienceId => sectionIds.includes(audienceId));
        });
        
        res.json(filteredAnnouncements);
        
    } catch (err) {
        console.error("Get student announcements error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/my-sections", async (req, res) => {
    const { studentId } = req.query;
    
    if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const sections = await conn.query(
            `SELECT
                ss.section_id as id,
                s.name,
                s.code,
                s.enrollment_code,
                c.title as class_title,
                c.id as class_id
             FROM section_students ss
             JOIN sections s ON ss.section_id = s.id
             JOIN classes c ON s.class_id = c.id
             WHERE ss.student_id = ? AND ss.status = 'enrolled'
             ORDER BY c.title, s.name`,
            [studentId]
        );
        
        res.json(sections);
        
    } catch (err) {
        console.error("Get student sections error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// TEACHER: ALL SECTIONS FOR ANNOUNCEMENTS
// =====================================================

// =====================================================
// TEACHER: GET ALL SECTIONS FOR ANNOUNCEMENTS
// =====================================================
app.get("/api/teacher/all-sections", async (req, res) => {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ message: "Missing teacherId" });

    let conn;
    try {
        conn = await pool.getConnection();

        const sections = await conn.query(
            `SELECT 
                s.id as section_id, 
                s.name as section_name, 
                s.code as section_code,
                s.enrollment_code,
                c.id as class_id, 
                c.title as class_title
             FROM sections s
             JOIN classes c ON s.class_id = c.id
             WHERE c.teacher_id = ?
             ORDER BY c.title, s.name`,
            [teacherId]
        );

        // Group by class for the frontend
        const grouped = {};
        sections.forEach(row => {
            if (!grouped[row.class_id]) {
                grouped[row.class_id] = {
                    classId: row.class_id,
                    className: row.class_title,
                    sections: []
                };
            }
            grouped[row.class_id].sections.push({
                sectionId: row.section_id,
                sectionName: row.section_name,
                sectionCode: row.enrollment_code || row.section_code
            });
        });

        res.json(Object.values(grouped));
    } catch (err) {
        console.error("Get teacher sections error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// TEACHER: CLASSES API
// =====================================================

app.get("/api/teacher/classes", async (req, res) => {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ message: "Missing teacherId" });

    let conn;
    try {
        conn = await pool.getConnection();
        const classes = await conn.query(
            "SELECT id, teacher_id, title, subject_code, professor, class_code, created_at FROM classes WHERE teacher_id = ? ORDER BY id",
            [teacherId]
        );
        res.json(classes);
    } catch (err) {
        console.error("Get teacher classes error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/teacher/classes", async (req, res) => {
    const { teacherId, title, description } = req.body;
    if (!teacherId || !title) return res.status(400).json({ message: "Missing required fields" });

    let conn;
    try {
        conn = await pool.getConnection();
        
        const users = await conn.query("SELECT first_name, last_name FROM users WHERE id = ?", [teacherId]);
        const professor = users.length > 0 ? `${users[0].first_name} ${users[0].last_name}` : 'Unknown';
        
        let classCode;
        let codeExists = true;
        while (codeExists) {
            classCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            const check = await conn.query("SELECT id FROM classes WHERE class_code = ?", [classCode]);
            codeExists = check.length > 0;
        }
        
        const result = await conn.query(
            "INSERT INTO classes (teacher_id, title, professor, subject_code, class_code) VALUES (?, ?, ?, ?, ?)",
            [teacherId, title, professor, description || null, classCode]
        );
        
        res.json({ 
            id: Number(result.insertId), 
            class_code: classCode,
            message: "Class created successfully" 
        });
    } catch (err) {
        console.error("Create class error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});
app.get('/api/teacher/submissions', async (req, res) => {
    try {
        const { itemType, itemId, sectionId } = req.query;
        
        if (!itemType || !itemId || !sectionId) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }
        
        // Determine which table to query based on itemType
        let tableName;
        if (itemType === 'assignment') {
            tableName = 'assignment_submissions';
        } else if (itemType === 'quiz') {
            tableName = 'quiz_submissions';
        } else {
            // Materials don't have submissions
            return res.json([]);
        }
        
        const query = `
            SELECT 
                s.*,
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.email,
                up.profile_picture
            FROM ${tableName} s
            JOIN users u ON s.student_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE s.${itemType}_id = ? 
                AND s.section_id = ?
            ORDER BY s.submitted_at DESC
        `;
        
        const submissions = await conn.query(query, [itemId, sectionId]);
        
        res.json(submissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Failed to fetch submissions' });
    }
});
// =====================================================
// STUDENT: SUBMIT QUIZ
// =====================================================

const quizSubmissionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "..", "..", "frontend", "uploads", "submissions");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'quiz-submission-' + uniqueSuffix + ext);
    }
});

const uploadQuizSubmission = multer({ storage: quizSubmissionStorage });

app.post("/api/submit-quiz", uploadQuizSubmission.single('submissionFile'), async (req, res) => {
    const { studentId, quizId, sectionId, submissionLink } = req.body;

    if (!studentId || !quizId) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields: studentId and quizId are required"
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        let submissionUrl = null;
        if (req.file) {
            submissionUrl = `/uploads/submissions/${req.file.filename}`;
        } else if (submissionLink) {
            submissionUrl = submissionLink;
        }

        const existing = await conn.query(
            "SELECT id FROM task_completions WHERE user_id = ? AND item_type = 'quiz' AND item_id = ?",
            [studentId, quizId]
        );

        if (existing.length > 0) {
            await conn.query(
                "UPDATE task_completions SET completed_at = NOW(), submission_url = ? WHERE user_id = ? AND item_type = 'quiz' AND item_id = ?",
                [submissionUrl, studentId, quizId]
            );
        } else {
            await conn.query(
                "INSERT INTO task_completions (user_id, item_type, item_id, completed_at, submission_url) VALUES (?, 'quiz', ?, NOW(), ?)",
                [studentId, quizId, submissionUrl]
            );
        }

        res.json({
            success: true,
            message: "Quiz submitted successfully",
            submissionUrl,
            quizId
        });

    } catch (error) {
        console.error('Quiz submission error:', error);
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    } finally {
        if (conn) conn.release();
    }
});
// =====================================================
// TEACHER: SUBMITTED FILES API
// =====================================================
app.get("/api/teacher/submitted-files", async (req, res) => {
    const { itemType, itemId, sectionId } = req.query;

    if (!itemType || !itemId || !sectionId) {
        return res.status(400).json({ message: "Missing required parameters" });
    }

    // Materials don't have file submissions
    if (itemType === 'material') {
        return res.json([]);
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const submissions = await conn.query(
            `SELECT 
                tc.id,
                tc.submission_url as file_url,
                tc.completed_at as submitted_at,
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.profile_picture
             FROM task_completions tc
             JOIN users u ON tc.user_id = u.id
             JOIN section_students ss ON ss.student_id = u.id AND ss.section_id = ?
             WHERE tc.item_type = ? 
               AND tc.item_id = ?
               AND tc.completed_at IS NOT NULL
               AND tc.submission_url IS NOT NULL
             ORDER BY tc.completed_at DESC`,
            [sectionId, itemType, itemId]
        );

        // Enrich with filename derived from URL
        const enriched = submissions.map(sub => ({
            ...sub,
            file_name: sub.file_url
                ? decodeURIComponent(sub.file_url.split('/').pop())
                : null
        }));

        res.json(enriched);
    } catch (err) {
        console.error("Get submitted files error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.put("/api/teacher/classes/:id", async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "UPDATE classes SET title = ?, subject_code = ? WHERE id = ?",
            [title, description || null, id]
        );
        res.json({ message: "Class updated" });
    } catch (err) {
        console.error("Update class error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.delete("/api/teacher/classes/:id", async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const sections = await conn.query("SELECT id FROM sections WHERE class_id = ?", [id]);
        for (const sec of sections) {
            await conn.query("DELETE FROM section_students WHERE section_id = ?", [sec.id]);
            await conn.query("DELETE FROM materials WHERE section_id = ?", [sec.id]);
            await conn.query("DELETE FROM quizzes WHERE section_id = ?", [sec.id]);
            await conn.query("DELETE FROM assignments WHERE section_id = ?", [sec.id]);
        }
        await conn.query("DELETE FROM sections WHERE class_id = ?", [id]);
        await conn.query("DELETE FROM classes WHERE id = ?", [id]);
        res.json({ message: "Class deleted" });
    } catch (err) {
        console.error("Delete class error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// TEACHER: SECTIONS API
// =====================================================
// =====================================================
// STUDENT: ARCHIVE / UNARCHIVE CLASS
// =====================================================

app.post("/api/archive-class", async (req, res) => {
    const { studentId, sectionId } = req.body;
    if (!studentId || !sectionId) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "UPDATE section_students SET is_archived = 1 WHERE student_id = ? AND section_id = ?",
            [studentId, sectionId]
        );
        res.json({ success: true, message: "Class archived successfully" });
    } catch (err) {
        console.error("Archive class error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/unarchive-class", async (req, res) => {
    const { studentId, sectionId } = req.body;
    if (!studentId || !sectionId) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "UPDATE section_students SET is_archived = 0 WHERE student_id = ? AND section_id = ?",
            [studentId, sectionId]
        );
        res.json({ success: true, message: "Class unarchived successfully" });
    } catch (err) {
        console.error("Unarchive class error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/my-classes/archived", async (req, res) => {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: "Student ID is required" });

    let conn;
    try {
        conn = await pool.getConnection();

        const enrollments = await conn.query(
            `SELECT DISTINCT c.id as class_id, c.title, c.subject_code, c.professor, c.class_code,
                    s.id as section_id, s.name as section_name, s.code as section_code
             FROM classes c
             JOIN sections s ON c.id = s.class_id
             JOIN section_students ss ON s.id = ss.section_id
             WHERE ss.student_id = ? AND ss.is_archived = 1
             ORDER BY c.id`,
            [studentId]
        );

        const classesWithData = [];
        for (const enrollment of enrollments) {
            const materials = await conn.query(
                "SELECT id, title, description, pdf_url, due_date FROM materials WHERE section_id = ? ORDER BY sort_order",
                [enrollment.section_id]
            );
            const quizzes = await conn.query(
                "SELECT id, title, description, link, link_label, due_date FROM quizzes WHERE section_id = ? ORDER BY id",
                [enrollment.section_id]
            );
            const assignments = await conn.query(
                "SELECT id, title, description, link, due_date, points FROM assignments WHERE section_id = ? ORDER BY id",
                [enrollment.section_id]
            );

            classesWithData.push({
                id: enrollment.class_id,
                title: enrollment.title,
                subject_code: enrollment.subject_code,
                professor: enrollment.professor,
                class_code: enrollment.class_code,
                section_id: enrollment.section_id,
                section_name: enrollment.section_name,
                section_code: enrollment.section_code,
                materials,
                quizzes,
                assignments
            });
        }

        res.json(classesWithData);
    } catch (err) {
        console.error("Get archived classes error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});
app.get("/api/teacher/sections", async (req, res) => {
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ message: "Missing classId" });

    let conn;
    try {
        conn = await pool.getConnection();
        const sections = await conn.query(
            "SELECT id, class_id, name, code, enrollment_code, created_at FROM sections WHERE class_id = ? ORDER BY id",
            [classId]
        );
        res.json(sections);
    } catch (err) {
        console.error("Get sections error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/teacher/sections", async (req, res) => {
    const { classId, name } = req.body;
    if (!classId || !name) return res.status(400).json({ message: "Missing required fields" });

    let conn;
    try {
        conn = await pool.getConnection();
        
        let enrollmentCode;
        let codeExists = true;
        while (codeExists) {
            enrollmentCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            const check = await conn.query("SELECT id FROM sections WHERE enrollment_code = ?", [enrollmentCode]);
            codeExists = check.length > 0;
        }
        
        let displayCode;
        let displayExists = true;
        while (displayExists) {
            displayCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const check = await conn.query("SELECT id FROM sections WHERE code = ?", [displayCode]);
            displayExists = check.length > 0;
        }
        
        const result = await conn.query(
            "INSERT INTO sections (class_id, name, code, enrollment_code) VALUES (?, ?, ?, ?)",
            [classId, name, displayCode, enrollmentCode]
        );
        
        res.json({ 
            id: Number(result.insertId), 
            code: displayCode,
            enrollment_code: enrollmentCode,
            message: "Section created successfully" 
        });
    } catch (err) {
        console.error("Create section error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.put("/api/teacher/sections/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("UPDATE sections SET name = ? WHERE id = ?", [name, id]);
        res.json({ message: "Section updated" });
    } catch (err) {
        console.error("Update section error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.delete("/api/teacher/sections/:id", async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("DELETE FROM section_students WHERE section_id = ?", [id]);
        await conn.query("DELETE FROM materials WHERE section_id = ?", [id]);
        await conn.query("DELETE FROM quizzes WHERE section_id = ?", [id]);
        await conn.query("DELETE FROM assignments WHERE section_id = ?", [id]);
        await conn.query("DELETE FROM sections WHERE id = ?", [id]);
        res.json({ message: "Section deleted" });
    } catch (err) {
        console.error("Delete section error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// TEACHER: MATERIALS API with file upload
// =====================================================

app.get("/api/teacher/materials", async (req, res) => {
    const { sectionId } = req.query;
    if (!sectionId) return res.status(400).json({ message: "Missing sectionId" });

    let conn;
    try {
        conn = await pool.getConnection();
        const materials = await conn.query(
            "SELECT id, section_id, title, description, pdf_url, due_date, created_at FROM materials WHERE section_id = ? ORDER BY id",
            [sectionId]
        );
        res.json(materials);
    } catch (err) {
        console.error("Get materials error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/teacher/materials", uploadMaterial.single('file'), async (req, res) => {
    const { sectionId, title, description, dueDate } = req.body;
    if (!sectionId || !title) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        const sectionCheck = await conn.query("SELECT id FROM sections WHERE id = ?", [sectionId]);
        if (sectionCheck.length === 0) {
            return res.status(404).json({ message: "Section not found" });
        }
        
        let pdf_url = null;
        if (req.file) {
            pdf_url = `/uploads/materials/${req.file.filename}`;
        } else if (req.body.link) {
            pdf_url = req.body.link;
        }
        
        const result = await conn.query(
            "INSERT INTO materials (section_id, title, description, pdf_url, due_date) VALUES (?, ?, ?, ?, ?)",
            [sectionId, title, description || null, pdf_url, dueDate || null]
        );
        
        res.json({ 
            id: Number(result.insertId), 
            message: "Material created successfully",
            file: req.file ? req.file.filename : null
        });
    } catch (err) {
        console.error("Create material error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.put("/api/teacher/materials/:id", uploadMaterial.single('file'), async (req, res) => {
    const { id } = req.params;
    const { title, description, dueDate } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    let conn;
    try {
        conn = await pool.getConnection();
        
        let pdf_url = null;
        if (req.file) {
            pdf_url = `/uploads/materials/${req.file.filename}`;
        } else if (req.body.link) {
            pdf_url = req.body.link;
        }
        
        if (pdf_url) {
            await conn.query(
                "UPDATE materials SET title = ?, description = ?, pdf_url = ?, due_date = ? WHERE id = ?",
                [title, description || null, pdf_url, dueDate || null, id]
            );
        } else {
            await conn.query(
                "UPDATE materials SET title = ?, description = ?, due_date = ? WHERE id = ?",
                [title, description || null, dueDate || null, id]
            );
        }
        res.json({ message: "Material updated successfully" });
    } catch (err) {
        console.error("Update material error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.delete("/api/teacher/materials/:id", async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("DELETE FROM task_completions WHERE item_type = 'material' AND item_id = ?", [id]);
        await conn.query("DELETE FROM materials WHERE id = ?", [id]);
        res.json({ message: "Material deleted successfully" });
    } catch (err) {
        console.error("Delete material error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// TEACHER: QUIZZES API
// =====================================================

app.get("/api/teacher/quizzes", async (req, res) => {
    const { sectionId } = req.query;
    if (!sectionId) return res.status(400).json({ message: "Missing sectionId" });

    let conn;
    try {
        conn = await pool.getConnection();
        const quizzes = await conn.query(
            // Add 'points' to the SELECT:
            "SELECT id, section_id, title, description, link, link_label, due_date, points, created_at FROM quizzes WHERE section_id = ? ORDER BY id",
            [sectionId]
        );
        res.json(quizzes);
    } catch (err) {
        console.error("Get quizzes error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/teacher/quizzes", uploadMaterial.single('file'), async (req, res) => {
    const { sectionId, title, description, dueDate, points } = req.body;
    if (!sectionId || !title) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const sectionCheck = await conn.query("SELECT id FROM sections WHERE id = ?", [sectionId]);
        if (sectionCheck.length === 0) {
            return res.status(404).json({ message: "Section not found" });
        }
        
        let link = null;
        if (req.file) {
            link = `/uploads/materials/${req.file.filename}`;
        } else if (req.body.link) {
            link = req.body.link;
        }
        
        const result = await conn.query(
            "INSERT INTO quizzes (section_id, title, description, link, link_label, due_date, points) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [sectionId, title, description || null, link, link || 'Open Quiz', dueDate || null, points || 0]
        );
        res.json({ id: Number(result.insertId), message: "Quiz created successfully" });
    } catch (err) {
        console.error("Create quiz error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.put("/api/teacher/quizzes/:id", async (req, res) => {
    const { id } = req.params;
    const { title, description, link, dueDate, points } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "UPDATE quizzes SET title = ?, description = ?, link = ?, link_label = ?, due_date = ?, points = ? WHERE id = ?",
            [title, description || null, link || null, link || 'Open Quiz', dueDate || null, points || 0, id]
        );
        res.json({ message: "Quiz updated successfully" });
    } catch (err) {
        console.error("Update quiz error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.delete("/api/teacher/quizzes/:id", async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("DELETE FROM task_completions WHERE item_type = 'quiz' AND item_id = ?", [id]);
        await conn.query("DELETE FROM quizzes WHERE id = ?", [id]);
        res.json({ message: "Quiz deleted successfully" });
    } catch (err) {
        console.error("Delete quiz error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// TEACHER: ASSIGNMENTS API with file upload
// =====================================================

app.get("/api/teacher/assignments", async (req, res) => {
    const { sectionId } = req.query;
    if (!sectionId) return res.status(400).json({ message: "Missing sectionId" });

    let conn;
    try {
        conn = await pool.getConnection();
        const assignments = await conn.query(
            "SELECT id, section_id, title, description, link, due_date, points, created_at FROM assignments WHERE section_id = ? ORDER BY id",
            [sectionId]
        );
        res.json(assignments);
    } catch (err) {
        console.error("Get assignments error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/api/teacher/assignments", uploadMaterial.single('file'), async (req, res) => {
    const { sectionId, title, description, dueDate, points } = req.body;
    if (!sectionId || !title) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const sectionCheck = await conn.query("SELECT id FROM sections WHERE id = ?", [sectionId]);
        if (sectionCheck.length === 0) {
            return res.status(404).json({ message: "Section not found" });
        }
        
        let link = null;
        if (req.file) {
            link = `/uploads/materials/${req.file.filename}`;
        } else if (req.body.link) {
            link = req.body.link;
        }
        
        const result = await conn.query(
            "INSERT INTO assignments (section_id, title, description, link, due_date, points) VALUES (?, ?, ?, ?, ?, ?)",
            [sectionId, title, description || null, link, dueDate || null, points || 0]
        );
        res.json({ id: Number(result.insertId), message: "Assignment created successfully" });
    } catch (err) {
        console.error("Create assignment error:", err);
        res.status(500).json({ message: "Server error: " + err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.put("/api/teacher/assignments/:id", async (req, res) => {
    const { id } = req.params;
    const { title, description, link, dueDate, points } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "UPDATE assignments SET title = ?, description = ?, link = ?, due_date = ?, points = ? WHERE id = ?",
            [title, description || null, link || null, dueDate || null, points || 0, id]
        );
        res.json({ message: "Assignment updated successfully" });
    } catch (err) {
        console.error("Update assignment error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.delete("/api/teacher/assignments/:id", async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("DELETE FROM task_completions WHERE item_type = 'assignment' AND item_id = ?", [id]);
        await conn.query("DELETE FROM assignments WHERE id = ?", [id]);
        res.json({ message: "Assignment deleted successfully" });
    } catch (err) {
        console.error("Delete assignment error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// STUDENT: GET COMPLETION STATUS WITH SCORE
// =====================================================
// =====================================================
// TEACHER: GET ALL CLASSES AND SECTIONS FOR ANNOUNCEMENTS
// =====================================================

app.get("/api/teacher/announcement-sections", async (req, res) => {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ message: "Missing teacherId" });
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Get all classes with their sections for this teacher
        const classes = await conn.query(
            `SELECT 
                c.id as class_id, 
                c.title as class_title,
                s.id as section_id,
                s.name as section_name,
                s.code as section_code
             FROM classes c
             LEFT JOIN sections s ON c.id = s.class_id
             WHERE c.teacher_id = ?
             ORDER BY c.title, s.name`,
            [teacherId]
        );
        
        // Group sections by class
        const groupedData = {};
        classes.forEach(item => {
            if (!groupedData[item.class_id]) {
                groupedData[item.class_id] = {
                    class_id: item.class_id,
                    class_title: item.class_title,
                    sections: []
                };
            }
            if (item.section_id) {
                groupedData[item.class_id].sections.push({
                    section_id: item.section_id,
                    section_name: item.section_name,
                    section_code: item.section_code
                });
            }
        });
        
        res.json(Object.values(groupedData));
    } catch (err) {
        console.error("Get announcement sections error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});
app.get("/api/student/completion-status", async (req, res) => {
    const { userId, itemType, itemId } = req.query;
    
    if (!userId || !itemType || !itemId) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const result = await conn.query(
            `SELECT completed_at, score 
             FROM task_completions 
             WHERE user_id = ? AND item_type = ? AND item_id = ?`,
            [userId, itemType, itemId]
        );
        
        if (result.length > 0) {
            res.json({
                completed_at: result[0].completed_at,
                score: result[0].score,
                is_graded: result[0].score !== null
            });
        } else {
            res.json({
                completed_at: null,
                score: null,
                is_graded: false
            });
        }
    } catch (error) {
        console.error("Error fetching completion status:", error);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// STUDENT: SUBMIT ASSIGNMENT (COMPLETE FIXED VERSION)
// =====================================================

const assignmentSubmissionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "..", "..", "frontend", "uploads", "submissions");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'submission-' + uniqueSuffix + ext);
    }
});

const uploadSubmission = multer({ storage: assignmentSubmissionStorage });

app.post("/api/submit-assignment", uploadSubmission.single('submissionFile'), async (req, res) => {
    const { studentId, assignmentId, sectionId, submissionLink } = req.body;
    
    console.log('📝 Assignment submission received:', { 
        studentId, 
        assignmentId, 
        sectionId, 
        submissionLink, 
        hasFile: !!req.file,
        fileInfo: req.file ? req.file.filename : null
    });
    
    if (!studentId || !assignmentId) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
            success: false,
            message: "Missing required fields: studentId and assignmentId are required" 
        });
    }
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        let submissionUrl = null;
        if (req.file) {
            submissionUrl = `/uploads/submissions/${req.file.filename}`;
        } else if (submissionLink) {
            submissionUrl = submissionLink;
        }
        
        const existing = await conn.query(
            "SELECT id, score FROM task_completions WHERE user_id = ? AND item_type = 'assignment' AND item_id = ?",
            [studentId, assignmentId]
        );
        
        if (existing.length > 0) {
            if (submissionUrl) {
                await conn.query(
                    "UPDATE task_completions SET completed_at = NOW(), submission_url = ? WHERE user_id = ? AND item_type = 'assignment' AND item_id = ?",
                    [submissionUrl, studentId, assignmentId]
                );
            } else {
                await conn.query(
                    "UPDATE task_completions SET completed_at = NOW() WHERE user_id = ? AND item_type = 'assignment' AND item_id = ?",
                    [studentId, assignmentId]
                );
            }
            console.log('✅ Updated existing submission for assignment:', assignmentId);
        } else {
            if (submissionUrl) {
                await conn.query(
                    "INSERT INTO task_completions (user_id, item_type, item_id, completed_at, submission_url) VALUES (?, 'assignment', ?, NOW(), ?)",
                    [studentId, assignmentId, submissionUrl]
                );
            } else {
                await conn.query(
                    "INSERT INTO task_completions (user_id, item_type, item_id, completed_at) VALUES (?, 'assignment', ?, NOW())",
                    [studentId, assignmentId]
                );
            }
            console.log('✅ Created new submission for assignment:', assignmentId);
        }
        
        res.json({ 
            success: true,
            message: "Assignment submitted successfully",
            submissionUrl: submissionUrl,
            assignmentId: assignmentId
        });
        
    } catch (error) {
        console.error('❌ Assignment submission error:', error);
        res.status(500).json({ 
            success: false,
            message: "Server error: " + error.message 
        });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// TEACHER: STUDENTS API
// =====================================================

app.get("/api/teacher/students", async (req, res) => {
    const { sectionId } = req.query;
    
    if (!sectionId) {
        return res.status(400).json({ message: "Missing sectionId", students: [] });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const students = await conn.query(
            `SELECT 
                u.id, 
                u.first_name, 
                u.last_name, 
                u.email, 
                u.profile_picture,
                ss.status, 
                ss.enrolled_at
             FROM section_students ss 
             INNER JOIN users u ON ss.student_id = u.id 
             WHERE ss.section_id = ? 
             ORDER BY u.last_name ASC`,
            [sectionId]
        );
        
        res.json(students);
    } catch (err) {
        console.error("Get students error:", err);
        res.status(500).json({ message: "Server error: " + err.message, students: [] });
    } finally {
        if (conn) conn.release();
    }
});

app.delete("/api/teacher/students", async (req, res) => {
    const { sectionId, studentId } = req.body;
    if (!sectionId || !studentId) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "DELETE FROM section_students WHERE section_id = ? AND student_id = ?",
            [sectionId, studentId]
        );
        res.json({ message: "Student removed successfully" });
    } catch (err) {
        console.error("Remove student error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

app.get("/api/teacher/class-students", async (req, res) => {
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ message: "Missing classId" });

    let conn;
    try {
        conn = await pool.getConnection();
        
        const students = await conn.query(
            `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
             FROM section_students ss
             JOIN sections s ON ss.section_id = s.id
             JOIN users u ON ss.student_id = u.id
             WHERE s.class_id = ?
             ORDER BY u.last_name`,
            [classId]
        );
        
        res.json(students);
    } catch (err) {
        console.error("Get class students error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// TEACHER: COMPLETIONS API (WITH SCORES)
// =====================================================

app.get("/api/teacher/completions", async (req, res) => {
    const { itemType, itemId, sectionId } = req.query;
    if (!itemType || !itemId || !sectionId) return res.status(400).json({ message: "Missing fields" });

    let conn;
    try {
        conn = await pool.getConnection();
        const completions = await conn.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.profile_picture,
                    tc.completed_at,
                    tc.score
             FROM section_students ss
             JOIN users u ON ss.student_id = u.id
             LEFT JOIN task_completions tc ON tc.user_id = u.id AND tc.item_type = ? AND tc.item_id = ?
             WHERE ss.section_id = ?
             ORDER BY u.last_name`,
            [itemType, itemId, sectionId]
        );
        res.json(completions);
    } catch (err) {
        console.error("Get completions error:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// TEACHER: SAVE STUDENT SCORE - FIXED VERSION
// =====================================================

app.put("/api/teacher/scores", async (req, res) => {
    const { studentId, itemType, itemId, sectionId, score } = req.body;
    
    console.log('📝 Score save request received:', { studentId, itemType, itemId, sectionId, score });
    
    if (!studentId || !itemType || !itemId) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
            success: false,
            message: 'Missing required fields (studentId, itemType, itemId)' 
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const existing = await conn.query(
            `SELECT id, score FROM task_completions 
             WHERE user_id = ? AND item_type = ? AND item_id = ?`,
            [studentId, itemType, itemId]
        );

        if (existing.length > 0) {
            if (score === null || score === '') {
                await conn.query(
                    `UPDATE task_completions 
                     SET score = NULL 
                     WHERE user_id = ? AND item_type = ? AND item_id = ?`,
                    [studentId, itemType, itemId]
                );
                console.log('✅ Score cleared for student:', studentId);
            } else {
                await conn.query(
                    `UPDATE task_completions 
                     SET score = ? 
                     WHERE user_id = ? AND item_type = ? AND item_id = ?`,
                    [score, studentId, itemType, itemId]
                );
                console.log('✅ Score updated for student:', studentId, 'Score:', score);
            }
        } else {
            await conn.query(
                `INSERT INTO task_completions (user_id, item_type, item_id, completed_at, score) 
                 VALUES (?, ?, ?, NOW(), ?)`,
                [studentId, itemType, itemId, score]
            );
            console.log('✅ New completion record created with score for student:', studentId);
        }

        res.json({ 
            success: true,
            message: 'Score saved successfully',
            data: { studentId, itemType, itemId, score }
        });
        
    } catch (error) {
        console.error('❌ Error saving score:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error: ' + error.message 
        });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// GET TEACHER SECTIONS FOR SCORE SAVING
// =====================================================

app.get("/api/teacher/student-sections/:studentId", async (req, res) => {
    const { studentId } = req.params;
    
    if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const sections = await conn.query(
            `SELECT s.id, s.name, s.code, c.id as class_id, c.title as class_title
             FROM section_students ss
             JOIN sections s ON ss.section_id = s.id
             JOIN classes c ON s.class_id = c.id
             WHERE ss.student_id = ? AND ss.status = 'enrolled'`,
            [studentId]
        );
        
        res.json(sections);
    } catch (error) {
        console.error('Error fetching student sections:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// STUDENT: GET SCORES
// =====================================================

app.get("/api/student/scores/:studentId", async (req, res) => {
    const { studentId } = req.params;

    console.log('Fetching scores for student:', studentId);
    
    if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const scores = await conn.query(
            `SELECT 
                tc.item_type,
                tc.item_id,
                tc.score,
                tc.completed_at,
                COALESCE(m.title, q.title, a.title) as item_title,
                CASE 
                    WHEN tc.item_type = 'material' THEN m.section_id
                    WHEN tc.item_type = 'quiz' THEN q.section_id
                    WHEN tc.item_type = 'assignment' THEN a.section_id
                END as section_id
             FROM task_completions tc
             LEFT JOIN materials m ON tc.item_type = 'material' AND tc.item_id = m.id
             LEFT JOIN quizzes q ON tc.item_type = 'quiz' AND tc.item_id = q.id
             LEFT JOIN assignments a ON tc.item_type = 'assignment' AND tc.item_id = a.id
             WHERE tc.user_id = ? AND tc.completed_at IS NOT NULL
             ORDER BY tc.completed_at DESC`,
            [studentId]
        );

        res.json(scores);
    } catch (error) {
        console.error('Error fetching student scores:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    } finally {
        if (conn) conn.release();
    }
});

// =====================================================
// STUDENT: GET SCORES BY CLASS
// =====================================================

app.get("/api/student/scores-by-class/:studentId/:classId", async (req, res) => {
    const { studentId, classId } = req.params;
    
    if (!studentId || !classId) {
        return res.status(400).json({ message: 'Student ID and Class ID are required' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        const sections = await conn.query(
            "SELECT id FROM sections WHERE class_id = ?",
            [classId]
        );
        
        const sectionIds = sections.map(s => s.id);
        
        if (sectionIds.length === 0) {
            return res.json([]);
        }
        
        const placeholders = sectionIds.map(() => '?').join(',');
        
        const scores = await conn.query(
            `SELECT 
                tc.item_type,
                tc.item_id,
                tc.score,
                tc.completed_at,
                COALESCE(m.title, q.title, a.title) as item_title,
                CASE 
                    WHEN tc.item_type = 'material' THEN m.section_id
                    WHEN tc.item_type = 'quiz' THEN q.section_id
                    WHEN tc.item_type = 'assignment' THEN a.section_id
                END as section_id
             FROM task_completions tc
             LEFT JOIN materials m ON tc.item_type = 'material' AND tc.item_id = m.id AND m.section_id IN (${placeholders})
             LEFT JOIN quizzes q ON tc.item_type = 'quiz' AND tc.item_id = q.id AND q.section_id IN (${placeholders})
             LEFT JOIN assignments a ON tc.item_type = 'assignment' AND tc.item_id = a.id AND a.section_id IN (${placeholders})
             WHERE tc.user_id = ? 
               AND tc.completed_at IS NOT NULL
               AND (
                 (tc.item_type = 'material' AND m.section_id IN (${placeholders})) OR
                 (tc.item_type = 'quiz' AND q.section_id IN (${placeholders})) OR
                 (tc.item_type = 'assignment' AND a.section_id IN (${placeholders}))
               )
             ORDER BY tc.completed_at DESC`,
            [...sectionIds, studentId, ...sectionIds]
        );

        res.json(scores);
    } catch (error) {
        console.error('Error fetching student scores by class:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    } finally {
        if (conn) conn.release();
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});