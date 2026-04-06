using Gezify.Api.Auth;
using Gezify.Api.Data;
using Gezify.Api.Data.Entities;
using Gezify.Api.Data.Enums;
using Gezify.Api.Services;
using Gezify.Api.Travels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gezify.Api.Expenses;

public static class ExpenseEndpoints
{
    public static IEndpointRouteBuilder MapExpenseEndpoints(this IEndpointRouteBuilder app)
    {
        var scoped = app.MapGroup("/travels/{travelId:guid}").WithTags("Expenses").RequireAuthorization();
        scoped.MapGet("/expenses", ListExpensesAsync);
        scoped.MapPost("/expenses", CreateExpenseAsync);

        var root = app.MapGroup("/expenses").WithTags("Expenses").RequireAuthorization();
        root.MapGet("/{expenseId:guid}", GetExpenseAsync);
        root.MapPatch("/{expenseId:guid}/payer", PatchPayerAsync);

        return app;
    }

    private static async Task<IResult> ListExpensesAsync(
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

        var rows = await db.Expenses
            .AsNoTracking()
            .Where(e => e.TravelId == travelId)
            .Include(e => e.AddedBy)
            .Include(e => e.PaidBy)
            .OrderByDescending(e => e.ExpenseDate)
            .ThenByDescending(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

        var list = rows.Select(ToDetailDto).ToList();
        return Results.Ok(list);
    }

    private static async Task<IResult> CreateExpenseAsync(
        Guid travelId,
        HttpContext httpContext,
        [FromBody] CreateExpenseRequest? body,
        ApplicationDbContext db,
        IExchangeRateService exchangeRates,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        var denied = await TravelAuthorization.RequireTravelMemberAsync(db, travelId, userId.Value, cancellationToken);
        if (denied is not null)
            return denied;

        var errors = ValidateCreateExpense(body);
        if (errors.Count > 0)
            return Results.Json(ApiErrors.Validation(errors), statusCode: StatusCodes.Status422UnprocessableEntity);

        var currency = body!.Currency!.Trim().ToUpperInvariant();
        decimal rate;
        try
        {
            rate = await exchangeRates.GetTryRateAsync(currency, cancellationToken);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            var fxErrors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                ["currency"] = [ex.Message]
            };
            return Results.Json(ApiErrors.Validation(fxErrors), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var amountTry = decimal.Round(body.Amount!.Value * rate, 2, MidpointRounding.AwayFromZero);

        Guid? paidById = null;
        if (body.PaidByUserId is { } payerId)
        {
            var payerIsMember = await db.TravelMembers.AnyAsync(
                m => m.TravelId == travelId && m.UserId == payerId,
                cancellationToken);
            if (!payerIsMember)
            {
                var payerErrors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
                {
                    ["paidByUserId"] = ["The payer must be a member of this travel."]
                };
                return Results.Json(ApiErrors.Validation(payerErrors), statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            paidById = payerId;
        }

        var now = DateTimeOffset.UtcNow;
        var expense = new Expense
        {
            TravelId = travelId,
            AddedById = userId.Value,
            PaidById = paidById,
            Category = body.Category!.Value,
            Location = string.IsNullOrWhiteSpace(body.Location) ? null : body.Location.Trim(),
            Amount = body.Amount.Value,
            Currency = currency,
            AmountTry = amountTry,
            ExchangeRate = rate,
            ExpenseDate = body.ExpenseDate!.Value,
            CreatedAt = now
        };
        db.Expenses.Add(expense);
        await db.SaveChangesAsync(cancellationToken);

        await db.Entry(expense).Reference(e => e.AddedBy).LoadAsync(cancellationToken);
        if (expense.PaidById is not null)
            await db.Entry(expense).Reference(e => e.PaidBy).LoadAsync(cancellationToken);

        return Results.Created($"/expenses/{expense.Id}", ToDetailDto(expense));
    }

    private static async Task<IResult> GetExpenseAsync(
        Guid expenseId,
        HttpContext httpContext,
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        var expense = await db.Expenses
            .Include(e => e.AddedBy)
            .Include(e => e.PaidBy)
            .FirstOrDefaultAsync(e => e.Id == expenseId, cancellationToken);
        if (expense is null)
            return Results.Json(ApiErrors.NotFound("Expense not found."), statusCode: StatusCodes.Status404NotFound);

        var denied = await TravelAuthorization.RequireTravelMemberAsync(db, expense.TravelId, userId.Value, cancellationToken);
        if (denied is not null)
            return denied;

        return Results.Ok(ToDetailDto(expense));
    }

    private static async Task<IResult> PatchPayerAsync(
        Guid expenseId,
        HttpContext httpContext,
        [FromBody] PatchExpensePayerRequest? body,
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.TryGetUserId();
        if (userId is null)
            return Results.Json(ApiErrors.Unauthorized("Authentication required."), statusCode: StatusCodes.Status401Unauthorized);

        if (body?.PaidByUserId is null)
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                ["paidByUserId"] = ["The paidByUserId field is required."]
            };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == expenseId, cancellationToken);
        if (expense is null)
            return Results.Json(ApiErrors.NotFound("Expense not found."), statusCode: StatusCodes.Status404NotFound);

        var denied = await TravelAuthorization.RequireTravelMemberAsync(db, expense.TravelId, userId.Value, cancellationToken);
        if (denied is not null)
            return denied;

        var payerIsMember = await db.TravelMembers.AnyAsync(
            m => m.TravelId == expense.TravelId && m.UserId == body.PaidByUserId.Value,
            cancellationToken);
        if (!payerIsMember)
        {
            var err = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                ["paidByUserId"] = ["The payer must be a member of this travel."]
            };
            return Results.Json(ApiErrors.Validation(err), statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        expense.PaidById = body.PaidByUserId.Value;
        await db.SaveChangesAsync(cancellationToken);

        await db.Entry(expense).Reference(e => e.AddedBy).LoadAsync(cancellationToken);
        await db.Entry(expense).Reference(e => e.PaidBy).LoadAsync(cancellationToken);

        return Results.Ok(ToDetailDto(expense));
    }

    private static ExpenseDetailDto ToDetailDto(Expense e) =>
        new(
            e.Id,
            e.TravelId,
            e.Category,
            e.Location,
            e.Amount,
            e.Currency,
            e.AmountTry,
            e.ExchangeRate,
            e.ExpenseDate,
            e.CreatedAt,
            ToActor(e.AddedBy!),
            e.PaidBy is null ? null : ToActor(e.PaidBy));

    private static ExpenseActorDto ToActor(User u) =>
        new(u.Id, u.Email, u.DisplayName);

    private static Dictionary<string, string[]> ValidateCreateExpense(CreateExpenseRequest? body)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        if (body is null)
        {
            errors[""] = ["Request body is required."];
            return errors;
        }

        if (body.Category is null)
            errors["category"] = ["The category field is required."];
        if (body.Amount is null || body.Amount <= 0)
            errors["amount"] = ["The amount must be greater than zero."];
        if (string.IsNullOrWhiteSpace(body.Currency))
            errors["currency"] = ["The currency field is required."];
        else if (body.Currency.Trim().Length != 3)
            errors["currency"] = ["The currency must be a 3-letter ISO 4217 code."];

        if (body.ExpenseDate is null)
            errors["expenseDate"] = ["The expenseDate field is required."];

        if (body.Location is not null && body.Location.Length > 1024)
            errors["location"] = ["The location must be at most 1024 characters."];

        return errors;
    }
}

public sealed record CreateExpenseRequest(
    ExpenseCategory? Category,
    string? Location,
    decimal? Amount,
    string? Currency,
    DateTimeOffset? ExpenseDate,
    Guid? PaidByUserId);

public sealed record PatchExpensePayerRequest(Guid? PaidByUserId);

public sealed record ExpenseActorDto(Guid Id, string Email, string? DisplayName);

public sealed record ExpenseDetailDto(
    Guid Id,
    Guid TravelId,
    ExpenseCategory Category,
    string? Location,
    decimal Amount,
    string Currency,
    decimal AmountTry,
    decimal ExchangeRate,
    DateTimeOffset ExpenseDate,
    DateTimeOffset CreatedAt,
    ExpenseActorDto AddedBy,
    ExpenseActorDto? PaidBy);
