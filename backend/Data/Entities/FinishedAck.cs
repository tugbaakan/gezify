namespace Gezify.Api.Data.Entities;

public class FinishedAck
{
    public Guid TravelId { get; set; }

    public Travel Travel { get; set; } = null!;

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public DateTimeOffset AckedAt { get; set; }
}
