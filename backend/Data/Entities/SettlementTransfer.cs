namespace Gezify.Api.Data.Entities;

public class SettlementTransfer
{
    public Guid Id { get; set; }

    public Guid TravelId { get; set; }

    public Travel Travel { get; set; } = null!;

    public Guid FromUserId { get; set; }

    public User FromUser { get; set; } = null!;

    public Guid ToUserId { get; set; }

    public User ToUser { get; set; } = null!;

    public decimal AmountTry { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
