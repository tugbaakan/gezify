using Microsoft.EntityFrameworkCore;

namespace Gezify.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Enables gen_random_uuid() / uuid defaults in later migrations.
        modelBuilder.HasPostgresExtension("pgcrypto");
    }
}
