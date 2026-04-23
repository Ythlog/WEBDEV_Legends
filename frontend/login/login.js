function showLogin() {
  document.getElementById("signup-form").classList.add("hidden");
  document.getElementById("forgot-form").classList.add("hidden");
  document.getElementById("login-form").classList.remove("hidden");
}

function showSignup() {
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("forgot-form").classList.add("hidden");
  document.getElementById("signup-form").classList.remove("hidden");
}

function showForgotPassword() {
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("signup-form").classList.add("hidden");
  document.getElementById("forgot-form").classList.remove("hidden");
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
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name, last_name, username, email, password, role })
    });

    const result = await res.json();

    if (!res.ok) {
      return Swal.fire("Error", result.message, "error");
    }

    Swal.fire("Success", "Account created! Please log in.", "success").then(() => {
      showLogin();
    });
  } catch (err) {
    Swal.fire("Error", "Server error.", "error");
  }
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

    Swal.fire("Welcome!", "Login successful.", "success").then(() => {
      window.location.href = "/dashboard";
    });
  } catch (err) {
    Swal.fire("Error", "Server error.", "error");
  }
}