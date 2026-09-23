using Microsoft.AspNetCore.Mvc;
using PLPrediction.Helpers;
using PLPrediction.Services;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SeasonScoringController : ControllerBase
    {
        private readonly SeasonScoringService _seasonScoringService;
        private readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public SeasonScoringController(SeasonScoringService seasonScoringService, Supabase.Client supabase, IHttpClientFactory httpClientFactory)
        {
            _seasonScoringService = seasonScoringService;
            _supabase = supabase;
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        // Kun admin: scorer sesongtippingen mot fasit-tabellen. Var tidligere
        // helt åpen — hvem som helst kunne sende inn en falsk sluttabell og
        // trigge scoring med diktede resultater.
        [HttpPost("{season}")]
        public async Task<IActionResult> ScoreSeasonPredictions(
            string season,
            [FromBody] List<string> actualStandings,
            [FromHeader] string? authorization)
        {
            if (!await AdminAuth.IsAdminAsync(authorization, _supabase, _http, _supabaseUrl, _supabaseKey))
                return Unauthorized("Kun admin kan scoring-kjøre sesongtippingen");

            if (actualStandings == null || actualStandings.Count != 20)
                return BadRequest("Must provide exactly 20 teams in final standings order");

            await _seasonScoringService.ScoreSeasonPredictionsAsync(season, actualStandings);

            return Ok(new { message = $"Season {season} predictions scored successfully" });
        }
    }
}