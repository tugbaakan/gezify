namespace Gezify.Api.Services;

public interface IInvitationEmailSender
{
    /// <summary>
    /// Sends the invitation email. In Development, may no-op when SendGrid is not configured.
    /// Throws when sending is required and fails.
    /// </summary>
    Task SendInvitationAsync(
        string toEmail,
        string inviteLink,
        string travelName,
        CancellationToken cancellationToken);
}
