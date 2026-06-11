using Microsoft.AspNetCore.Mvc;
using PLPrediction.DTOs;
using System.Text;
using System.Text.Json;

namespace PLPrediction.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public AuthController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDTO dto)
        {
            var response = await _supabase.Auth.SignUp(dto.Email, dto.Password);

            if (response.User == null)
                return BadRequest("Registration failed");

            // Insert into users table
            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
            var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;

            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("apikey", supabaseKey);
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

            var body = JsonSerializer.Serialize(new
            {
                id = response.User.Id,
                username = dto.Username,
                total_points = 0
            });

            await http.PostAsync($"{supabaseUrl}/rest/v1/users",
                new StringContent(body, Encoding.UTF8, "application/json"));

            return Ok(new { message = "Registered successfully", userId = response.User.Id });
        }

        [HttpPost("login")]
public async Task<IActionResult> Login(LoginDTO dto)
{
    var response = await _supabase.Auth.SignIn(dto.Email, dto.Password);

    if (response.User == null)
        return Unauthorized("Invalid credentials");

    // Fetch username from users table
    using var http = new HttpClient();
    var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
    var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY")!;
    http.DefaultRequestHeaders.Add("apikey", supabaseKey);
    http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

    var userRes = await http.GetAsync($"{supabaseUrl}/rest/v1/users?id=eq.{response.User.Id}&select=username");
    var userJson = await userRes.Content.ReadAsStringAsync();
    var users = System.Text.Json.JsonDocument.Parse(userJson).RootElement;
    var username = users.GetArrayLength() > 0 ? users[0].GetProperty("username").GetString() : "Ukjent";

    return Ok(new { token = response.AccessToken, userId = response.User.Id, username });
}
    }
}