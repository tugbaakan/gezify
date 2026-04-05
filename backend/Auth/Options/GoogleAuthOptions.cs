namespace Gezify.Api.Auth.Options;

public sealed class GoogleAuthOptions
{
    public const string SectionName = "Auth:Google";

    public string ClientId { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;
}
