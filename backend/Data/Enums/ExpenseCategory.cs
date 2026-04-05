using NpgsqlTypes;

namespace Gezify.Api.Data.Enums;

public enum ExpenseCategory
{
    [PgName("food")]
    Food,

    [PgName("accommodation")]
    Accommodation,

    [PgName("transfer")]
    Transfer,

    [PgName("souvenir")]
    Souvenir,

    [PgName("activity")]
    Activity,
}
