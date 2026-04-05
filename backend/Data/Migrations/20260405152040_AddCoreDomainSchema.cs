using System;
using Gezify.Api.Data.Enums;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gezify.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCoreDomainSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:public.expense_category", "food,accommodation,transfer,souvenir,activity")
                .Annotation("Npgsql:Enum:public.invitation_status", "pending,accepted,expired")
                .Annotation("Npgsql:Enum:public.travel_status", "active,all_finished,settled")
                .Annotation("Npgsql:PostgresExtension:pgcrypto", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:pgcrypto", ",,");

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    google_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    email = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    display_name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    avatar_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "travels",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<TravelStatus>(type: "travel_status", nullable: false, defaultValue: TravelStatus.Active),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    settled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_travels", x => x.id);
                    table.ForeignKey(
                        name: "FK_travels_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "expenses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    travel_id = table.Column<Guid>(type: "uuid", nullable: false),
                    added_by = table.Column<Guid>(type: "uuid", nullable: false),
                    paid_by = table.Column<Guid>(type: "uuid", nullable: true),
                    category = table.Column<ExpenseCategory>(type: "expense_category", nullable: false),
                    location = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    amount_try = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    exchange_rate = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    expense_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expenses", x => x.id);
                    table.ForeignKey(
                        name: "FK_expenses_travels_travel_id",
                        column: x => x.travel_id,
                        principalTable: "travels",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_expenses_users_added_by",
                        column: x => x.added_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expenses_users_paid_by",
                        column: x => x.paid_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "finished_acks",
                columns: table => new
                {
                    travel_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    acked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_finished_acks", x => new { x.travel_id, x.user_id });
                    table.ForeignKey(
                        name: "FK_finished_acks_travels_travel_id",
                        column: x => x.travel_id,
                        principalTable: "travels",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_finished_acks_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "invitations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    travel_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invited_by = table.Column<Guid>(type: "uuid", nullable: false),
                    token = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    email = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    status = table.Column<InvitationStatus>(type: "invitation_status", nullable: false, defaultValue: InvitationStatus.Pending),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    accepted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invitations", x => x.id);
                    table.ForeignKey(
                        name: "FK_invitations_travels_travel_id",
                        column: x => x.travel_id,
                        principalTable: "travels",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_invitations_users_invited_by",
                        column: x => x.invited_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "settlement_transfers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    travel_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    to_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount_try = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settlement_transfers", x => x.id);
                    table.CheckConstraint("CK_settlement_transfers_distinct_users", "from_user_id <> to_user_id");
                    table.ForeignKey(
                        name: "FK_settlement_transfers_travels_travel_id",
                        column: x => x.travel_id,
                        principalTable: "travels",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_settlement_transfers_users_from_user_id",
                        column: x => x.from_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_settlement_transfers_users_to_user_id",
                        column: x => x.to_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "travel_members",
                columns: table => new
                {
                    travel_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    joined_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_travel_members", x => new { x.travel_id, x.user_id });
                    table.ForeignKey(
                        name: "FK_travel_members_travels_travel_id",
                        column: x => x.travel_id,
                        principalTable: "travels",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_travel_members_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_expenses_added_by",
                table: "expenses",
                column: "added_by");

            migrationBuilder.CreateIndex(
                name: "IX_expenses_paid_by",
                table: "expenses",
                column: "paid_by");

            migrationBuilder.CreateIndex(
                name: "IX_expenses_travel_id_expense_date",
                table: "expenses",
                columns: new[] { "travel_id", "expense_date" });

            migrationBuilder.CreateIndex(
                name: "IX_expenses_travel_id_paid_by",
                table: "expenses",
                columns: new[] { "travel_id", "paid_by" });

            migrationBuilder.CreateIndex(
                name: "IX_finished_acks_travel_id",
                table: "finished_acks",
                column: "travel_id");

            migrationBuilder.CreateIndex(
                name: "IX_finished_acks_user_id",
                table: "finished_acks",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_invited_by",
                table: "invitations",
                column: "invited_by");

            migrationBuilder.CreateIndex(
                name: "IX_invitations_token",
                table: "invitations",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invitations_travel_id_status",
                table: "invitations",
                columns: new[] { "travel_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_settlement_transfers_from_user_id",
                table: "settlement_transfers",
                column: "from_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_settlement_transfers_to_user_id",
                table: "settlement_transfers",
                column: "to_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_settlement_transfers_travel_id",
                table: "settlement_transfers",
                column: "travel_id");

            migrationBuilder.CreateIndex(
                name: "IX_travel_members_user_id",
                table: "travel_members",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_travels_created_by",
                table: "travels",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_travels_status",
                table: "travels",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "IX_users_google_id",
                table: "users",
                column: "google_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "expenses");

            migrationBuilder.DropTable(
                name: "finished_acks");

            migrationBuilder.DropTable(
                name: "invitations");

            migrationBuilder.DropTable(
                name: "settlement_transfers");

            migrationBuilder.DropTable(
                name: "travel_members");

            migrationBuilder.DropTable(
                name: "travels");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pgcrypto", ",,")
                .OldAnnotation("Npgsql:Enum:public.expense_category", "food,accommodation,transfer,souvenir,activity")
                .OldAnnotation("Npgsql:Enum:public.invitation_status", "pending,accepted,expired")
                .OldAnnotation("Npgsql:Enum:public.travel_status", "active,all_finished,settled")
                .OldAnnotation("Npgsql:PostgresExtension:pgcrypto", ",,");
        }
    }
}
