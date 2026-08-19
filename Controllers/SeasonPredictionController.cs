using Microsoft.AspNetCore.Mvc;
using PLPrediction.DTOs;
using System.Text.Json;
using System.Text;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SeasonPredictionsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public SeasonPredictionsController(Supabase.Client supabase, IHttpClientFactory httpClientFactory)
        {
            _supabase = supabase;
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        private void SetHeaders()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");
        }

        [HttpPost]
        public async Task<IActionResult> SubmitSeasonPrediction(
            SubmitSeasonPredictionDTO dto,
            [FromHeader] string authorization)
        {
            // Get user from token
            var token = authorization.Replace("Bearer ", "");
            Supabase.Gotrue.User? user;
            try { user = await _supabase.Auth.GetUser(token); }
            catch { return Unauthorized("Token expired or invalid"); }
            if (user == null) return Unauthorized("Invalid token");

            // Check deadline
            SetHeaders();
            var settingsRes = await _http.GetAsync($"{_supabaseUrl}/rest/v1/settings?key=eq.season_predictions_deadline&select=value");
            var settingsJson = await settingsRes.Content.ReadAsStringAsync();
            var settingsData = JsonDocument.Parse(settingsJson).RootElement;

            if (settingsData.GetArrayLength() > 0)
            {
                var deadline = DateTime.Parse(settingsData[0].GetProperty("value").GetString()!);
                if (DateTime.UtcNow > deadline)
                    return BadRequest("Fristen for sesongtipping er utløpt");
            }

            // Save prediction
            var body = JsonSerializer.Serialize(new
            {
                user_id = user.Id,
                season = dto.Season,
                predicted_standings = dto.PredictedStandings
            });

            SetHeaders();
            _http.DefaultRequestHeaders.Add("Prefer", "resolution=merge-duplicates");

            var res = await _http.PostAsync($"{_supabaseUrl}/rest/v1/season_predictions?on_conflict=user_id,season",
                new StringContent(body, Encoding.UTF8, "application/json"));

            if (!res.IsSuccessStatusCode)
            {
                var error = await res.Content.ReadAsStringAsync();
                return BadRequest($"Failed to save season prediction: {error}");
            }

            return Ok(new { message = "Season prediction submitted successfully" });
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetSeasonPrediction(string userId, [FromQuery] string season)
        {
            SetHeaders();

            var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/season_predictions?user_id=eq.{userId}&season=eq.{season}&select=*");
            var json = await res.Content.ReadAsStringAsync();

            return Ok(JsonDocument.Parse(json).RootElement);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllSeasonPredictions([FromQuery] string season)
        {
            SetHeaders();

            var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/season_predictions?season=eq.{season}&select=*,users(username)");
            var json = await res.Content.ReadAsStringAsync();

            return Ok(JsonDocument.Parse(json).RootElement);
        }
    }
}