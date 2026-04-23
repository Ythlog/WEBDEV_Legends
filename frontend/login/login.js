// ===== SHOW LOGIN FORM =====
function showLogin() {
  document.getElementById('signup-form').classList.add('hidden');
  document.getElementById('forgot-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
}

// ===== SHOW SIGNUP FORM =====
function showSignup() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('forgot-form').classList.add('hidden');
  document.getElementById('signup-form').classList.remove('hidden');
}

// ===== SHOW FORGOT PASSWORD FORM =====
function showForgotPassword() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('signup-form').classList.add('hidden');
  document.getElementById('forgot-form').classList.remove('hidden');
}