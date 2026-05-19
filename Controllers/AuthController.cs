using Microsoft.AspNetCore.Mvc;
using PLPrediction.DTOs;

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

            return Ok(new { message = "Registered successfully", userId = response.User.Id });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDTO dto)
        {
            var response = await _supabase.Auth.SignIn(dto.Email, dto.Password);

            if (response.User == null)
                return Unauthorized("Invalid credentials");

            return Ok(new { token = response.AccessToken, userId = response.User.Id });
        }
    }
}