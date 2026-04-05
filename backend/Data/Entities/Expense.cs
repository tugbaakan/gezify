using Gezify.Api.Data.Enums;

namespace Gezify.Api.Data.Entities;

public class Expense
{
    public Guid Id { get; set; }

    public Guid TravelId { get; set; }

    public Travel Travel { get; set; } = null!;

    public Guid AddedById { get; set; }

    public User AddedBy { get; set; } = null!;

    /// <summary>
    /// Set after the two-step “who paid?” flow; null until PATCH /expenses/{id}/payer.
    /// </summary>
    public Guid? PaidById { get; set; }

    public User? PaidBy { get; set; }

    public ExpenseCategory Category { get; set; }

    public string? Location { get; set; }

    public decimal Amount { get; set; }

    public required string Currency { get; set; }

    public decimal AmountTry { get; set; }

    public decimal ExchangeRate { get; set; }

    public DateTimeOffset ExpenseDate { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
