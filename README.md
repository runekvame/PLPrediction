# ⚽ PLPrediction

A private Premier League score prediction app built for a friend group. Each matchweek, users predict scorelines for all fixtures and earn points based on accuracy.

🔗 **Live app:** [runekvame.github.io/PLPrediction](https://runekvame.github.io/PLPrediction)

---

## Features

- 🔐 **Auth** — Login with email via Supabase Auth
- 📅 **Matchweek predictions** — Predict exact scorelines for every fixture
- ⏱️ **Deadlines** — Predictions lock 2 hours before each match kicks off
- 🏆 **Leaderboard** — Live standings across the season
- 🤖 **Auto-scoring** — Finished matches are scored automatically every 4 hours
- 🌟 **Bonus rounds** — Double points in rounds 1 & 19, triple in round 38
- 🔮 **Season predictions** — Predict the top 4, relegation zone and champion before the season starts
- 📊 **Profiles** — View your own prediction history and score breakdown

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Plain HTML / CSS / JavaScript (GitHub Pages) |
| Backend | ASP.NET Core (.NET 10) |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| Hosting | Render (Docker, free tier) |
| Football data | [football-data.org](https://www.football-data.org) API |
| Uptime | UptimeRobot (prevents cold starts on Render) |

---

## How Scoring Works

| Result | Points |
|---|---|
| Exact scoreline | 3 pts |
| Correct outcome + goal difference | 2 pts |
| Correct outcome (W/D/L) | 1 pt |
| Wrong | 0 pts |

Bonus multipliers apply in rounds 1, 19 (×2) and 38 (×3).

---

## Project Structure

```
PLPrediction/
├── Controllers/        # API endpoints (predictions, scoring, leaderboard, etc.)
├── Services/           # Business logic (match sync, auto-scoring)
├── Models/             # Database models
├── DTOs/               # Data transfer objects
├── docs/               # Frontend (GitHub Pages)
│   ├── js/             # App logic
│   ├── css/            # Styles
│   └── *.html          # Pages
└── Dockerfile
```

---

## Architecture Notes

- The frontend is zero-build — plain `.html`/`.css`/`.js` files served from `docs/` via GitHub Pages
- The backend is a single Docker container on Render's free tier; UptimeRobot pings it to prevent sleep
- Match data is fetched from football-data.org (`competition=PL, season=2026`) and batch-upserted to avoid Render timeouts
- Scoring runs as a background service (`AutoScoringService`) every 4 hours — syncs matches and scores all completed matchweeks
- Supabase RLS ensures users can only read/write their own predictions
- `normalizeDate()` on the frontend patches missing `Z` suffixes on Supabase timestamps for correct UTC parsing

---

## License

[MIT](LICENSE)
