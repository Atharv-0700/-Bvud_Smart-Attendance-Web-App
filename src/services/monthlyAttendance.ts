/**
 * Monthly Attendance Calculation Service
 * Calculates monthly attendance percentages and eligibility
 * NO UI changes - pure backend service
 */

import { database } from '../config/firebase';
import { ref, get, set, query, orderByChild, equalTo } from 'firebase/database';
import { getMonthDateRange, isInMonth, formatMonthYear } from '../utils/dateUtils';

export interface MonthlyAttendanceParams {
  year: number;
  month: number;
  subject: string;
  semester: number;
  division?: string;
}

export interface StudentMonthlyAttendance {
  studentId: string;
  studentName: string;
  rollNumber: string;
  email?: string;
  subject: string;
  semester: number;
  division: string;
  totalLectures: number;
  attendedLectures: number;
  attendancePercentage: number;
  eligibilityStatus: 'Eligible' | 'Not Eligible';
  generatedAt: string;
  monthYear: string;
}

export interface MonthlyAttendanceResult {
  success: boolean;
  totalLectures: number;
  studentsProcessed: number;
  studentsData: StudentMonthlyAttendance[];
  storageKey: string;
  message?: string;
}

/**
 * PART 1: Calculate total lectures conducted in a month
 */
async function calculateTotalLectures(
  params: MonthlyAttendanceParams
): Promise<{ lectureIds: string[]; totalLectures: number }> {
  console.log('[MONTHLY] Calculating total lectures for:', params);
  
  const { year, month, subject, semester, division } = params;
  const { startDate, endDate } = getMonthDateRange(year, month);
  
  // Get all lectures
  const lecturesRef = ref(database, 'lectures');
  const snapshot = await get(lecturesRef);
  
  if (!snapshot.exists()) {
    return { lectureIds: [], totalLectures: 0 };
  }
  
  const allLectures = snapshot.val();
  const matchingLectureIds: string[] = [];
  
  // Filter lectures by criteria
  for (const [lectureId, lectureData] of Object.entries(allLectures)) {
    const lecture = lectureData as any;
    
    // Check if lecture matches criteria
    const matchesSubject = lecture.subject === subject;
    const matchesSemester = parseInt(lecture.semester) === semester;
    const matchesDivision = !division || lecture.division === division;
    
    // Check if lecture date is in the specified month
    const lectureDate = lecture.timestamp || lecture.date || lecture.createdAt;
    const isInMonthRange = isInMonth(lectureDate, year, month);
    
    if (matchesSubject && matchesSemester && matchesDivision && isInMonthRange) {
      matchingLectureIds.push(lectureId);
    }
  }
  
  console.log(`[MONTHLY] Found ${matchingLectureIds.length} lectures`);
  
  return {
    lectureIds: matchingLectureIds,
    totalLectures: matchingLectureIds.length,
  };
}

/**
 * PART 2: Calculate attended lectures for each student
 */
async function calculateStudentAttendance(
  lectureIds: string[],
  params: MonthlyAttendanceParams
): Promise<Map<string, { attended: number; studentData: any }>> {
  console.log('[MONTHLY] Calculating student attendance for', lectureIds.length, 'lectures');
  
  const studentAttendanceMap = new Map<string, { attended: number; studentData: any }>();
  
  // Process each lecture
  for (const lectureId of lectureIds) {
    const lectureStudentsRef = ref(database, `lectures/${lectureId}/students`);
    const studentsSnapshot = await get(lectureStudentsRef);
    
    if (!studentsSnapshot.exists()) {
      continue;
    }
    
    const students = studentsSnapshot.val();
    
    // Process each student in this lecture
    for (const [studentId, studentData] of Object.entries(students)) {
      const student = studentData as any;
      
      // Check if attendance is confirmed
      const isConfirmed = 
        student.status === 'CONFIRMED' || 
        student.status === 'confirmed' ||
        student.status === 'present';
      
      if (isConfirmed) {
        if (!studentAttendanceMap.has(studentId)) {
          studentAttendanceMap.set(studentId, {
            attended: 0,
            studentData: {
              studentName: student.studentName,
              rollNumber: student.rollNumber || '',
              email: student.studentEmail || student.email || '',
            },
          });
        }
        
        const current = studentAttendanceMap.get(studentId)!;
        current.attended += 1;
        studentAttendanceMap.set(studentId, current);
      }
    }
  }
  
  console.log(`[MONTHLY] Processed ${studentAttendanceMap.size} students`);
  
  return studentAttendanceMap;
}

