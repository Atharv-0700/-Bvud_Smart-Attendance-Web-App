/**
 * Type definitions for Subject-wise Attendance Tracking System
 * Bharati Vidyapeeth University Smart Attendance System
 */

// ============================================
// PART 1: Subject-wise Attendance Summary
// ============================================

export interface SubjectAttendanceSummary {
  subject: string;
  semester: number;
  division?: string;
  totalLectures: number;
  attendedLectures: number;
  absentLectures: number;
  attendancePercentage: number;
  subjectStatus: 'Eligible' | 'Not Eligible';
  lastUpdated: string;
}

// ============================================
// PART 2: Semester Report
// ============================================

export interface SubjectEligibility {
  subject: string;
  attendancePercentage: number;
  subjectStatus: 'Eligible' | 'Not Eligible';
  totalLectures: number;
  attendedLectures: number;
  absentLectures: number;
}

export interface SemesterReport {
  semester: number;
  studentId: string;
  studentName: string;
  rollNumber: string;
  subjects: SubjectEligibility[];
  overallStatus: 'Eligible for Exam' | 'Not Eligible for Exam';
  generatedAt: string;
}

// ============================================
// PART 3: Monthly Report (Per Subject)
// ============================================

export interface MonthlySubjectAttendance {
  year: number;
  month: number;
  subject: string;
  semester: number;
  division?: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  email?: string;
  totalLectures: number;
  attendedLectures: number;
  absentLectures: number;
  attendancePercentage: number;
  eligibilityStatus: 'Eligible' | 'Not Eligible';
  generatedAt: string;
}

// ============================================
// PART 4: Full Student Report
// ============================================

export interface FullStudentReport {
  studentId: string;
  studentName: string;
  rollNumber: string;
  email?: string;
  semester: number;
  division?: string;
  subjectWiseAttendance: SubjectAttendanceSummary[];
  semesterEligibility: SemesterReport;
  overallAttendancePercentage: number;
  generatedAt: string;
  universityComplianceNote: string;
}

// ============================================
// PART 5: University Report (Bulk Export)
// ============================================

export interface UniversityReportRow {
  rollNumber: string;
  studentName: string;
  subject: string;
  semester: number;
  month?: string;
  totalLectures: number;
  attendedLectures: number;
  absentLectures: number;
  attendancePercentage: number;
  eligibilityStatus: 'Eligible' | 'Not Eligible';
}

export interface UniversityReportMetadata {
  university: string;
  department: string;
  subject?: string;
  semester?: number;
  month?: string;
  year?: number;
  teacherName: string;
  generatedAt: string;
  reportType: 'Monthly' | 'Semester' | 'Subject-wise';
}

export interface UniversityReport {
  metadata: UniversityReportMetadata;
  students: UniversityReportRow[];
  statistics: {
    totalStudents: number;
    eligible: number;
    notEligible: number;
    averageAttendance: number;
  };
}

// ============================================
// PART 6: Lecture Update Event
// ============================================

export interface LectureEndEvent {
  lectureId: string;
  subject: string;
  semester: number;
  division?: string;
  date: string;
  timestamp: number;
  teacherId: string;
  students: {
    [studentId: string]: {
      status: 'CONFIRMED' | 'confirmed' | 'present';
      studentName: string;
      rollNumber: string;
      studentEmail?: string;
    };
  };
}

// ============================================
// PART 7: Calculation Parameters
// ============================================

export interface AttendanceCalculationParams {
  studentId?: string;
  subject?: string;
  semester?: number;
  division?: string;
  startDate?: string;
  endDate?: string;
}

export interface MonthlyReportParams {
  year: number;
  month: number;
  subject?: string;
  semester?: number;
  division?: string;
  teacherId?: string;
}

export interface SemesterReportParams {
  semester: number;
  studentId?: string;
  division?: string;
  asOfDate?: string;
}

// ============================================
// PART 8: Database Paths
// ============================================

export const DATABASE_PATHS = {
  LECTURES: 'lectures',
  ATTENDANCE_SUMMARY: 'attendanceSummary',
  SEMESTER_REPORTS: 'semesterReports',
  MONTHLY_ATTENDANCE: 'monthlyAttendance',
  FULL_STUDENT_REPORTS: 'fullStudentReports',
  UNIVERSITY_REPORTS: 'universityReports',
} as const;

// ============================================
// PART 9: Result Types
// ============================================

export interface CalculationResult {
  success: boolean;
  message: string;
  affectedRecords?: number;
  errors?: string[];
}

export interface ReportGenerationResult {
  success: boolean;
  reportUrl?: string;
  downloadUrl?: string;
  reportData?: any;
  message: string;
  error?: string;
}
