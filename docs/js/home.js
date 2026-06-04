// Check login
if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "index.html";
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

function renderMiniLeaderboard(players) {
  if (!players || players.length === 0) {
    return '<p style="color:var(--text-muted)">Ingen spillere ennå</p>';
  }

  return players
    .slice(0, 5)
    .map(
      (p, i) => `
        <div style="display:flex;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-muted)">${i + 1}. ${p.username}</span>
            <span style="color:var(--accent);font-weight:700">${p.total_points} p</span>
        </div>
    `,
    )
    .join("");
}

async function loadPage() {
  const matches = await getMatchesFromDB();
  document.getElementById("upcoming-matches").innerHTML =
    renderUpcomingMatches(matches);
  document.getElementById("recent-matches").innerHTML =
    renderRecentMatches(matches);

  const leaderboard = await getLeaderboard();
  document.getElementById("mini-leaderboard").innerHTML =
    renderMiniLeaderboard(leaderboard);

  // Show admin link if admin
  const adminStatus = await isAdmin();
  if (adminStatus) {
    document.getElementById("admin-link").style.display = "block";
  }
}

loadPage();
