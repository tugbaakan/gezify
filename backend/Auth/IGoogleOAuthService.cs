namespace Gezify.Api.Auth;

public interface IGoogleOAuthService
{
    /// <summary>Exchanges an authorization code for tokens and returns the validated Google ID token payload.</summary>
    Task<GoogleUserProfile?> ExchangeCodeAsync(string code, string redirectUri, CancellationToken cancellationToken);
}

public sealed record GoogleUserProfile(string GoogleId, string Email, string? DisplayName, string? AvatarUrl);
