using System.Text.Json.Serialization;

namespace Gezify.Api.Auth;

public sealed record GoogleAuthRequest(
    [property: JsonPropertyName("code")] string? Code,
    [property: JsonPropertyName("redirectUri")] string? RedirectUri);

public sealed record AuthSuccessResponse(
    [property: JsonPropertyName("accessToken")] string AccessToken,
    [property: JsonPropertyName("expiresIn")] int ExpiresInSeconds,
    [property: JsonPropertyName("user")] PublicUserDto User);

public sealed record PublicUserDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("displayName")] string? DisplayName,
    [property: JsonPropertyName("avatarUrl")] string? AvatarUrl,
    [property: JsonPropertyName("createdAt")] DateTimeOffset CreatedAt);
