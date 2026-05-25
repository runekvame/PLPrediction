namespace PLPrediction.DTOs
{
    public class SubmitPredictionDTO
    {
        public string MatchId { get; set; } = string.Empty;
        public int PredictedHome { get; set; }
        public int PredictedAway { get; set; }
    }
}