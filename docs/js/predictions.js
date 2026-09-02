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

let allMatches = [];
let userPredictions = [];
let currentGameweek = 1;
let seasonTeams = [];
let selectedTeamIndex = null;
let gwGridOpen = false;

const PL_TEAMS = [
  "Arsenal FC",
  "Aston Villa FC",
  "AFC Bournemouth",
  "Brentford FC",
  "Brighton & Hove Albion FC",
  "Chelsea FC",
  "Coventry City FC",
  "Crystal Palace FC",
  "Everton FC",
  "Fulham FC",
  "Hull City AFC",
  "Ipswich Town FC",
  "Leeds United FC",
  "Liverpool FC",
  "Manchester City FC",
  "Manchester United FC",
  "Newcastle United FC",
  "Nottingham Forest FC",
  "Sunderland AFC",
  "Tottenham Hotspur FC",
];

function switchTab(tab) {
  if (tab === "matches") {
    document.getElementById("matches-tab").style.display = "block";
    document.getElementById("season-tab").style.display = "none";
    document.getElementById("tab-matches").style.borderBottomColor = "var(--accent)";
    document.getElementById("tab-matches").style.color = "var(--text)";
    document.getElementById("tab-matches").style.fontWeight = "600";
    document.getElementById("tab-season").style.borderBottomColor = "transparent";
    document.getElementById("tab-season").style.color = "var(--text-muted)";
    document.getElementById("tab-season").style.fontWeight = "400";
  } else {
    document.getElementById("matches-tab").style.display = "none";
    document.getElementById("season-tab").style.display = "block";
    document.getElementById("tab-season").style.borderBottomColor = "var(--accent)";
    document.getElementById("tab-season").style.color = "var(--text)";
    document.getElementById("tab-season").style.fontWeight = "600";
    document.getElementById("tab-matches").style.borderBottomColor = "transparent";
    document.getElementById("tab-matches").style.color = "var(--text-muted)";
    document.getElementById("tab-matches").style.fontWeight = "400";
    loadSeasonPrediction();
  }
}

function normalizeDate(dateStr) {
  return dateStr && !dateStr.endsWith("Z") && !dateStr.includes("+")
    ? dateStr + "Z"
    : dateStr;
}

