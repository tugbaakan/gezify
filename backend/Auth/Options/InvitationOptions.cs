namespace Gezify.Api.Auth.Options;

public sealed class InvitationOptions
{
    public const string SectionName = "Invitation";

    /// <summary>SPA base URL for invite links (e.g. https://gezify.app). Also set via INVITATION_BASE_URL.</summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>Symmetric key for invitation JWT (≥32 chars). Also set via INVITATION_SIGNING_KEY.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public string Issuer { get; set; } = "Gezify";

    public string Audience { get; set; } = "Gezify.Invitation";

    /// <summary>Invitation JWT lifetime in days (default 7).</summary>
    public int TokenValidDays { get; set; } = 7;
}
