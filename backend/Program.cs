using Gezify.Api.Data;
using Gezify.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = DatabaseConnection.Resolve(builder.Configuration, builder.Environment);
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    builder.WebHost.UseUrls($"http://+:{port}");

var app = builder.Build();

// Local dev: redirect HTTP → HTTPS only when the https launch profile set ASPNETCORE_HTTPS_PORT.
// Skip for `http`-only profile and for production (Railway terminates TLS; app listens on HTTP).
if (app.Environment.IsDevelopment()
    && !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_HTTPS_PORT")))
    app.UseHttpsRedirection();

// §11.3: apply migrations on startup in non-production only; production uses a pre-deploy step.
if (!app.Environment.IsProduction())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
