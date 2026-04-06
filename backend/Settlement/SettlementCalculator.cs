namespace Gezify.Api.Settlement;

/// <summary>
/// §9 settlement: equal split with exact cent remainder, per-member net, greedy transfer minimization.
/// </summary>
public static class SettlementCalculator
{
    public sealed record MemberBalance(Guid UserId, decimal PaidTry, decimal ShareOwedTry, decimal NetTry);

    public sealed record Summary(
        decimal TotalAmountTry,
        int MemberCount,
        decimal EqualShareTryRounded,
        IReadOnlyList<MemberBalance> Members);

    public sealed record Transfer(Guid FromUserId, Guid ToUserId, decimal AmountTry);

    public sealed record Result(Summary Summary, IReadOnlyList<Transfer> Transfers);

    /// <summary>
    /// <paramref name="memberIds"/> must be the travel’s members (distinct). Order is used only for deterministic remainder split.
    /// </summary>
    public static bool TryCompute(
        IReadOnlyList<Guid> memberIds,
        IReadOnlyList<(Guid? PaidById, decimal AmountTry)> expenses,
        out Result? result,
        out string? error)
    {
        result = null;
        error = null;

        var distinctMembers = memberIds.Distinct().OrderBy(id => id).ToList();
        if (distinctMembers.Count == 0)
        {
            error = "The trip has no members.";
            return false;
        }

        if (distinctMembers.Count != memberIds.Count)
        {
            error = "Member list contains duplicates.";
            return false;
        }

        var memberSet = distinctMembers.ToHashSet();
        decimal totalTry = 0;
        foreach (var e in expenses)
        {
            totalTry += e.AmountTry;
            if (e.PaidById is null)
            {
                error = "All expenses must have a payer before the trip can be settled.";
                return false;
            }

            if (!memberSet.Contains(e.PaidById.Value))
            {
                error = "An expense payer is not a member of this trip.";
                return false;
            }
        }

        var totalCents = ToTotalCents(totalTry);
        var n = distinctMembers.Count;
        var baseShare = totalCents / n;
        var remainderCents = (int)(totalCents % n);

        var shareCents = new Dictionary<Guid, long>(n);
        for (var i = 0; i < distinctMembers.Count; i++)
        {
            var id = distinctMembers[i];
            var extra = i < remainderCents ? 1L : 0L;
            shareCents[id] = baseShare + extra;
        }

        var paidCents = distinctMembers.ToDictionary(id => id, _ => 0L);
        foreach (var e in expenses)
        {
            paidCents[e.PaidById!.Value] += ToTotalCents(e.AmountTry);
        }

        var netCents = distinctMembers.ToDictionary(
            id => id,
            id => paidCents[id] - shareCents[id]);

        var members = new List<MemberBalance>(distinctMembers.Count);
        foreach (var id in distinctMembers)
        {
            var paid = paidCents[id] / 100m;
            var share = shareCents[id] / 100m;
            members.Add(new MemberBalance(id, paid, share, paid - share));
        }

        var equalShareRounded = Math.Round(totalTry / n, 2, MidpointRounding.AwayFromZero);
        var summary = new Summary(totalTry, n, equalShareRounded, members);

        var transfers = BuildGreedyTransfers(netCents);
        result = new Result(summary, transfers);
        return true;
    }

    private static long ToTotalCents(decimal amountTry) =>
        (long)Math.Round(amountTry * 100m, MidpointRounding.AwayFromZero);

    private static IReadOnlyList<Transfer> BuildGreedyTransfers(Dictionary<Guid, long> netCents)
    {
        var transfers = new List<Transfer>();
        while (true)
        {
            Guid? debtorId = null;
            var debtorBal = 0L;
            foreach (var (id, bal) in netCents)
            {
                if (bal >= 0)
                    continue;
                if (debtorId is null || bal < debtorBal)
                {
                    debtorId = id;
                    debtorBal = bal;
                }
            }

            if (debtorId is null)
                break;

            Guid? creditorId = null;
            var creditorBal = 0L;
            foreach (var (id, bal) in netCents)
            {
                if (bal <= 0)
                    continue;
                if (creditorId is null || bal > creditorBal)
                {
                    creditorId = id;
                    creditorBal = bal;
                }
            }

            if (creditorId is null)
                break;

            var payCents = Math.Min(-debtorBal, creditorBal);
            if (payCents <= 0)
                break;

            transfers.Add(new Transfer(debtorId.Value, creditorId.Value, payCents / 100m));
            netCents[debtorId.Value] += payCents;
            netCents[creditorId.Value] -= payCents;
        }

        return transfers;
    }
}
