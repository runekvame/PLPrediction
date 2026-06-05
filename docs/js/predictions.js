if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "index.html";
}

let allMatches = [];
let userPredictions = [];
let currentGameweek = 1;
let seasonTeams = [];

const PL_TEAMS = [
  "Arsenal FC",
  "Aston Villa FC",
  "AFC Bournemouth",
  "Brentford FC",
  "Brighton & Hove Albion FC",
  "Burnley FC",
  "Chelsea FC",
  "Crystal Palace FC",
  "Everton FC",
  "Fulham FC",
  "Leeds United FC",
  "Liverpool FC",
  "Manchester City FC",
  "Manchester United FC",
  "Newcastle United FC",
  "Nottingham Forest FC",
  "Sunderland AFC",
  "Tottenham Hotspur FC",
  "West Ham United FC",
  "Wolverhampton Wanderers FC",
];

function switchTab(tab) {
  if (tab === "matches") {
    document.getElementById("matches-tab").style.display = "block";
    document.getElementById("season-tab").style.display = "none";
    document.getElementById("tab-matches").style.borderBottomColor =
      "var(--accent)";
    document.getElementById("tab-matches").style.color = "var(--text)";
    document.getElementById("tab-season").style.borderBottomColor =
      "transparent";
    document.getElementById("tab-season").style.color = "var(--text-muted)";
  } else {
    document.getElementById("matches-tab").style.display = "none";
    document.getElementById("season-tab").style.display = "block";
    document.getElementById("tab-season").style.borderBottomColor =
      "var(--accent)";
    document.getElementById("tab-season").style.color = "var(--text)";
    document.getElementById("tab-matches").style.borderBottomColor =
      "transparent";
    document.getElementById("tab-matches").style.color = "var(--text-muted)";
    loadSeasonPrediction();
  }
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

function getUserPrediction(matchId) {
  return userPredictions.find((p) => p.match_id === matchId);
}

const DOUBLE_POINTS_GAMEWEEKS = [1, 19];
const TRIPLE_POINTS_GAMEWEEKS = [38];

function renderGameweekButtons(matches) {
  const gameweeks = [...new Set(matches.map((m) => m.gameweek))].sort(
    (a, b) => a - b,
  );
  const container = document.getElementById("gameweek-buttons");
  container.innerHTML = gameweeks
    .map((gw) => {
      const isDouble = DOUBLE_POINTS_GAMEWEEKS.includes(gw);
      const isTriple = TRIPLE_POINTS_GAMEWEEKS.includes(gw);
      const isCurrent = gw === currentGameweek;
      const badgeColor = isTriple ? "#a855f7" : "#f87171";
      const badgeText = isTriple ? "3x" : "2x";
      return `
            <div style="position:relative;display:inline-block">
                <button 
                    class="${isCurrent ? "" : "secondary"}" 
                    onclick="selectGameweek(${gw})"
                    style="padding:0.4rem 0.8rem;font-size:0.85rem">
                    Runde ${gw}
                </button>
                ${isDouble || isTriple ? `<span style="position:absolute;top:-8px;right:-8px;background:${badgeColor};color:white;border-radius:50%;width:18px;height:18px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;font-weight:700;z-index:10">${badgeText}</span>` : ""}
            </div>
        `;
    })
    .join("");
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
        const isPast = new Date(m.kickoff_time) < new Date();

        return `
        <div class="match-card" style="flex-direction:column;align-items:stretch;gap:0.8rem">
            <div style="display:flex;align-items:center;justify-content:space-between">
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
                    <span class="badge ${isFinished ? "finished" : "upcoming"}">${isFinished ? "Ferdig" : formatDate(m.kickoff_time)}</span>
                </div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding-top:0.8rem">
                <span style="color:var(--text-muted);font-size:0.85rem">Din tipping:</span>
                ${
                  isPast || isFinished
                    ? prediction
                      ? `<span style="font-weight:600">${prediction.predicted_home} - ${prediction.predicted_away} 
                           ${prediction.points_awarded !== null ? `<span style="color:var(--accent);margin-left:0.5rem">${prediction.points_awarded} p</span>` : ""}</span>`
                      : `<span style="color:var(--text-muted)">Ingen tipping</span>`
                    : prediction
                      ? `<div style="display:flex;align-items:center;gap:0.5rem">
                            <div class="prediction-inputs">
                                <input type="number" id="home-${m.id}" value="${prediction.predicted_home}" min="0" max="20">
                                <span style="color:var(--text-muted)">-</span>
                                <input type="number" id="away-${m.id}" value="${prediction.predicted_away}" min="0" max="20">
                            </div>
                            <button onclick="savePrediction('${m.id}')" style="padding:0.4rem 0.8rem;font-size:0.85rem">Oppdater</button>
                           </div>`
                      : `<div style="display:flex;align-items:center;gap:0.5rem">
                            <div class="prediction-inputs">
                                <input type="number" id="home-${m.id}" value="0" min="0" max="20">
                                <span style="color:var(--text-muted)">-</span>
                                <input type="number" id="away-${m.id}" value="0" min="0" max="20">
                            </div>
                            <button onclick="savePrediction('${m.id}')" style="padding:0.4rem 0.8rem;font-size:0.85rem">Tipp</button>
                           </div>`
                }
            </div>
        </div>
        `;
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
    alert("Kunne ikke lagre tipping. Prøv igjen.");
  }
}

