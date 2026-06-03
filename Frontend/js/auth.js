function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    hideAlert();
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    hideAlert();
}

function showAlert(message, type = 'error') {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
}

function hideAlert() {
    document.getElementById('alert').style.display = 'none';
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showAlert('Fyll inn e-post og passord');
        return;
    }

    const result = await login(email, password);

    if (result.token) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('userId', result.userId);
        window.location.href = 'home.html';
    } else {
        showAlert('Feil e-post eller passord');
    }
}

async function handleRegister() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!username || !email || !password) {
        showAlert('Fyll inn alle feltene');
        return;
    }

    if (password.length < 6) {
        showAlert('Passordet må være minst 6 tegn');
        return;
    }

    const result = await register(email, password, username);

    if (result.userId) {
        showAlert('Konto opprettet! Logger inn...', 'success');
        setTimeout(async () => {
            const loginResult = await login(email, password);
            if (loginResult.token) {
                localStorage.setItem('token', loginResult.token);
                localStorage.setItem('userId', loginResult.userId);
                window.location.href = 'home.html';
            }
        }, 1000);
    } else {
        showAlert('Kunne ikke opprette konto. Prøv igjen.');
    }
}

// Redirect if already logged in
if (localStorage.getItem('token')) {
    window.location.href = 'home.html';
}