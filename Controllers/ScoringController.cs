using Microsoft.AspNetCore.Mvc;
using PLPrediction.Services;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScoringController : ControllerBase
    {
        private readonly ScoringService _scoringService;

        public ScoringController(ScoringService scoringService)
        {
            _scoringService = scoringService;
        }

        [HttpPost("gameweek/{gameweek}")]
        public async Task<IActionResult> ScoreGameweek(int gameweek)
        {
            await _scoringService.ScoreGameweekAsync(gameweek);
            return Ok(new { message = $"Gameweek {gameweek} scored successfully" });
        }
    }
}