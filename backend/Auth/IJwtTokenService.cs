using System.Security.Claims;

namespace Gezify.Api.Auth;

public interface IJwtTokenService
{
    string CreateAccessToken(Guid userId, string email);

    /// <summary>Used by tests or diagnostics; JwtBearer validates using the same parameters.</summary>
    ClaimsPrincipal? ReadPrincipal(string token);
}
