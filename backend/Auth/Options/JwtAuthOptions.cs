namespace Gezify.Api.Auth.Options;

public sealed class JwtAuthOptions
{
    public const string SectionName = "Auth:Jwt";

    /// <summary>Symmetric key for HS256 (at least 32 bytes recommended).</summary>
    public string SecretKey { get; set; } = string.Empty;

    public string Issuer { get; set; } = "Gezify";

    public string Audience { get; set; } = "Gezify.Api";

    public int AccessTokenMinutes { get; set; } = 10080;
}
