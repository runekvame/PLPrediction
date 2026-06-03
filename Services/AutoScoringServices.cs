using System.Text.Json;
using System.Text;

namespace PLPrediction.Services
{
    public class AutoScoringService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;

        public AutoScoringService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SyncAndScoreAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"AutoScoring error: {ex.Message}");
                }

                // Run every 6 hours
                await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
            }
        }

        private async Task SyncAndScoreAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var scoringService = scope.ServiceProvider.GetRequiredService<ScoringService>();
            var matchService = scope.ServiceProvider.GetRequiredService<MatchService>();

            Console.WriteLine("Auto-sync: fetching latest match data...");
            await matchService.FetchAndCacheFixturesAsync();

            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;

            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("apikey", supabaseKey);
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

            // Get all distinct gameweeks with finished matches
            var res = await http.GetAsync($"{supabaseUrl}/rest/v1/matches?status=eq.FINISHED&select=gameweek");
            var json = await res.Content.ReadAsStringAsync();
            var matches = JsonDocument.Parse(json).RootElement;

            var gameweeks = matches.EnumerateArray()
                .Select(m => m.GetProperty("gameweek").GetInt32())
                .Distinct()
                .ToList();

            foreach (var gameweek in gameweeks)
            {
                http.DefaultRequestHeaders.Clear();
                http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

                // Check for unscored predictions
                var predRes = await http.GetAsync(
                    $"{supabaseUrl}/rest/v1/predictions?points_awarded=is.null&select=id");
                var predJson = await predRes.Content.ReadAsStringAsync();
                var unscored = JsonDocument.Parse(predJson).RootElement;

                if (unscored.GetArrayLength() > 0)
                {
                    Console.WriteLine($"Auto-scoring gameweek {gameweek}...");
                    await scoringService.ScoreGameweekAsync(gameweek);
                }
            }

            Console.WriteLine("Auto-sync complete.");
        }
    }
}