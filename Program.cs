using DotNetEnv;

Env.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));
Console.WriteLine($"Looking for .env in: {Directory.GetCurrentDirectory()}");

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Supabase
var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY");

Console.WriteLine($"URL: {supabaseUrl}");
Console.WriteLine($"KEY: {supabaseKey}");
var supabase = new Supabase.Client(supabaseUrl, supabaseKey);
await supabase.InitializeAsync();

builder.Services.AddSingleton(supabase);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();