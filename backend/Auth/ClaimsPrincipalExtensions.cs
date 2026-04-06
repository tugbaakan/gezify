using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Gezify.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Resolves the Gezify user id from the access token (sub / NameIdentifier).</summary>
    public static Guid? TryGetUserId(this ClaimsPrincipal? principal)
    {
        if (principal is null)
            return null;

        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (sub is null || !Guid.TryParse(sub, out var userId))
            return null;

        return userId;
    }
}
