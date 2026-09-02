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
    <h2>💰 Potten</h2>
    <div style="text-align:center;margin:1rem 0 1.8rem">
      <div style="font-size:2.4rem;font-weight:800;color:var(--accent)">${amount.toLocaleString("nb-NO")} kr</div>
      <div style="color:var(--text-muted);font-size:0.85rem;margin-top:0.3rem">Totalt innestående</div>
    </div>
    <div style="font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:0.8rem">Premiering</div>
    <div style="display:flex;justify-content:center;align-items:flex-end;gap:0.5rem">
      <!-- 2nd -->
      <div style="display:flex;flex-direction:column;align-items:center;flex:1">
        <div style="font-size:1.5rem;margin-bottom:0.3rem">🥈</div>
        <div style="font-weight:700;font-size:1rem">${fmt(second)}</div>
        <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">30%</div>
        <div style="background:rgba(148,163,184,0.2);border-radius:6px 6px 0 0;width:100%;height:52px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;color:var(--text-muted)">2</div>
      </div>
      <!-- 1st -->
      <div style="display:flex;flex-direction:column;align-items:center;flex:1">
        <div style="font-size:1.8rem;margin-bottom:0.3rem">🥇</div>
        <div style="font-weight:800;font-size:1.1rem;color:var(--accent)">${fmt(first)}</div>
        <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">50%</div>
        <div style="background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.25);border-radius:6px 6px 0 0;width:100%;height:76px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;color:var(--accent)">1</div>
      </div>
      <!-- 3rd -->
      <div style="display:flex;flex-direction:column;align-items:center;flex:1">
        <div style="font-size:1.5rem;margin-bottom:0.3rem">🥉</div>
        <div style="font-weight:700;font-size:1rem">${fmt(third)}</div>
        <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.5rem">20%</div>
        <div style="background:rgba(217,119,6,0.12);border-radius:6px 6px 0 0;width:100%;height:36px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;color:#d97706">3</div>
      </div>
    </div>
  `;
}

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
