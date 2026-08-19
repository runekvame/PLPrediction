using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public ProfileController(Supabase.Client supabase, IHttpClientFactory httpClientFactory)
        {
            _supabase = supabase;
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile([FromHeader] string authorization)
        {
            var token = authorization.Replace("Bearer ", "");
            Supabase.Gotrue.User? user;
            try { user = await _supabase.Auth.GetUser(token); }
            catch { return Unauthorized("Token expired or invalid"); }
            if (user == null) return Unauthorized("Invalid token");

            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var res = await _http.GetAsync(
                $"{_supabaseUrl}/rest/v1/users?id=eq.{user.Id}&select=id,username,avatar_url,total_points,is_admin");
            var json = await res.Content.ReadAsStringAsync();
            var arr = JsonDocument.Parse(json).RootElement;

            if (arr.GetArrayLength() == 0) return NotFound("User not found");

            return Content(arr[0].GetRawText(), "application/json");
        }

        [HttpPost("avatar")]
        public async Task<IActionResult> UploadAvatar([FromHeader] string authorization)
        {
            var token = authorization.Replace("Bearer ", "");
            Supabase.Gotrue.User? user;
            try { user = await _supabase.Auth.GetUser(token); }
            catch { return Unauthorized("Token expired or invalid"); }
            if (user == null) return Unauthorized("Invalid token");

            // Read raw PNG bytes from request body (already resized client-side to 400x400)
            using var ms = new MemoryStream();
            await Request.Body.CopyToAsync(ms);
            var imageBytes = ms.ToArray();

            if (imageBytes.Length == 0) return BadRequest("No image data received");
            if (imageBytes.Length > 1_000_000) return BadRequest("Bilde er for stort (maks 1 MB)");

            // Upload to Supabase Storage using service role key
            // Path: avatars/{userId}.png — overwrites on re-upload
            var storagePath = $"{user.Id}.png";
            var storageUrl = $"{_supabaseUrl}/storage/v1/object/avatars/{storagePath}";

            using var uploadClient = new HttpClient();
            uploadClient.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            uploadClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

            var content = new ByteArrayContent(imageBytes);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");

            // Try PUT first (update), fall back to POST (insert) if not found
            var putRes = await uploadClient.PutAsync(storageUrl, content);

            if (!putRes.IsSuccessStatusCode)
            {
                // File doesn't exist yet — POST to create
                content = new ByteArrayContent(imageBytes);
                content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
                var postRes = await uploadClient.PostAsync(storageUrl, content);

                if (!postRes.IsSuccessStatusCode)
                {
                    var err = await postRes.Content.ReadAsStringAsync();
                    return BadRequest($"Opplasting feilet: {err}");
                }
            }

            // Build the public URL
            var publicUrl = $"{_supabaseUrl}/storage/v1/object/public/avatars/{storagePath}?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";

            // Save public URL to users table
            _http.DefaultRequestHeaders.Clear();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");
            _http.DefaultRequestHeaders.Add("Prefer", "return=minimal");

            var patchBody = JsonSerializer.Serialize(new { avatar_url = publicUrl });
            var patchRes = await _http.PatchAsync(
                $"{_supabaseUrl}/rest/v1/users?id=eq.{user.Id}",
                new StringContent(patchBody, Encoding.UTF8, "application/json"));

            if (!patchRes.IsSuccessStatusCode)
            {
                var err = await patchRes.Content.ReadAsStringAsync();
                return BadRequest($"Kunne ikke lagre avatar-URL: {err}");
            }

            return Ok(new { avatar_url = publicUrl });
        }
    }
}