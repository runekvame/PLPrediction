namespace PLPrediction.Models
{
    public class Prediction
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string MatchId { get; set; } = string.Empty;
        public int PredictedHome { get; set; }
        public int PredictedAway { get; set; }
        public int? PointsAwarded { get; set; }
        public DateTime SubmittedAt { get; set; }
    }
}