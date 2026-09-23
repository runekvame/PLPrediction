using Microsoft.AspNetCore.Mvc;
using PLPrediction.Helpers;
using PLPrediction.Services;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScoringController : ControllerBase
    {
        private readonly ScoringService _scoringService;
        private readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public ScoringController(ScoringService scoringService, Supabase.Client supabase, IHttpClientFactory httpClientFactory)
        {
            _scoringService = scoringService;
            _supabase = supabase;
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        // Kun admin: scorer en runde. Var tidligere helt åpen — hvem som helst
        // kunne trigge scoring av vilkårlige runder.
        [HttpPost("gameweek/{gameweek}")]
        public async Task<IActionResult> ScoreGameweek(int gameweek, [FromHeader] string? authorization)
        {
            if (!await AdminAuth.IsAdminAsync(authorization, _supabase, _http, _supabaseUrl, _supabaseKey))
                return Unauthorized("Kun admin kan scoring-kjøre en runde");

            await _scoringService.ScoreGameweekAsync(gameweek);
            return Ok(new { message = $"Gameweek {gameweek} scored successfully" });
        }

        // Kun admin: nullstiller og kjører runden på nytt. Var tidligere helt
        // åpen — hvem som helst kunne nullstille poengene til alle spillerne.
        [HttpPost("gameweek/{gameweek}/reset")]
        public async Task<IActionResult> ResetAndRescoreGameweek(int gameweek, [FromHeader] string? authorization)
        {
            if (!await AdminAuth.IsAdminAsync(authorization, _supabase, _http, _supabaseUrl, _supabaseKey))
                return Unauthorized("Kun admin kan nullstille og rekjøre en runde");

            await _scoringService.ResetAndRescoreGameweekAsync(gameweek);
            return Ok(new { message = $"Gameweek {gameweek} reset and rescored successfully" });
        }

    }
}