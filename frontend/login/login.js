let tempSignupData = null;
let resetEmail = null;

function showLogin() {
    document.getElementById("signup-form").classList.add("hidden");
    document.getElementById("forgot-form").classList.add("hidden");
    document.getElementById("login-form").classList.remove("hidden");
    document.getElementById("verification-modal").classList.add("hidden");
    document.getElementById("reset-password-modal").classList.add("hidden");
}

function showSignup() {
    document.getElementById("login-form").classList.add("hidden");
    document.getElementById("forgot-form").classList.add("hidden");
    document.getElementById("signup-form").classList.remove("hidden");
    document.getElementById("verification-modal").classList.add("hidden");
    document.getElementById("reset-password-modal").classList.add("hidden");
}

function showForgotPassword() {
    document.getElementById("login-form").classList.add("hidden");
    document.getElementById("signup-form").classList.add("hidden");
    document.getElementById("forgot-form").classList.remove("hidden");
    document.getElementById("verification-modal").classList.add("hidden");
    document.getElementById("reset-password-modal").classList.add("hidden");
}

async function handleSignup() {
    const first_name = document.getElementById("signup-firstname").value.trim();
    const last_name = document.getElementById("signup-lastname").value.trim();
    const username = document.getElementById("signup-username").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();
    const role = document.querySelector('input[name="role"]:checked')?.value;

    if (!first_name || !last_name || !username || !email || !password || !role) {
        return Swal.fire("Error", "All fields are required.", "error");
    }

    try {
        const res = await fetch("/api/send-signup-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ first_name, last_name, username, email, password, role })
        });

        const result = await res.json();

        if (!res.ok) {
            return Swal.fire("Error", result.message, "error");
        }

        tempSignupData = result.tempData;
        showVerificationModal('signup', email);
        Swal.fire("Verification Code Sent", `A 6-digit code has been sent to ${email}. Valid for 5 minutes.`, "info");
    } catch (err) {
        Swal.fire("Error", "Server error.", "error");
    }
}

async function handleForgotPassword() {
    const email = document.getElementById("forgot-email").value.trim();

    if (!email) {
        return Swal.fire("Error", "Please enter your email.", "error");
    }

    try {
        const res = await fetch("/api/send-reset-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const result = await res.json();

        if (!res.ok) {
            return Swal.fire("Error", result.message, "error");
        }

        resetEmail = email;
        showVerificationModal('reset', email);
        Swal.fire("Reset Code Sent", `A 6-digit code has been sent to ${email}. Valid for 5 minutes.`, "info");
    } catch (err) {
        Swal.fire("Error", "Server error.", "error");
    }
}

function showVerificationModal(type, email) {
    const modal = document.getElementById("verification-modal");
    const title = document.getElementById("modal-title");
    const subtitle = document.getElementById("modal-subtitle");
    
    if (type === 'signup') {
        title.textContent = "Verify Your Email";
        subtitle.textContent = `Enter the 6-digit code sent to ${email}`;
    } else {
        title.textContent = "Password Reset Verification";
        subtitle.textContent = `Enter the 6-digit code sent to ${email}`;
    }
    
    document.getElementById("verification-type").value = type;
    modal.classList.remove("hidden");
}

async function verifyCode() {
    const code = document.getElementById("verification-code").value.trim();
    const type = document.getElementById("verification-type").value;
    
    if (!code || code.length !== 6) {
        return Swal.fire("Error", "Please enter the 6-digit verification code.", "error");
    }
    
    if (type === 'signup') {
        if (!tempSignupData) {
            Swal.fire("Error", "Session expired. Please sign up again.", "error");
            closeVerificationModal();
            showSignup();
            return;
        }
        
        try {
            const res = await fetch("/api/verify-signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: tempSignupData.email, 
                    code: code,
                    tempData: tempSignupData
                })
            });
            
            const result = await res.json();
            
            if (!res.ok) {
                return Swal.fire("Error", result.message, "error");
            }
            
            Swal.fire("Success", "Account verified and created successfully! Please login.", "success").then(() => {
                closeVerificationModal();
                showLogin();
                tempSignupData = null;
                document.getElementById("signup-form").reset();
            });
        } catch (err) {
            Swal.fire("Error", "Server error.", "error");
        }
    } else if (type === 'reset') {
        closeVerificationModal();
        showResetPasswordModal(resetEmail, code);
    }
}

function showResetPasswordModal(email, code) {
    document.getElementById("reset-password-modal").classList.remove("hidden");
    window.resetEmail = email;
    window.resetCode = code;
}

function closeResetPasswordModal() {
    document.getElementById("reset-password-modal").classList.add("hidden");
    document.getElementById("reset-new-password").value = "";
    document.getElementById("reset-confirm-password").value = "";
}

async function submitNewPassword() {
    const newPassword = document.getElementById("reset-new-password").value.trim();
    const confirmPassword = document.getElementById("reset-confirm-password").value.trim();
    
    if (!newPassword || !confirmPassword) {
        return Swal.fire("Error", "Please fill in both fields.", "error");
    }
    
    if (newPassword !== confirmPassword) {
        return Swal.fire("Error", "Passwords do not match.", "error");
    }
    
    if (newPassword.length < 6) {
        return Swal.fire("Error", "Password must be at least 6 characters.", "error");
    }
    
    try {
        const res = await fetch("/api/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email: window.resetEmail, 
                code: window.resetCode, 
                newPassword: newPassword 
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            return Swal.fire("Error", data.message, "error");
        }
        
        Swal.fire("Success", "Password reset successful! Please login.", "success").then(() => {
            closeResetPasswordModal();
            showLogin();
            window.resetEmail = null;
            window.resetCode = null;
        });
    } catch (err) {
        Swal.fire("Error", "Server error.", "error");
    }
}

function closeVerificationModal() {
    document.getElementById("verification-modal").classList.add("hidden");
    document.getElementById("verification-code").value = "";
}

async function handleLogin() {
    const login = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!login || !password) {
        return Swal.fire("Error", "Username and password required.", "error");
    }

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login, password })
        });

        const result = await res.json();

        if (!res.ok) {
            return Swal.fire("Error", result.message, "error");
        }

        // ✅ SAVE USER TO LOCALSTORAGE
        localStorage.setItem('eduhub_user', JSON.stringify(result.user));
        console.log('Saved to localStorage:', result.user); // debug

        Swal.fire("Welcome!", "Login successful.", "success").then(() => {
            window.location.href = "/dashboard";
        });
    } catch (err) {
        Swal.fire("Error", "Server error.", "error");
    }
}

function togglePassword(inputId, eyeElement) {
    const passwordInput = document.getElementById(inputId);
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeElement.textContent = "⚫";
    } else {
        passwordInput.type = "password";
        eyeElement.textContent = "👁️";
    }
}