function shortTeam(name) {
  const parts = name.split(" ").filter(w => w !== "AFC" && w !== "FC" && w !== "&");
  return parts[0] || name;
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

function getUserPrediction(matchId) {
  return userPredictions.find((p) => p.match_id === matchId);
}

const DOUBLE_POINTS_GAMEWEEKS = [1, 19];
const TRIPLE_POINTS_GAMEWEEKS = [38];

function toggleGwGrid() {
  gwGridOpen = !gwGridOpen;
  const grid = document.getElementById("gw-grid");
  const arrow = document.getElementById("gw-toggle-arrow");
  if (grid) grid.style.display = gwGridOpen ? "flex" : "none";
  if (arrow) arrow.textContent = gwGridOpen ? "▲" : "▼";
}

function renderGameweekButtons(matches) {
  const gameweeks = [...new Set(matches.map((m) => m.gameweek))].sort(
    (a, b) => a - b,
  );
  const container = document.getElementById("gameweek-buttons");

  const isDouble = DOUBLE_POINTS_GAMEWEEKS.includes(currentGameweek);
  const isTriple = TRIPLE_POINTS_GAMEWEEKS.includes(currentGameweek);
  const badgeColor = isTriple ? "#a855f7" : "#f87171";
  const badgeText = isTriple ? "3x" : "2x";
  const showBadge = isDouble || isTriple;

  container.innerHTML = `
    <!-- Toggle button showing current gameweek -->
    <div style="margin-bottom:0.75rem;">
      <div style="position:relative;display:inline-block;">
        <button
          onclick="toggleGwGrid()"
          style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 1rem;font-size:0.95rem;font-weight:600;">
          Runde ${currentGameweek}
          <span id="gw-toggle-arrow" style="font-size:0.75rem;">▼</span>
        </button>
        ${showBadge ? `<span style="position:absolute;top:-8px;right:-8px;background:${badgeColor};color:white;border-radius:50%;width:18px;height:18px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;font-weight:700;z-index:10">${badgeText}</span>` : ""}
      </div>
    </div>

    <!-- Collapsible grid -->
    <div id="gw-grid" style="display:${gwGridOpen ? "flex" : "none"};gap:0.5rem;flex-wrap:wrap;">
      ${gameweeks
        .map((gw) => {
          const isD = DOUBLE_POINTS_GAMEWEEKS.includes(gw);
          const isT = TRIPLE_POINTS_GAMEWEEKS.includes(gw);
          const isCurrent = gw === currentGameweek;
          const bc = isT ? "#a855f7" : "#f87171";
          const bt = isT ? "3x" : "2x";
          return `
        <div style="position:relative;display:inline-block">
          <button
            class="${isCurrent ? "" : "secondary"}"
            onclick="selectGameweek(${gw})"
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

function renderMatches(matches) {
  const filtered = matches.filter((m) => m.gameweek === currentGameweek);
  const container = document.getElementById("matches-container");

  if (filtered.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-muted)">Ingen kamper denne runden</p>';
    return;
  }

  const doubleBanner = TRIPLE_POINTS_GAMEWEEKS.includes(currentGameweek)
    ? `<div style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.8rem">
        <span style="font-size:1.5rem">⚡</span>
        <div>
            <div style="font-weight:700;color:#a855f7">Trippel poeng runde!</div>
            <div style="color:var(--text-muted);font-size:0.85rem">Alle tippinger denne runden gir tre ganger så mange poeng</div>
        </div>
       </div>`
    : DOUBLE_POINTS_GAMEWEEKS.includes(currentGameweek)
      ? `<div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.8rem">
        <span style="font-size:1.5rem">🔥</span>
        <div>
            <div style="font-weight:700;color:var(--danger)">Dobbel poeng runde!</div>
            <div style="color:var(--text-muted);font-size:0.85rem">Alle tippinger denne runden gir dobbelt så mange poeng</div>
        </div>
       </div>`
      : "";

  container.innerHTML =
    doubleBanner +
    filtered
      .map((m) => {
        const prediction = getUserPrediction(m.id);
        const isFinished = m.status === "FINISHED";
        const matchDeadline = new Date(new Date(normalizeDate(m.kickoff_time)).getTime() - 2 * 60 * 60 * 1000);
        const isPast = matchDeadline < new Date();

        const cardStyle = prediction && !isPast && !isFinished
          ? 'border: 1.5px solid rgba(74,222,128,0.45); box-shadow: inset 0 0 24px rgba(74,222,128,0.07);'
          : '';
        return `
<div class="match-card" style="flex-direction:column;align-items:stretch;gap:0;padding:0;overflow:hidden;${cardStyle}">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:1.2rem 1.5rem;gap:0.8rem;${isFinished ? "cursor:pointer" : ""}"
        ${isFinished ? `onclick="toggleMatchPredictions('${m.id}', '${m.home_team}', '${m.away_team}', ${m.home_score}, ${m.away_score})"` : ""}>
        <div class="match-teams" style="flex:1">
            <span class="match-team">${m.home_team}</span>
            ${
              isFinished
                ? `<span class="match-score">${m.home_score} - ${m.away_score}</span>`
                : `<span class="match-score" style="background:none;color:var(--text-muted)">vs</span>`
            }
            <span class="match-team away">${m.away_team}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem">
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.25rem">
                <span class="badge ${isFinished ? "finished" : "upcoming"}">${isFinished ? "Ferdig" : `<span style="font-size:0.85em;font-weight:600;opacity:0.9">Frist: </span>${formatDate(new Date(new Date(normalizeDate(m.kickoff_time)).getTime() - 2 * 60 * 60 * 1000).toISOString())}`}</span>
                ${!isFinished ? `<span style="font-size:0.75rem;color:var(--text-muted)">Kampstart: ${formatDate(m.kickoff_time)}</span>` : ""}
            </div>
            ${isFinished ? `<span id="arrow-${m.id}" style="color:var(--text-muted);font-size:0.8rem">▼</span>` : ""}
        </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding:0.8rem 1.5rem;">
        <span style="color:var(--text-muted);font-size:0.85rem">Din tipping:</span>
        ${
          isPast || isFinished
            ? prediction
              ? `<span style="font-weight:600">${prediction.predicted_home} - ${prediction.predicted_away}
               ${prediction.points_awarded !== null ? `<span style="color:var(--accent);margin-left:0.5rem">${prediction.points_awarded} p</span>` : ""}</span>`
              : `<span style="color:var(--text-muted)">Ingen tipping</span>`
            : prediction
              ? `<div style="display:flex;flex-direction:column;gap:0.35rem;align-items:flex-end">
                <span style="font-size:0.72rem;color:var(--accent);font-weight:600;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:6px;padding:0.15rem 0.5rem;">
                  ✓ Lagret: ${prediction.predicted_home} – ${prediction.predicted_away}
                </span>
                <div style="display:flex;align-items:center;gap:0.5rem">
                  <div style="display:flex;flex-direction:column;align-items:center;gap:0.2rem">
                    <div style="display:flex;gap:0.25rem;font-size:0.7rem;color:var(--text-muted);font-weight:600;letter-spacing:0.03em">
                      <span style="min-width:44px;text-align:center">${shortTeam(m.home_team)}</span>
                      <span style="width:14px"></span>
                      <span style="min-width:44px;text-align:center">${shortTeam(m.away_team)}</span>
                    </div>
                    <div class="prediction-inputs">
                      <input type="number" id="home-${m.id}" value="${prediction.predicted_home}" min="0" max="20">
                      <span style="color:var(--text-muted)">-</span>
                      <input type="number" id="away-${m.id}" value="${prediction.predicted_away}" min="0" max="20">
                    </div>
                  </div>
                  <button onclick="savePrediction('${m.id}')" style="padding:0.4rem 0.8rem;font-size:0.85rem">Oppdater</button>
                </div>
               </div>`
              : `<div style="display:flex;align-items:center;gap:0.5rem">
                <div style="display:flex;flex-direction:column;align-items:center;gap:0.2rem">
                  <div style="display:flex;gap:0.25rem;font-size:0.7rem;color:var(--text-muted);font-weight:600;letter-spacing:0.03em">
                    <span style="min-width:44px;text-align:center">${shortTeam(m.home_team)}</span>
                    <span style="width:14px"></span>
                    <span style="min-width:44px;text-align:center">${shortTeam(m.away_team)}</span>
                  </div>
                  <div class="prediction-inputs">
                    <input type="number" id="home-${m.id}" value="0" min="0" max="20">
                    <span style="color:var(--text-muted)">-</span>
                    <input type="number" id="away-${m.id}" value="0" min="0" max="20">
                  </div>
                </div>
                <button onclick="savePrediction('${m.id}')" style="padding:0.4rem 0.8rem;font-size:0.85rem">Tipp</button>
               </div>`
        }
    </div>
    <div id="match-history-${m.id}"></div>
</div>`;
      })
      .join("");
}

async function savePrediction(matchId) {
  const btn = document.querySelector(
    `button[onclick="savePrediction('${matchId}')"]`,
  );
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
  }

  const home = parseInt(document.getElementById(`home-${matchId}`).value);
  const away = parseInt(document.getElementById(`away-${matchId}`).value);

  const result = await submitPrediction(matchId, home, away);

  if (result.message) {
    await loadPredictions();
    renderMatches(allMatches);
  } else {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Tipp";
    }
    const errorMsg = typeof result.error === "string"
      ? result.error
      : "Kunne ikke lagre tipping. Prøv igjen.";
    alert(errorMsg);
  }
}

