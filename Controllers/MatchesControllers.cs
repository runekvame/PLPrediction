using Microsoft.AspNetCore.Mvc;
using PLPrediction.Services;
using System.Text.Json;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MatchesController : ControllerBase
    {
        private readonly MatchService _matchService;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public MatchesController(MatchService matchService, IHttpClientFactory httpClientFactory)
        {
            _matchService = matchService;
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        [HttpGet("sync")]
        public async Task<IActionResult> SyncFixtures()
        {
            var matches = await _matchService.FetchAndCacheFixturesAsync();
            return Ok(new { message = $"Synced {matches.Count} matches", matches });
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllMatches()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/matches?select=*&order=kickoff_time.asc");
            var json = await res.Content.ReadAsStringAsync();

            return Content(json, "application/json");
        }
    }
}