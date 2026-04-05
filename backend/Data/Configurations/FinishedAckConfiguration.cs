using Gezify.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gezify.Api.Data.Configurations;

public class FinishedAckConfiguration : IEntityTypeConfiguration<FinishedAck>
{
    public void Configure(EntityTypeBuilder<FinishedAck> entity)
    {
        entity.ToTable("finished_acks");

        entity.Property(e => e.TravelId).HasColumnName("travel_id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.AckedAt).HasColumnName("acked_at");

        entity.HasKey(e => new { e.TravelId, e.UserId });

        entity.Property(e => e.AckedAt).HasDefaultValueSql("now()");

        entity.HasOne(e => e.Travel)
            .WithMany(e => e.FinishedAcks)
            .HasForeignKey(e => e.TravelId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.User)
            .WithMany(e => e.FinishedAcks)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.TravelId);
    }
}
