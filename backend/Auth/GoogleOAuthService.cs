using System.Net.Http.Headers;
using System.Text.Json;
using Gezify.Api.Auth.Options;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;

namespace Gezify.Api.Auth;

public sealed class GoogleOAuthService(
    IHttpClientFactory httpClientFactory,
    IOptions<GoogleAuthOptions> options,
    ILogger<GoogleOAuthService> logger) : IGoogleOAuthService
{
    private readonly GoogleAuthOptions _options = options.Value;

    public async Task<GoogleUserProfile?> ExchangeCodeAsync(string code, string redirectUri, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId) || string.IsNullOrWhiteSpace(_options.ClientSecret))
        {
            logger.LogWarning("Google OAuth client id or secret is not configured.");
            return null;
        }

        var client = httpClientFactory.CreateClient(nameof(GoogleOAuthService));
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["redirect_uri"] = redirectUri,
            ["grant_type"] = "authorization_code"
        });
        content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

        using var response = await client.PostAsync("https://oauth2.googleapis.com/token", content, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Google token exchange failed: {Status} {Body}", (int)response.StatusCode, json);
            return null;
        }

        GoogleOAuthTokenResponse? tokenResponse;
        try
        {
            tokenResponse = JsonSerializer.Deserialize<GoogleOAuthTokenResponse>(json);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to parse Google token response.");
            return null;
        }

        if (tokenResponse?.IdToken is null)
        {
            logger.LogWarning("Google token response missing id_token.");
            return null;
        }

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(tokenResponse.IdToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [_options.ClientId]
            });

            var email = payload.Email;
            if (string.IsNullOrWhiteSpace(email))
            {
                logger.LogWarning("Google ID token missing email claim.");
                return null;
            }

            return new GoogleUserProfile(
                GoogleId: payload.Subject,
                Email: email,
                DisplayName: payload.Name,
                AvatarUrl: payload.Picture);
        }
        catch (InvalidJwtException ex)
        {
            logger.LogWarning(ex, "Google ID token validation failed.");
            return null;
        }
    }
}
