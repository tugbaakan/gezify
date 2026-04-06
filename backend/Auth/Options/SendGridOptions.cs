namespace Gezify.Api.Auth.Options;

public sealed class SendGridOptions
{
    public const string SectionName = "SendGrid";

    public string ApiKey { get; set; } = string.Empty;

    public string FromEmail { get; set; } = string.Empty;

    public string FromName { get; set; } = "Gezify";
}
