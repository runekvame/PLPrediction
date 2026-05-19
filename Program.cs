using DotNetEnv;

Env.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Supabase
var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
var supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_KEY")!;

builder.Services.AddSingleton(provider =>
    new Supabase.Client(supabaseUrl, supabaseKey));

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