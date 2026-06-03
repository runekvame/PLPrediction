using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminAuthController : ControllerBase
    {
        private readonly Supabase.Client _supabase;
        private readonly HttpClient _http;
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;

        public AdminAuthController(Supabase.Client supabase, IHttpClientFactory httpClientFactory)
        {
            _supabase = supabase;
            _http = httpClientFactory.CreateClient();
            _supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            _supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
        }

        [HttpGet("isadmin")]
        public async Task<IActionResult> IsAdmin([FromHeader] string authorization)
        {
            try
            {
                var token = authorization.Replace("Bearer ", "");
                var user = await _supabase.Auth.GetUser(token);
                if (user == null) return Unauthorized();

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

                var res = await _http.GetAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{user.Id}&select=is_admin");
                var json = await res.Content.ReadAsStringAsync();
                var users = JsonDocument.Parse(json).RootElement;

                if (users.GetArrayLength() == 0) return Unauthorized();

                var isAdmin = users[0].GetProperty("is_admin").GetBoolean();
                return Ok(new { isAdmin });
            }
            catch
            {
                return Unauthorized();
            }
        }

        [HttpPost("createuser")]
        public async Task<IActionResult> CreateUser(
            [FromBody] PLPrediction.DTOs.RegisterDTO dto,
            [FromHeader] string authorization)
        {
            try
            {
                // Verify admin
                var token = authorization.Replace("Bearer ", "");
                var adminUser = await _supabase.Auth.GetUser(token);
                if (adminUser == null) return Unauthorized();

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

                var adminCheck = await _http.GetAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{adminUser.Id}&select=is_admin");
                var adminJson = await adminCheck.Content.ReadAsStringAsync();
                var adminData = JsonDocument.Parse(adminJson).RootElement;

                if (adminData.GetArrayLength() == 0 || !adminData[0].GetProperty("is_admin").GetBoolean())
                    return Unauthorized("Not an admin");

                // Create user
                var response = await _supabase.Auth.SignUp(dto.Email, dto.Password);
                if (response.User == null) return BadRequest("Could not create user");

                var body = System.Text.Json.JsonSerializer.Serialize(new
                {
                    id = response.User.Id,
                    username = dto.Username,
                    total_points = 0,
                    is_admin = false
                });

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

                await _http.PostAsync($"{_supabaseUrl}/rest/v1/users",
                    new System.Net.Http.StringContent(body, System.Text.Encoding.UTF8, "application/json"));

                return Ok(new { message = $"User {dto.Username} created successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("deleteuser/{userId}")]
        public async Task<IActionResult> DeleteUser(
            string userId,
            [FromHeader] string authorization)
        {
            try
            {
                // Verify admin
                var token = authorization.Replace("Bearer ", "");
                var adminUser = await _supabase.Auth.GetUser(token);
                if (adminUser == null) return Unauthorized();

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

                var adminCheck = await _http.GetAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{adminUser.Id}&select=is_admin");
                var adminJson = await adminCheck.Content.ReadAsStringAsync();
                var adminData = JsonDocument.Parse(adminJson).RootElement;

                if (adminData.GetArrayLength() == 0 || !adminData[0].GetProperty("is_admin").GetBoolean())
                    return Unauthorized("Not an admin");

                // Delete from users table first
                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");

                await _http.DeleteAsync($"{_supabaseUrl}/rest/v1/users?id=eq.{userId}");

                return Ok(new { message = "User deleted" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}