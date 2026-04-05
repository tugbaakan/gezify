using Gezify.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gezify.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> entity)
    {
        entity.ToTable("users");

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.GoogleId).HasColumnName("google_id").IsRequired().HasMaxLength(256);
        entity.Property(e => e.Email).HasColumnName("email").IsRequired().HasMaxLength(512);
        entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(512);
        entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(2048);
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");

        entity.HasKey(e => e.Id);
        entity.HasIndex(e => e.GoogleId).IsUnique();
        entity.HasIndex(e => e.Email);

        entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
    }
}
