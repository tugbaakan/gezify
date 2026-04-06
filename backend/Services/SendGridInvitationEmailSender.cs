using Gezify.Api.Auth.Options;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace Gezify.Api.Services;

public sealed class SendGridInvitationEmailSender(
    IOptions<SendGridOptions> options,
    IHostEnvironment environment,
    ILogger<SendGridInvitationEmailSender> logger) : IInvitationEmailSender
{
    private readonly SendGridOptions _options = options.Value;

    public async Task SendInvitationAsync(
        string toEmail,
        string inviteLink,
        string travelName,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            if (environment.IsDevelopment())
            {
                logger.LogWarning(
                    "SendGrid:ApiKey is not set; skipping invitation email to {Email}. Link: {Link}",
                    toEmail,
                    inviteLink);
                return;
            }

            throw new InvalidOperationException(
                "SendGrid:ApiKey (or SENDGRID_API_KEY) is required to send invitation emails.");
        }

        if (string.IsNullOrWhiteSpace(_options.FromEmail))
            throw new InvalidOperationException("SendGrid:FromEmail is required when SendGrid is configured.");

        var client = new SendGridClient(_options.ApiKey);
        var from = new EmailAddress(_options.FromEmail, string.IsNullOrWhiteSpace(_options.FromName) ? "Gezify" : _options.FromName);
        var to = new EmailAddress(toEmail);
        var subject = $"You're invited to join \"{travelName}\" on Gezify";
        var plain = $"You've been invited to join the travel \"{travelName}\" on Gezify.\n\nOpen this link to accept:\n{inviteLink}\n";
        var html = $"""
                    <p>You've been invited to join the travel <strong>{System.Net.WebUtility.HtmlEncode(travelName)}</strong> on Gezify.</p>
                    <p><a href="{System.Net.WebUtility.HtmlEncode(inviteLink)}">Accept invitation</a></p>
                    <p>If the button does not work, copy this URL:<br/><code>{System.Net.WebUtility.HtmlEncode(inviteLink)}</code></p>
                    """;

        var msg = MailHelper.CreateSingleEmail(from, to, subject, plain, html);
        var response = await client.SendEmailAsync(msg, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Body.ReadAsStringAsync(cancellationToken);
            logger.LogError(
                "SendGrid failed with {Status}: {Body}",
                response.StatusCode,
                body);
            throw new InvalidOperationException("Could not send invitation email.");
        }
    }
}
