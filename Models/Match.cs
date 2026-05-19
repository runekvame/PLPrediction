namespace PLPrediction.Models
{
    public class Match
    {
        public string Id { get; set; } = string.Empty;
        public int ExternalId { get; set; }
        public string HomeTeam { get; set; } = string.Empty;
        public string AwayTeam { get; set; } = string.Empty;
        public int? HomeScore { get; set; }
        public int? AwayScore { get; set; }
        public int Gameweek { get; set; }
        public DateTime KickoffTime { get; set; }
        public string Status { get; set; } = "upcoming";
        public DateTime FetchedAt { get; set; }
    }
}