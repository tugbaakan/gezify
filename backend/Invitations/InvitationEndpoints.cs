using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Gezify.Api.Auth;
using Gezify.Api.Data;
using Gezify.Api.Data.Entities;
using Gezify.Api.Data.Enums;
using Gezify.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gezify.Api.Invitations;

public static class InvitationEndpoints
{
    public static RouteGroupBuilder MapInvitationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/invitations").WithTags("Invitations");

        group.MapPost("/accept", AcceptAsync).RequireAuthorization();
        group.MapGet("/validate", ValidateAsync).AllowAnonymous();

        return group;
    }

    private static async Task<IResult> AcceptAsync(
        HttpContext httpContext,
        [FromBody] AcceptInvitationRequest? body,
        ApplicationDbContext db,
        IInvitationTokenService invitationTokens,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        if (string.IsNullOrWhiteSpace(body?.Token))
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["token"] = ["The token field is required."] };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var principal = invitationTokens.ValidateToken(body.Token.Trim(), DateTimeOffset.UtcNow);
        if (principal is null)
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["token"] = ["The invitation token is invalid or expired."] };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!TryParseInvitationClaims(principal, out var invitationId, out var travelId, out var emailClaim))
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["token"] = ["The invitation token is invalid."] };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);
        if (user is null)
            return Results.Json(ApiErrors.NotFound("User not found."), statusCode: StatusCodes.Status404NotFound);

        if (!string.Equals(user.Email, emailClaim, StringComparison.OrdinalIgnoreCase))
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                ["token"] = ["This invitation was sent to a different email address than your account."]
            };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var invitation = await db.Invitations.FirstOrDefaultAsync(i => i.Id == invitationId, cancellationToken);
        if (invitation is null)
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["token"] = ["The invitation token is invalid."] };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["token"] = ["This invitation has already been used or is no longer valid."] };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (invitation.TravelId != travelId || !string.Equals(invitation.Email, emailClaim, StringComparison.OrdinalIgnoreCase))
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["token"] = ["The invitation token does not match this invitation."] };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var alreadyMember = await db.TravelMembers.AnyAsync(
            m => m.TravelId == invitation.TravelId && m.UserId == userId.Value,
            cancellationToken);
        if (alreadyMember)
        {
            invitation.Status = InvitationStatus.Accepted;
            invitation.AcceptedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(new AcceptInvitationResponse(invitation.TravelId));
        }

        var now = DateTimeOffset.UtcNow;
        db.TravelMembers.Add(new TravelMember
        {
            TravelId = invitation.TravelId,
            UserId = userId.Value,
            JoinedAt = now
        });
        invitation.Status = InvitationStatus.Accepted;
        invitation.AcceptedAt = now;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new AcceptInvitationResponse(invitation.TravelId));
    }

    private static async Task<IResult> ValidateAsync(
        [FromQuery] string? token,
        ApplicationDbContext db,
        IInvitationTokenService invitationTokens,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return Results.Ok(new InvitationValidationDto(false, null));
        }

        var trimmed = token.Trim();
        var principal = invitationTokens.ValidateToken(trimmed, DateTimeOffset.UtcNow);
        if (principal is null)
        {
            return Results.Ok(new InvitationValidationDto(false, null));
        }

        if (!TryParseInvitationClaims(principal, out var invitationId, out var travelId, out _))
        {
            return Results.Ok(new InvitationValidationDto(false, null));
        }

        var invitation = await db.Invitations.AsNoTracking()
            .Include(i => i.Travel)
            .FirstOrDefaultAsync(i => i.Id == invitationId, cancellationToken);

        if (invitation is null)
        {
            return Results.Ok(new InvitationValidationDto(false, null));
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            return Results.Ok(new InvitationValidationDto(false, null));
        }

        return Results.Ok(new InvitationValidationDto(true, invitation.Travel?.Name));
    }

    /// <summary>Expected JWT has 3 dot-separated segments; helps spot truncation without logging the token.</summary>
    private static int CountJwtParts(string value)
    {
        if (string.IsNullOrEmpty(value))
            return 0;
        return value.Count(c => c == '.') + 1;
    }

    private static bool TryParseInvitationClaims(
        ClaimsPrincipal principal,
        out Guid invitationId,
        out Guid travelId,
        out string email)
    {
        invitationId = default;
        travelId = default;
        email = string.Empty;

        // JwtSecurityTokenHandler maps inbound JWT claims to ClaimTypes.*; accept both shapes.
        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (sub is null || !Guid.TryParse(sub, out invitationId))
            return false;

        var tid = principal.FindFirstValue(InvitationTokenService.TravelIdClaimType);
        if (tid is null || !Guid.TryParse(tid, out travelId))
            return false;

        email = principal.FindFirstValue(ClaimTypes.Email)
                ?? principal.FindFirstValue(JwtRegisteredClaimNames.Email)
                ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email))
            return false;

        return true;
    }
}

public sealed record AcceptInvitationRequest(string? Token);

public sealed record AcceptInvitationResponse(Guid TravelId);

public sealed record InvitationValidationDto(bool Valid, string? TravelName);
