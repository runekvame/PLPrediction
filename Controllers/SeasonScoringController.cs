using Microsoft.AspNetCore.Mvc;
using PLPrediction.Services;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SeasonScoringController : ControllerBase
    {
        private readonly SeasonScoringService _seasonScoringService;

        public SeasonScoringController(SeasonScoringService seasonScoringService)
        {
            _seasonScoringService = seasonScoringService;
        }

        [HttpPost("{season}")]
        public async Task<IActionResult> ScoreSeasonPredictions(
            string season,
            [FromBody] List<string> actualStandings)
        {
            if (actualStandings == null || actualStandings.Count != 20)
                return BadRequest("Must provide exactly 20 teams in final standings order");

            await _seasonScoringService.ScoreSeasonPredictionsAsync(season, actualStandings);

            return Ok(new { message = $"Season {season} predictions scored successfully" });
        }
    }
}