/**
 * Monthly Attendance Engine (Enhanced)
 * Implements PART 4 of the Subject-wise Attendance Tracking System
 * 
 * Calculates monthly attendance per subject with improved accuracy
 * Integrates with subject-wise attendance tracking
 */

import { database } from '@/config/firebase';
import { ref, get, set } from 'firebase/database';
import {
  MonthlySubjectAttendance,
  MonthlyReportParams,
  DATABASE_PATHS,
} from '@/types/attendanceTypes';
import { getMonthDateRange, isInMonth, formatMonthYear } from '@/utils/dateUtils';

/**
 * Calculate monthly attendance for a specific subject
 */
export async function calculateMonthlySubjectAttendance(
  params: MonthlyReportParams
): Promise<{
  success: boolean;
  studentsData: MonthlySubjectAttendance[];
  totalLectures: number;
  message: string;
}> {
  try {
    console.log('[MONTHLY-SUBJECT] Calculating attendance:', params);

    const { year, month, subject, semester, division } = params;

    // Get all lectures
    const lecturesRef = ref(database, DATABASE_PATHS.LECTURES);
    const lecturesSnapshot = await get(lecturesRef);

    if (!lecturesSnapshot.exists()) {
      return {
        success: false,
        studentsData: [],
        totalLectures: 0,
        message: 'No lectures found',
      };
    }

    const allLectures = lecturesSnapshot.val();
    const matchingLectureIds: string[] = [];

    // Filter lectures by criteria and month
    for (const [lectureId, lectureData] of Object.entries(allLectures)) {
      const lecture = lectureData as any;

      // Check criteria
      const matchesSubject = !subject || lecture.subject === subject;
      const matchesSemester = !semester || parseInt(lecture.semester) === semester;
      const matchesDivision = !division || lecture.division === division;

      // Check if lecture is in the specified month
      const lectureDate = lecture.timestamp || lecture.date || lecture.createdAt;
      const isInMonthRange = isInMonth(lectureDate, year, month);

      if (matchesSubject && matchesSemester && matchesDivision && isInMonthRange) {
        matchingLectureIds.push(lectureId);
      }
    }

    console.log(`[MONTHLY-SUBJECT] Found ${matchingLectureIds.length} lectures in month`);

    if (matchingLectureIds.length === 0) {
      return {
        success: true,
        studentsData: [],
        totalLectures: 0,
        message: 'No lectures found for the specified criteria',
      };
    }

    // Calculate attendance for each student
    const studentMap = new Map<string, {
      studentName: string;
      rollNumber: string;
      email: string;
      attendedLectures: number;
    }>();

    for (const lectureId of matchingLectureIds) {
      const lectureRef = ref(database, `${DATABASE_PATHS.LECTURES}/${lectureId}`);
      const lectureSnapshot = await get(lectureRef);

      if (!lectureSnapshot.exists()) continue;

      const lecture = lectureSnapshot.val();
      const students = lecture.students || {};

      // Get subject info from first lecture
      const lectureSubject = subject || lecture.subject;
      const lectureSemester = semester || parseInt(lecture.semester);
      const lectureDivision = division || lecture.division || 'default';

      for (const [studentId, studentData] of Object.entries(students)) {
        const student = studentData as any;

        // Initialize student if not exists
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            studentName: student.studentName || 'Unknown',
            rollNumber: student.rollNumber || '',
            email: student.studentEmail || student.email || '',
            attendedLectures: 0,
          });
        }

        // Check if student attended
        const isPresent =
          student.status === 'CONFIRMED' ||
          student.status === 'confirmed' ||
          student.status === 'present';

        if (isPresent) {
          const studentInfo = studentMap.get(studentId)!;
          studentInfo.attendedLectures++;
          studentMap.set(studentId, studentInfo);
        }
      }
    }

    // Convert to MonthlySubjectAttendance array
    const studentsData: MonthlySubjectAttendance[] = [];
    const totalLectures = matchingLectureIds.length;

    // Get subject and semester from first lecture for consistency
    const firstLecture = allLectures[matchingLectureIds[0]];
    const reportSubject = subject || firstLecture.subject;
    const reportSemester = semester || parseInt(firstLecture.semester);
    const reportDivision = division || firstLecture.division;

    for (const [studentId, studentInfo] of studentMap.entries()) {
      const absentLectures = totalLectures - studentInfo.attendedLectures;
      const percentage = totalLectures > 0
        ? Math.round((studentInfo.attendedLectures / totalLectures) * 10000) / 100
        : 0;

      const monthlyData: MonthlySubjectAttendance = {
        year,
        month,
        subject: reportSubject,
        semester: reportSemester,
        division: reportDivision,
        studentId,
        studentName: studentInfo.studentName,
        rollNumber: studentInfo.rollNumber,
        email: studentInfo.email,
        totalLectures,
        attendedLectures: studentInfo.attendedLectures,
        absentLectures,
        attendancePercentage: percentage,
        eligibilityStatus: percentage >= 75 ? 'Eligible' : 'Not Eligible',
        generatedAt: new Date().toISOString(),
      };

      studentsData.push(monthlyData);
    }

    // Sort by roll number
    studentsData.sort((a, b) => {
      const rollA = a.rollNumber || '';
      const rollB = b.rollNumber || '';
      return rollA.localeCompare(rollB);
    });

    console.log(`[MONTHLY-SUBJECT] Processed ${studentsData.length} students`);

    return {
      success: true,
      studentsData,
      totalLectures,
      message: `Calculated monthly attendance for ${studentsData.length} students`,
    };
  } catch (error) {
    console.error('[MONTHLY-SUBJECT] Error:', error);
    return {
      success: false,
      studentsData: [],
      totalLectures: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Store monthly subject attendance
 * Path: /monthlyAttendance/{year}/{month}/{subject}/{studentId}
 */
export async function storeMonthlySubjectAttendance(
  data: MonthlySubjectAttendance
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const path = `${DATABASE_PATHS.MONTHLY_ATTENDANCE}/${data.year}/${data.month}/${data.subject}_sem${data.semester}/${data.studentId}`;
    const dataRef = ref(database, path);

    await set(dataRef, data);

    return {
      success: true,
      message: 'Monthly attendance stored successfully',
    };
  } catch (error) {
    console.error('[MONTHLY-SUBJECT] Error storing:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate and store monthly attendance for a subject
 */
export async function calculateAndStoreMonthlyAttendance(
  params: MonthlyReportParams
): Promise<{
  success: boolean;
  totalLectures: number;
  studentsProcessed: number;
  message: string;
}> {
  try {
    // Calculate
    const result = await calculateMonthlySubjectAttendance(params);

    if (!result.success || result.studentsData.length === 0) {
      return {
        success: result.success,
        totalLectures: result.totalLectures,
        studentsProcessed: 0,
        message: result.message,
      };
    }

    // Store each student's data
    let stored = 0;
    for (const studentData of result.studentsData) {
      const storeResult = await storeMonthlySubjectAttendance(studentData);
      if (storeResult.success) {
        stored++;
      }
    }

    // Store metadata
    const metadataPath = `${DATABASE_PATHS.MONTHLY_ATTENDANCE}/${params.year}/${params.month}/${params.subject}_sem${params.semester}/_metadata`;
    const metadataRef = ref(database, metadataPath);

    await set(metadataRef, {
      year: params.year,
      month: params.month,
      subject: params.subject,
      semester: params.semester,
      division: params.division,
      totalLectures: result.totalLectures,
      totalStudents: result.studentsData.length,
      generatedAt: new Date().toISOString(),
      monthYear: formatMonthYear(params.year, params.month),
    });

    console.log(`[MONTHLY-SUBJECT] Stored ${stored} student records`);

    return {
      success: true,
      totalLectures: result.totalLectures,
      studentsProcessed: stored,
      message: `Stored monthly attendance for ${stored} students`,
    };
  } catch (error) {
    console.error('[MONTHLY-SUBJECT] Error in calculate and store:', error);
    return {
      success: false,
      totalLectures: 0,
      studentsProcessed: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get monthly attendance for a subject
 */
export async function getMonthlySubjectAttendance(
  params: MonthlyReportParams
): Promise<MonthlySubjectAttendance[]> {
  try {
    const { year, month, subject, semester } = params;
    const path = `${DATABASE_PATHS.MONTHLY_ATTENDANCE}/${year}/${month}/${subject}_sem${semester}`;
    const dataRef = ref(database, path);

    const snapshot = await get(dataRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const studentsData: MonthlySubjectAttendance[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (key !== '_metadata') {
        studentsData.push(value as MonthlySubjectAttendance);
      }
    }

    // Sort by roll number
    studentsData.sort((a, b) => {
      const rollA = a.rollNumber || '';
      const rollB = b.rollNumber || '';
      return rollA.localeCompare(rollB);
    });

    return studentsData;
  } catch (error) {
    console.error('[MONTHLY-SUBJECT] Error getting data:', error);
    return [];
  }
}

/**
 * Get monthly attendance statistics
 */
export async function getMonthlySubjectStats(
  params: MonthlyReportParams
): Promise<{
  totalStudents: number;
  eligible: number;
  notEligible: number;
  averageAttendance: number;
  totalLectures: number;
}> {
  try {
    const studentsData = await getMonthlySubjectAttendance(params);

    if (studentsData.length === 0) {
      return {
        totalStudents: 0,
        eligible: 0,
        notEligible: 0,
        averageAttendance: 0,
        totalLectures: 0,
      };
    }

    const eligible = studentsData.filter(s => s.eligibilityStatus === 'Eligible').length;
    const notEligible = studentsData.length - eligible;
    const totalAttendance = studentsData.reduce((sum, s) => sum + s.attendancePercentage, 0);
    const averageAttendance = Math.round((totalAttendance / studentsData.length) * 100) / 100;

    return {
      totalStudents: studentsData.length,
      eligible,
      notEligible,
      averageAttendance,
      totalLectures: studentsData[0]?.totalLectures || 0,
    };
  } catch (error) {
    console.error('[MONTHLY-SUBJECT] Error getting stats:', error);
    return {
      totalStudents: 0,
      eligible: 0,
      notEligible: 0,
      averageAttendance: 0,
      totalLectures: 0,
    };
  }
}

/**
 * Check if monthly data already exists
 */
export async function monthlyDataExists(params: MonthlyReportParams): Promise<boolean> {
  try {
    const { year, month, subject, semester } = params;
    const metadataPath = `${DATABASE_PATHS.MONTHLY_ATTENDANCE}/${year}/${month}/${subject}_sem${semester}/_metadata`;
    const metadataRef = ref(database, metadataPath);

    const snapshot = await get(metadataRef);
    return snapshot.exists();
  } catch (error) {
    console.error('[MONTHLY-SUBJECT] Error checking existence:', error);
    return false;
  }
}