function selectGameweek(gw) {
  currentGameweek = gw;
  renderGameweekButtons(allMatches);
  renderMatches(allMatches);
}

async function loadPredictions() {
  const userId = localStorage.getItem("userId");
  userPredictions = await getUserPredictions(userId);
}

// Season prediction
let dragSrcIndex = null;

function renderSeasonStandings(teams) {
  const list = document.getElementById("season-standings-list");
  list.innerHTML = teams
    .map(
      (team, i) => `
        <div id="team-${i}" draggable="true"
            ondragstart="dragStart(event, ${i})"
            ondragover="dragOver(event, ${i})"
            ondragleave="dragLeave(event)"
            ondrop="drop(event, ${i})"
            ondragend="dragEnd(event)"
            style="display:flex;align-items:center;gap:1rem;padding:0.8rem;margin-bottom:0.4rem;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;cursor:grab;transition:all 0.15s ease">
            <span style="color:var(--accent);font-weight:700;min-width:24px">${i + 1}</span>
            <span style="flex:1;font-weight:500">${team}</span>
            <span style="color:var(--text-muted);font-size:1rem">⠿</span>
        </div>
    `,
    )
    .join("");
}

function dragStart(event, index) {
  dragSrcIndex = index;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", index);
  setTimeout(() => {
    document.getElementById(`team-${index}`).style.opacity = "0.4";
  }, 0);
}

function dragOver(event, index) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  document.querySelectorAll('[id^="team-"]').forEach((el) => {
    el.style.borderColor = "var(--border)";
    el.style.transform = "scale(1)";
  });
  const target = document.getElementById(`team-${index}`);
  if (target && dragSrcIndex !== index) {
    target.style.borderColor = "var(--accent)";
    target.style.transform = "scale(1.02)";
  }
}

function dragLeave(event) {
  event.target.closest("[draggable]").style.borderColor = "var(--border)";
  event.target.closest("[draggable]").style.transform = "scale(1)";
}

function dragEnd(event) {
  document.querySelectorAll('[id^="team-"]').forEach((el) => {
    el.style.opacity = "1";
    el.style.borderColor = "var(--border)";
    el.style.transform = "scale(1)";
  });
}

function drop(event, index) {
  event.preventDefault();
  if (dragSrcIndex === null || dragSrcIndex === index) return;

  const moved = seasonTeams.splice(dragSrcIndex, 1)[0];
  seasonTeams.splice(index, 0, moved);
  dragSrcIndex = null;
  renderSeasonStandings(seasonTeams);
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

async function loadDeadlineCountdown() {
  const settings = await getSettings();
  if (!Array.isArray(settings)) return;

  const deadlineSetting = settings.find(
    (s) => s.key === "season_predictions_deadline",
  );
  if (!deadlineSetting) return;

  const deadline = new Date(deadlineSetting.value);
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

async function loadPage() {
  allMatches = await getMatchesFromDB();

  const now = new Date();
  const upcoming = allMatches.filter((m) => new Date(m.kickoff_time) > now);
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
  await loadDeadlineCountdown();
}

loadPage();

window.switchTab = switchTab;
window.savePrediction = savePrediction;
window.selectGameweek = selectGameweek;
window.saveSeasonPrediction = saveSeasonPrediction;
window.dragStart = dragStart;
window.dragOver = dragOver;
window.dragLeave = dragLeave;
window.dragEnd = dragEnd;
window.drop = drop;