/**
 * PART 3 & 4: Calculate percentage and eligibility
 */
function calculatePercentageAndEligibility(
  attendedLectures: number,
  totalLectures: number
): { percentage: number; eligibility: 'Eligible' | 'Not Eligible' } {
  if (totalLectures === 0) {
    return {
      percentage: 0,
      eligibility: 'Not Eligible',
    };
  }
  
  const percentage = (attendedLectures / totalLectures) * 100;
  const roundedPercentage = Math.round(percentage * 100) / 100; // Round to 2 decimals
  
  const eligibility = roundedPercentage >= 75 ? 'Eligible' : 'Not Eligible';
  
  return {
    percentage: roundedPercentage,
    eligibility,
  };
}

/**
 * PART 5: Store monthly attendance data
 */
async function storeMonthlyData(
  params: MonthlyAttendanceParams,
  studentsData: StudentMonthlyAttendance[]
): Promise<string> {
  const { year, month, subject, semester, division } = params;
  
  // Create storage key
  const divisionKey = division || 'all';
  const storageKey = `${year}/${month}/${subject}_sem${semester}_${divisionKey}`;
  
  console.log('[MONTHLY] Storing data at:', storageKey);
  
  // Store each student's data
  for (const studentData of studentsData) {
    const studentRef = ref(
      database,
      `monthlyAttendance/${storageKey}/${studentData.studentId}`
    );
    
    await set(studentRef, studentData);
  }
  
  // Store summary metadata
  const summaryRef = ref(database, `monthlyAttendance/${storageKey}/_metadata`);
  await set(summaryRef, {
    year,
    month,
    subject,
    semester,
    division: division || 'all',
    totalStudents: studentsData.length,
    totalLectures: studentsData[0]?.totalLectures || 0,
    generatedAt: new Date().toISOString(),
    monthYear: formatMonthYear(year, month),
  });
  
  console.log('[MONTHLY] Data stored successfully');
  
  return storageKey;
}

/**
 * Main function: Calculate monthly attendance
 */
