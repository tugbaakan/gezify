using Gezify.Api.Data.Entities;
using Gezify.Api.Data.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gezify.Api.Data.Configurations;

public class TravelConfiguration : IEntityTypeConfiguration<Travel>
{
    public void Configure(EntityTypeBuilder<Travel> entity)
    {
        entity.ToTable("travels");

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.Name).HasColumnName("name").IsRequired().HasMaxLength(512);
        entity.Property(e => e.CreatedById).HasColumnName("created_by");
        entity.Property(e => e.Status)
            .HasColumnName("status")
            .HasColumnType("travel_status");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.SettledAt).HasColumnName("settled_at");

        entity.HasKey(e => e.Id);

        entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
        entity.Property(e => e.Status).HasDefaultValue(TravelStatus.Active);
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");

        // Product policy: keep creator reference; block user delete if they still own travels.
        entity.HasOne(e => e.Creator)
            .WithMany(e => e.TravelsCreated)
            .HasForeignKey(e => e.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => e.CreatedById);
        entity.HasIndex(e => e.Status);
    }
}
