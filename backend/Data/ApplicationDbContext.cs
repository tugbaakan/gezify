using Gezify.Api.Data.Entities;
using Gezify.Api.Data.Enums;
using Microsoft.EntityFrameworkCore;

namespace Gezify.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Travel> Travels => Set<Travel>();

    public DbSet<TravelMember> TravelMembers => Set<TravelMember>();

    public DbSet<Invitation> Invitations => Set<Invitation>();

    public DbSet<Expense> Expenses => Set<Expense>();

    public DbSet<FinishedAck> FinishedAcks => Set<FinishedAck>();

    public DbSet<SettlementTransfer> SettlementTransfers => Set<SettlementTransfer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("pgcrypto");

        modelBuilder.HasPostgresEnum<TravelStatus>(schema: "public", name: "travel_status");
        modelBuilder.HasPostgresEnum<InvitationStatus>(schema: "public", name: "invitation_status");
        modelBuilder.HasPostgresEnum<ExpenseCategory>(schema: "public", name: "expense_category");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
