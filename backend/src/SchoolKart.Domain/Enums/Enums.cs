namespace SchoolKart.Domain.Enums;

public enum SubscriptionPlan { Trial, Basic, Standard, Premium, Enterprise }
public enum SubscriptionStatus { Active, Trial, Expired, Suspended, Cancelled }
public enum UserStatus { Active, Inactive, Suspended, PendingVerification }
public enum Gender { Male, Female, Other }
public enum BloodGroup { APositive, ANegative, BPositive, BNegative, ABPositive, ABNegative, OPositive, ONegative }
public enum AdmissionStatus { Inquiry, Applied, Admitted, Active, Transferred, Withdrawn, Alumni }
public enum GuardianRelation { Father, Mother, Guardian, Grandparent, Sibling, Other }
public enum DocumentType { BirthCertificate, Aadhar, TransferCertificate, Marksheet, Photo, AddressProof, Other }
public enum EmploymentType { Permanent, Contractual, PartTime, Visiting, Probation }
public enum EmployeeStatus { Active, Inactive, OnLeave, Resigned, Terminated }
public enum AttendanceStatus { Present, Absent, Late, HalfDay, Excused }
public enum LeaveStatus { Pending, Approved, Rejected, Cancelled }
public enum LeaveType { Sick, Casual, Earned, Maternity, Paternity, Unpaid, Other }
public enum ExamType { UnitTest, Midterm, Final, Quarterly, HalfYearly, Annual, Practice }
public enum GradeType { Marks, Grades, Both }
public enum FeeFrequency { OneTime, Monthly, Quarterly, HalfYearly, Annual }
public enum PaymentStatus { Pending, Partial, Paid, Overdue, Waived }
public enum PaymentMethod { Cash, Cheque, DD, Online, UPI, Card, NEFT, RTGS }
public enum DiscountType { Percentage, Fixed }
public enum SubjectType { Core, Elective, Activity, Language }
public enum DayOfWeek { Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday }
public enum HolidayType { National, Regional, School, Exam }
public enum BookStatus { Available, Issued, Reserved, Damaged, Lost }
public enum PromotionStatus { Promoted, Detained, Transferred, Withdrawn }
public enum PayrollStatus { Draft, Approved, Paid, Cancelled }
