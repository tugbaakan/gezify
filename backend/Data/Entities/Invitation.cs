using Gezify.Api.Data.Enums;

namespace Gezify.Api.Data.Entities;

public class Invitation
{
    public Guid Id { get; set; }

    public Guid TravelId { get; set; }

    public Travel Travel { get; set; } = null!;

    public Guid InvitedById { get; set; }

    public User InvitedBy { get; set; } = null!;

    public required string Token { get; set; }

    public required string Email { get; set; }

    public InvitationStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? AcceptedAt { get; set; }
}
