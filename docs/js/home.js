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
  const el = document.querySelector(".nav-username");
  if (el) el.textContent = username;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderUpcomingMatches(matches) {
  const upcoming = matches
    .filter((m) => m.status === "TIMED" || m.status === "SCHEDULED")
    .slice(0, 5);

  if (upcoming.length === 0) {
    return '<p style="color:var(--text-muted)">Ingen kommende kamper</p>';
  }

  return upcoming
    .map(
      (m) => `
    <div class="match-card">
        <div class="match-teams">
            <span class="match-team">${m.home_team}</span>
            <span class="match-score" style="background:none;color:var(--text-muted)">vs</span>
            <span class="match-team away">${m.away_team}</span>
        </div>
        <div class="match-info">${formatDate(m.kickoff_time)}</div>
    </div>
  `,
    )
    .join("");
}

function renderRecentMatches(matches) {
  const recent = matches
    .filter((m) => m.status === "FINISHED")
    .slice(-5)
    .reverse();

  if (recent.length === 0) {
    return '<p style="color:var(--text-muted)">Ingen resultater ennå</p>';
  }

  return recent
    .map(
      (m) => `
    <div class="match-card">
        <div class="match-teams">
            <span class="match-team">${m.home_team}</span>
            <span class="match-score">${m.home_score} - ${m.away_score}</span>
            <span class="match-team away">${m.away_team}</span>
        </div>
        <span class="badge finished">Ferdig</span>
    </div>
  `,
    )
    .join("");
}

function renderPodium(players) {
  const podium = document.getElementById("podium");
  if (!players || players.length === 0) {
    podium.innerHTML =
      '<p style="color:var(--text-muted);padding:1rem">Ingen spillere ennå</p>';
    return;
  }

  const top3 = players.slice(0, 3);
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  function placeHTML(player, rank) {
    const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
    const classes = { 1: "first", 2: "second", 3: "third" };

    if (!player) {
      return `
        <div class="podium-place ${classes[rank]} podium-empty">
            <div class="podium-avatar">${medals[rank]}</div>
            <div class="podium-name">-</div>
            <div class="podium-points">0 p</div>
            <div class="podium-block">${rank}</div>
        </div>`;
    }

    const initial = (player.username || "?")[0].toUpperCase();
    return `
      <div class="podium-place ${classes[rank]}">
          <div class="podium-avatar">${initial}</div>
          <div class="podium-name">${player.username || "Ukjent"}</div>
          <div class="podium-points">${player.total_points ?? 0} p</div>
          <div class="podium-block">${medals[rank]}</div>
      </div>`;
  }

  podium.innerHTML =
    placeHTML(second, 2) + placeHTML(first, 1) + placeHTML(third, 3);
}

function toggleNav() {
  document.getElementById("nav-menu").classList.toggle("open");
}
window.toggleNav = toggleNav;

async function loadPage() {
  const matches = await getMatchesFromDB();
  document.getElementById("upcoming-matches").innerHTML =
    renderUpcomingMatches(matches);
  document.getElementById("recent-matches").innerHTML =
    renderRecentMatches(matches);

  const leaderboard = await getLeaderboard();
  renderPodium(leaderboard);

  const DOUBLE_POINTS_GAMEWEEKS = [1, 19];
  const TRIPLE_POINTS_GAMEWEEKS = [38];
  const now = new Date();
  const upcomingMatches = matches.filter((m) => new Date(m.kickoff_time) > now);
  const currentGW =
    upcomingMatches.length > 0
      ? upcomingMatches[0].gameweek
      : Math.max(...matches.map((m) => m.gameweek));

  const isDouble = DOUBLE_POINTS_GAMEWEEKS.includes(currentGW);
  const isTriple = TRIPLE_POINTS_GAMEWEEKS.includes(currentGW);
  const gwColor = isTriple ? "#a855f7" : isDouble ? "#f87171" : "var(--accent)";
  const gwExtra = isTriple
    ? " ⚡ Trippel poeng"
    : isDouble
      ? " 🔥 Dobbel poeng"
      : "";

  document.getElementById("gameweek-text").innerHTML =
    `<span style="color:var(--text-muted)">Nåværende runde:</span> <span style="font-weight:700;color:${gwColor}">Runde ${currentGW}${gwExtra}</span>`;
  document.querySelector(
    "#gameweek-indicator span:first-child",
  ).style.background = gwColor;

  if (isTriple) {
    document.querySelector(".page-header").insertAdjacentHTML(
      "afterend",
      `
      <div style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.8rem">
          <span style="font-size:1.5rem">⚡</span>
          <div>
              <div style="font-weight:700;color:#a855f7">Trippel poeng runde ${currentGW}!</div>
              <div style="color:var(--text-muted);font-size:0.85rem">Denne spillerunden gir tre ganger så mange poeng</div>
          </div>
      </div>
    `,
    );
  } else if (isDouble) {
    document.querySelector(".page-header").insertAdjacentHTML(
      "afterend",
      `
      <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.8rem">
          <span style="font-size:1.5rem">🔥</span>
          <div>
              <div style="font-weight:700;color:var(--danger)">Dobbel poeng runde ${currentGW}!</div>
              <div style="color:var(--text-muted);font-size:0.85rem">Denne spillerunden gir dobbelt så mange poeng</div>
          </div>
      </div>
    `,
    );
  }

  const adminStatus = await isAdmin();
  if (adminStatus) {
    document.getElementById("admin-link").style.display = "block";
  }
}

loadPage();
