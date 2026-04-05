namespace Gezify.Api.Data.Entities;

public class User
{
    public Guid Id { get; set; }

    public required string GoogleId { get; set; }

    public required string Email { get; set; }

    public string? DisplayName { get; set; }

    public string? AvatarUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Travel> TravelsCreated { get; set; } = new List<Travel>();

    public ICollection<TravelMember> TravelMemberships { get; set; } = new List<TravelMember>();

    public ICollection<Invitation> InvitationsSent { get; set; } = new List<Invitation>();

    public ICollection<Expense> ExpensesAdded { get; set; } = new List<Expense>();

    public ICollection<Expense> ExpensesPaid { get; set; } = new List<Expense>();

    public ICollection<FinishedAck> FinishedAcks { get; set; } = new List<FinishedAck>();

    public ICollection<SettlementTransfer> SettlementTransfersFrom { get; set; } = new List<SettlementTransfer>();

    public ICollection<SettlementTransfer> SettlementTransfersTo { get; set; } = new List<SettlementTransfer>();
}