function selectGameweek(gw) {
  currentGameweek = gw;
  gwGridOpen = false;
  renderGameweekButtons(allMatches);
  renderMatches(allMatches);
}

async function loadPredictions() {
  const userId = localStorage.getItem("userId");
  userPredictions = await getUserPredictions(userId);
}

function renderSeasonStandings(teams) {
  const list = document.getElementById("season-standings-list");
  list.innerHTML = teams
    .map(
      (team, i) => `
    <div id="team-${i}"
        onclick="selectOrSwap(${i})"
        style="display:flex;align-items:center;gap:1rem;padding:0.8rem;margin-bottom:0.4rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.15s ease;">
        <span style="color:var(--accent);font-weight:700;min-width:24px">${i + 1}</span>
        <span style="flex:1;font-weight:500">${team}</span>
        <span style="color:var(--text-muted);font-size:1rem">⇅</span>
    </div>
  `,
    )
    .join("");
}

function selectOrSwap(index) {
  if (selectedTeamIndex === null) {
    selectedTeamIndex = index;
    const el = document.getElementById(`team-${index}`);
    el.style.borderColor = "var(--accent)";
    el.style.background = "rgba(74,222,128,0.1)";
  } else if (selectedTeamIndex === index) {
    const el = document.getElementById(`team-${index}`);
    el.style.borderColor = "var(--border)";
    el.style.background = "var(--bg-input)";
    selectedTeamIndex = null;
  } else {
    const a = selectedTeamIndex;
    const b = index;
    const temp = seasonTeams[a];
    seasonTeams[a] = seasonTeams[b];
    seasonTeams[b] = temp;
    selectedTeamIndex = null;
    renderSeasonStandings(seasonTeams);
  }
}

