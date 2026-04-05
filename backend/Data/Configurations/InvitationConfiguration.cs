using Gezify.Api.Data.Entities;
using Gezify.Api.Data.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gezify.Api.Data.Configurations;

public class InvitationConfiguration : IEntityTypeConfiguration<Invitation>
{
    public void Configure(EntityTypeBuilder<Invitation> entity)
    {
        entity.ToTable("invitations");

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.TravelId).HasColumnName("travel_id");
        entity.Property(e => e.InvitedById).HasColumnName("invited_by");
        entity.Property(e => e.Token).HasColumnName("token").IsRequired().HasMaxLength(2048);
        entity.Property(e => e.Email).HasColumnName("email").IsRequired().HasMaxLength(512);
        entity.Property(e => e.Status)
            .HasColumnName("status")
            .HasColumnType("invitation_status");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.AcceptedAt).HasColumnName("accepted_at");

        entity.HasKey(e => e.Id);

        entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
        entity.Property(e => e.Status).HasDefaultValue(InvitationStatus.Pending);
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");

        entity.HasIndex(e => e.Token).IsUnique();

        entity.HasOne(e => e.Travel)
            .WithMany(e => e.Invitations)
            .HasForeignKey(e => e.TravelId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.InvitedBy)
            .WithMany(e => e.InvitationsSent)
            .HasForeignKey(e => e.InvitedById)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => new { e.TravelId, e.Status });
    }
}
