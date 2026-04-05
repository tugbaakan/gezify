using NpgsqlTypes;

namespace Gezify.Api.Data.Enums;

public enum TravelStatus
{
    [PgName("active")]
    Active,

    [PgName("all_finished")]
    AllFinished,

    [PgName("settled")]
    Settled,
}
