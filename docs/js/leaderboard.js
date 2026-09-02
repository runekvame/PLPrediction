function normalizeDate(dateStr) {
  return dateStr && !dateStr.endsWith("Z") && !dateStr.includes("+")
    ? dateStr + "Z"
    : dateStr;
}

if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
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

document.addEventListener("click", function (e) {
  const avatar = document.querySelector(".nav-avatar");
  if (avatar && !avatar.contains(e.target)) {
    document.getElementById("nav-dropdown")?.classList.remove("open");
  }
});

window.toggleDropdown = toggleDropdown;

const DOUBLE_POINTS_GAMEWEEKS = [1, 19];
const TRIPLE_POINTS_GAMEWEEKS = [38];

let gwGridOpen = false;
let selectedGw = null;

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

function toggleGwGrid() {
  gwGridOpen = !gwGridOpen;
  const grid = document.getElementById("gw-grid");
  const arrow = document.getElementById("gw-toggle-arrow");
  if (grid) grid.style.display = gwGridOpen ? "flex" : "none";
  if (arrow) arrow.textContent = gwGridOpen ? "▲" : "▼";
}

function renderGwButtons(gameweeks) {
  const container = document.getElementById("gw-buttons");

  const isDouble = selectedGw
    ? DOUBLE_POINTS_GAMEWEEKS.includes(selectedGw)
    : false;
  const isTriple = selectedGw
    ? TRIPLE_POINTS_GAMEWEEKS.includes(selectedGw)
    : false;
  const badgeColor = isTriple ? "#a855f7" : "#f87171";
  const badgeText = isTriple ? "3x" : "2x";
  const showBadge = selectedGw && (isDouble || isTriple);
  const label = selectedGw ? `Runde ${selectedGw}` : "Velg spillerunde";

  container.innerHTML = `
    <div style="margin-bottom:0.75rem;">
      <div style="position:relative;display:inline-block;">
        <button
          onclick="toggleGwGrid()"
          style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 1rem;font-size:0.95rem;font-weight:600;">
          ${label}
          <span id="gw-toggle-arrow" style="font-size:0.75rem;">▼</span>
        </button>
        ${showBadge ? `<span style="position:absolute;top:-8px;right:-8px;background:${badgeColor};color:white;border-radius:50%;width:18px;height:18px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;font-weight:700;z-index:10">${badgeText}</span>` : ""}
      </div>
    </div>

    <div id="gw-grid" style="display:${gwGridOpen ? "flex" : "none"};gap:0.5rem;flex-wrap:wrap;">
      ${gameweeks
        .map((gw) => {
          const isD = DOUBLE_POINTS_GAMEWEEKS.includes(gw);
          const isT = TRIPLE_POINTS_GAMEWEEKS.includes(gw);
          const isCurrent = gw === selectedGw;
          const bc = isT ? "#a855f7" : "#f87171";
          const bt = isT ? "3x" : "2x";
          return `
        <div style="position:relative;display:inline-block">
          <button
            class="${isCurrent ? "" : "secondary"}"
            data-gw="${gw}"
            onclick="selectGw(${gw})"
            style="padding:0.4rem 0.8rem;font-size:0.85rem">
            Runde ${gw}
          </button>
          ${isD || isT ? `<span style="position:absolute;top:-8px;right:-8px;background:${bc};color:white;border-radius:50%;width:18px;height:18px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;font-weight:700;z-index:10">${bt}</span>` : ""}
        </div>`;
        })
        .join("")}
    </div>
  `;
}

let allGameweeks = [];

async function selectGw(gw) {
  selectedGw = gw;
  gwGridOpen = false;
  renderGwButtons(allGameweeks);
  const data = await getGameweekLeaderboard(gw);
  renderLeaderboard(data, "gw-leaderboard-body");
}

async function loadGameweekLeaderboard(gw) {
  await selectGw(gw);
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
window.toggleGwGrid = toggleGwGrid;

async function loadPage() {
  const season = await getLeaderboard();
  renderLeaderboard(season, "leaderboard-body");

  const matches = await getMatchesFromDB();
  allGameweeks = [...new Set(matches.map((m) => m.gameweek))].sort(
    (a, b) => a - b,
  );


  // Default to the last completed gameweek (has scores).
  // Fall back to the first upcoming GW, then the last GW overall.
  const now = new Date();

  const finishedGws = matches
    .filter((m) => m.status === "FINISHED")
    .map((m) => m.gameweek);
  const lastFinishedGw = finishedGws.length > 0 ? Math.max(...finishedGws) : null;

  const upcomingGws = matches
    .filter((m) => {
      const kickoff = new Date(normalizeDate(m.kickoff_time));
      return kickoff > now && (m.status === "TIMED" || m.status === "SCHEDULED");
    })
    .map((m) => m.gameweek);
  const firstUpcomingGw = upcomingGws.length > 0 ? Math.min(...upcomingGws) : null;

  const defaultGw = lastFinishedGw ?? firstUpcomingGw ?? allGameweeks[allGameweeks.length - 1];

  renderGwButtons(allGameweeks);
  if (defaultGw) await selectGw(defaultGw);

  const adminStatus = await isAdmin();
  if (adminStatus) {
    document.getElementById("admin-link").style.display = "block";
  }

  const adminLink2 = document.getElementById("admin-link-secondary");
  if (adminLink2) adminLink2.style.display = "block";

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
