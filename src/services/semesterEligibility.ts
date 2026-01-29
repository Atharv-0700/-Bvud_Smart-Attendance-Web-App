/**
 * Semester Eligibility Engine
 * Implements PART 3 of the Subject-wise Attendance Tracking System
 * 
 * This service determines semester exam eligibility based on:
 * - All subjects must have ≥75% attendance
 * - Generates comprehensive semester reports
 * - Tracks eligibility status per student
 */

import { database } from '@/config/firebase';
import { ref, get, set } from 'firebase/database';
import {
  SemesterReport,
  SubjectEligibility,
  SemesterReportParams,
  CalculationResult,
  DATABASE_PATHS,
} from '@/types/attendanceTypes';
import {
  getSubjectAttendanceSummary,
  calculateSubjectWiseAttendance,
} from './subjectWiseAttendance';

/**
 * Generate semester eligibility report for a student
 */
export async function generateSemesterReport(
  studentId: string,
  semester: number,
  studentName?: string,
  rollNumber?: string
): Promise<{
  success: boolean;
  report?: SemesterReport;
  message: string;
}> {
  try {
    console.log(`[SEMESTER] Generating report for student ${studentId}, semester ${semester}`);

    // Get subject-wise attendance summaries
    const summaries = await getSubjectAttendanceSummary(studentId);

    // Filter for the specified semester
    const semesterSummaries = summaries.filter(s => s.semester === semester);

    if (semesterSummaries.length === 0) {
      return {
        success: false,
        message: `No attendance data found for semester ${semester}`,
      };
    }

    // Convert summaries to subject eligibility format
    const subjects: SubjectEligibility[] = semesterSummaries.map(summary => ({
      subject: summary.subject,
      attendancePercentage: summary.attendancePercentage,
      subjectStatus: summary.subjectStatus,
      totalLectures: summary.totalLectures,
      attendedLectures: summary.attendedLectures,
      absentLectures: summary.absentLectures,
    }));

    // Determine overall status: ALL subjects must be eligible
    const allEligible = subjects.every(s => s.subjectStatus === 'Eligible');
    const overallStatus = allEligible 
      ? 'Eligible for Exam' 
      : 'Not Eligible for Exam';

    // Get student info if not provided
    if (!studentName || !rollNumber) {
      const userRef = ref(database, `users/${studentId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        studentName = studentName || userData.name || 'Unknown';
        rollNumber = rollNumber || userData.rollNumber || 'Unknown';
      } else {
        studentName = studentName || 'Unknown';
        rollNumber = rollNumber || 'Unknown';
      }
    }

    const report: SemesterReport = {
      semester,
      studentId,
      studentName,
      rollNumber,
      subjects,
      overallStatus,
      generatedAt: new Date().toISOString(),
    };

    console.log(`[SEMESTER] Report generated: ${overallStatus}`);

    return {
      success: true,
      report,
      message: 'Semester report generated successfully',
    };
  } catch (error) {
    console.error('[SEMESTER] Error generating report:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Store semester report in database
 * Path: /semesterReports/{studentId}/{semester}
 */
export async function storeSemesterReport(
  report: SemesterReport
): Promise<CalculationResult> {
  try {
    const reportRef = ref(
      database,
      `${DATABASE_PATHS.SEMESTER_REPORTS}/${report.studentId}/semester_${report.semester}`
    );

    await set(reportRef, report);

    console.log(`[SEMESTER] Stored report for ${report.studentId}, semester ${report.semester}`);

    return {
      success: true,
      message: 'Semester report stored successfully',
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('[SEMESTER] Error storing report:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get semester report for a student
 */
export async function getSemesterReport(
  studentId: string,
  semester: number
): Promise<SemesterReport | null> {
  try {
    const reportRef = ref(
      database,
      `${DATABASE_PATHS.SEMESTER_REPORTS}/${studentId}/semester_${semester}`
    );

    const snapshot = await get(reportRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val() as SemesterReport;
  } catch (error) {
    console.error('[SEMESTER] Error getting report:', error);
    return null;
  }
}

/**
 * Generate and store semester report
 */
export async function generateAndStoreSemesterReport(
  studentId: string,
  semester: number,
  studentName?: string,
  rollNumber?: string
): Promise<CalculationResult> {
  try {
    // Generate report
    const { success, report, message } = await generateSemesterReport(
      studentId,
      semester,
      studentName,
      rollNumber
    );

    if (!success || !report) {
      return {
        success: false,
        message,
      };
    }

    // Store report
    const storeResult = await storeSemesterReport(report);

    return storeResult;
  } catch (error) {
    console.error('[SEMESTER] Error in generate and store:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch generate semester reports for multiple students
 */
export async function batchGenerateSemesterReports(
  params: SemesterReportParams
): Promise<{
  success: boolean;
  reportsGenerated: number;
  reports: SemesterReport[];
  message: string;
}> {
  try {
    console.log(`[SEMESTER] Batch generating reports for semester ${params.semester}`);

    // If specific student, generate for that student only
    if (params.studentId) {
      const { success, report, message } = await generateSemesterReport(
        params.studentId,
        params.semester
      );

      if (!success || !report) {
        return {
          success: false,
          reportsGenerated: 0,
          reports: [],
          message,
        };
      }

      await storeSemesterReport(report);

      return {
        success: true,
        reportsGenerated: 1,
        reports: [report],
        message: 'Semester report generated successfully',
      };
    }

    // Otherwise, generate for all students in the semester
    // Get all students who have attendance data for this semester
    const summariesRef = ref(database, DATABASE_PATHS.ATTENDANCE_SUMMARY);
    const snapshot = await get(summariesRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        reportsGenerated: 0,
        reports: [],
        message: 'No attendance data found',
      };
    }

    const allSummaries = snapshot.val();
    const studentIds = new Set<string>();

    // Find all students who have data for this semester
    for (const [studentId, summaries] of Object.entries(allSummaries)) {
      const studentSummaries = summaries as any;
      
      for (const summaryData of Object.values(studentSummaries)) {
        const summary = summaryData as any;
        if (summary.semester === params.semester) {
          studentIds.add(studentId);
          break;
        }
      }
    }

    console.log(`[SEMESTER] Found ${studentIds.size} students for semester ${params.semester}`);

    // Generate reports for each student
    const reports: SemesterReport[] = [];
    let generated = 0;

    for (const studentId of studentIds) {
      const result = await generateAndStoreSemesterReport(studentId, params.semester);
      
      if (result.success) {
        generated++;
        
        // Get the stored report
        const report = await getSemesterReport(studentId, params.semester);
        if (report) {
          reports.push(report);
        }
      }

      // Small delay to avoid overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[SEMESTER] Generated ${generated} semester reports`);

    return {
      success: true,
      reportsGenerated: generated,
      reports,
      message: `Generated ${generated} semester reports`,
    };
  } catch (error) {
    console.error('[SEMESTER] Error in batch generation:', error);
    return {
      success: false,
      reportsGenerated: 0,
      reports: [],
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get semester eligibility statistics
 */
export async function getSemesterEligibilityStats(
  semester: number,
  division?: string
): Promise<{
  totalStudents: number;
  eligible: number;
  notEligible: number;
  eligibilityRate: number;
}> {
  try {
    const reportsRef = ref(database, DATABASE_PATHS.SEMESTER_REPORTS);
    const snapshot = await get(reportsRef);

    if (!snapshot.exists()) {
      return {
        totalStudents: 0,
        eligible: 0,
        notEligible: 0,
        eligibilityRate: 0,
      };
    }

    const allReports = snapshot.val();
    let totalStudents = 0;
    let eligible = 0;

    for (const studentReports of Object.values(allReports)) {
      const reports = studentReports as any;
      const semesterReport = reports[`semester_${semester}`];

      if (semesterReport && semesterReport.semester === semester) {
        totalStudents++;
        
        if (semesterReport.overallStatus === 'Eligible for Exam') {
          eligible++;
        }
      }
    }

    const notEligible = totalStudents - eligible;
    const eligibilityRate = totalStudents > 0 
      ? Math.round((eligible / totalStudents) * 10000) / 100
      : 0;

    return {
      totalStudents,
      eligible,
      notEligible,
      eligibilityRate,
    };
  } catch (error) {
    console.error('[SEMESTER] Error getting stats:', error);
    return {
      totalStudents: 0,
      eligible: 0,
      notEligible: 0,
      eligibilityRate: 0,
    };
  }
}

/**
 * Check if a student is eligible for semester exam
 */
export async function checkSemesterEligibility(
  studentId: string,
  semester: number
): Promise<{
  eligible: boolean;
  report?: SemesterReport;
  message: string;
}> {
  try {
    // Try to get existing report
    let report = await getSemesterReport(studentId, semester);

    // If no report exists, generate it
    if (!report) {
      const result = await generateAndStoreSemesterReport(studentId, semester);
      
      if (!result.success) {
        return {
          eligible: false,
          message: result.message,
        };
      }

      report = await getSemesterReport(studentId, semester);
    }

    if (!report) {
      return {
        eligible: false,
        message: 'Unable to generate eligibility report',
      };
    }

    const eligible = report.overallStatus === 'Eligible for Exam';

    return {
      eligible,
      report,
      message: eligible
        ? 'Student is eligible for semester exam'
        : 'Student is not eligible for semester exam',
    };
  } catch (error) {
    console.error('[SEMESTER] Error checking eligibility:', error);
    return {
      eligible: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
