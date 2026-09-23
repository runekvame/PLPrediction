using Microsoft.AspNetCore.Mvc;
using PLPrediction.Helpers;
using PLPrediction.Services;
using System.Text.Json;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MatchesController : ControllerBase
    {
        private readonly MatchService _matchService;
        private readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public MatchesController(MatchService matchService, Supabase.Client supabase, IHttpClientFactory httpClientFactory)
        {
            _matchService = matchService;
            _supabase = supabase;
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        // Kun admin: henter fasit fra football-data.org og skriver til Supabase.
        // Var tidligere helt åpen for hvem som helst på internett å kalle.
        [HttpGet("sync")]
        public async Task<IActionResult> SyncFixtures([FromHeader] string? authorization)
        {
            if (!await AdminAuth.IsAdminAsync(authorization, _supabase, _http, _supabaseUrl, _supabaseKey))
                return Unauthorized("Kun admin kan synkronisere kamper");

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