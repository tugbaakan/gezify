using System.Security.Claims;
using Gezify.Api.Auth.Options;
using Gezify.Api.Data;
using Gezify.Api.Data.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gezify.Api.Auth;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth");

        group.MapPost("/google", PostGoogleAsync)
            .AllowAnonymous();

        group.MapGet("/me", GetMeAsync)
            .RequireAuthorization();

        return group;
    }

    private static async Task<IResult> PostGoogleAsync(
        [FromBody] GoogleAuthRequest? body,
        IGoogleOAuthService googleOAuth,
        IJwtTokenService jwt,
        ApplicationDbContext db,
        IOptions<JwtAuthOptions> jwtOptions,
        CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        if (body is null || string.IsNullOrWhiteSpace(body.Code))
            errors["code"] = ["The code field is required."];
        if (body is null || string.IsNullOrWhiteSpace(body.RedirectUri))
            errors["redirectUri"] = ["The redirectUri field is required."];

        if (errors.Count > 0)
            return Results.Json(ApiErrors.Validation(errors), statusCode: StatusCodes.Status422UnprocessableEntity);

        var profile = await googleOAuth.ExchangeCodeAsync(body!.Code!, body.RedirectUri!, cancellationToken);
        if (profile is null)
            return Results.Json(ApiErrors.Unauthorized("Google sign-in could not be verified."), statusCode: StatusCodes.Status401Unauthorized);

        var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == profile.GoogleId, cancellationToken);
        if (user is null)
        {
            user = new User
            {
                GoogleId = profile.GoogleId,
                Email = profile.Email,
                DisplayName = profile.DisplayName,
                AvatarUrl = profile.AvatarUrl,
                CreatedAt = DateTimeOffset.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken);
        }
        else
        {
            var changed = false;
            if (!string.Equals(user.Email, profile.Email, StringComparison.Ordinal))
            {
                user.Email = profile.Email;
                changed = true;
            }

            if (!string.Equals(user.DisplayName, profile.DisplayName, StringComparison.Ordinal))
            {
                user.DisplayName = profile.DisplayName;
                changed = true;
            }

            if (!string.Equals(user.AvatarUrl, profile.AvatarUrl, StringComparison.Ordinal))
            {
                user.AvatarUrl = profile.AvatarUrl;
                changed = true;
            }

            if (changed)
                await db.SaveChangesAsync(cancellationToken);
        }

        var token = jwt.CreateAccessToken(user.Id, user.Email);
        var expiresSeconds = jwtOptions.Value.AccessTokenMinutes * 60;
        var dto = ToPublicUser(user);
        return Results.Ok(new AuthSuccessResponse(token, expiresSeconds, dto));
    }

    private static async Task<IResult> GetMeAsync(
        ClaimsPrincipal principal,
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = principal.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Invalid token subject."), statusCode: StatusCodes.Status401Unauthorized);

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);
        if (user is null)
            return Results.Json(ApiErrors.NotFound("User not found."), statusCode: StatusCodes.Status404NotFound);

        return Results.Ok(ToPublicUser(user));
    }

    private static PublicUserDto ToPublicUser(User user) =>
        new(user.Id, user.Email, user.DisplayName, user.AvatarUrl, user.CreatedAt);
}
