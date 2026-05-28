namespace PLPrediction.Models
{
    public class SeasonPrediction
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Season { get; set; } = string.Empty;
        public List<string> PredictedStandings { get; set; } = new();
        public int? PointsAwarded { get; set; }
        public DateTime SubmittedAt { get; set; }
    }
}