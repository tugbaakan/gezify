using System.Net.Mail;
using Gezify.Api.Auth;
using Gezify.Api.Auth.Options;
using Gezify.Api.Data;
using Gezify.Api.Data.Entities;
using Gezify.Api.Data.Enums;
using Gezify.Api.Services;
using Gezify.Api.Settlement;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        group.MapGet("/{travelId:guid}/invitations", ListInvitationsAsync);
        group.MapPost("/{travelId:guid}/invitations", CreateInvitationAsync);
        group.MapPost("/{travelId:guid}/finish", FinishTravelAsync);
        group.MapGet("/{travelId:guid}/settlement", GetSettlementAsync);

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

    private static async Task<IResult> GetSettlementAsync(
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

        var dto = await BuildTravelSettlementDtoAsync(db, travelId, travel.Status, cancellationToken);
        return Results.Ok(dto);
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

    private static async Task<IResult> ListInvitationsAsync(
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

        var travelExists = await db.Travels.AsNoTracking().AnyAsync(t => t.Id == travelId, cancellationToken);
        if (!travelExists)
            return Results.Json(ApiErrors.NotFound("Travel not found."), statusCode: StatusCodes.Status404NotFound);

        var items = await db.Invitations
            .AsNoTracking()
            .Where(i => i.TravelId == travelId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new TravelInvitationListItemDto(
                i.Id,
                i.Email,
                i.Status,
                i.CreatedAt,
                i.AcceptedAt,
                i.InvitedById,
                i.InvitedBy.Email,
                i.InvitedBy.DisplayName))
            .ToListAsync(cancellationToken);

        return Results.Ok(items);
    }

    private static async Task<IResult> CreateInvitationAsync(
        Guid travelId,
        HttpContext httpContext,
        [FromBody] CreateInvitationRequest? body,
        ApplicationDbContext db,
        IInvitationTokenService invitationTokens,
        IGezifyEmailSender emailSender,
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

    private static async Task<IResult> FinishTravelAsync(
        Guid travelId,
        HttpContext httpContext,
        ApplicationDbContext db,
        IGezifyEmailSender emailSender,
        IOptions<InvitationOptions> invitationOptions,
        IHostEnvironment environment,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger(nameof(TravelEndpoints));
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        var denied = await TravelAuthorization.RequireTravelMemberAsync(db, travelId, userId.Value, cancellationToken);
        if (denied is not null)
            return denied;

        var travel = await db.Travels.FirstOrDefaultAsync(t => t.Id == travelId, cancellationToken);
        if (travel is null)
            return Results.Json(ApiErrors.NotFound("Travel not found."), statusCode: StatusCodes.Status404NotFound);

        if (travel.Status == TravelStatus.Settled)
            return Results.Ok(await BuildTravelFinishDtoAsync(db, travelId, userId.Value, cancellationToken));

        if (travel.Status == TravelStatus.AllFinished)
        {
            var now = DateTimeOffset.UtcNow;
            var (ok, settleError) = await TravelSettlementHelper.TryPersistSettlementAsync(
                db, travel, now, cancellationToken);
            if (!ok)
            {
                return Results.Json(
                    ApiErrors.Validation(new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
                    {
                        ["settlement"] = [settleError ?? "Settlement could not be completed."]
                    }),
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            return Results.Ok(await BuildTravelFinishDtoAsync(db, travelId, userId.Value, cancellationToken));
        }

        var ackNow = DateTimeOffset.UtcNow;
        var ack = await db.FinishedAcks.FirstOrDefaultAsync(
            a => a.TravelId == travelId && a.UserId == userId.Value,
            cancellationToken);
        if (ack is null)
        {
            ack = new FinishedAck
            {
                TravelId = travelId,
                UserId = userId.Value,
                AckedAt = ackNow
            };
            db.FinishedAcks.Add(ack);
        }
        else
            ack.AckedAt = ackNow;

        var memberIds = await db.TravelMembers
            .Where(m => m.TravelId == travelId)
            .Select(m => m.UserId)
            .ToListAsync(cancellationToken);

        var ackedMemberCount = await db.FinishedAcks
            .Where(a => a.TravelId == travelId && memberIds.Contains(a.UserId))
            .CountAsync(cancellationToken);

        await db.SaveChangesAsync(cancellationToken);

        var justAllAcked = memberIds.Count > 0 && ackedMemberCount == memberIds.Count;
        if (justAllAcked)
        {
            travel.Status = TravelStatus.AllFinished;
            await db.SaveChangesAsync(cancellationToken);

            await SendTravelEveryoneFinishedEmailsAsync(
                db,
                emailSender,
                invitationOptions,
                environment,
                logger,
                travel.Id,
                travel.Name,
                cancellationToken);

            var (settleOk, settleErr) = await TravelSettlementHelper.TryPersistSettlementAsync(
                db, travel, ackNow, cancellationToken);
            if (!settleOk)
            {
                return Results.Json(
                    ApiErrors.Validation(new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
                    {
                        ["settlement"] = [settleErr ?? "Settlement could not be completed."]
                    }),
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }
        }

        return Results.Ok(await BuildTravelFinishDtoAsync(db, travelId, userId.Value, cancellationToken));
    }

    private static async Task<TravelFinishDto> BuildTravelFinishDtoAsync(
        ApplicationDbContext db,
        Guid travelId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var travel = await db.Travels.AsNoTracking()
            .FirstAsync(t => t.Id == travelId, cancellationToken);
        var existingAck = await db.FinishedAcks.AsNoTracking()
            .FirstOrDefaultAsync(a => a.TravelId == travelId && a.UserId == userId, cancellationToken);
        var everyoneDone = travel.Status is TravelStatus.AllFinished or TravelStatus.Settled;
        return new TravelFinishDto(
            travel.Status,
            existingAck is not null,
            everyoneDone,
            existingAck?.AckedAt);
    }

    private static async Task SendTravelEveryoneFinishedEmailsAsync(
        ApplicationDbContext db,
        IGezifyEmailSender emailSender,
        IOptions<InvitationOptions> invitationOptions,
        IHostEnvironment environment,
        ILogger logger,
        Guid travelId,
        string travelName,
        CancellationToken cancellationToken)
    {
        var opts = invitationOptions.Value;
        var baseUrl = opts.BaseUrl?.Trim().TrimEnd('/');
        if (string.IsNullOrEmpty(baseUrl))
        {
            if (environment.IsDevelopment())
                baseUrl = "http://localhost:5173";
        }

        if (string.IsNullOrEmpty(baseUrl))
        {
            logger.LogError(
                "Invitation:BaseUrl (or INVITATION_BASE_URL) is not set; skipping travel-finished emails for travel {TravelId}",
                travelId);
            return;
        }

        var travelUrl = $"{baseUrl}/travels/{travelId}";
        var members = await db.TravelMembers
            .AsNoTracking()
            .Where(m => m.TravelId == travelId)
            .Include(m => m.User)
            .ToListAsync(cancellationToken);

        foreach (var m in members)
        {
            var email = m.User?.Email;
            if (string.IsNullOrWhiteSpace(email))
                continue;

            try
            {
                await emailSender.SendTravelEveryoneFinishedAsync(
                    email.Trim(),
                    travelName,
                    travelUrl,
                    cancellationToken);
            }
            catch (InvalidOperationException ex)
            {
                logger.LogError(ex, "Could not send travel-finished email to {Email} for travel {TravelId}", email, travelId);
            }
        }
    }

    private static async Task<TravelSettlementDto> BuildTravelSettlementDtoAsync(
        ApplicationDbContext db,
        Guid travelId,
        TravelStatus status,
        CancellationToken cancellationToken)
    {
        if (status == TravelStatus.Active)
            return new TravelSettlementDto(status, [], null, false);

        if (status == TravelStatus.Settled)
        {
            var rows = await db.SettlementTransfers
                .AsNoTracking()
                .Where(s => s.TravelId == travelId)
                .OrderBy(s => s.CreatedAt)
                .Select(s => new SettlementTransferDto(
                    s.FromUserId,
                    s.FromUser!.Email,
                    s.FromUser.DisplayName,
                    s.ToUserId,
                    s.ToUser!.Email,
                    s.ToUser.DisplayName,
                    s.AmountTry))
                .ToListAsync(cancellationToken);

            var (computed, _) = await TravelSettlementHelper.LoadComputationAsync(db, travelId, cancellationToken);
            var summary = computed is null
                ? null
                : await ToSettlementSummaryDtoAsync(db, computed.Summary, cancellationToken);
            return new TravelSettlementDto(status, rows, summary, false);
        }

        // all_finished: live preview (not yet persisted or settlement blocked)
        var (preview, _) = await TravelSettlementHelper.LoadComputationAsync(db, travelId, cancellationToken);
        if (preview is null)
            return new TravelSettlementDto(status, [], null, true);

        var previewRows = await MapComputedTransfersToDtoAsync(db, preview.Transfers, cancellationToken);
        var previewSummary = await ToSettlementSummaryDtoAsync(db, preview.Summary, cancellationToken);
        return new TravelSettlementDto(status, previewRows, previewSummary, true);
    }

    private static async Task<SettlementSummaryDto> ToSettlementSummaryDtoAsync(
        ApplicationDbContext db,
        SettlementCalculator.Summary summary,
        CancellationToken cancellationToken)
    {
        var ids = summary.Members.Select(m => m.UserId).Distinct().ToList();
        var users = await db.Users
            .AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var members = summary.Members.Select(m =>
        {
            var u = users[m.UserId];
            return new SettlementMemberBalanceDto(
                m.UserId,
                u.Email,
                u.DisplayName,
                m.PaidTry,
                m.ShareOwedTry,
                m.NetTry);
        }).ToList();

        return new SettlementSummaryDto(
            summary.TotalAmountTry,
            summary.MemberCount,
            summary.EqualShareTryRounded,
            members);
    }

    private static async Task<IReadOnlyList<SettlementTransferDto>> MapComputedTransfersToDtoAsync(
        ApplicationDbContext db,
        IReadOnlyList<SettlementCalculator.Transfer> transfers,
        CancellationToken cancellationToken)
    {
        if (transfers.Count == 0)
            return [];

        var ids = transfers.SelectMany(t => new[] { t.FromUserId, t.ToUserId }).Distinct().ToList();
        var users = await db.Users
            .AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var list = new List<SettlementTransferDto>(transfers.Count);
        foreach (var t in transfers)
        {
            var from = users[t.FromUserId];
            var to = users[t.ToUserId];
            list.Add(new SettlementTransferDto(
                t.FromUserId,
                from.Email,
                from.DisplayName,
                t.ToUserId,
                to.Email,
                to.DisplayName,
                t.AmountTry));
        }

        return list;
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

public sealed record TravelInvitationListItemDto(
    Guid Id,
    string Email,
    InvitationStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? AcceptedAt,
    Guid InvitedByUserId,
    string InvitedByEmail,
    string? InvitedByDisplayName);

public sealed record SettlementTransferDto(
    Guid FromUserId,
    string FromEmail,
    string? FromDisplayName,
    Guid ToUserId,
    string ToEmail,
    string? ToDisplayName,
    decimal AmountTry);

public sealed record SettlementMemberBalanceDto(
    Guid UserId,
    string Email,
    string? DisplayName,
    decimal PaidTry,
    decimal ShareOwedTry,
    decimal NetTry);

public sealed record SettlementSummaryDto(
    decimal TotalAmountTry,
    int MemberCount,
    decimal EqualShareTry,
    IReadOnlyList<SettlementMemberBalanceDto> Members);

public sealed record TravelSettlementDto(
    TravelStatus Status,
    IReadOnlyList<SettlementTransferDto> Transfers,
    SettlementSummaryDto? Summary,
    bool IsSettlementPreview);

public sealed record TravelFinishDto(
    TravelStatus Status,
    bool YouHaveAcked,
    bool AllMembersHaveAcked,
    DateTimeOffset? YourAckedAt);
