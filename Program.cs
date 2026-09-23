using DotNetEnv;
using PLPrediction.Services;

Env.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Supabase
var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY");

var supabase = new Supabase.Client(supabaseUrl, supabaseKey);
await supabase.InitializeAsync();

builder.Services.AddSingleton(supabase);

builder.Services.AddHttpClient<MatchService>();
builder.Services.AddScoped<MatchService>();
builder.Services.AddHttpClient();

builder.Services.AddHttpClient<ScoringService>();
builder.Services.AddScoped<ScoringService>();

builder.Services.AddHttpClient<SeasonScoringService>();
builder.Services.AddScoped<SeasonScoringService>();

builder.Services.AddHostedService<AutoScoringService>();

// Kun frontend-domenet (+ vanlige lokale dev-porter) får lov til å kalle API-et.
// Var AllowAnyOrigin() + AllowAnyMethod() tidligere, som gjorde API-et fritt
// tilgjengelig fra hvilken som helst nettside.
var allowedOrigins = new[]
{
    "https://runekvame.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
};

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

//app.UseHttpsRedirection();
app.UseAuthorization();
app.MapMethods("/health", new[] { "GET", "HEAD" }, () => "OK");
app.MapControllers();
app.Run();