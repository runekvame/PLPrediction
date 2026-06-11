function showAlert(message, type = "error") {
  const alert = document.getElementById("alert");
  alert.textContent = message;
  alert.className = `alert ${type}`;
  alert.style.display = "block";
}

async function handleLogin() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("login-btn");

  if (!email || !password) {
    showAlert("Fyll inn e-post og passord");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Logger inn...';

  const result = await login(email, password);

  if (result.token) {
    localStorage.setItem("token", result.token);
    localStorage.setItem("userId", result.userId);
    localStorage.setItem("username", result.username);
    window.location.href = "home.html";
  } else {
    btn.disabled = false;
    btn.innerHTML = "Logg inn";
    showAlert("Feil e-post eller passord");
  }
}

if (localStorage.getItem("token")) {
  window.location.href = "home.html";
}

// Redirect if already logged in
if (localStorage.getItem("token")) {
  window.location.href = "home.html";
}

// Redirect if already logged in
if (localStorage.getItem("token")) {
  window.location.href = "home.html";
}
