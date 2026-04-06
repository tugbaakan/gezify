using Gezify.Api.Data;
using Gezify.Api.Data.Entities;
using Gezify.Api.Data.Enums;
using Microsoft.EntityFrameworkCore;

namespace Gezify.Api.Settlement;

public static class TravelSettlementHelper
{
    public static async Task<(SettlementCalculator.Result? Result, string? Error)> LoadComputationAsync(
        ApplicationDbContext db,
        Guid travelId,
        CancellationToken cancellationToken)
    {
        var memberIds = await db.TravelMembers
            .AsNoTracking()
            .Where(m => m.TravelId == travelId)
            .OrderBy(m => m.UserId)
            .Select(m => m.UserId)
            .ToListAsync(cancellationToken);

        var expenses = await db.Expenses
            .AsNoTracking()
            .Where(e => e.TravelId == travelId)
            .Select(e => new { e.PaidById, e.AmountTry })
            .ToListAsync(cancellationToken);

        var tuples = expenses.Select(e => (e.PaidById, e.AmountTry)).ToList();
        if (!SettlementCalculator.TryCompute(memberIds, tuples, out var result, out var error))
            return (null, error);

        return (result, null);
    }

    /// <summary>
    /// Replaces any existing rows, sets <see cref="Travel.Status"/> to <see cref="Gezify.Api.Data.Enums.TravelStatus.Settled"/> and <see cref="Travel.SettledAt"/>.
    /// </summary>
    public static async Task<(bool Success, string? Error)> TryPersistSettlementAsync(
        ApplicationDbContext db,
        Travel travel,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var memberIds = await db.TravelMembers
            .Where(m => m.TravelId == travel.Id)
            .OrderBy(m => m.UserId)
            .Select(m => m.UserId)
            .ToListAsync(cancellationToken);

        var expenses = await db.Expenses
            .Where(e => e.TravelId == travel.Id)
            .Select(e => new { e.PaidById, e.AmountTry })
            .ToListAsync(cancellationToken);

        var tuples = expenses.Select(e => (e.PaidById, e.AmountTry)).ToList();
        if (!SettlementCalculator.TryCompute(memberIds, tuples, out var computed, out var error))
            return (false, error);

        var existing = await db.SettlementTransfers
            .Where(s => s.TravelId == travel.Id)
            .ToListAsync(cancellationToken);
        db.SettlementTransfers.RemoveRange(existing);

        foreach (var t in computed!.Transfers)
        {
            db.SettlementTransfers.Add(new SettlementTransfer
            {
                Id = Guid.NewGuid(),
                TravelId = travel.Id,
                FromUserId = t.FromUserId,
                ToUserId = t.ToUserId,
                AmountTry = t.AmountTry,
                CreatedAt = now
            });
        }

        travel.Status = TravelStatus.Settled;
        travel.SettledAt = now;
        await db.SaveChangesAsync(cancellationToken);
        return (true, null);
    }
}
