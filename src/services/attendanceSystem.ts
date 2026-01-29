/**
 * Complete Attendance Management System
 * Main Service Layer Integration
 * 
 * This is the main entry point for the subject-wise attendance tracking system.
 * It provides a unified API for all attendance-related operations.
 * 
 * USAGE FROM EXISTING CODE:
 * 
 * 1. When a teacher ends a lecture (in StartLecture.tsx or similar):
 *    import { handleLectureEnd } from '@/services/attendanceSystem';
 *    await handleLectureEnd(lectureId);
 * 
 * 2. To generate monthly report (in TeacherReports.tsx):
 *    import { generateMonthlyReport } from '@/services/attendanceSystem';
 *    await generateMonthlyReport({ year, month, subject, semester });
 * 
 * 3. To generate semester report:
 *    import { generateSemesterReport } from '@/services/attendanceSystem';
 *    await generateSemesterReport({ semester, studentId });
 * 
 * 4. To get student's full report:
 *    import { getStudentFullReport } from '@/services/attendanceSystem';
 *    const report = await getStudentFullReport(studentId);
 */

import {
  CalculationResult,
  MonthlyReportParams,
  SemesterReportParams,
  FullStudentReport,
  UniversityReport,
  SubjectAttendanceSummary,
  SemesterReport,
} from '@/types/attendanceTypes';

// Import all service modules
import {
  calculateSubjectWiseAttendance,
  getSubjectAttendanceSummary,
  updateSubjectAttendanceSummary,
  batchUpdateSubjectAttendance,
  getOverallAttendanceStats,
} from './subjectWiseAttendance';

import {
  generateSemesterReport as genSemReport,
  getSemesterReport,
  batchGenerateSemesterReports,
  getSemesterEligibilityStats,
  checkSemesterEligibility,
} from './semesterEligibility';

import {
  calculateAndStoreMonthlyAttendance,
  getMonthlySubjectAttendance,
  getMonthlySubjectStats,
  monthlyDataExists,
} from './monthlySubjectAttendance';

import {
  handleLectureEnd as handleLectureEndInternal,
  recalculateStudentAttendance,
  recalculateAllAttendance,
  getAutomationStats,
  checkAutomationHealth,
} from './lectureEndAutomation';

import {
  generateMonthlyUniversityReport,
  generateSemesterUniversityReport,
  generateFullStudentReport,
  exportToExcel,
  exportToPDF,
  exportStudentReportToExcel,
} from './universityReports';

/**
 * ============================================
 * MAIN AUTOMATION TRIGGER
 * ============================================
 * Call this when a teacher ends a lecture
 */
