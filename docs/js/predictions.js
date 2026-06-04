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

function renderGameweekButtons(matches) {
  const gameweeks = [...new Set(matches.map((m) => m.gameweek))].sort(
    (a, b) => a - b,
  );
  const container = document.getElementById("gameweek-buttons");
  container.innerHTML = gameweeks
    .map(
      (gw) => `
        <button 
            class="${gw === currentGameweek ? "" : "secondary"}" 
            onclick="selectGameweek(${gw})"
            style="padding:0.4rem 0.8rem;font-size:0.85rem">
            Runde ${gw}
        </button>
    `,
    )
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

  container.innerHTML = filtered
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
  const home = parseInt(document.getElementById(`home-${matchId}`).value);
  const away = parseInt(document.getElementById(`away-${matchId}`).value);

  const result = await submitPrediction(matchId, home, away);

  if (result.message) {
    await loadPredictions();
    renderMatches(allMatches);
  } else {
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

async function loadPage() {
  allMatches = await getMatchesFromDB();

  // Find current or next gameweek
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

  // Show admin link if admin
  const adminStatus = await isAdmin();
  if (adminStatus) {
    document.getElementById("admin-link").style.display = "block";
  }
}

loadPage();
