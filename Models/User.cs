namespace PLPrediction.Models
{
    public class User
    {
        public string Id { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public int TotalPoints { get; set; } = 0;
        public DateTime CreatedAt { get; set; }
    }
}