if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "index.html";
}

function showAlert(message, type = "success") {
  const alert = document.getElementById("alert");
  alert.textContent = message;
  alert.className = `alert ${type}`;
  alert.style.display = "block";
  setTimeout(() => (alert.style.display = "none"), 4000);
}

async function syncMatches() {
  showAlert("Synkroniserer kamper...", "success");
  const res = await fetch(`${API_URL}/Matches/sync`);
  const data = await res.json();
  showAlert(data.message || "Kamper synkronisert!", "success");
}

async function scoreGameweek() {
  const gw = document.getElementById("score-gameweek").value;
  if (!gw) {
    showAlert("Skriv inn spillerundenummer", "error");
    return;
  }

  const res = await fetch(`${API_URL}/Scoring/gameweek/${gw}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "",
  });
  const data = await res.json();
  showAlert(data.message || "Poeng beregnet!", "success");
}

async function scoreSeasonPredictions() {
  const text = document.getElementById("final-standings").value;
  const teams = text
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (teams.length !== 20) {
    showAlert(
      `Du må skrive inn nøyaktig 20 lag (du har ${teams.length})`,
      "error",
    );
    return;
  }

  const res = await fetch(`${API_URL}/SeasonScoring/2026-27`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(teams),
  });
  const data = await res.json();
  showAlert(data.message || "Sesongtipping beregnet!", "success");
}

async function loadUsers() {
  const supabaseUrl = "https://plprediction.onrender.com";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2emNjdWhwY2ttb2F1cmh4Znp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNTQ0MDgsImV4cCI6MjA5NDYzMDQwOH0.lUV1tXVGoh8vRN0QziUPycqN_rSet-HNRr-YkeNVPKQ";

  const res = await fetch(
    `${supabaseUrl}/rest/v1/users?select=username,total_points,created_at&order=total_points.desc`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    },
  );
  const users = await res.json();

  document.getElementById("users-list").innerHTML = users
    .map(
      (u) => `
        <div style="display:flex;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border)">
            <span>${u.username}</span>
            <span style="color:var(--accent);font-weight:700">${u.total_points} p</span>
        </div>
    `,
    )
    .join("");
}

loadUsers();
