using Gezify.Api.Data.Enums;

namespace Gezify.Api.Data.Entities;

public class Travel
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public Guid CreatedById { get; set; }

    public User Creator { get; set; } = null!;

    public TravelStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? SettledAt { get; set; }

    public ICollection<TravelMember> Members { get; set; } = new List<TravelMember>();

    public ICollection<Invitation> Invitations { get; set; } = new List<Invitation>();

    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();

    public ICollection<FinishedAck> FinishedAcks { get; set; } = new List<FinishedAck>();

    public ICollection<SettlementTransfer> SettlementTransfers { get; set; } = new List<SettlementTransfer>();
}
