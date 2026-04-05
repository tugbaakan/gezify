namespace Gezify.Api.Infrastructure;

public static class DatabaseConnection
{
    /// <summary>
    /// Resolves Npgsql connection string from <c>DATABASE_URL</c> (Railway/Heroku style) or configuration.
    /// </summary>
    public static string Resolve(IConfiguration configuration, IHostEnvironment environment)
    {
        var databaseUrl = configuration["DATABASE_URL"];
        if (!string.IsNullOrWhiteSpace(databaseUrl))
            return ParseDatabaseUrl(databaseUrl, requireSsl: !environment.IsDevelopment());

        var fromConfig = configuration.GetConnectionString("Database");
        if (!string.IsNullOrWhiteSpace(fromConfig))
            return fromConfig;

        throw new InvalidOperationException(
            "Database connection not configured. Set DATABASE_URL or ConnectionStrings:Database.");
    }

    /// <summary>
    /// Converts <c>postgresql://user:pass@host:port/dbname</c> to an Npgsql connection string.
    /// </summary>
    public static string ParseDatabaseUrl(string databaseUrl, bool requireSsl)
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':', 2);
        var user = Uri.UnescapeDataString(userInfo[0]);
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
        var database = uri.AbsolutePath.TrimStart('/');

        var sslMode = requireSsl ? "Require" : "Prefer";
        var trust = requireSsl ? "Trust Server Certificate=true" : string.Empty;

        return $"Host={uri.Host};Port={uri.Port};Database={database};Username={user};Password={password};SSL Mode={sslMode};{trust}";
    }
}