export async function handleLectureEnd(lectureId: string): Promise<{
  success: boolean;
  message: string;
  details?: {
    studentsProcessed: number;
    subjectSummariesUpdated: number;
    semesterReportsUpdated: number;
    duration?: string;
  };
  errors?: string[];
}> {
  try {
    const startTime = Date.now();
    
    const result = await handleLectureEndInternal(lectureId);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2) + 's';

    return {
      success: result.success,
      message: result.message,
      details: {
        studentsProcessed: result.studentsProcessed,
        subjectSummariesUpdated: result.subjectSummariesUpdated,
        semesterReportsUpdated: result.semesterReportsUpdated,
        duration,
      },
      errors: result.errors,
    };
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error in handleLectureEnd:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ============================================
 * STUDENT REPORTS
 * ============================================
 */

/**
 * Get subject-wise attendance for a student
 */
export async function getStudentSubjectAttendance(
  studentId: string
): Promise<{
  success: boolean;
  summaries: SubjectAttendanceSummary[];
  stats: {
    totalSubjects: number;
    eligibleSubjects: number;
    notEligibleSubjects: number;
    overallPercentage: number;
    overallStatus: string;
  };
}> {
  try {
    const summaries = await getSubjectAttendanceSummary(studentId);
    const stats = await getOverallAttendanceStats(studentId);

    return {
      success: true,
      summaries,
      stats,
    };
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error getting student attendance:', error);
    return {
      success: false,
      summaries: [],
      stats: {
        totalSubjects: 0,
        eligibleSubjects: 0,
        notEligibleSubjects: 0,
        overallPercentage: 0,
        overallStatus: 'Not Eligible for Exam',
      },
    };
  }
}

/**
 * Get full student report (all data)
 */
export async function getStudentFullReport(
  studentId: string
): Promise<{
  success: boolean;
  report?: FullStudentReport;
  message: string;
}> {
  try {
    const report = await generateFullStudentReport(studentId);

    if (!report) {
      return {
        success: false,
        message: 'No attendance data found for student',
      };
    }

    return {
      success: true,
      report,
      message: 'Report generated successfully',
    };
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error getting full report:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if student is eligible for semester exam
 */
export async function checkStudentEligibility(
  studentId: string,
  semester: number
): Promise<{
  eligible: boolean;
  report?: SemesterReport;
  message: string;
}> {
  try {
    return await checkSemesterEligibility(studentId, semester);
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error checking eligibility:', error);
    return {
      eligible: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ============================================
 * MONTHLY REPORTS
 * ============================================
 */

/**
 * Generate monthly attendance report
 */
export async function generateMonthlyReport(
  params: MonthlyReportParams
): Promise<{
  success: boolean;
  totalLectures: number;
  studentsProcessed: number;
  message: string;
}> {
  try {
    // Check if already exists
    const exists = await monthlyDataExists(params);
    
    if (exists) {
      console.log('[ATTENDANCE-SYSTEM] Monthly report already exists, retrieving...');
      const data = await getMonthlySubjectAttendance(params);
      
      return {
        success: true,
        totalLectures: data[0]?.totalLectures || 0,
        studentsProcessed: data.length,
        message: 'Monthly report retrieved from cache',
      };
    }

    // Calculate and store
    return await calculateAndStoreMonthlyAttendance(params);
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error generating monthly report:', error);
    return {
      success: false,
      totalLectures: 0,
      studentsProcessed: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get monthly attendance data
 */
export async function getMonthlyReport(
  params: MonthlyReportParams
): Promise<{
  success: boolean;
  students: any[];
  stats: any;
  message: string;
}> {
  try {
    const students = await getMonthlySubjectAttendance(params);
    const stats = await getMonthlySubjectStats(params);

    return {
      success: true,
      students,
      stats,
      message: 'Monthly report retrieved successfully',
    };
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error getting monthly report:', error);
    return {
      success: false,
      students: [],
      stats: {
        totalStudents: 0,
        eligible: 0,
        notEligible: 0,
        averageAttendance: 0,
        totalLectures: 0,
      },
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ============================================
 * SEMESTER REPORTS
 * ============================================
 */

/**
 * Generate semester eligibility report
 */
export async function generateSemesterEligibilityReport(
  params: SemesterReportParams
): Promise<{
  success: boolean;
  reportsGenerated: number;
  message: string;
}> {
  try {
    const result = await batchGenerateSemesterReports(params);

    return {
      success: result.success,
      reportsGenerated: result.reportsGenerated,
      message: result.message,
    };
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error generating semester report:', error);
    return {
      success: false,
      reportsGenerated: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get semester eligibility statistics
 */
export async function getSemesterStats(
  semester: number
): Promise<{
  totalStudents: number;
  eligible: number;
  notEligible: number;
  eligibilityRate: number;
}> {
  try {
    return await getSemesterEligibilityStats(semester);
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error getting semester stats:', error);
    return {
      totalStudents: 0,
      eligible: 0,
      notEligible: 0,
      eligibilityRate: 0,
    };
  }
}

/**
 * ============================================
 * UNIVERSITY REPORTS (EXCEL & PDF)
 * ============================================
 */

/**
 * Generate and export monthly university report
 */
export async function exportMonthlyUniversityReport(
  params: MonthlyReportParams,
  teacherName: string,
  format: 'excel' | 'pdf' = 'excel'
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Generate report
    const report = await generateMonthlyUniversityReport(params, teacherName);

    // Export based on format
    const filename = `monthly_${params.subject}_${params.year}_${params.month}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

    if (format === 'excel') {
      exportToExcel(report, filename);
    } else {
      exportToPDF(report, filename);
    }

    return {
      success: true,
      message: `Report exported as ${filename}`,
    };
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error exporting monthly report:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate and export semester university report
 */
export async function exportSemesterUniversityReport(
  params: SemesterReportParams,
  teacherName: string,
  format: 'excel' | 'pdf' = 'excel'
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Generate report
    const report = await generateSemesterUniversityReport(params, teacherName);

    // Export based on format
    const filename = `semester_${params.semester}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`;

    if (format === 'excel') {
      exportToExcel(report, filename);
    } else {
      exportToPDF(report, filename);
    }

    return {
      success: true,
      message: `Report exported as ${filename}`,
    };
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error exporting semester report:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export full student report
 */
export async function exportStudentReport(
  studentId: string,
  format: 'excel' | 'pdf' = 'excel'
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const report = await generateFullStudentReport(studentId);

    if (!report) {
      return {
        success: false,
        message: 'No data found for student',
      };
    }

    if (format === 'excel') {
      exportStudentReportToExcel(report);
    } else {
      // PDF export for student report (can be added later)
      return {
        success: false,
        message: 'PDF export for student reports not yet implemented',
      };
    }

    return {
      success: true,
      message: `Student report exported successfully`,
    };
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error exporting student report:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ============================================
 * MAINTENANCE & UTILITIES
 * ============================================
 */

/**
 * Recalculate attendance for a specific student (fix data)
 */
export async function recalculateStudent(
  studentId: string
): Promise<CalculationResult> {
  try {
    return await recalculateStudentAttendance(studentId);
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error recalculating student:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Recalculate all attendance (heavy operation)
 */
export async function recalculateAll(): Promise<{
  success: boolean;
  studentsProcessed: number;
  message: string;
}> {
  try {
    return await recalculateAllAttendance();
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error in full recalculation:', error);
    return {
      success: false,
      studentsProcessed: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get system statistics
 */
export async function getSystemStats(): Promise<{
  totalLectures: number;
  totalStudents: number;
  totalSubjects: number;
}> {
  try {
    return await getAutomationStats();
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error getting system stats:', error);
    return {
      totalLectures: 0,
      totalStudents: 0,
      totalSubjects: 0,
    };
  }
}

/**
 * System health check
 */
export async function checkSystemHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  try {
    return await checkAutomationHealth();
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error in health check:', error);
    return {
      healthy: false,
      issues: ['Error performing health check'],
      recommendations: ['Check system logs for details'],
    };
  }
}

/**
 * ============================================
 * QUICK START FUNCTIONS
 * ============================================
 */

/**
 * Initialize system (run once after deployment)
 */
export async function initializeSystem(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('[ATTENDANCE-SYSTEM] Initializing system...');

    // Check health
    const health = await checkSystemHealth();

    if (health.healthy) {
      return {
        success: true,
        message: 'System is already initialized and healthy',
      };
    }

    // If not healthy, run full recalculation
    console.log('[ATTENDANCE-SYSTEM] Running initial calculation...');
    const result = await recalculateAllAttendance();

    return {
      success: result.success,
      message: result.message,
    };
  } catch (error) {
    console.error('[ATTENDANCE-SYSTEM] Error initializing system:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ============================================
 * EXPORT ALL FOR CONVENIENCE
 * ============================================
 */

export {
  // Types
  CalculationResult,
  MonthlyReportParams,
  SemesterReportParams,
  FullStudentReport,
  UniversityReport,
  SubjectAttendanceSummary,
  SemesterReport,
  
  // Direct exports for advanced usage
  calculateSubjectWiseAttendance,
  getSubjectAttendanceSummary,
  updateSubjectAttendanceSummary,
  batchUpdateSubjectAttendance,
  getOverallAttendanceStats,
  
  genSemReport,
  getSemesterReport,
  batchGenerateSemesterReports,
  getSemesterEligibilityStats,
  checkSemesterEligibility,
  
  calculateAndStoreMonthlyAttendance,
  getMonthlySubjectAttendance,
  getMonthlySubjectStats,
  monthlyDataExists,
  
  generateMonthlyUniversityReport,
  generateSemesterUniversityReport,
  generateFullStudentReport,
  exportToExcel,
  exportToPDF,
  exportStudentReportToExcel,
};
