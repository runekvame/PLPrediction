using Microsoft.AspNetCore.Mvc;
using PLPrediction.Services;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MatchesController : ControllerBase
    {
        private readonly MatchService _matchService;

        public MatchesController(MatchService matchService)
        {
            _matchService = matchService;
        }

        [HttpGet("sync")]
        public async Task<IActionResult> SyncFixtures()
        {
            var matches = await _matchService.FetchAndCacheFixturesAsync();
            return Ok(new { message = $"Synced {matches.Count} matches", matches });
        }
    }
}