using System.Text.Json;
using System.Text;

namespace PLPrediction.Services
{
    public class ScoringService
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public ScoringService(HttpClient http)
        {
            _http = http;
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        private void SetHeaders()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");
        }

        public async Task ScoreGameweekAsync(int gameweek)
        {
            SetHeaders();

            // Get all finished matches for the gameweek
            var matchRes = await _http.GetAsync($"{_supabaseUrl}/rest/v1/matches?gameweek=eq.{gameweek}&status=eq.FINISHED&select=*");
            var matchJson = await matchRes.Content.ReadAsStringAsync();
            var matches = JsonDocument.Parse(matchJson).RootElement;

            foreach (var match in matches.EnumerateArray())
            {
                var matchId = match.GetProperty("id").GetString();
                var homeScore = match.GetProperty("home_score").GetInt32();
                var awayScore = match.GetProperty("away_score").GetInt32();

                SetHeaders();

                // Get all predictions for this match
                var predRes = await _http.GetAsync($"{_supabaseUrl}/rest/v1/predictions?match_id=eq.{matchId}&points_awarded=is.null&select=*");
                var predJson = await predRes.Content.ReadAsStringAsync();
                var predictions = JsonDocument.Parse(predJson).RootElement;

                foreach (var prediction in predictions.EnumerateArray())
                {
                    var predId = prediction.GetProperty("id").GetString();
                    var userId = prediction.GetProperty("user_id").GetString();
                    var predHome = prediction.GetProperty("predicted_home").GetInt32();
                    var predAway = prediction.GetProperty("predicted_away").GetInt32();

                    // Calculate points
                    int points = 0;
                    bool correctResult = (predHome > predAway && homeScore > awayScore) ||
                                         (predHome < predAway && homeScore < awayScore) ||
                                         (predHome == predAway && homeScore == awayScore);

                    if (correctResult) points += 2;
                    if (predHome == homeScore && predAway == awayScore) points += 3;

                    SetHeaders();

                    // Update prediction with points
                    var updateBody = JsonSerializer.Serialize(new { points_awarded = points });
                    await _http.PatchAsync($"{_supabaseUrl}/rest/v1/predictions?id=eq.{predId}",
                        new StringContent(updateBody, Encoding.UTF8, "application/json"));

                    // Update user total points
                    SetHeaders();
                    var userRes = await _http.GetAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{userId}&select=total_points");
                    var userJson = await userRes.Content.ReadAsStringAsync();
                    var users = JsonDocument.Parse(userJson).RootElement;
                    var currentPoints = users[0].GetProperty("total_points").GetInt32();

                    SetHeaders();
                    var pointsBody = JsonSerializer.Serialize(new { total_points = currentPoints + points });
                    await _http.PatchAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{userId}",
                        new StringContent(pointsBody, Encoding.UTF8, "application/json"));
                }
            }
        }
    }
}