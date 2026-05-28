using System.Text.Json;
using System.Text;

namespace PLPrediction.Services
{
    public class SeasonScoringService
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public SeasonScoringService(HttpClient http)
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

        public async Task ScoreSeasonPredictionsAsync(string season, List<string> actualStandings)
        {
            SetHeaders();

            // Get all season predictions for this season
            var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/season_predictions?season=eq.{season}&select=*");
            var json = await res.Content.ReadAsStringAsync();
            var predictions = JsonDocument.Parse(json).RootElement;

            foreach (var prediction in predictions.EnumerateArray())
            {
                var predId = prediction.GetProperty("id").GetString();
                var userId = prediction.GetProperty("user_id").GetString();
                var predictedStandings = prediction.GetProperty("predicted_standings")
                    .EnumerateArray()
                    .Select(t => t.GetString()!)
                    .ToList();

                int totalPoints = 0;

                for (int i = 0; i < actualStandings.Count; i++)
                {
                    var actualTeam = actualStandings[i];
                    var predictedPosition = predictedStandings.IndexOf(actualTeam);

                    if (predictedPosition == -1) continue;

                    var diff = Math.Abs(i - predictedPosition);

                    if (diff == 0) totalPoints += 3;
                    else if (diff == 1) totalPoints += 2;
                    else if (diff == 2) totalPoints += 1;
                }

                SetHeaders();

                // Update season prediction with points
                var updateBody = JsonSerializer.Serialize(new { points_awarded = totalPoints });
                await _http.PatchAsync($"{_supabaseUrl}/rest/v1/season_predictions?id=eq.{predId}",
                    new StringContent(updateBody, Encoding.UTF8, "application/json"));

                // Add points to user total
                SetHeaders();
                var userRes = await _http.GetAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{userId}&select=total_points");
                var userJson = await userRes.Content.ReadAsStringAsync();
                var users = JsonDocument.Parse(userJson).RootElement;
                var currentPoints = users[0].GetProperty("total_points").GetInt32();

                SetHeaders();
                var pointsBody = JsonSerializer.Serialize(new { total_points = currentPoints + totalPoints });
                await _http.PatchAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{userId}",
                    new StringContent(pointsBody, Encoding.UTF8, "application/json"));
            }
        }
    }
}