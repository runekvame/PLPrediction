namespace PLPrediction.DTOs
{
    public class SubmitSeasonPredictionDTO
    {
        public string Season { get; set; } = string.Empty;
        public List<string> PredictedStandings { get; set; } = new();
    }
}