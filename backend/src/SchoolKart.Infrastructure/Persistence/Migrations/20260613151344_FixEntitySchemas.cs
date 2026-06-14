using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolKart.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixEntitySchemas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GatePasses_Students_StudentId",
                table: "GatePasses");

            migrationBuilder.DropForeignKey(
                name: "FK_GatePasses_Visitors_VisitorId",
                table: "GatePasses");

            migrationBuilder.DropForeignKey(
                name: "FK_ParentCommunications_Students_StudentId",
                table: "ParentCommunications");

            migrationBuilder.DropIndex(
                name: "IX_ParentCommunications_StudentId",
                table: "ParentCommunications");

            migrationBuilder.DropIndex(
                name: "IX_GatePasses_VisitorId",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "ParentCommunications");

            migrationBuilder.DropColumn(
                name: "EmployeeId",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "IssuedAt",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "ConductedBy",
                table: "EntranceTests");

            migrationBuilder.DropColumn(
                name: "InterviewDate",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "TestDate",
                table: "AdmissionApplications");

            migrationBuilder.RenameColumn(
                name: "WhomToMeetId",
                table: "Visitors",
                newName: "HostEmployeeId");

            migrationBuilder.RenameColumn(
                name: "WhomToMeet",
                table: "Visitors",
                newName: "VehicleNumber");

            migrationBuilder.RenameColumn(
                name: "Remarks",
                table: "Visitors",
                newName: "PurposeDetails");

            migrationBuilder.RenameColumn(
                name: "Photo",
                table: "Visitors",
                newName: "PhotoUrl");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Visitors",
                newName: "VisitorName");

            migrationBuilder.RenameColumn(
                name: "CreatedBy",
                table: "Visitors",
                newName: "CheckedOutBy");

            migrationBuilder.RenameColumn(
                name: "Address",
                table: "Visitors",
                newName: "Notes");

            migrationBuilder.RenameColumn(
                name: "Relationship",
                table: "ParentStudentMappings",
                newName: "Relation");

            migrationBuilder.RenameColumn(
                name: "ReceiveSms",
                table: "ParentStudentMappings",
                newName: "IsPickupAuthorized");

            migrationBuilder.RenameColumn(
                name: "ReceiveEmail",
                table: "ParentStudentMappings",
                newName: "IsEmergency");

            migrationBuilder.RenameColumn(
                name: "IsEmergencyContact",
                table: "ParentStudentMappings",
                newName: "CanViewResults");

            migrationBuilder.RenameColumn(
                name: "CanPickup",
                table: "ParentStudentMappings",
                newName: "CanViewFees");

            migrationBuilder.RenameColumn(
                name: "Photo",
                table: "Parents",
                newName: "ProfilePicture");

            migrationBuilder.RenameColumn(
                name: "IdType",
                table: "Parents",
                newName: "Pincode");

            migrationBuilder.RenameColumn(
                name: "IdNumber",
                table: "Parents",
                newName: "Gender");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "ParentCommunications",
                newName: "Direction");

            migrationBuilder.RenameColumn(
                name: "RespondedBy",
                table: "ParentCommunications",
                newName: "InitiatedBy");

            migrationBuilder.RenameColumn(
                name: "VisitorId",
                table: "GatePasses",
                newName: "RequestedBy");

            migrationBuilder.RenameColumn(
                name: "ValidUntil",
                table: "GatePasses",
                newName: "OutTime");

            migrationBuilder.RenameColumn(
                name: "Remarks",
                table: "GatePasses",
                newName: "RejectionReason");

            migrationBuilder.RenameColumn(
                name: "Purpose",
                table: "GatePasses",
                newName: "Reason");

            migrationBuilder.RenameColumn(
                name: "IssuedBy",
                table: "GatePasses",
                newName: "ApprovedBy");

            migrationBuilder.RenameColumn(
                name: "ExitTime",
                table: "GatePasses",
                newName: "InTime");

            migrationBuilder.RenameColumn(
                name: "Remarks",
                table: "EntranceTests",
                newName: "Subject");

            migrationBuilder.RenameColumn(
                name: "ObtainedMarks",
                table: "EntranceTests",
                newName: "MarksObtained");

            migrationBuilder.RenameColumn(
                name: "GuardianPhone",
                table: "AdmissionInquiries",
                newName: "ParentPhone");

            migrationBuilder.RenameColumn(
                name: "GuardianName",
                table: "AdmissionInquiries",
                newName: "ParentName");

            migrationBuilder.RenameColumn(
                name: "GuardianEmail",
                table: "AdmissionInquiries",
                newName: "ReferredBy");

            migrationBuilder.RenameColumn(
                name: "ClassId",
                table: "AdmissionInquiries",
                newName: "AcademicYearId");

            migrationBuilder.RenameColumn(
                name: "TestResult",
                table: "AdmissionApplications",
                newName: "State");

            migrationBuilder.RenameColumn(
                name: "Remarks",
                table: "AdmissionApplications",
                newName: "ReviewNotes");

            migrationBuilder.RenameColumn(
                name: "GuardianEmail",
                table: "AdmissionApplications",
                newName: "RejectionReason");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Visitors",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BadgeNumber",
                table: "Visitors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CheckedInBy",
                table: "Visitors",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Company",
                table: "Visitors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                table: "Visitors",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HostDepartment",
                table: "Visitors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HostName",
                table: "Visitors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdProofUrl",
                table: "Visitors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NoOfPersons",
                table: "Visitors",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewAttendance",
                table: "ParentStudentMappings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AadharNumber",
                table: "Parents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Parents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Employer",
                table: "Parents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PortalEnabled",
                table: "Parents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Subject",
                table: "ParentCommunications",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Message",
                table: "ParentCommunications",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentUrl",
                table: "ParentCommunications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsRead",
                table: "ParentCommunications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReadAt",
                table: "ParentCommunications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "StudentId",
                table: "GatePasses",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PassNumber",
                table: "GatePasses",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "GatePasses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AuthorizedPerson",
                table: "GatePasses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AuthorizedPersonPhone",
                table: "GatePasses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpectedReturn",
                table: "GatePasses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "GatePasses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ParentPhone",
                table: "GatePasses",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "TestDate",
                table: "EntranceTests",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "EntranceTests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "TestTime",
                table: "EntranceTests",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.AlterColumn<string>(
                name: "Source",
                table: "AdmissionInquiries",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "FollowUpDate",
                table: "AdmissionInquiries",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClassSeeking",
                table: "AdmissionInquiries",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ParentEmail",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviousSchool",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "GuardianPhone",
                table: "AdmissionApplications",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "GuardianName",
                table: "AdmissionApplications",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Allergies",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ApplicationFee",
                table: "AdmissionApplications",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ApplicationFeePaid",
                table: "AdmissionApplications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "BloodGroup",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Caste",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "DocumentUrls",
                table: "AdmissionApplications",
                type: "text[]",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "FatherName",
                table: "AdmissionApplications",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FatherOccupation",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FatherPhone",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "InquiryId",
                table: "AdmissionApplications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MedicalConditions",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherName",
                table: "AdmissionApplications",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MotherOccupation",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotherPhone",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Pincode",
                table: "AdmissionApplications",
                type: "text",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_GatePasses_Students_StudentId",
                table: "GatePasses",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GatePasses_Students_StudentId",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "BadgeNumber",
                table: "Visitors");

            migrationBuilder.DropColumn(
                name: "CheckedInBy",
                table: "Visitors");

            migrationBuilder.DropColumn(
                name: "Company",
                table: "Visitors");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                table: "Visitors");

            migrationBuilder.DropColumn(
                name: "HostDepartment",
                table: "Visitors");

            migrationBuilder.DropColumn(
                name: "HostName",
                table: "Visitors");

            migrationBuilder.DropColumn(
                name: "IdProofUrl",
                table: "Visitors");

            migrationBuilder.DropColumn(
                name: "NoOfPersons",
                table: "Visitors");

            migrationBuilder.DropColumn(
                name: "CanViewAttendance",
                table: "ParentStudentMappings");

            migrationBuilder.DropColumn(
                name: "AadharNumber",
                table: "Parents");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Parents");

            migrationBuilder.DropColumn(
                name: "Employer",
                table: "Parents");

            migrationBuilder.DropColumn(
                name: "PortalEnabled",
                table: "Parents");

            migrationBuilder.DropColumn(
                name: "AttachmentUrl",
                table: "ParentCommunications");

            migrationBuilder.DropColumn(
                name: "IsRead",
                table: "ParentCommunications");

            migrationBuilder.DropColumn(
                name: "ReadAt",
                table: "ParentCommunications");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "AuthorizedPerson",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "AuthorizedPersonPhone",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "ExpectedReturn",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "ParentPhone",
                table: "GatePasses");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "EntranceTests");

            migrationBuilder.DropColumn(
                name: "TestTime",
                table: "EntranceTests");

            migrationBuilder.DropColumn(
                name: "ClassSeeking",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "ParentEmail",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "PreviousSchool",
                table: "AdmissionInquiries");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "Allergies",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "ApplicationFee",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "ApplicationFeePaid",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "BloodGroup",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "Caste",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "City",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "ContactEmail",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "ContactPhone",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "DocumentUrls",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "FatherName",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "FatherOccupation",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "FatherPhone",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "InquiryId",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "MedicalConditions",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "MotherName",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "MotherOccupation",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "MotherPhone",
                table: "AdmissionApplications");

            migrationBuilder.DropColumn(
                name: "Pincode",
                table: "AdmissionApplications");

            migrationBuilder.RenameColumn(
                name: "VisitorName",
                table: "Visitors",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "VehicleNumber",
                table: "Visitors",
                newName: "WhomToMeet");

            migrationBuilder.RenameColumn(
                name: "PurposeDetails",
                table: "Visitors",
                newName: "Remarks");

            migrationBuilder.RenameColumn(
                name: "PhotoUrl",
                table: "Visitors",
                newName: "Photo");

            migrationBuilder.RenameColumn(
                name: "Notes",
                table: "Visitors",
                newName: "Address");

            migrationBuilder.RenameColumn(
                name: "HostEmployeeId",
                table: "Visitors",
                newName: "WhomToMeetId");

            migrationBuilder.RenameColumn(
                name: "CheckedOutBy",
                table: "Visitors",
                newName: "CreatedBy");

            migrationBuilder.RenameColumn(
                name: "Relation",
                table: "ParentStudentMappings",
                newName: "Relationship");

            migrationBuilder.RenameColumn(
                name: "IsPickupAuthorized",
                table: "ParentStudentMappings",
                newName: "ReceiveSms");

            migrationBuilder.RenameColumn(
                name: "IsEmergency",
                table: "ParentStudentMappings",
                newName: "ReceiveEmail");

            migrationBuilder.RenameColumn(
                name: "CanViewResults",
                table: "ParentStudentMappings",
                newName: "IsEmergencyContact");

            migrationBuilder.RenameColumn(
                name: "CanViewFees",
                table: "ParentStudentMappings",
                newName: "CanPickup");

            migrationBuilder.RenameColumn(
                name: "ProfilePicture",
                table: "Parents",
                newName: "Photo");

            migrationBuilder.RenameColumn(
                name: "Pincode",
                table: "Parents",
                newName: "IdType");

            migrationBuilder.RenameColumn(
                name: "Gender",
                table: "Parents",
                newName: "IdNumber");

            migrationBuilder.RenameColumn(
                name: "InitiatedBy",
                table: "ParentCommunications",
                newName: "RespondedBy");

            migrationBuilder.RenameColumn(
                name: "Direction",
                table: "ParentCommunications",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "RequestedBy",
                table: "GatePasses",
                newName: "VisitorId");

            migrationBuilder.RenameColumn(
                name: "RejectionReason",
                table: "GatePasses",
                newName: "Remarks");

            migrationBuilder.RenameColumn(
                name: "Reason",
                table: "GatePasses",
                newName: "Purpose");

            migrationBuilder.RenameColumn(
                name: "OutTime",
                table: "GatePasses",
                newName: "ValidUntil");

            migrationBuilder.RenameColumn(
                name: "InTime",
                table: "GatePasses",
                newName: "ExitTime");

            migrationBuilder.RenameColumn(
                name: "ApprovedBy",
                table: "GatePasses",
                newName: "IssuedBy");

            migrationBuilder.RenameColumn(
                name: "Subject",
                table: "EntranceTests",
                newName: "Remarks");

            migrationBuilder.RenameColumn(
                name: "MarksObtained",
                table: "EntranceTests",
                newName: "ObtainedMarks");

            migrationBuilder.RenameColumn(
                name: "ReferredBy",
                table: "AdmissionInquiries",
                newName: "GuardianEmail");

            migrationBuilder.RenameColumn(
                name: "ParentPhone",
                table: "AdmissionInquiries",
                newName: "GuardianPhone");

            migrationBuilder.RenameColumn(
                name: "ParentName",
                table: "AdmissionInquiries",
                newName: "GuardianName");

            migrationBuilder.RenameColumn(
                name: "AcademicYearId",
                table: "AdmissionInquiries",
                newName: "ClassId");

            migrationBuilder.RenameColumn(
                name: "State",
                table: "AdmissionApplications",
                newName: "TestResult");

            migrationBuilder.RenameColumn(
                name: "ReviewNotes",
                table: "AdmissionApplications",
                newName: "Remarks");

            migrationBuilder.RenameColumn(
                name: "RejectionReason",
                table: "AdmissionApplications",
                newName: "GuardianEmail");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Visitors",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Subject",
                table: "ParentCommunications",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Message",
                table: "ParentCommunications",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "ParentCommunications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "StudentId",
                table: "GatePasses",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "PassNumber",
                table: "GatePasses",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EmployeeId",
                table: "GatePasses",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "IssuedAt",
                table: "GatePasses",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AlterColumn<DateTime>(
                name: "TestDate",
                table: "EntranceTests",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AddColumn<Guid>(
                name: "ConductedBy",
                table: "EntranceTests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Source",
                table: "AdmissionInquiries",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "FollowUpDate",
                table: "AdmissionInquiries",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "GuardianPhone",
                table: "AdmissionApplications",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "GuardianName",
                table: "AdmissionApplications",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "InterviewDate",
                table: "AdmissionApplications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TestDate",
                table: "AdmissionApplications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParentCommunications_StudentId",
                table: "ParentCommunications",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_GatePasses_VisitorId",
                table: "GatePasses",
                column: "VisitorId");

            migrationBuilder.AddForeignKey(
                name: "FK_GatePasses_Students_StudentId",
                table: "GatePasses",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GatePasses_Visitors_VisitorId",
                table: "GatePasses",
                column: "VisitorId",
                principalTable: "Visitors",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ParentCommunications_Students_StudentId",
                table: "ParentCommunications",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "Id");
        }
    }
}
