using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeaderboardController : ControllerBase
    {
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public LeaderboardController(IHttpClientFactory httpClientFactory)
        {
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        [HttpGet]
        public async Task<IActionResult> GetLeaderboard()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/users?select=username,total_points&is_admin=eq.false&order=total_points.desc");
            var json = await res.Content.ReadAsStringAsync();

            return Ok(JsonDocument.Parse(json).RootElement);
        }

        [HttpGet("gameweek/{gameweek}")]
        public async Task<IActionResult> GetGameweekLeaderboard(int gameweek)
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/gameweek_scores?gameweek=eq.{gameweek}&select=user_id,points,users(username)&order=points.desc");
            var json = await res.Content.ReadAsStringAsync();

            return Ok(JsonDocument.Parse(json).RootElement);
        }

        [HttpGet("gameweek/all")]
        public async Task<IActionResult> GetAllGameweekScores()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/gameweek_scores?select=*&order=gameweek.asc");
            var json = await res.Content.ReadAsStringAsync();

            return Content(json, "application/json");
        }
    }
}