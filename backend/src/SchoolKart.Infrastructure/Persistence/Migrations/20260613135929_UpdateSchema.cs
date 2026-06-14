using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolKart.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<Dictionary<string, object>>>(
                name: "Deductions",
                table: "Payslips",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<List<Dictionary<string, object>>>(
                name: "Earnings",
                table: "Payslips",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<List<Dictionary<string, object>>>(
                name: "Components",
                table: "EmployeeSalaries",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<Guid>(
                name: "CampusId",
                table: "Departments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "HeadId",
                table: "Departments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Departments_CampusId",
                table: "Departments",
                column: "CampusId");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_HeadId",
                table: "Departments",
                column: "HeadId");

            migrationBuilder.AddForeignKey(
                name: "FK_Departments_Campuses_CampusId",
                table: "Departments",
                column: "CampusId",
                principalTable: "Campuses",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Departments_Users_HeadId",
                table: "Departments",
                column: "HeadId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Departments_Campuses_CampusId",
                table: "Departments");

            migrationBuilder.DropForeignKey(
                name: "FK_Departments_Users_HeadId",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "IX_Departments_CampusId",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "IX_Departments_HeadId",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Deductions",
                table: "Payslips");

            migrationBuilder.DropColumn(
                name: "Earnings",
                table: "Payslips");

            migrationBuilder.DropColumn(
                name: "Components",
                table: "EmployeeSalaries");

            migrationBuilder.DropColumn(
                name: "CampusId",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "HeadId",
                table: "Departments");
        }
    }
}
