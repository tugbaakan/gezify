using Gezify.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gezify.Api.Data.Configurations;

public class TravelMemberConfiguration : IEntityTypeConfiguration<TravelMember>
{
    public void Configure(EntityTypeBuilder<TravelMember> entity)
    {
        entity.ToTable("travel_members");

        entity.Property(e => e.TravelId).HasColumnName("travel_id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.JoinedAt).HasColumnName("joined_at");

        entity.HasKey(e => new { e.TravelId, e.UserId });

        entity.Property(e => e.JoinedAt).HasDefaultValueSql("now()");

        entity.HasOne(e => e.Travel)
            .WithMany(e => e.Members)
            .HasForeignKey(e => e.TravelId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.User)
            .WithMany(e => e.TravelMemberships)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.UserId);
    }
}
