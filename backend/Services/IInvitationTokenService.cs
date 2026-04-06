using System.Security.Claims;

namespace Gezify.Api.Services;

public interface IInvitationTokenService
{
    string CreateToken(Guid invitationId, Guid travelId, string email, DateTimeOffset nowUtc);

    /// <summary>Validates signature and lifetime. Returns null if invalid or expired.</summary>
    ClaimsPrincipal? ValidateToken(string token, DateTimeOffset nowUtc);
}