export async function calculateMonthlyAttendance(
  params: MonthlyAttendanceParams
): Promise<MonthlyAttendanceResult> {
  try {
    console.log('');
    console.log('='.repeat(60));
    console.log('[MONTHLY ATTENDANCE] Starting calculation');
    console.log('Parameters:', params);
    console.log('='.repeat(60));
    
    const { year, month, subject, semester, division } = params;
    
    // Step 1: Calculate total lectures
    const { lectureIds, totalLectures } = await calculateTotalLectures(params);
    
    if (totalLectures === 0) {
      console.log('[MONTHLY] No lectures found for criteria');
      return {
        success: true,
        totalLectures: 0,
        studentsProcessed: 0,
        studentsData: [],
        storageKey: '',
        message: 'No lectures found for the specified criteria',
      };
    }
    
    // Step 2: Calculate student attendance
    const studentAttendanceMap = await calculateStudentAttendance(lectureIds, params);
    
    // Step 3 & 4: Calculate percentages and eligibility
    const studentsData: StudentMonthlyAttendance[] = [];
    
    for (const [studentId, data] of studentAttendanceMap.entries()) {
      const { percentage, eligibility } = calculatePercentageAndEligibility(
        data.attended,
        totalLectures
      );
      
      studentsData.push({
        studentId,
        studentName: data.studentData.studentName,
        rollNumber: data.studentData.rollNumber,
        email: data.studentData.email,
        subject,
        semester,
        division: division || 'all',
        totalLectures,
        attendedLectures: data.attended,
        attendancePercentage: percentage,
        eligibilityStatus: eligibility,
        generatedAt: new Date().toISOString(),
        monthYear: formatMonthYear(year, month),
      });
    }
    
    // Sort by roll number
    studentsData.sort((a, b) => {
      const rollA = a.rollNumber || '';
      const rollB = b.rollNumber || '';
      return rollA.localeCompare(rollB);
    });
    
    // Step 5: Store monthly data
    const storageKey = await storeMonthlyData(params, studentsData);
    
    console.log('[MONTHLY ATTENDANCE] Calculation complete');
    console.log('  - Total Lectures:', totalLectures);
    console.log('  - Students Processed:', studentsData.length);
    console.log('  - Storage Key:', storageKey);
    console.log('='.repeat(60));
    console.log('');
    
    return {
      success: true,
      totalLectures,
      studentsProcessed: studentsData.length,
      studentsData,
      storageKey,
      message: `Successfully processed ${studentsData.length} students`,
    };
  } catch (error) {
    console.error('[MONTHLY ATTENDANCE] Error:', error);
    
    return {
      success: false,
      totalLectures: 0,
      studentsProcessed: 0,
      studentsData: [],
      storageKey: '',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get stored monthly attendance data
 */
export async function getMonthlyAttendance(
  params: MonthlyAttendanceParams
): Promise<StudentMonthlyAttendance[]> {
  const { year, month, subject, semester, division } = params;
  const divisionKey = division || 'all';
  const storageKey = `${year}/${month}/${subject}_sem${semester}_${divisionKey}`;
  
  const monthlyRef = ref(database, `monthlyAttendance/${storageKey}`);
  const snapshot = await get(monthlyRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const data = snapshot.val();
  const studentsData: StudentMonthlyAttendance[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    if (key !== '_metadata') {
      studentsData.push(value as StudentMonthlyAttendance);
    }
  }
  
  return studentsData;
}

/**
 * Check if monthly data already exists (prevent recalculation)
 */
export async function monthlyDataExists(
  params: MonthlyAttendanceParams
): Promise<boolean> {
  const { year, month, subject, semester, division } = params;
  const divisionKey = division || 'all';
  const storageKey = `${year}/${month}/${subject}_sem${semester}_${divisionKey}`;
  
  const metadataRef = ref(database, `monthlyAttendance/${storageKey}/_metadata`);
  const snapshot = await get(metadataRef);
  
  return snapshot.exists();
}

/**
 * Calculate monthly attendance for all subjects (for automation)
 */
export async function calculateAllSubjectsMonthly(
  year: number,
  month: number
): Promise<{
  success: boolean;
  processed: number;
  results: MonthlyAttendanceResult[];
}> {
  console.log('[MONTHLY] Calculating for all subjects');
  
  // Get all unique subject-semester-division combinations from lectures
  const lecturesRef = ref(database, 'lectures');
  const snapshot = await get(lecturesRef);
  
  if (!snapshot.exists()) {
    return { success: true, processed: 0, results: [] };
  }
  
  const allLectures = snapshot.val();
  const combinations = new Set<string>();
  
  // Find all unique combinations
  for (const lectureData of Object.values(allLectures)) {
    const lecture = lectureData as any;
    
    if (isInMonth(lecture.timestamp || lecture.date, year, month)) {
      const key = `${lecture.subject}|${lecture.semester}|${lecture.division || 'all'}`;
      combinations.add(key);
    }
  }
  
  console.log(`[MONTHLY] Found ${combinations.size} unique combinations`);
  
  // Calculate for each combination
  const results: MonthlyAttendanceResult[] = [];
  
  for (const combo of combinations) {
    const [subject, semesterStr, division] = combo.split('|');
    const semester = parseInt(semesterStr);
    
    // Check if already calculated
    const exists = await monthlyDataExists({
      year,
      month,
      subject,
      semester,
      division: division === 'all' ? undefined : division,
    });
    
    if (exists) {
      console.log(`[MONTHLY] Skipping ${combo} - already exists`);
      continue;
    }
    
    // Calculate
    const result = await calculateMonthlyAttendance({
      year,
      month,
      subject,
      semester,
      division: division === 'all' ? undefined : division,
    });
    
    results.push(result);
    
    // Small delay to avoid overwhelming Firebase
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return {
    success: true,
    processed: results.length,
    results,
  };
}

/**
 * Get monthly attendance summary statistics
 */
export async function getMonthlyStatistics(
  params: MonthlyAttendanceParams
): Promise<{
  totalStudents: number;
  eligible: number;
  notEligible: number;
  averageAttendance: number;
  totalLectures: number;
}> {
  const studentsData = await getMonthlyAttendance(params);
  
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
}
