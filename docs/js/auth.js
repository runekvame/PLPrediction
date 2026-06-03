function showAlert(message, type = "error") {
  const alert = document.getElementById("alert");
  alert.textContent = message;
  alert.className = `alert ${type}`;
  alert.style.display = "block";
}

async function handleLogin() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showAlert("Fyll inn e-post og passord");
    return;
  }

  const result = await login(email, password);

  if (result.token) {
    localStorage.setItem("token", result.token);
    localStorage.setItem("userId", result.userId);
    window.location.href = "home.html";
  } else {
    showAlert("Feil e-post eller passord");
  }
}

// Redirect if already logged in
if (localStorage.getItem("token")) {
  window.location.href = "home.html";
}
