using System.Text.RegularExpressions;

namespace PLPrediction.Helpers
{
    public static class InputValidation
    {
        // Bokstaver (inkl. æøå), tall, mellomrom, understrek og bindestrek. 2-20 tegn.
        private static readonly Regex UsernamePattern =
            new(@"^[\p{L}0-9 _\-]{2,20}$", RegexOptions.Compiled);

        public static bool IsValidUsername(string? username) =>
            !string.IsNullOrWhiteSpace(username) && UsernamePattern.IsMatch(username.Trim());
    }
}
