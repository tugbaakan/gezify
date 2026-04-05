using Gezify.Api.Auth;
using Gezify.Api.Data;
using Gezify.Api.Data.Enums;
using Gezify.Api.Infrastructure;
using Gezify.Api.OpenApi;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.AddGezifyAuth();
builder.Services.AddGezifyCors(builder.Configuration, builder.Environment);
builder.Services.AddGezifySwagger();

var connectionString = DatabaseConnection.Resolve(builder.Configuration, builder.Environment);
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.MapEnum<TravelStatus>("travel_status");
dataSourceBuilder.MapEnum<InvitationStatus>("invitation_status");
dataSourceBuilder.MapEnum<ExpenseCategory>("expense_category");
var dataSource = dataSourceBuilder.Build();
builder.Services.AddSingleton(dataSource);
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(dataSource));

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    builder.WebHost.UseUrls($"http://+:{port}");

var app = builder.Build();

if (string.IsNullOrWhiteSpace(app.Configuration["ALLOWED_ORIGIN"])
    && string.IsNullOrWhiteSpace(app.Configuration["Cors:AllowedOrigin"])
    && app.Environment.IsDevelopment())
{
    app.Logger.LogWarning(
        "Set ALLOWED_ORIGIN or Cors:AllowedOrigin so the SPA can call this API from a browser.");
}

app.UseGezifyExceptionHandler();

// Local dev: redirect HTTP → HTTPS only when the https launch profile set ASPNETCORE_HTTPS_PORT.
// Skip for `http`-only profile and for production (Railway terminates TLS; app listens on HTTP).
if (app.Environment.IsDevelopment()
    && !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_HTTPS_PORT")))
    app.UseHttpsRedirection();

app.UseGezifyCors();
app.UseGezifySwagger();
app.UseAuthentication();
app.UseAuthorization();
app.UseGezifyStatusCodePages();

// §11.3: apply migrations on startup in non-production only; production uses a pre-deploy step.
if (!app.Environment.IsProduction())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapAuthEndpoints();

app.Run();
