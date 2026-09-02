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

function normalizeDate(dateStr) {
  return dateStr && !dateStr.endsWith("Z") && !dateStr.includes("+")
    ? dateStr + "Z"
    : dateStr;
}

function formatDate(dateStr) {
  const date = new Date(normalizeDate(dateStr));
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
        <div class="match-info"><span style="font-size:0.85em;font-weight:600;opacity:0.9">Frist: </span>${formatDate(m.kickoff_time)}</div>
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

function podiumAvatarContent(player, rank) {
  // Returns either an <img> (photo) or the text initial, matching the
  // existing .podium-avatar size for each rank (first=68px, others=56px)
  if (!player) return { 1: "🥇", 2: "🥈", 3: "🥉" }[rank];

  if (player.avatar_url) {
    const size = rank === 1 ? "68px" : "56px";
    return `<img src="${player.avatar_url}" alt="${player.username}"
              style="width:${size};height:${size};object-fit:cover;border-radius:50%;display:block;" />`;
  }

  return (player.username || "?")[0].toUpperCase();
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

    return `
      <div class="podium-place ${classes[rank]}">
          <div class="podium-avatar">${podiumAvatarContent(player, rank)}</div>
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


function renderPotCard(amount) {
  const card = document.getElementById("pot-card");
  if (!card) return;
  if (!amount || amount <= 0) return;

  const first  = Math.round(amount * 0.5);
  const second = Math.round(amount * 0.3);
  const third  = Math.round(amount * 0.2);

  const fmt = (n) => n.toLocaleString("nb-NO") + " kr";

  card.style.display = "block";
  card.innerHTML = `
    <h2>💰 Potten — ${amount.toLocaleString("nb-NO")} kr</h2>
    <div class="podium">
      <div class="podium-place second">
        <div class="podium-avatar">🥈</div>
        <div class="podium-name">2. plass</div>
        <div class="podium-points" style="font-size:0.95rem;font-weight:700;color:var(--text)">${fmt(second)}</div>
        <div class="podium-block">30%</div>
      </div>
      <div class="podium-place first">
        <div class="podium-avatar">🥇</div>
        <div class="podium-name">1. plass</div>
        <div class="podium-points">${fmt(first)}</div>
        <div class="podium-block">50%</div>
      </div>
      <div class="podium-place third">
        <div class="podium-avatar">🥉</div>
        <div class="podium-name">3. plass</div>
        <div class="podium-points" style="font-size:0.95rem;font-weight:700;color:var(--text)">${fmt(third)}</div>
        <div class="podium-block">20%</div>
      </div>
    </div>
  `;
}


function renderMyRank(players) {
  const userId = localStorage.getItem("userId");
  if (!userId || !players || players.length === 0) return;

  const idx = players.findIndex((p) => (p.id ?? p.user_id) === userId);
  if (idx === -1) return;

  const me = players[idx];
  const rank = idx + 1;
  const total = players.length;
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const icon = medals[rank] || `#${rank}`;
  const isTop3 = rank <= 3;
  const borderColor = isTop3 ? "rgba(74,222,128,0.35)" : "var(--border)";
  const bg = isTop3 ? "rgba(74,222,128,0.06)" : "transparent";

  const card = document.getElementById("my-rank-card");
  if (!card) return;

  card.style.display = "block";
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;padding:0.25rem 0">
      <div style="font-size:1.6rem;min-width:2rem;text-align:center">${icon}</div>
      <div style="flex:1">
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.15rem">Din plassering</div>
        <div style="font-weight:700;font-size:1rem">${rank}. plass av ${total} spillere</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:1.4rem;font-weight:800;color:var(--accent)">${me.total_points ?? 0}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">poeng</div>
      </div>
    </div>`;
  card.style.border = `1px solid ${borderColor}`;
  card.style.background = bg;
}

async function loadPage() {
  const matches = await getMatchesFromDB();
  document.getElementById("upcoming-matches").innerHTML =
    renderUpcomingMatches(matches);
  document.getElementById("recent-matches").innerHTML =
    renderRecentMatches(matches);

  const leaderboard = await getLeaderboard();
  renderPodium(leaderboard);
  renderMyRank(leaderboard);

  const DOUBLE_POINTS_GAMEWEEKS = [1, 19];
  const TRIPLE_POINTS_GAMEWEEKS = [38];
  const now = new Date();
  const upcomingMatches = matches.filter((m) => new Date(normalizeDate(m.kickoff_time)) > now);
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

  // Load pot amount
  const settings = await getSettings();
  if (Array.isArray(settings)) {
    const potSetting = settings.find((s) => s.key === "pot_amount");
    if (potSetting) renderPotCard(parseInt(potSetting.value, 10));
  }

  loadSeasonDeadlineCountdown(matches);

  const adminStatus = await isAdmin();
  if (adminStatus) {
    document.getElementById("admin-link").style.display = "block";
  }

  const adminLink2 = document.getElementById("admin-link-secondary");
  if (adminLink2) adminLink2.style.display = "block";
}

function loadSeasonDeadlineCountdown(matches) {
  if (!matches || matches.length === 0) return;

  // Deadline is 3 hours before the first match of the season
  const firstMatch = matches
    .slice()
    .sort((a, b) => new Date(normalizeDate(a.kickoff_time)) - new Date(normalizeDate(b.kickoff_time)))[0];
  if (!firstMatch) return;

  const deadline = new Date(new Date(normalizeDate(firstMatch.kickoff_time)).getTime() - 3 * 60 * 60 * 1000);
  const now = new Date();
  if (now > deadline) return;

  const banner = document.getElementById("season-deadline-banner");
  const bannerText = document.getElementById("season-deadline-text");
  if (!banner || !bannerText) return;

  banner.style.display = "flex";

  function updateCountdown() {
    const now = new Date();
    const diff = deadline - now;
    if (diff <= 0) {
      bannerText.textContent = "Fristen er utløpt";
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      bannerText.textContent = `Sesongtipping stenger om ${days} dager, ${hours} timer og ${minutes} min`;
    } else if (hours > 0) {
      bannerText.textContent = `Sesongtipping stenger om ${hours} timer, ${minutes} min og ${seconds} sek`;
    } else {
      bannerText.textContent = `Sesongtipping stenger om ${minutes} min og ${seconds} sek`;
    }
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

loadPage();
