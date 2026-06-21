using System.Text.Json;
using System.Text;
using PLPrediction.Models;

namespace PLPrediction.Services
{
    public class MatchService
    {
        private readonly HttpClient _http;
        private readonly Supabase.Client _supabase;
        private readonly string _apiKey;

        public MatchService(HttpClient http, Supabase.Client supabase, IConfiguration config)
        {
            _http = http;
            _supabase = supabase;
            _apiKey = Environment.GetEnvironmentVariable("FOOTBALL_API_KEY")!;
        }

        public async Task<List<Match>> FetchAndCacheFixturesAsync()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("X-Auth-Token", _apiKey);

            var response = await _http.GetAsync("https://api.football-data.org/v4/competitions/PL/matches?season=2026");
            var json = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);

            var matches = new List<Match>();
            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;

            foreach (var match in doc.RootElement.GetProperty("matches").EnumerateArray())
            {
                var m = new Match
                {
                    ExternalId = match.GetProperty("id").GetInt32(),
                    HomeTeam = match.GetProperty("homeTeam").GetProperty("name").GetString()!,
                    AwayTeam = match.GetProperty("awayTeam").GetProperty("name").GetString()!,
                    Gameweek = match.GetProperty("matchday").GetInt32(),
                    KickoffTime = match.GetProperty("utcDate").GetDateTime(),
                    Status = match.GetProperty("status").GetString()!,
                    FetchedAt = DateTime.UtcNow
                };

                var score = match.GetProperty("score").GetProperty("fullTime");
                if (score.TryGetProperty("home", out var home) && home.ValueKind != JsonValueKind.Null)
                    m.HomeScore = home.GetInt32();
                if (score.TryGetProperty("away", out var away) && away.ValueKind != JsonValueKind.Null)
                    m.AwayScore = away.GetInt32();

                matches.Add(m);

                // Save to Supabase
                var body = JsonSerializer.Serialize(new
                {
                    external_id = m.ExternalId,
                    home_team = m.HomeTeam,
                    away_team = m.AwayTeam,
                    gameweek = m.Gameweek,
                    kickoff_time = m.KickoffTime,
                    status = m.Status,
                    home_score = m.HomeScore,
                    away_score = m.AwayScore,
                    fetched_at = m.FetchedAt
                });

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                _http.DefaultRequestHeaders.Add("Prefer", "resolution=merge-duplicates");

                await _http.PostAsync($"{supabaseUrl}/rest/v1/matches",
                    new StringContent(body, Encoding.UTF8, "application/json"));

                // Reset headers for next football API call
                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("X-Auth-Token", _apiKey);
            }

            return matches;
        }
    }
}