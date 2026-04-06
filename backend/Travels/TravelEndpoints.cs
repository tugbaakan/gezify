using System.Net.Mail;
using Gezify.Api.Auth;
using Gezify.Api.Auth.Options;
using Gezify.Api.Data;
using Gezify.Api.Data.Entities;
using Gezify.Api.Data.Enums;
using Gezify.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gezify.Api.Travels;

public static class TravelEndpoints
{
    public static RouteGroupBuilder MapTravelEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/travels").WithTags("Travels").RequireAuthorization();

        group.MapGet("/", ListTravelsAsync);
        group.MapPost("/", CreateTravelAsync);
        group.MapGet("/{travelId:guid}", GetTravelAsync);
        group.MapPatch("/{travelId:guid}", PatchTravelAsync);
        group.MapGet("/{travelId:guid}/members", ListMembersAsync);
        group.MapPost("/{travelId:guid}/invitations", CreateInvitationAsync);

        return group;
    }

    private static async Task<IResult> ListTravelsAsync(
        HttpContext httpContext,
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        var items = await db.TravelMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId.Value)
            .Include(m => m.Travel)
            .OrderByDescending(m => m.Travel!.CreatedAt)
            .Select(m => new TravelListItemDto(
                m.Travel!.Id,
                m.Travel.Name,
                m.Travel.Status,
                m.Travel.CreatedAt,
                m.Travel.SettledAt))
            .ToListAsync(cancellationToken);

        return Results.Ok(items);
    }

    private static async Task<IResult> CreateTravelAsync(
        HttpContext httpContext,
        [FromBody] CreateTravelRequest? body,
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        var errors = ValidateTravelName(body?.Name);
        if (errors.Count > 0)
            return Results.Json(ApiErrors.Validation(errors), statusCode: StatusCodes.Status422UnprocessableEntity);

        var now = DateTimeOffset.UtcNow;
        var travel = new Travel
        {
            Id = Guid.NewGuid(),
            Name = body!.Name!.Trim(),
            CreatedById = userId.Value,
            Status = TravelStatus.Active,
            CreatedAt = now
        };
        db.Travels.Add(travel);
        db.TravelMembers.Add(new TravelMember
        {
            Travel = travel,
            UserId = userId.Value,
            JoinedAt = now
        });
        await db.SaveChangesAsync(cancellationToken);

        var dto = new TravelDetailDto(travel.Id, travel.Name, travel.Status, travel.CreatedAt, travel.SettledAt, travel.CreatedById);
        return Results.Created($"/travels/{travel.Id}", dto);
    }

    private static async Task<IResult> GetTravelAsync(
        Guid travelId,
        HttpContext httpContext,
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        var denied = await TravelAuthorization.RequireTravelMemberAsync(db, travelId, userId.Value, cancellationToken);
        if (denied is not null)
            return denied;

        var travel = await db.Travels.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == travelId, cancellationToken);
        if (travel is null)
            return Results.Json(ApiErrors.NotFound("Travel not found."), statusCode: StatusCodes.Status404NotFound);

        return Results.Ok(new TravelDetailDto(travel.Id, travel.Name, travel.Status, travel.CreatedAt, travel.SettledAt, travel.CreatedById));
    }

    private static async Task<IResult> PatchTravelAsync(
        Guid travelId,
        HttpContext httpContext,
        [FromBody] PatchTravelRequest? body,
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        var denied = await TravelAuthorization.RequireTravelMemberAsync(db, travelId, userId.Value, cancellationToken);
        if (denied is not null)
            return denied;

        var travel = await db.Travels.FirstOrDefaultAsync(t => t.Id == travelId, cancellationToken);
        if (travel is null)
            return Results.Json(ApiErrors.NotFound("Travel not found."), statusCode: StatusCodes.Status404NotFound);

        if (body?.Name is null)
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["name"] = ["The name field is required."] };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var errors = ValidateTravelName(body.Name);
        if (errors.Count > 0)
            return Results.Json(ApiErrors.Validation(errors), statusCode: StatusCodes.Status422UnprocessableEntity);

        travel.Name = body.Name.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new TravelDetailDto(travel.Id, travel.Name, travel.Status, travel.CreatedAt, travel.SettledAt, travel.CreatedById));
    }

    private static async Task<IResult> ListMembersAsync(
        Guid travelId,
        HttpContext httpContext,
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        var denied = await TravelAuthorization.RequireTravelMemberAsync(db, travelId, userId.Value, cancellationToken);
        if (denied is not null)
            return denied;

        var members = await db.TravelMembers
            .AsNoTracking()
            .Where(m => m.TravelId == travelId)
            .Include(m => m.User)
            .OrderBy(m => m.JoinedAt)
            .Select(m => new TravelMemberDto(
                m.UserId,
                m.User!.Email,
                m.User.DisplayName,
                m.User.AvatarUrl,
                m.JoinedAt))
            .ToListAsync(cancellationToken);

        return Results.Ok(members);
    }

    private static async Task<IResult> CreateInvitationAsync(
        Guid travelId,
        HttpContext httpContext,
        [FromBody] CreateInvitationRequest? body,
        ApplicationDbContext db,
        IInvitationTokenService invitationTokens,
        IInvitationEmailSender emailSender,
        IOptions<InvitationOptions> invitationOptions,
        IHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        var denied = await TravelAuthorization.RequireTravelMemberAsync(db, travelId, userId.Value, cancellationToken);
        if (denied is not null)
            return denied;

        var travel = await db.Travels.AsNoTracking().FirstOrDefaultAsync(t => t.Id == travelId, cancellationToken);
        if (travel is null)
            return Results.Json(ApiErrors.NotFound("Travel not found."), statusCode: StatusCodes.Status404NotFound);

        if (string.IsNullOrWhiteSpace(body?.Email))
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["email"] = ["The email field is required."] };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var email = body.Email.Trim();
        if (email.Length > 512 || !TryValidateEmail(email))
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["email"] = ["The email is not valid."] };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var normalized = email.ToLowerInvariant();
        var now = DateTimeOffset.UtcNow;
        Guid invitationId;
        string token;
        try
        {
            invitationId = Guid.NewGuid();
            token = invitationTokens.CreateToken(invitationId, travelId, normalized, now);
        }
        catch (InvalidOperationException ex)
        {
            return Results.Json(
                ApiErrors.ServerError(ex.Message),
                statusCode: StatusCodes.Status500InternalServerError);
        }

        var invitation = new Invitation
        {
            Id = invitationId,
            TravelId = travelId,
            InvitedById = userId.Value,
            Token = token,
            Email = normalized,
            Status = InvitationStatus.Pending,
            CreatedAt = now
        };
        db.Invitations.Add(invitation);
        await db.SaveChangesAsync(cancellationToken);

        var opts = invitationOptions.Value;
        var baseUrl = opts.BaseUrl?.Trim().TrimEnd('/');
        if (string.IsNullOrEmpty(baseUrl))
        {
            if (environment.IsDevelopment())
                baseUrl = "http://localhost:5173";
            else
            {
                var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
                {
                    ["configuration"] = ["Invitation:BaseUrl (or INVITATION_BASE_URL) must be set."]
                };
                return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
            }
        }

        var inviteLink = $"{baseUrl}/invite/{token}";

        try
        {
            await emailSender.SendInvitationAsync(normalized, inviteLink, travel.Name, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return Results.Json(
                ApiErrors.BadGateway("Could not send invitation email."),
                statusCode: StatusCodes.Status502BadGateway);
        }

        return Results.Created(
            $"/travels/{travelId}/invitations/{invitation.Id}",
            new InvitationCreatedDto(invitation.Id, invitation.Email, invitation.Status, invitation.CreatedAt));
    }

    private static Dictionary<string, string[]> ValidateTravelName(string? name)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(name))
            errors["name"] = ["The name field is required."];
        else if (name.Trim().Length > 512)
            errors["name"] = ["The name must be at most 512 characters."];
        return errors;
    }

    private static bool TryValidateEmail(string email)
    {
        try
        {
            _ = new MailAddress(email);
            return true;
        }
        catch
        {
            return false;
        }
    }
}

public sealed record TravelListItemDto(
    Guid Id,
    string Name,
    TravelStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? SettledAt);

public sealed record TravelDetailDto(
    Guid Id,
    string Name,
    TravelStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? SettledAt,
    Guid CreatedById);

public sealed record CreateTravelRequest(string? Name);

public sealed record PatchTravelRequest(string? Name);

public sealed record TravelMemberDto(
    Guid UserId,
    string Email,
    string? DisplayName,
    string? AvatarUrl,
    DateTimeOffset JoinedAt);

public sealed record CreateInvitationRequest(string? Email);

public sealed record InvitationCreatedDto(
    Guid Id,
    string Email,
    InvitationStatus Status,
    DateTimeOffset CreatedAt);
