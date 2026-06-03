if (!localStorage.getItem('token')) {
    window.location.href = 'index.html';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'index.html';
}

function renderLeaderboard(players, bodyId) {
    const body = document.getElementById(bodyId);
    if (!players || players.length === 0) {
        body.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted)">Ingen data</td></tr>';
        return;
    }

    const currentUserId = localStorage.getItem('userId');

    body.innerHTML = players.map((p, i) => `
        <tr style="${p.user_id === currentUserId ? 'background:rgba(74,222,128,0.05)' : ''}">
            <td class="rank">${i + 1}</td>
            <td style="font-weight:${p.user_id === currentUserId ? '700' : '400'}">${p.username || p.users?.username || '-'}</td>
            <td class="points" style="text-align:right">${p.total_points ?? p.points ?? 0}</td>
        </tr>
    `).join('');
}

async function loadGameweekLeaderboard(gw) {
    // Update button styles
    document.querySelectorAll('#gw-buttons button').forEach(btn => {
        btn.className = btn.dataset.gw == gw ? '' : 'secondary';
    });

    const data = await getGameweekLeaderboard(gw);
    renderLeaderboard(data, 'gw-leaderboard-body');
}

async function loadPage() {
    // Season leaderboard
    const season = await getLeaderboard();
    renderLeaderboard(season, 'leaderboard-body');

    // Gameweek buttons
    const matches = await getMatchesFromDB();
    const gameweeks = [...new Set(matches.map(m => m.gameweek))].sort((a, b) => a - b);

    const gwButtons = document.getElementById('gw-buttons');
    gwButtons.innerHTML = gameweeks.map(gw => `
        <button 
            class="secondary" 
            data-gw="${gw}"
            onclick="loadGameweekLeaderboard(${gw})"
            style="padding:0.4rem 0.8rem;font-size:0.85rem">
            Runde ${gw}
        </button>
    `).join('');
}

loadPage();