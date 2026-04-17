using Gezify.Api.Data.Enums;
using Gezify.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Npgsql;

namespace Gezify.Api.Data;

/// <summary>
/// Enables <c>dotnet ef</c> (including CI) to build <see cref="ApplicationDbContext"/> with the same
/// Npgsql enum mapping and connection resolution as runtime (<c>DATABASE_URL</c> or connection string).
/// </summary>
public sealed class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var basePath = Directory.GetCurrentDirectory();
        var envName =
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Development";

        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile(Path.Combine(basePath, "appsettings.json"), optional: true)
            .AddJsonFile(Path.Combine(basePath, $"appsettings.{envName}.json"), optional: true)
            .AddUserSecrets(typeof(ApplicationDbContext).Assembly, optional: true)
            .AddEnvironmentVariables()
            .Build();

        var hostEnvironment = new DesignTimeHostEnvironment(
            configuration["ASPNETCORE_ENVIRONMENT"] ?? envName);

        var connectionString = DatabaseConnection.Resolve(configuration, hostEnvironment);

        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
        dataSourceBuilder.MapEnum<TravelStatus>("travel_status");
        dataSourceBuilder.MapEnum<InvitationStatus>("invitation_status");
        dataSourceBuilder.MapEnum<ExpenseCategory>("expense_category");
        var dataSource = dataSourceBuilder.Build();

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql(dataSource);

        return new ApplicationDbContext(optionsBuilder.Options);
    }

    private sealed class DesignTimeHostEnvironment : IHostEnvironment
    {
        public DesignTimeHostEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }

        public string ApplicationName { get; set; } = "Gezify.Api";

        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
