const API_URL = "https://plprediction.onrender.com/api";

function getToken() {
  return localStorage.getItem("token");
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    authorization: `Bearer ${getToken()}`,
  };
}

// Auth
async function login(email, password) {
  const res = await fetch(`${API_URL}/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function register(email, password, username) {
  const res = await fetch(`${API_URL}/Auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  });
  return res.json();
}

// Matches
async function getMatches() {
  const res = await fetch(`${API_URL}/Matches/sync`);
  return res.json();
}

// Predictions
async function submitPrediction(matchId, predictedHome, predictedAway) {
  const res = await fetch(`${API_URL}/Predictions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ matchId, predictedHome, predictedAway }),
  });
  return res.json();
}

async function getUserPredictions(userId) {
  const res = await fetch(`${API_URL}/Predictions/${userId}`, {
    headers: getHeaders(),
  });
  return res.json();
}

// Leaderboard
async function getLeaderboard() {
  const res = await fetch(`${API_URL}/Leaderboard`);
  return res.json();
}

async function getGameweekLeaderboard(gameweek) {
  const res = await fetch(`${API_URL}/Leaderboard/gameweek/${gameweek}`);
  return res.json();
}

// Season predictions
async function submitSeasonPrediction(season, predictedStandings) {
  const res = await fetch(`${API_URL}/SeasonPredictions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ season, predictedStandings }),
  });
  return res.json();
}

async function getMatchesFromDB() {
  const supabaseUrl = "https://fvzccuhpckmoaurhxfzy.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2emNjdWhwY2ttb2F1cmh4Znp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNTQ0MDgsImV4cCI6MjA5NDYzMDQwOH0.lUV1tXVGoh8vRN0QziUPycqN_rSet-HNRr-YkeNVPKQ";

  const res = await fetch(
    `${supabaseUrl}/rest/v1/matches?select=*&order=kickoff_time.asc`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    },
  );
  return res.json();
}

async function isAdmin() {
  const res = await fetch(`${API_URL}/AdminAuth/isadmin`, {
    headers: getHeaders(),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.isAdmin;
}

async function createUser(email, password, username) {
  const res = await fetch(`${API_URL}/AdminAuth/createuser`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, password, username }),
  });
  return res.json();
}

async function deleteUser(userId) {
  const res = await fetch(`${API_URL}/AdminAuth/deleteuser/${userId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return res.json();
}
