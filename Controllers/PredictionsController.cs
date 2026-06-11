using Microsoft.AspNetCore.Mvc;
using PLPrediction.DTOs;
using System.Text.Json;
using System.Text;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PredictionsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public PredictionsController(Supabase.Client supabase, IHttpClientFactory httpClientFactory)
        {
            _supabase = supabase;
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        [HttpPost]
        public async Task<IActionResult> SubmitPrediction(SubmitPredictionDTO dto, [FromHeader] string authorization)
        {
            var token = authorization.Replace("Bearer ", "");
            var user = await _supabase.Auth.GetUser(token);
            if (user == null) return Unauthorized("Invalid token");

            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            // Get the match to find its gameweek
            var matchRes = await _http.GetAsync($"{_supabaseUrl}/rest/v1/matches?id=eq.{dto.MatchId}&select=kickoff_time,status,gameweek");
            var matchJson = await matchRes.Content.ReadAsStringAsync();
            var matches = JsonDocument.Parse(matchJson).RootElement;

            if (matches.GetArrayLength() == 0) return NotFound("Match not found");

            var match = matches[0];
            var gameweek = match.GetProperty("gameweek").GetInt32();

            // Get the earliest kickoff time in this gameweek
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var gwRes = await _http.GetAsync($"{_supabaseUrl}/rest/v1/matches?gameweek=eq.{gameweek}&select=kickoff_time&order=kickoff_time.asc&limit=1");
            var gwJson = await gwRes.Content.ReadAsStringAsync();
            var gwMatches = JsonDocument.Parse(gwJson).RootElement;

            if (gwMatches.GetArrayLength() == 0) return NotFound("Gameweek not found");

            var firstKickoff = gwMatches[0].GetProperty("kickoff_time").GetDateTime();
            var deadline = firstKickoff.AddHours(-2);

            if (DateTime.UtcNow >= deadline)
                return BadRequest("Fristen for tipping denne spillerunden er utløpt");

            // Save prediction
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var body = JsonSerializer.Serialize(new
            {
                user_id = user.Id,
                match_id = dto.MatchId,
                predicted_home = dto.PredictedHome,
                predicted_away = dto.PredictedAway
            });

            var res = await _http.PostAsync($"{_supabaseUrl}/rest/v1/predictions",
                new StringContent(body, Encoding.UTF8, "application/json"));

            if (!res.IsSuccessStatusCode)
            {
                var error = await res.Content.ReadAsStringAsync();
                return BadRequest($"Failed to save prediction: {error}");
            }

            return Ok(new { message = "Prediction submitted successfully" });
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllPredictions([FromHeader] string authorization)
        {
            try
            {
                var token = authorization.Replace("Bearer ", "");
                var adminUser = await _supabase.Auth.GetUser(token);
                if (adminUser == null) return Unauthorized();

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

                var adminCheck = await _http.GetAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{adminUser.Id}&select=is_admin");
                var adminJson = await adminCheck.Content.ReadAsStringAsync();
                var adminData = JsonDocument.Parse(adminJson).RootElement;

                if (adminData.GetArrayLength() == 0 || !adminData[0].GetProperty("is_admin").GetBoolean())
                    return Unauthorized("Not an admin");

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

                var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/predictions?select=*&order=submitted_at.asc");
                var json = await res.Content.ReadAsStringAsync();

                return Content(json, "application/json");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUserPredictions(string userId)
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/predictions?user_id=eq.{userId}&select=*");
            var json = await res.Content.ReadAsStringAsync();

            return Ok(JsonDocument.Parse(json).RootElement);
        }

        [HttpGet("match/{matchId}")]
        public async Task<IActionResult> GetMatchPredictions(string matchId)
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var res = await _http.GetAsync(
                $"{_supabaseUrl}/rest/v1/predictions?match_id=eq.{matchId}&select=*,users(username)&order=points_awarded.desc");
            var json = await res.Content.ReadAsStringAsync();

            return Content(json, "application/json");
        }
    }
}