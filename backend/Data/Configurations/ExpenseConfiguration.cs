using Gezify.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gezify.Api.Data.Configurations;

public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> entity)
    {
        entity.ToTable("expenses");

        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.TravelId).HasColumnName("travel_id");
        entity.Property(e => e.AddedById).HasColumnName("added_by");
        entity.Property(e => e.PaidById).HasColumnName("paid_by");
        entity.Property(e => e.Category)
            .HasColumnName("category")
            .HasColumnType("expense_category");
        entity.Property(e => e.Location).HasColumnName("location").HasMaxLength(1024);
        entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(12, 2);
        entity.Property(e => e.Currency).HasColumnName("currency").IsRequired().HasMaxLength(3).IsFixedLength();
        entity.Property(e => e.AmountTry).HasColumnName("amount_try").HasPrecision(12, 2);
        entity.Property(e => e.ExchangeRate).HasColumnName("exchange_rate").HasPrecision(18, 8);
        entity.Property(e => e.ExpenseDate).HasColumnName("expense_date");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");

        entity.HasKey(e => e.Id);

        entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");

        entity.HasOne(e => e.Travel)
            .WithMany(e => e.Expenses)
            .HasForeignKey(e => e.TravelId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.AddedBy)
            .WithMany(e => e.ExpensesAdded)
            .HasForeignKey(e => e.AddedById)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(e => e.PaidBy)
            .WithMany(e => e.ExpensesPaid)
            .HasForeignKey(e => e.PaidById)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(e => new { e.TravelId, e.ExpenseDate });
        entity.HasIndex(e => new { e.TravelId, e.PaidById });
    }
}
