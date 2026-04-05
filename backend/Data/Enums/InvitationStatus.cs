using NpgsqlTypes;

namespace Gezify.Api.Data.Enums;

public enum InvitationStatus
{
    [PgName("pending")]
    Pending,

    [PgName("accepted")]
    Accepted,

    [PgName("expired")]
    Expired,
}
