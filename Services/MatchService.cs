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
            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
 
            // --- Step 1: Fetch all matches from football-data.org ---
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("X-Auth-Token", _apiKey);
 
            var response = await _http.GetAsync("https://api.football-data.org/v4/competitions/PL/matches?season=2026");
            var json = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);
 
            var matches = new List<Match>();
 
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
            }
 
            // --- Step 2: Batch upsert ALL matches in a single HTTP call ---
            var batchBody = JsonSerializer.Serialize(matches.Select(m => new
            {
                external_id = m.ExternalId,
                home_team = m.HomeTeam,
                away_team = m.AwayTeam,
                gameweek = m.Gameweek,
                kickoff_time = m.KickoffTime.ToString("o"), // ISO 8601 with Z
                status = m.Status,
                home_score = m.HomeScore,
                away_score = m.AwayScore,
                fetched_at = m.FetchedAt.ToString("o")
            }));
 
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
            _http.DefaultRequestHeaders.Add("Prefer", "resolution=merge-duplicates");
 
            var upsertRes = await _http.PostAsync(
                $"{supabaseUrl}/rest/v1/matches?on_conflict=external_id",
                new StringContent(batchBody, Encoding.UTF8, "application/json"));
 
            if (!upsertRes.IsSuccessStatusCode)
            {
                var err = await upsertRes.Content.ReadAsStringAsync();
                throw new Exception($"Supabase upsert failed: {err}");
            }
 
            return matches;
        }
    }
}
 