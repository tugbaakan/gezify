using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Gezify.Api.Auth.Options;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Gezify.Api.Services;

public sealed class InvitationTokenService(IOptions<InvitationOptions> options) : IInvitationTokenService
{
    public const string TravelIdClaimType = "tid";

    private readonly InvitationOptions _options = options.Value;

    public string CreateToken(Guid invitationId, Guid travelId, string email, DateTimeOffset nowUtc)
    {
        if (_options.SigningKey.Length < 32)
            throw new InvalidOperationException(
                "Invitation:SigningKey (or INVITATION_SIGNING_KEY) must be at least 32 characters.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = nowUtc.AddDays(_options.TokenValidDays);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, invitationId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(TravelIdClaimType, travelId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: nowUtc.UtcDateTime,
            expires: expires.UtcDateTime,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateToken(string token, DateTimeOffset nowUtc)
    {
        if (string.IsNullOrWhiteSpace(token) || _options.SigningKey.Length < 32)
            return null;

        // Keep JWT short claim types (sub, email, tid). Default handler maps them to ClaimTypes.*
        // and breaks our invitation parsing unless we duplicate every possible mapped type.
        var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
        handler.InboundClaimTypeMap.Clear();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        try
        {
            return handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidIssuer = _options.Issuer,
                ValidAudience = _options.Audience,
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2)
            }, out _);
        }
        catch
        {
            return null;
        }
    }
}
