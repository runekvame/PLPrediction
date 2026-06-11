if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "index.html";
}

const username = localStorage.getItem("username");
if (username) {
  const initial = username[0].toUpperCase();
  const btn = document.getElementById("avatar-btn");
  const header = document.getElementById("dropdown-username");
  if (btn) btn.textContent = initial;
  if (header) header.textContent = username;
}

function toggleDropdown() {
  const dropdown = document.getElementById("nav-dropdown");
  dropdown.classList.toggle("open");
}

document.addEventListener("click", function (e) {
  const avatar = document.querySelector(".nav-avatar");
  if (avatar && !avatar.contains(e.target)) {
    document.getElementById("nav-dropdown")?.classList.remove("open");
  }
});

window.toggleDropdown = toggleDropdown;

// Renders a 32px round avatar — photo if available, initial if not.
// Colours match the nav-avatar-btn style already in your CSS.
function leaderboardAvatar(player) {
  const name = player.username || player.users?.username || "?";
  const initial = name[0].toUpperCase();
  const avatarUrl = player.avatar_url || player.users?.avatar_url || null;

  if (avatarUrl) {
    return `<img src="${avatarUrl}" alt="${name}"
              style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block;" />`;
  }

  return `<div style="
      width:32px;height:32px;border-radius:50%;
      background:var(--bg-input);border:2px solid var(--accent);
      display:flex;align-items:center;justify-content:center;
      font-size:0.8rem;font-weight:700;color:var(--accent);
      flex-shrink:0;">
    ${initial}
  </div>`;
}

function renderLeaderboard(players, bodyId) {
  const body = document.getElementById(bodyId);
  if (!players || players.length === 0) {
    body.innerHTML =
      '<tr><td colspan="4" style="color:var(--text-muted)">Ingen data</td></tr>';
    return;
  }

  const currentUserId = localStorage.getItem("userId");

  body.innerHTML = players
    .map(
      (p, i) => `
        <tr style="${p.user_id === currentUserId ? "background:rgba(74,222,128,0.05)" : ""}">
            <td class="rank">${i + 1}</td>
            <td style="width:40px;padding-right:0;">${leaderboardAvatar(p)}</td>
            <td style="font-weight:${p.user_id === currentUserId ? "700" : "400"}">${p.username || p.users?.username || "-"}</td>
            <td class="points" style="text-align:right">${p.total_points ?? p.points ?? 0}</td>
        </tr>
    `,
    )
    .join("");
}

async function loadGameweekLeaderboard(gw) {
  document.querySelectorAll("#gw-buttons button").forEach((btn) => {
    btn.className = btn.dataset.gw == gw ? "" : "secondary";
  });

  const data = await getGameweekLeaderboard(gw);
  renderLeaderboard(data, "gw-leaderboard-body");
}

async function loadSeasonPredictionsComparison() {
  const res = await fetch(`${API_URL}/SeasonPredictions?season=2026-27`, {
    headers: getHeaders(),
  });

  if (!res.ok) return;

  const predictions = await res.json();
  if (!predictions || predictions.length === 0) return;

  const container = document.querySelector("main");
  const section = document.createElement("div");
  section.className = "card";
  section.style.marginTop = "1.5rem";

  section.innerHTML = `
    <h2>Sesongtippinger 2026-27</h2>
    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem">
      Trykk på en spiller for å se deres tipping
    </p>
    <div style="display:flex;flex-direction:column;gap:0.5rem" id="season-pred-list">
      ${predictions
        .map(
          (p, idx) => `
        <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
          <div onclick="togglePrediction(${idx})"
            style="display:flex;justify-content:space-between;align-items:center;padding:0.8rem 1rem;cursor:pointer;background:var(--bg-input);user-select:none">
            <span style="font-weight:600">${p.users?.username || "Ukjent"}</span>
            <span id="arrow-${idx}" style="color:var(--text-muted);font-size:0.85rem">▼</span>
          </div>
          <div id="pred-${idx}" style="display:none;padding:0.8rem 1rem">
            <div style="display:grid;grid-template-columns:auto 1fr;gap:0.3rem 1rem">
              ${p.predicted_standings
                .map(
                  (team, i) => `
                <span style="color:var(--text-muted);font-weight:700;font-size:0.85rem">${i + 1}.</span>
                <span style="font-size:0.9rem">${team}</span>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  container.appendChild(section);
}

function togglePrediction(idx) {
  const content = document.getElementById(`pred-${idx}`);
  const arrow = document.getElementById(`arrow-${idx}`);
  if (content.style.display === "none") {
    content.style.display = "block";
    arrow.textContent = "▲";
  } else {
    content.style.display = "none";
    arrow.textContent = "▼";
  }
}

function toggleNav() {
  document.getElementById("nav-menu").classList.toggle("open");
}
window.toggleNav = toggleNav;

window.togglePrediction = togglePrediction;

async function loadPage() {
  const season = await getLeaderboard();
  renderLeaderboard(season, "leaderboard-body");

  const matches = await getMatchesFromDB();
  const gameweeks = [...new Set(matches.map((m) => m.gameweek))].sort(
    (a, b) => a - b,
  );

  const DOUBLE_POINTS_GAMEWEEKS = [1, 19];
  const TRIPLE_POINTS_GAMEWEEKS = [38];

  const gwButtons = document.getElementById("gw-buttons");
  gwButtons.innerHTML = gameweeks
    .map((gw) => {
      const isDouble = DOUBLE_POINTS_GAMEWEEKS.includes(gw);
      const isTriple = TRIPLE_POINTS_GAMEWEEKS.includes(gw);
      const badgeColor = isTriple ? "#a855f7" : "#f87171";
      const badgeText = isTriple ? "3x" : "2x";
      return `
      <div style="position:relative;display:inline-block">
          <button
              class="secondary"
              data-gw="${gw}"
              onclick="loadGameweekLeaderboard(${gw})"
              style="padding:0.4rem 0.8rem;font-size:0.85rem">
              Runde ${gw}
          </button>
          ${isDouble || isTriple ? `<span style="position:absolute;top:-8px;right:-8px;background:${badgeColor};color:white;border-radius:50%;width:18px;height:18px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;font-weight:700;z-index:10">${badgeText}</span>` : ""}
      </div>
    `;
    })
    .join("");

  const adminStatus = await isAdmin();
  if (adminStatus) {
    document.getElementById("admin-link").style.display = "block";
  }

  const settings = await getSettings();
  if (Array.isArray(settings)) {
    const visibleSetting = settings.find(
      (s) => s.key === "season_predictions_visible",
    );
    if (visibleSetting && visibleSetting.value === "true") {
      await loadSeasonPredictionsComparison();
    }
  }
}
loadPage();
