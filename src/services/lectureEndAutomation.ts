/**
 * Lecture End Automation System
 * Implements PART 2 & PART 7 of the Subject-wise Attendance Tracking System
 * 
 * Automatically recalculates attendance summaries when a lecture ends:
 * - Updates subject-wise attendance for all students
 * - Recalculates eligibility status
 * - Updates semester reports
 * - Optimized for performance (500+ students)
 */

import { database } from '@/config/firebase';
import { ref, get } from 'firebase/database';
import { LectureEndEvent, CalculationResult } from '@/types/attendanceTypes';
import {
  updateSubjectAttendanceSummary,
  batchUpdateSubjectAttendance,
} from './subjectWiseAttendance';
import {
  generateAndStoreSemesterReport,
  batchGenerateSemesterReports,
} from './semesterEligibility';

/**
 * Process lecture end event and update all attendance records
 * This is the main automation trigger
 */
export async function handleLectureEnd(
  lectureId: string
): Promise<{
  success: boolean;
  studentsProcessed: number;
  subjectSummariesUpdated: number;
  semesterReportsUpdated: number;
  message: string;
  errors?: string[];
}> {
  try {
    console.log('');
    console.log('='.repeat(80));
    console.log('[AUTOMATION] Lecture End Event Started');
    console.log(`[AUTOMATION] Lecture ID: ${lectureId}`);
    console.log('='.repeat(80));

    const startTime = Date.now();

    // Step 1: Get lecture data
    const lectureRef = ref(database, `lectures/${lectureId}`);
    const lectureSnapshot = await get(lectureRef);

    if (!lectureSnapshot.exists()) {
      return {
        success: false,
        studentsProcessed: 0,
        subjectSummariesUpdated: 0,
        semesterReportsUpdated: 0,
        message: 'Lecture not found',
      };
    }

    const lecture = lectureSnapshot.val();
    const { subject, semester, division, students } = lecture;

    console.log(`[AUTOMATION] Subject: ${subject}`);
    console.log(`[AUTOMATION] Semester: ${semester}`);
    console.log(`[AUTOMATION] Division: ${division || 'default'}`);

    if (!students) {
      console.log('[AUTOMATION] No students found in lecture');
      return {
        success: true,
        studentsProcessed: 0,
        subjectSummariesUpdated: 0,
        semesterReportsUpdated: 0,
        message: 'No students in lecture',
      };
    }

    const studentIds = Object.keys(students);
    console.log(`[AUTOMATION] Processing ${studentIds.length} students`);

    // Step 2: Update subject-wise attendance for all students
    console.log('[AUTOMATION] Step 1/2: Updating subject-wise attendance...');
    
    const attendanceResult = await batchUpdateSubjectAttendance(
      studentIds,
      {
        subject,
        semester: parseInt(semester),
        division,
      }
    );

    console.log(`[AUTOMATION] Subject summaries updated: ${attendanceResult.affectedRecords || 0}`);

    // Step 3: Update semester reports for all students
    console.log('[AUTOMATION] Step 2/2: Updating semester reports...');
    
    let semesterReportsUpdated = 0;
    const errors: string[] = [];

    // Process semester reports in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
      const batch = studentIds.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(studentId => 
          generateAndStoreSemesterReport(studentId, parseInt(semester))
        )
      );

      for (let j = 0; j < results.length; j++) {
        if (results[j].success) {
          semesterReportsUpdated++;
        } else {
          errors.push(`${batch[j]}: ${results[j].message}`);
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < studentIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`[AUTOMATION] Semester reports updated: ${semesterReportsUpdated}`);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('='.repeat(80));
    console.log('[AUTOMATION] Lecture End Event Completed');
    console.log(`[AUTOMATION] Duration: ${duration}s`);
    console.log(`[AUTOMATION] Students Processed: ${studentIds.length}`);
    console.log(`[AUTOMATION] Subject Summaries Updated: ${attendanceResult.affectedRecords || 0}`);
    console.log(`[AUTOMATION] Semester Reports Updated: ${semesterReportsUpdated}`);
    if (errors.length > 0) {
      console.log(`[AUTOMATION] Errors: ${errors.length}`);
    }
    console.log('='.repeat(80));
    console.log('');

    return {
      success: errors.length === 0,
      studentsProcessed: studentIds.length,
      subjectSummariesUpdated: attendanceResult.affectedRecords || 0,
      semesterReportsUpdated,
      message: `Processed ${studentIds.length} students in ${duration}s`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('[AUTOMATION] Error in lecture end handler:', error);
    return {
      success: false,
      studentsProcessed: 0,
      subjectSummariesUpdated: 0,
      semesterReportsUpdated: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Recalculate all attendance data for a specific student
 * Useful for fixing data inconsistencies
 */
export async function recalculateStudentAttendance(
  studentId: string
): Promise<CalculationResult> {
  try {
    console.log(`[AUTOMATION] Recalculating all attendance for student: ${studentId}`);

    // Update subject-wise attendance (all subjects)
    const attendanceResult = await updateSubjectAttendanceSummary(studentId);

    if (!attendanceResult.success) {
      return attendanceResult;
    }

    // Get student's semesters
    const summariesRef = ref(database, `attendanceSummary/${studentId}`);
    const snapshot = await get(summariesRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        message: 'No attendance data found for student',
      };
    }

    const summaries = snapshot.val();
    const semesters = new Set<number>();

    for (const summary of Object.values(summaries)) {
      const s = summary as any;
      semesters.add(s.semester);
    }

    // Update semester reports
    let reportsUpdated = 0;
    for (const semester of semesters) {
      const result = await generateAndStoreSemesterReport(studentId, semester);
      if (result.success) {
        reportsUpdated++;
      }
    }

    console.log(`[AUTOMATION] Recalculation complete: ${reportsUpdated} semester reports updated`);

    return {
      success: true,
      message: `Updated ${attendanceResult.affectedRecords} subject summaries and ${reportsUpdated} semester reports`,
      affectedRecords: (attendanceResult.affectedRecords || 0) + reportsUpdated,
    };
  } catch (error) {
    console.error('[AUTOMATION] Error in recalculation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Recalculate all attendance data for all students
 * WARNING: This is a heavy operation - use with caution
 */
export async function recalculateAllAttendance(
  semester?: number
): Promise<{
  success: boolean;
  studentsProcessed: number;
  message: string;
}> {
  try {
    console.log('[AUTOMATION] Starting full recalculation...');

    // Get all students who have attendance data
    const summariesRef = ref(database, 'attendanceSummary');
    const snapshot = await get(summariesRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        studentsProcessed: 0,
        message: 'No attendance data found',
      };
    }

    const allSummaries = snapshot.val();
    const studentIds = Object.keys(allSummaries);

    console.log(`[AUTOMATION] Found ${studentIds.length} students to recalculate`);

    // Process students in batches
    let processed = 0;
    const BATCH_SIZE = 5; // Small batch size for safety

    for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
      const batch = studentIds.slice(i, i + BATCH_SIZE);
      
      console.log(`[AUTOMATION] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(studentIds.length / BATCH_SIZE)}`);

      for (const studentId of batch) {
        const result = await recalculateStudentAttendance(studentId);
        if (result.success) {
          processed++;
        }
      }

      // Delay between batches to avoid overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[AUTOMATION] Full recalculation complete: ${processed} students`);

    return {
      success: true,
      studentsProcessed: processed,
      message: `Recalculated attendance for ${processed} students`,
    };
  } catch (error) {
    console.error('[AUTOMATION] Error in full recalculation:', error);
    return {
      success: false,
      studentsProcessed: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Schedule monthly attendance calculation
 * Can be called at the end of each month
 */
export async function scheduleMonthlyCalculation(
  year: number,
  month: number
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log(`[AUTOMATION] Scheduling monthly calculation for ${year}-${month}`);

    // Import monthly attendance service
    const { calculateAllSubjectsMonthly } = await import('./monthlyAttendance');

    const result = await calculateAllSubjectsMonthly(year, month);

    return {
      success: result.success,
      message: `Processed ${result.processed} subject-semester combinations`,
    };
  } catch (error) {
    console.error('[AUTOMATION] Error in monthly calculation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Performance monitoring for automation
 */
export async function getAutomationStats(): Promise<{
  totalLectures: number;
  totalStudents: number;
  totalSubjects: number;
  lastProcessedLecture?: string;
  lastProcessedTime?: string;
}> {
  try {
    // Get lecture count
    const lecturesRef = ref(database, 'lectures');
    const lecturesSnapshot = await get(lecturesRef);
    const totalLectures = lecturesSnapshot.exists() 
      ? Object.keys(lecturesSnapshot.val()).length 
      : 0;

    // Get student count
    const summariesRef = ref(database, 'attendanceSummary');
    const summariesSnapshot = await get(summariesRef);
    const totalStudents = summariesSnapshot.exists()
      ? Object.keys(summariesSnapshot.val()).length
      : 0;

    // Get subject count
    let totalSubjects = 0;
    if (summariesSnapshot.exists()) {
      const summaries = summariesSnapshot.val();
      const subjects = new Set<string>();
      
      for (const studentSummaries of Object.values(summaries)) {
        const studentData = studentSummaries as any;
        for (const summary of Object.values(studentData)) {
          const s = summary as any;
          subjects.add(s.subject);
        }
      }
      
      totalSubjects = subjects.size;
    }

    return {
      totalLectures,
      totalStudents,
      totalSubjects,
    };
  } catch (error) {
    console.error('[AUTOMATION] Error getting stats:', error);
    return {
      totalLectures: 0,
      totalStudents: 0,
      totalSubjects: 0,
    };
  }
}

/**
 * Health check for automation system
 */
export async function checkAutomationHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  try {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if attendance summaries exist
    const summariesRef = ref(database, 'attendanceSummary');
    const summariesSnapshot = await get(summariesRef);

    if (!summariesSnapshot.exists()) {
      issues.push('No attendance summaries found');
      recommendations.push('Run recalculateAllAttendance() to initialize data');
    }

    // Check if semester reports exist
    const reportsRef = ref(database, 'semesterReports');
    const reportsSnapshot = await get(reportsRef);

    if (!reportsSnapshot.exists()) {
      issues.push('No semester reports found');
      recommendations.push('Semester reports will be generated automatically when lectures end');
    }

    const healthy = issues.length === 0;

    return {
      healthy,
      issues,
      recommendations,
    };
  } catch (error) {
    console.error('[AUTOMATION] Error in health check:', error);
    return {
      healthy: false,
      issues: ['Error performing health check'],
      recommendations: ['Check database connection and permissions'],
    };
  }
}
