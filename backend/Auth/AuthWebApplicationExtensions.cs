using System.Text;
using Gezify.Api.Auth.Options;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;

namespace Gezify.Api.Auth;

public static class AuthWebApplicationExtensions
{
    public static WebApplicationBuilder AddGezifyAuth(this WebApplicationBuilder builder)
    {
        builder.Services.Configure<GoogleAuthOptions>(builder.Configuration.GetSection(GoogleAuthOptions.SectionName));
        builder.Services.Configure<JwtAuthOptions>(builder.Configuration.GetSection(JwtAuthOptions.SectionName));

        builder.Services.PostConfigure<JwtAuthOptions>(opts =>
        {
            var resolved = ResolveJwtSecretKey(builder.Configuration);
            if (!string.IsNullOrWhiteSpace(resolved))
                opts.SecretKey = resolved;
        });

        builder.Services.AddHttpClient(nameof(GoogleOAuthService), client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
        builder.Services.AddSingleton<IGoogleOAuthService, GoogleOAuthService>();

        var jwtSection = builder.Configuration.GetSection(JwtAuthOptions.SectionName);
        var jwtKey = ResolveJwtSecretKey(builder.Configuration);
        if (jwtKey.Length < 32)
            throw new InvalidOperationException(
                "JWT signing key must be at least 32 characters. Set AUTH_JWT_SECREKEYT, or Auth:Jwt:SecretKey (or user secrets).");

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
                options.SaveToken = true;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ValidIssuer = jwtSection["Issuer"],
                    ValidAudience = jwtSection["Audience"],
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(2)
                };
                options.Events = new JwtBearerEvents
                {
                    OnChallenge = context =>
                    {
                        context.HandleResponse();
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.Response.ContentType = "application/json";
                        var message = !string.IsNullOrEmpty(context.ErrorDescription)
                            ? context.ErrorDescription
                            : !string.IsNullOrEmpty(context.Error)
                                ? context.Error
                                : "Authentication required.";
                        var envelope = ApiErrors.Unauthorized(message);
                        return context.Response.WriteAsJsonAsync(envelope);
                    },
                    OnForbidden = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";
                        var envelope = ApiErrors.Forbidden("You are not allowed to access this resource.");
                        return context.Response.WriteAsJsonAsync(envelope);
                    }
                };
            });

        builder.Services.AddAuthorization();

        return builder;
    }

    /// <summary>
    /// Railway-style flat env vars (<c>AUTH_JWT_SECRETKEY</c>) and nested config (<c>Auth:Jwt:SecretKey</c>).
    /// </summary>
    internal static string ResolveJwtSecretKey(IConfiguration configuration) =>
        configuration["AUTH_JWT_SECRETKEY"]
        ?? configuration["Auth:Jwt:SecretKey"]
        ?? string.Empty;

    public static WebApplication UseGezifyExceptionHandler(this WebApplication app)
    {
        app.UseExceptionHandler(handler =>
        {
            handler.Run(async context =>
            {
                if (context.Response.HasStarted)
                    return;

                var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("UnhandledException");
                var feature = context.Features.Get<IExceptionHandlerFeature>();
                if (feature?.Error is not null)
                    logger.LogError(feature.Error, "Unhandled exception");

                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                context.Response.ContentType = "application/json";
                var showDetail = app.Environment.IsDevelopment() && feature?.Error is not null;
                var message = showDetail
                    ? feature!.Error!.Message
                    : "An unexpected error occurred.";
                await context.Response.WriteAsJsonAsync(ApiErrors.ServerError(message));
            });
        });

        return app;
    }

    public static WebApplication UseGezifyCors(this WebApplication app)
    {
        app.UseCors(GezifyCors.PolicyName);
        return app;
    }

    public static IServiceCollection AddGezifyCors(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        var allowedOrigin = configuration["ALLOWED_ORIGIN"]
                            ?? configuration["Cors:AllowedOrigin"];

        services.AddCors(options =>
        {
            options.AddPolicy(GezifyCors.PolicyName, policy =>
            {
                if (!string.IsNullOrWhiteSpace(allowedOrigin))
                {
                    policy.WithOrigins(NormalizeOrigin(allowedOrigin))
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                }
                else
                {
                    if (environment.IsDevelopment())
                    {
                        // Logged at startup in Program.cs when building the app.
                    }

                    policy.SetIsOriginAllowed(_ => false);
                }
            });
        });

        return services;
    }

    private static string NormalizeOrigin(string origin) => origin.Trim().TrimEnd('/');
}

internal static class GezifyCors
{
    public const string PolicyName = "GezifyAllowedOrigin";
}
