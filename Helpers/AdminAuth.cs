using System.Text.Json;

namespace PLPrediction.Helpers
{
    // Delt hjelper for å sjekke at kalleren er en innlogget admin.
    // Brukes av kontrollere som trenger admin-tilgang, slik at vi ikke
    // kopierer inn de samme REST-kallene mot Supabase i hver eneste controller.
    public static class AdminAuth
    {
        public static async Task<bool> IsAdminAsync(
            string? authorization,
            Supabase.Client supabase,
            HttpClient http,
            string supabaseUrl,
            string supabaseKey)
        {
            if (string.IsNullOrWhiteSpace(authorization)) return false;

            var token = authorization.Replace("Bearer ", "");

            Supabase.Gotrue.User? user;
            try { user = await supabase.Auth.GetUser(token); }
            catch { return false; }
            if (user == null) return false;

            http.DefaultRequestHeaders.Clear();
            http.DefaultRequestHeaders.Add("apikey", supabaseKey);
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

            var res = await http.GetAsync($"{supabaseUrl}/rest/v1/users?id=eq.{user.Id}&select=is_admin");
            if (!res.IsSuccessStatusCode) return false;

            var json = await res.Content.ReadAsStringAsync();
            var data = JsonDocument.Parse(json).RootElement;

            return data.GetArrayLength() > 0
                && data[0].TryGetProperty("is_admin", out var isAdmin)
                && isAdmin.ValueKind == JsonValueKind.True;
        }
    }
}
