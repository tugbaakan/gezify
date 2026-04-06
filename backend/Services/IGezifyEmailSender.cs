namespace Gezify.Api.Services;

public interface IGezifyEmailSender
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

    /// <summary>
    /// Notifies a member that every participant has marked the trip as finished.
    /// In Development, may no-op when SendGrid is not configured.
    /// Throws when sending is required and fails.
    /// </summary>
    Task SendTravelEveryoneFinishedAsync(
        string toEmail,
        string travelName,
        string travelDetailUrl,
        CancellationToken cancellationToken);
}
