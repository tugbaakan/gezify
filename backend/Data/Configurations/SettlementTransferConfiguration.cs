using Gezify.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gezify.Api.Data.Configurations;

public class SettlementTransferConfiguration : IEntityTypeConfiguration<SettlementTransfer>
{
    public void Configure(EntityTypeBuilder<SettlementTransfer> entity)
    {
        entity.ToTable(
            "settlement_transfers",
            t => t.HasCheckConstraint(
                "CK_settlement_transfers_distinct_users",
                "from_user_id <> to_user_id"));

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.TravelId).HasColumnName("travel_id");
        entity.Property(e => e.FromUserId).HasColumnName("from_user_id");
        entity.Property(e => e.ToUserId).HasColumnName("to_user_id");
        entity.Property(e => e.AmountTry).HasColumnName("amount_try").HasPrecision(12, 2);
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");

        entity.HasKey(e => e.Id);

        entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");

        entity.HasOne(e => e.Travel)
            .WithMany(e => e.SettlementTransfers)
            .HasForeignKey(e => e.TravelId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.FromUser)
            .WithMany(e => e.SettlementTransfersFrom)
            .HasForeignKey(e => e.FromUserId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.ToUser)
            .WithMany(e => e.SettlementTransfersTo)
            .HasForeignKey(e => e.ToUserId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.TravelId);
    }
}
