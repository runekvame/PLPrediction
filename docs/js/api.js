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
  try {
    const res = await fetch(`${API_URL}/Auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      return { error: "Invalid credentials" };
    }

    return res.json();
  } catch (err) {
    return { error: "Network error" };
  }
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

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data || "Kunne ikke lagre tipping" };
  }

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

async function submitSeasonPrediction(season, predictedStandings) {
  const res = await fetch(`${API_URL}/SeasonPredictions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ season, predictedStandings }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data || "Kunne ikke lagre sesongtipping" };
  }
  return res.json();
}

async function getSeasonPrediction(userId, season) {
  const res = await fetch(
    `${API_URL}/SeasonPredictions/${userId}?season=${season}`,
    {
      headers: getHeaders(),
    },
  );
  return res.json();
}

async function getSettings() {
  const res = await fetch(`${API_URL}/Settings`);
  return res.json();
}

async function updateSetting(key, value) {
  const res = await fetch(`${API_URL}/Settings/${key}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(value),
  });
  return res.json();
}

async function getProfile() {
  const res = await fetch(`${API_URL}/Profile`, {
    headers: getHeaders(),
  });
  if (!res.ok) return {};
  return res.json();
}

async function uploadAvatarApi(blob) {
  try {
    const res = await fetch(`${API_URL}/Profile/avatar`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${getToken()}`,
        "Content-Type": "image/png",
      },
      body: blob,
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: text || "Opplasting feilet" };
    }

    return res.json();
  } catch (err) {
    return { error: "Nettverksfeil" };
  }
}

async function initNavAvatar() {
  const username = localStorage.getItem("username") || "?";
  const btn = document.getElementById("avatar-btn");
  const header = document.getElementById("dropdown-username");
  const navUsername = document.getElementById("nav-username");

  // Show immediately from localStorage
  if (header) header.textContent = username;
  if (btn) btn.textContent = username.charAt(0).toUpperCase();
  if (navUsername) navUsername.textContent = username;

  // Then fetch photo in background and update if available
  const profile = await getProfile();
  const avatarUrl = profile.avatar_url || null;
  if (btn && avatarUrl) {
    btn.innerHTML = `<img src="${avatarUrl}" alt="${username}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  }
}
