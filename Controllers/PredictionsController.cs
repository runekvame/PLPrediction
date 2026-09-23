using Microsoft.AspNetCore.Mvc;
using PLPrediction.DTOs;
using System.Text.Json;
using System.Text;
using System.Linq;

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
            Supabase.Gotrue.User? user;
            try { user = await _supabase.Auth.GetUser(token); }
            catch { return Unauthorized("Token expired or invalid"); }
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

            // Check deadline: 2 hours before this specific match's kickoff
            var matchKickoff = match.GetProperty("kickoff_time").GetDateTime();
            var deadline = matchKickoff.AddHours(-2);

            if (DateTime.UtcNow >= deadline)
                return BadRequest("Fristen for å tippe denne kampen er utløpt");

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

            _http.DefaultRequestHeaders.Add("Prefer", "resolution=merge-duplicates");
            var res = await _http.PostAsync($"{_supabaseUrl}/rest/v1/predictions?on_conflict=user_id,match_id",
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

        // Krever innlogging. Egne tips vises alltid. Andres tips vises kun for
        // kamper som allerede har startet — før det kunne hvem som helst med
        // en gyldig innlogging se andres tips før fristen gikk ut.
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUserPredictions(string userId, [FromHeader] string authorization)
        {
            var token = authorization.Replace("Bearer ", "");
            Supabase.Gotrue.User? requester;
            try { requester = await _supabase.Auth.GetUser(token); }
            catch { return Unauthorized("Token expired or invalid"); }
            if (requester == null) return Unauthorized("Invalid token");

            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var res = await _http.GetAsync(
                $"{_supabaseUrl}/rest/v1/predictions?user_id=eq.{userId}&select=*,matches(kickoff_time)");
            var json = await res.Content.ReadAsStringAsync();
            var predictions = JsonDocument.Parse(json).RootElement;

            if (requester.Id == userId)
                return Ok(predictions);

            var now = DateTime.UtcNow;
            var visible = predictions.EnumerateArray().Where(p =>
                p.TryGetProperty("matches", out var m) &&
                m.ValueKind == JsonValueKind.Object &&
                m.TryGetProperty("kickoff_time", out var ko) &&
                ko.ValueKind == JsonValueKind.String &&
                DateTime.Parse(ko.GetString()!).ToUniversalTime() <= now
            ).ToList();

            return Ok(visible);
        }

        // Krever innlogging. Før kampen har startet vises kun din egen tipping
        // for kampen — før det kunne hvem som helst se alles tips på forhånd.
        [HttpGet("match/{matchId}")]
        public async Task<IActionResult> GetMatchPredictions(string matchId, [FromHeader] string authorization)
        {
            var token = authorization.Replace("Bearer ", "");
            Supabase.Gotrue.User? requester;
            try { requester = await _supabase.Auth.GetUser(token); }
            catch { return Unauthorized("Token expired or invalid"); }
            if (requester == null) return Unauthorized("Invalid token");

            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var matchRes = await _http.GetAsync($"{_supabaseUrl}/rest/v1/matches?id=eq.{matchId}&select=kickoff_time");
            var matchJson = await matchRes.Content.ReadAsStringAsync();
            var matchData = JsonDocument.Parse(matchJson).RootElement;
            if (matchData.GetArrayLength() == 0) return NotFound("Match not found");

            var kickoff = DateTime.Parse(matchData[0].GetProperty("kickoff_time").GetString()!).ToUniversalTime();
            var started = DateTime.UtcNow >= kickoff;

            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var filter = started
                ? $"match_id=eq.{matchId}"
                : $"match_id=eq.{matchId}&user_id=eq.{requester.Id}";

            var res = await _http.GetAsync(
                $"{_supabaseUrl}/rest/v1/predictions?{filter}&select=*,users(username, avatar_url)&order=points_awarded.desc");
            var json = await res.Content.ReadAsStringAsync();

            return Content(json, "application/json");
        }
    }
}