async function loadSeasonPrediction() {
  const userId = localStorage.getItem("userId");
  const existing = await getSeasonPrediction(userId, "2026-27");
  const statusEl = document.getElementById("season-prediction-status");

  if (existing && existing.length > 0 && existing[0].predicted_standings) {
    seasonTeams = existing[0].predicted_standings;
    if (existing[0].points_awarded !== null) {
      statusEl.innerHTML = `<div class="alert success">Du fikk ${existing[0].points_awarded} poeng på sesongtippingen!</div>`;
    } else {
      statusEl.innerHTML = `<div class="alert success" style="display:block">Du har allerede levert en tipping. Du kan oppdatere den frem til sesongstart.</div>`;
    }
  } else {
    seasonTeams = [...PL_TEAMS];
    statusEl.innerHTML = "";
  }

  renderSeasonStandings(seasonTeams);
}

async function saveSeasonPrediction() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Lagrer...';

  const result = await submitSeasonPrediction("2026-27", seasonTeams);

  btn.disabled = false;
  btn.innerHTML = "Lagre tipping";

  if (result.message) {
    alert("Sesongtipping lagret!");
  } else {
    alert("Kunne ikke lagre. Prøv igjen.");
  }
}

function loadDeadlineCountdown() {
  if (!allMatches || allMatches.length === 0) return;

  // Deadline is 3 hours before the first match of the season
  const firstMatch = allMatches
    .slice()
    .sort((a, b) => new Date(normalizeDate(a.kickoff_time)) - new Date(normalizeDate(b.kickoff_time)))[0];
  if (!firstMatch) return;

  const deadline = new Date(new Date(normalizeDate(firstMatch.kickoff_time)).getTime() - 3 * 60 * 60 * 1000);
  const now = new Date();
  if (now > deadline) return;

  const countdown = document.getElementById("deadline-countdown");
  const countdownText = document.getElementById("countdown-text");
  countdown.style.display = "inline-flex";

  function updateCountdown() {
    const now = new Date();
    const diff = deadline - now;
    if (diff <= 0) {
      countdownText.textContent = "Fristen er utløpt";
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      countdownText.textContent = `Sesongtipping stenger om ${days} dager, ${hours} timer og ${minutes} min`;
    } else if (hours > 0) {
      countdownText.textContent = `Sesongtipping stenger om ${hours} timer, ${minutes} min og ${seconds} sek`;
    } else {
      countdownText.textContent = `Sesongtipping stenger om ${minutes} min og ${seconds} sek`;
    }
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

async function toggleMatchPredictions(
  matchId,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
) {
  const container = document.getElementById(`match-history-${matchId}`);
  const arrow = document.getElementById(`arrow-${matchId}`);
  const existing = document.getElementById(`history-${matchId}`);

  if (existing) {
    const isHidden = existing.style.display === "none";
    existing.style.display = isHidden ? "block" : "none";
    if (arrow) arrow.textContent = isHidden ? "▲" : "▼";
    return;
  }

  if (arrow) arrow.textContent = "▲";

  const res = await fetch(`${API_URL}/Predictions/match/${matchId}`, {
    headers: getHeaders(),
  });
  const predictions = await res.json();

  if (!container) return;

  if (!predictions || predictions.length === 0) {
    container.innerHTML = `
      <div id="history-${matchId}" style="padding:0.8rem 1.5rem;border-top:1px solid var(--border);color:var(--text-muted);font-size:0.85rem">
          Ingen tippinger for denne kampen
      </div>`;
    return;
  }

  container.innerHTML = `
    <div id="history-${matchId}" style="border-top:1px solid var(--border);padding:0.5rem 0">
        <div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:0.5rem;padding:0.4rem 1.5rem;margin-bottom:0.3rem;align-items:center">
            <span></span>
            <span style="color:var(--text-muted);font-size:0.8rem;font-weight:600">SPILLER</span>
            <span style="color:var(--text-muted);font-size:0.8rem;font-weight:600;text-align:center">TIPPING</span>
            <span style="color:var(--text-muted);font-size:0.8rem;font-weight:600;text-align:right">POENG</span>
        </div>
        ${predictions
          .map((p) => {
            const pts = p.points_awarded;
            const isExact =
              p.predicted_home === homeScore && p.predicted_away === awayScore;
            const isCorrect = pts > 0;
            const pointColor = isExact
              ? "var(--accent)"
              : isCorrect
                ? "#facc15"
                : "var(--text-muted)";
            const icon = isExact ? "🎯" : isCorrect ? "✅" : "❌";
            const name = p.users?.username || "Ukjent";
            const avatarUrl = p.users?.avatar_url || null;

            const avatarHtml = avatarUrl
              ? `<img src="${avatarUrl}" alt="${name}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;flex-shrink:0;" />`
              : `<div style="width:28px;height:28px;border-radius:50%;background:var(--bg-input);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:var(--accent);flex-shrink:0;">${name[0].toUpperCase()}</div>`;

            return `
          <div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:0.5rem;align-items:center;padding:0.5rem 1.5rem;background:${isExact ? "rgba(74,222,128,0.05)" : "transparent"}">
              ${avatarHtml}
              <span style="font-size:0.9rem;font-weight:500">${name}</span>
              <span style="text-align:center;font-weight:600;font-size:0.9rem;background:var(--bg-input);padding:0.2rem 0.6rem;border-radius:6px">${p.predicted_home} - ${p.predicted_away}</span>
              <span style="text-align:right;font-weight:700;color:${pointColor};font-size:0.9rem">${icon} ${pts !== null ? pts + "p" : "-"}</span>
          </div>`;
          })
          .join("")}
    </div>
  `;
}

function toggleNav() {
  document.getElementById("nav-menu").classList.toggle("open");
}
window.toggleNav = toggleNav;
window.toggleMatchPredictions = toggleMatchPredictions;
window.toggleGwGrid = toggleGwGrid;

async function loadPage() {
  allMatches = await getMatchesFromDB();

  const now = new Date();
  const upcoming = allMatches.filter((m) => new Date(normalizeDate(m.kickoff_time)) > now);
  if (upcoming.length > 0) {
    currentGameweek = upcoming[0].gameweek;
  } else {
    currentGameweek = Math.max(...allMatches.map((m) => m.gameweek));
  }

  await loadPredictions();
  renderGameweekButtons(allMatches);
  renderMatches(allMatches);

  const adminStatus = await isAdmin();
  if (adminStatus) {
    document.getElementById("admin-link").style.display = "block";
  }

  const adminLink2 = document.getElementById("admin-link-secondary");
  if (adminLink2) adminLink2.style.display = "block";

  loadDeadlineCountdown();
}

// Open season tab directly if URL hash is #season (e.g. from home page banner)
if (window.location.hash === "#season") {
  switchTab("season");
}

loadPage();

window.switchTab = switchTab;
window.savePrediction = savePrediction;
window.selectGameweek = selectGameweek;
window.saveSeasonPrediction = saveSeasonPrediction;
window.selectOrSwap = selectOrSwap;
