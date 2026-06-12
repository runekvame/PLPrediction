// Check if admin
async function checkAdmin() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const admin = await isAdmin();
  if (!admin) {
    window.location.href = "home.html";
    return;
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "index.html";
}

initNavAvatar().catch(() => {});

function toggleDropdown() {
  const dropdown = document.getElementById("nav-dropdown");
  dropdown.classList.toggle("open");
}

// Close dropdown when clicking outside
document.addEventListener("click", function (e) {
  const avatar = document.querySelector(".nav-avatar");
  if (avatar && !avatar.contains(e.target)) {
    document.getElementById("nav-dropdown")?.classList.remove("open");
  }
});

window.toggleDropdown = toggleDropdown;

function showAlert(message, type = "success") {
  const alert = document.getElementById("alert");
  alert.textContent = message;
  alert.className = `alert ${type}`;
  alert.style.display = "block";
  setTimeout(() => (alert.style.display = "none"), 4000);
}

async function syncMatches() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Synkroniserer...';

  const res = await fetch(`${API_URL}/Matches/sync`);
  const data = await res.json();

  btn.disabled = false;
  btn.innerHTML = "Synkroniser kamper";
  showAlert(data.message || "Kamper synkronisert!", "success");
}

async function scoreGameweek() {
  const gw = document.getElementById("score-gameweek").value;
  if (!gw) {
    showAlert("Skriv inn spillerundenummer", "error");
    return;
  }

  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Beregner...';

  const res = await fetch(`${API_URL}/Scoring/gameweek/${gw}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "",
  });
  const data = await res.json();

  btn.disabled = false;
  btn.innerHTML = "Beregn poeng";
  showAlert(data.message || "Poeng beregnet!", "success");
}

async function scoreSeasonPredictions() {
  const text = document.getElementById("final-standings").value;
  const teams = text
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (teams.length !== 20) {
    showAlert(
      `Du må skrive inn nøyaktig 20 lag (du har ${teams.length})`,
      "error",
    );
    return;
  }

  const res = await fetch(`${API_URL}/SeasonScoring/2026-27`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(teams),
  });
  const data = await res.json();
  showAlert(data.message || "Sesongtipping beregnet!", "success");
}

async function handleCreateUser() {
  const username = document.getElementById("new-username").value;
  const email = document.getElementById("new-email").value;
  const password = document.getElementById("new-password").value;

  if (!username || !email || !password) {
    showAlert("Fyll inn alle feltene", "error");
    return;
  }

  if (password.length < 6) {
    showAlert("Passordet må være minst 6 tegn", "error");
    return;
  }

  const result = await createUser(email, password, username);
  if (result.message) {
    showAlert(result.message, "success");
    document.getElementById("new-username").value = "";
    document.getElementById("new-email").value = "";
    document.getElementById("new-password").value = "";
    await loadUsers();
  } else {
    showAlert("Kunne ikke opprette bruker", "error");
  }
}

async function handleDeleteUser(userId, username) {
  if (!confirm(`Er du sikker på at du vil slette ${username}?`)) return;

  const result = await deleteUser(userId);
  if (result.message) {
    showAlert(`${username} er slettet`, "success");
    await loadUsers();
  } else {
    showAlert("Kunne ikke slette bruker", "error");
  }
}

async function loadUsers() {
  const res = await fetch(`${API_URL}/AdminAuth/users`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    document.getElementById("users-list").innerHTML =
      '<p style="color:var(--danger)">Kunne ikke laste brukere</p>';
    return;
  }

  const users = await res.json();

  document.getElementById("users-list").innerHTML = users
    .map(
      (u) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.7rem 0;border-bottom:1px solid var(--border)">
            <div>
                <span style="font-weight:600">${u.username}</span>
                ${u.is_admin ? '<span class="badge" style="background:rgba(74,222,128,0.15);color:var(--accent);margin-left:0.5rem">Admin</span>' : ""}
            </div>
            <div style="display:flex;align-items:center;gap:1rem">
                <span style="color:var(--accent);font-weight:700">${u.total_points} p</span>
                ${!u.is_admin ? `<button class="danger" onclick="handleDeleteUser('${u.id}', '${u.username}')" style="padding:0.3rem 0.7rem;font-size:0.8rem">Slett</button>` : ""}
            </div>
        </div>
    `,
    )
    .join("");
}

let seasonPredictionsVisible = false;

async function loadSettings() {
  const settings = await getSettings();
  if (!Array.isArray(settings)) return;

  const visibleSetting = settings.find(
    (s) => s.key === "season_predictions_visible",
  );
  if (visibleSetting) {
    seasonPredictionsVisible = visibleSetting.value === "true";
    updateToggleButton();
  }
}

function updateToggleButton() {
  const btn = document.getElementById("toggle-predictions-btn");
  if (!btn) return;
  if (seasonPredictionsVisible) {
    btn.textContent = "Skjul tippinger";
    btn.className = "secondary";
  } else {
    btn.textContent = "Vis tippinger";
    btn.className = "";
  }
}

async function toggleSeasonPredictions() {
  const newValue = !seasonPredictionsVisible;
  const result = await updateSetting(
    "season_predictions_visible",
    newValue.toString(),
  );
  if (result.message) {
    seasonPredictionsVisible = newValue;
    updateToggleButton();
    showAlert(
      `Sesongtippinger er nå ${newValue ? "synlige" : "skjulte"}`,
      "success",
    );
  }
}

function toggleNav() {
  document.getElementById("nav-menu").classList.toggle("open");
}
window.toggleNav = toggleNav;

async function downloadBackup() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Henter data...';

  try {
    const [
      users,
      matches,
      predictions,
      gameweekScores,
      seasonPredictions,
      settings,
    ] = await Promise.all([
      fetch(`${API_URL}/AdminAuth/users`, { headers: getHeaders() }).then((r) =>
        r.json(),
      ),
      fetch(`${API_URL}/Matches/all`, { headers: getHeaders() }).then((r) =>
        r.json(),
      ),
      fetch(`${API_URL}/Predictions/all`, { headers: getHeaders() }).then((r) =>
        r.json(),
      ),
      fetch(`${API_URL}/Leaderboard/gameweek/all`, {
        headers: getHeaders(),
      }).then((r) => r.json()),
      fetch(`${API_URL}/SeasonPredictions`, { headers: getHeaders() }).then(
        (r) => r.json(),
      ),
      fetch(`${API_URL}/Settings`).then((r) => r.json()),
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      users,
      matches,
      predictions,
      gameweek_scores: gameweekScores,
      season_predictions: seasonPredictions,
      settings,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plprediction-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showAlert("Sikkerhetskopi lastet ned!", "success");
  } catch (err) {
    showAlert("Kunne ikke laste ned sikkerhetskopi", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Last ned sikkerhetskopi";
  }
}

async function loadPage() {
  await checkAdmin();
  await loadUsers();
  await loadSettings();
}

loadPage();
