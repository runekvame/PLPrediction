using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public SettingsController(Supabase.Client supabase, IHttpClientFactory httpClientFactory)
        {
            _supabase = supabase;
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        private void SetHeaders()
        {
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            SetHeaders();
            var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/settings?select=*");
            var json = await res.Content.ReadAsStringAsync();
            return Ok(JsonDocument.Parse(json).RootElement);
        }

        [HttpPatch("{key}")]
        public async Task<IActionResult> UpdateSetting(
            string key,
            [FromBody] string value,
            [FromHeader] string authorization)
        {
            // Verify admin
            var token = authorization.Replace("Bearer ", "");
            var adminUser = await _supabase.Auth.GetUser(token);
            if (adminUser == null) return Unauthorized();

            SetHeaders();
            var adminCheck = await _http.GetAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{adminUser.Id}&select=is_admin");
            var adminJson = await adminCheck.Content.ReadAsStringAsync();
            var adminData = JsonDocument.Parse(adminJson).RootElement;

            if (adminData.GetArrayLength() == 0 || !adminData[0].GetProperty("is_admin").GetBoolean())
                return Unauthorized("Not an admin");

            SetHeaders();
            var body = JsonSerializer.Serialize(new { value });
            await _http.PatchAsync($"{_supabaseUrl}/rest/v1/settings?key=eq.{key}",
                new StringContent(body, Encoding.UTF8, "application/json"));

            return Ok(new { message = $"Setting {key} updated to {value}" });
        }
    }
}