/**
 * Subject-wise Attendance Calculation Engine
 * Implements PART 1 & PART 2 of the Subject-wise Attendance Tracking System
 * 
 * This service tracks attendance separately for each subject and calculates:
 * - Total lectures per subject
 * - Attended lectures per subject
 * - Absent lectures per subject
 * - Attendance percentage per subject
 * - Eligibility status per subject (75% rule)
 */

import { database } from '@/config/firebase';
import { ref, get, set, update } from 'firebase/database';
import {
  SubjectAttendanceSummary,
  AttendanceCalculationParams,
  CalculationResult,
  DATABASE_PATHS,
} from '@/types/attendanceTypes';

/**
 * Calculate subject-wise attendance for a student
 * Scans all lectures and computes attendance for each subject separately
 */
export async function calculateSubjectWiseAttendance(
  studentId: string,
  params?: AttendanceCalculationParams
): Promise<{
  success: boolean;
  summaries: SubjectAttendanceSummary[];
  message: string;
}> {
  try {
    console.log(`[SUBJECT-WISE] Calculating attendance for student: ${studentId}`);

    // Get all lectures
    const lecturesRef = ref(database, DATABASE_PATHS.LECTURES);
    const lecturesSnapshot = await get(lecturesRef);

    if (!lecturesSnapshot.exists()) {
      return {
        success: true,
        summaries: [],
        message: 'No lectures found',
      };
    }

    const allLectures = lecturesSnapshot.val();
    
    // Map to track attendance per subject
    const subjectMap = new Map<string, {
      subject: string;
      semester: number;
      division: string;
      totalLectures: number;
      attendedLectures: number;
    }>();

    // Process each lecture
    for (const [lectureId, lectureData] of Object.entries(allLectures)) {
      const lecture = lectureData as any;

      // Apply filters if provided
      if (params?.subject && lecture.subject !== params.subject) continue;
      if (params?.semester && parseInt(lecture.semester) !== params.semester) continue;
      if (params?.division && lecture.division !== params.division) continue;

      // Check if student exists in this lecture
      const studentAttendance = lecture.students?.[studentId];
      
      if (studentAttendance) {
        // Create unique key for subject+semester+division
        const key = `${lecture.subject}|${lecture.semester}|${lecture.division || 'default'}`;

        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            subject: lecture.subject,
            semester: parseInt(lecture.semester),
            division: lecture.division || 'default',
            totalLectures: 0,
            attendedLectures: 0,
          });
        }

        const subjectData = subjectMap.get(key)!;
        subjectData.totalLectures += 1;

        // Check if student attended
        const isPresent = 
          studentAttendance.status === 'CONFIRMED' ||
          studentAttendance.status === 'confirmed' ||
          studentAttendance.status === 'present';

        if (isPresent) {
          subjectData.attendedLectures += 1;
        }

        subjectMap.set(key, subjectData);
      }
    }

    // Convert map to summaries array
    const summaries: SubjectAttendanceSummary[] = [];

    for (const [key, data] of subjectMap.entries()) {
      const absentLectures = data.totalLectures - data.attendedLectures;
      const percentage = data.totalLectures > 0 
        ? Math.round((data.attendedLectures / data.totalLectures) * 10000) / 100
        : 0;

      const summary: SubjectAttendanceSummary = {
        subject: data.subject,
        semester: data.semester,
        division: data.division !== 'default' ? data.division : undefined,
        totalLectures: data.totalLectures,
        attendedLectures: data.attendedLectures,
        absentLectures: absentLectures,
        attendancePercentage: percentage,
        subjectStatus: percentage >= 75 ? 'Eligible' : 'Not Eligible',
        lastUpdated: new Date().toISOString(),
      };

      summaries.push(summary);
    }

    // Sort by subject name
    summaries.sort((a, b) => a.subject.localeCompare(b.subject));

    console.log(`[SUBJECT-WISE] Calculated ${summaries.length} subject summaries`);

    return {
      success: true,
      summaries,
      message: `Calculated attendance for ${summaries.length} subjects`,
    };
  } catch (error) {
    console.error('[SUBJECT-WISE] Error calculating attendance:', error);
    return {
      success: false,
      summaries: [],
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Store subject-wise attendance summary in database
 * Path: /attendanceSummary/{studentId}/{subject}
 */
export async function storeSubjectAttendanceSummary(
  studentId: string,
  summary: SubjectAttendanceSummary
): Promise<CalculationResult> {
  try {
    // Create unique key for subject
    const subjectKey = `${summary.subject}_sem${summary.semester}${
      summary.division ? `_${summary.division}` : ''
    }`;

    const summaryRef = ref(
      database,
      `${DATABASE_PATHS.ATTENDANCE_SUMMARY}/${studentId}/${subjectKey}`
    );

    await set(summaryRef, summary);

    console.log(`[SUBJECT-WISE] Stored summary for ${studentId} - ${summary.subject}`);

    return {
      success: true,
      message: 'Summary stored successfully',
      affectedRecords: 1,
    };
  } catch (error) {
    console.error('[SUBJECT-WISE] Error storing summary:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get subject-wise attendance summary for a student
 */
export async function getSubjectAttendanceSummary(
  studentId: string,
  subject?: string
): Promise<SubjectAttendanceSummary[]> {
  try {
    const summaryRef = ref(
      database,
      `${DATABASE_PATHS.ATTENDANCE_SUMMARY}/${studentId}`
    );

    const snapshot = await get(summaryRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const summaries: SubjectAttendanceSummary[] = [];

    for (const [key, value] of Object.entries(data)) {
      const summary = value as SubjectAttendanceSummary;
      
      // Filter by subject if specified
      if (!subject || summary.subject === subject) {
        summaries.push(summary);
      }
    }

    return summaries;
  } catch (error) {
    console.error('[SUBJECT-WISE] Error getting summary:', error);
    return [];
  }
}

/**
 * Recalculate and update subject-wise attendance for a student
 * Called after a lecture ends
 */
export async function updateSubjectAttendanceSummary(
  studentId: string,
  params?: AttendanceCalculationParams
): Promise<CalculationResult> {
  try {
    console.log(`[SUBJECT-WISE] Updating attendance summary for ${studentId}`);

    // Calculate fresh summaries
    const { success, summaries, message } = await calculateSubjectWiseAttendance(
      studentId,
      params
    );

    if (!success) {
      return {
        success: false,
        message,
      };
    }

    // Store each summary
    let stored = 0;
    const errors: string[] = [];

    for (const summary of summaries) {
      const result = await storeSubjectAttendanceSummary(studentId, summary);
      
      if (result.success) {
        stored++;
      } else {
        errors.push(`${summary.subject}: ${result.message}`);
      }
    }

    return {
      success: errors.length === 0,
      message: `Updated ${stored} subject summaries`,
      affectedRecords: stored,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('[SUBJECT-WISE] Error updating summary:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch update subject-wise attendance for multiple students
 * Optimized for performance
 */
export async function batchUpdateSubjectAttendance(
  studentIds: string[],
  params?: AttendanceCalculationParams
): Promise<CalculationResult> {
  try {
    console.log(`[SUBJECT-WISE] Batch updating ${studentIds.length} students`);

    let totalUpdated = 0;
    const errors: string[] = [];

    // Process students in batches to avoid overwhelming Firebase
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
      const batch = studentIds.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const results = await Promise.all(
        batch.map(studentId => updateSubjectAttendanceSummary(studentId, params))
      );

      // Count successes
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.success) {
          totalUpdated += result.affectedRecords || 0;
        } else {
          errors.push(`${batch[j]}: ${result.message}`);
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < studentIds.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`[SUBJECT-WISE] Batch update complete: ${totalUpdated} records updated`);

    return {
      success: errors.length === 0,
      message: `Updated ${totalUpdated} records for ${studentIds.length} students`,
      affectedRecords: totalUpdated,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('[SUBJECT-WISE] Error in batch update:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get overall attendance statistics for a student across all subjects
 */
export async function getOverallAttendanceStats(
  studentId: string
): Promise<{
  totalSubjects: number;
  eligibleSubjects: number;
  notEligibleSubjects: number;
  overallPercentage: number;
  overallStatus: 'Eligible for Exam' | 'Not Eligible for Exam';
}> {
  try {
    const summaries = await getSubjectAttendanceSummary(studentId);

    if (summaries.length === 0) {
      return {
        totalSubjects: 0,
        eligibleSubjects: 0,
        notEligibleSubjects: 0,
        overallPercentage: 0,
        overallStatus: 'Not Eligible for Exam',
      };
    }

    const eligibleSubjects = summaries.filter(
      s => s.subjectStatus === 'Eligible'
    ).length;

    const notEligibleSubjects = summaries.length - eligibleSubjects;

    // Calculate overall percentage (average of all subjects)
    const totalPercentage = summaries.reduce(
      (sum, s) => sum + s.attendancePercentage,
      0
    );
    const overallPercentage = Math.round((totalPercentage / summaries.length) * 100) / 100;

    // Overall status: ALL subjects must be eligible
    const overallStatus = eligibleSubjects === summaries.length
      ? 'Eligible for Exam'
      : 'Not Eligible for Exam';

    return {
      totalSubjects: summaries.length,
      eligibleSubjects,
      notEligibleSubjects,
      overallPercentage,
      overallStatus,
    };
  } catch (error) {
    console.error('[SUBJECT-WISE] Error getting overall stats:', error);
    return {
      totalSubjects: 0,
      eligibleSubjects: 0,
      notEligibleSubjects: 0,
      overallPercentage: 0,
      overallStatus: 'Not Eligible for Exam',
    };
  }
}
