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

  try {
    const res = await fetch(`${API_URL}/Matches/sync`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      showAlert(`Sync feilet (${res.status}): ${errorText}`, "error");
      return;
    }

    const data = await res.json();
    showAlert(data.message || "Kamper synkronisert!", "success");
  } catch (err) {
    showAlert(`Sync feilet: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Synkroniser kamper";
  }
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

  const potSetting = settings.find((s) => s.key === "pot_amount");
  if (potSetting) {
    const input = document.getElementById("pot-amount-input");
    if (input) input.value = potSetting.value;
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


async function savePotAmount() {
  const input = document.getElementById("pot-amount-input");
  const msg = document.getElementById("pot-save-msg");
  if (!input) return;
  const amount = parseInt(input.value, 10);
  if (isNaN(amount) || amount < 0) {
    alert("Ugyldig beløp");
    return;
  }
  try {
    const res = await fetch(`${API_URL}/Settings/pot_amount`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(String(amount)),
    });
    if (!res.ok) {
      const errText = await res.text();
      alert(`Feil ved lagring (${res.status}): ${errText}`);
      return;
    }
    if (msg) {
      msg.textContent = "✓ Lagret";
      msg.style.color = "var(--accent)";
      msg.style.display = "block";
      setTimeout(() => (msg.style.display = "none"), 2500);
    }
  } catch (e) {
    alert("Nettverksfeil: " + e.message);
  }
}


function normalizeDate(d) {
  return d && !d.endsWith("Z") && !d.includes("+") ? d + "Z" : d;
}

async function loadMissingPredictions() {
  const container = document.getElementById("missing-predictions-content");
  if (!container) return;

  container.innerHTML = `
    <div class="skeleton skeleton-text" style="width:60%;height:1.2rem;margin-bottom:0.5rem;border-radius:6px"></div>
    <div class="skeleton skeleton-text" style="width:100%;height:1.8rem;margin-bottom:0.4rem;border-radius:6px"></div>
    <div class="skeleton skeleton-text" style="width:100%;height:1.8rem;border-radius:6px"></div>`;

  try {
    const matches = await getMatchesFromDB();
    const now = new Date();
    const upcoming = matches.filter(
      (m) => new Date(normalizeDate(m.kickoff_time)) > now
    );
    const currentGw =
      upcoming.length > 0
        ? upcoming[0].gameweek
        : Math.max(...matches.map((m) => m.gameweek));

    const gwMatches = matches.filter((m) => m.gameweek === currentGw);
    const gwMatchIds = new Set(gwMatches.map((m) => m.id));
    const totalMatches = gwMatches.length;

    const [usersRes, predsRes] = await Promise.all([
      fetch(`${API_URL}/AdminAuth/users`, { headers: getHeaders() }),
      fetch(`${API_URL}/Predictions/all`, { headers: getHeaders() }),
    ]);

    const users = await usersRes.json();
    const allPredictions = await predsRes.json();

    const nonAdminUsers = users.filter((u) => !u.is_admin);

    // Count predictions per user for current gw
    const predCountByUser = {};
    allPredictions
      .filter((p) => gwMatchIds.has(p.match_id))
      .forEach((p) => {
        predCountByUser[p.user_id] = (predCountByUser[p.user_id] || 0) + 1;
      });

    const notTipped  = nonAdminUsers.filter((u) => !predCountByUser[u.id]);
    const partial    = nonAdminUsers.filter((u) => predCountByUser[u.id] > 0 && predCountByUser[u.id] < totalMatches);
    const allTipped  = nonAdminUsers.filter((u) => predCountByUser[u.id] === totalMatches);

    if (notTipped.length === 0 && partial.length === 0) {
      container.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.6rem;color:var(--accent);font-weight:600">
          <span style="font-size:1.2rem">✅</span> Alle ${nonAdminUsers.length} spillere har tippet alle ${totalMatches} kamper i runde ${currentGw}!
        </div>`;
      return;
    }

    function renderGroup(title, color, badge, users, predCount) {
      if (users.length === 0) return "";
      return `
        <div style="margin-bottom:0.25rem;margin-top:0.75rem;font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${color}">${title} (${users.length})</div>
        ${users.map((u, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0.6rem;border-radius:8px;background:${i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.03)"}">
            <span style="font-weight:600">${u.username}</span>
            <span style="font-size:0.75rem;color:${color};font-weight:700">${badge(u)}</span>
          </div>`).join("")}`;
    }

    container.innerHTML = `
      <div style="margin-bottom:0.5rem;font-size:0.85rem;color:var(--text-muted)">
        Runde ${currentGw} — ${totalMatches} kamper totalt
      </div>
      ${renderGroup("Ikke tippet", "var(--danger)", () => "Ikke tippet", notTipped)}
      ${renderGroup("Delvis tippet", "#facc15", (u) => `${predCountByUser[u.id]} / ${totalMatches}`, partial)}
      ${renderGroup("Fullstendig tippet", "var(--accent)", () => "✓ Alle tippet", allTipped)}
    `;
  } catch (e) {
    container.innerHTML = `<p style="color:var(--text-muted)">Kunne ikke hente data: ${e.message}</p>`;
  }
}

async function loadPage() {
  await checkAdmin();
  await loadUsers();
  await loadSettings();
  await loadMissingPredictions();
}

loadPage();
