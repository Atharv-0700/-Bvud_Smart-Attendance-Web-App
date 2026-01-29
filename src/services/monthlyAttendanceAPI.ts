/**
 * Monthly Attendance Complete API
 * Single entry point for all monthly attendance operations
 * Production-ready, fully integrated system
 */

import {
  calculateMonthlyAttendance,
  getMonthlyAttendance,
  monthlyDataExists,
  getMonthlyStatistics,
  MonthlyAttendanceParams,
  StudentMonthlyAttendance,
} from './monthlyAttendance';

import {
  downloadExcelReport,
  downloadPDFReport,
  downloadBothReports,
  UniversityReportConfig,
} from './reportGenerator';

import {
  manualGenerateMonthlyAttendance,
  automaticMonthlyGeneration,
  scheduleAutomaticGeneration,
  batchGenerateMonthlyAttendance,
  getSubjectsNeedingCalculation,
  getAutomationLogs,
} from './attendanceAutomation';

import {
  validateMonthlyParams,
  ensureIdempotentCalculation,
  estimateCalculationTime,
  checkDatabaseHealth,
  clearAllCaches,
  getCacheStats,
  calculationRateLimiter,
} from './performanceOptimizer';

import { getCurrentMonthYear, getPreviousMonthYear } from '../utils/dateUtils';

/**
 * =======================================================================
 * PUBLIC API - USE THESE FUNCTIONS IN YOUR APPLICATION
 * =======================================================================
 */

/**
 * 1. CALCULATE MONTHLY ATTENDANCE
 * 
 * Calculate monthly attendance for a specific subject
 * Automatically stores results in database
 * 
 * @example
 * const result = await MonthlyAttendanceAPI.calculate({
 *   year: 2025,
 *   month: 1,
 *   subject: 'Data Structures',
 *   semester: 3,
 *   division: 'A'
 * });
 */
export async function calculate(
  params: MonthlyAttendanceParams,
  options?: {
    forceRecalculate?: boolean;
    teacherId?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  data?: {
    totalLectures: number;
    studentsProcessed: number;
    studentsData: StudentMonthlyAttendance[];
    storageKey: string;
  };
}> {
  console.log('[API] Calculate monthly attendance called');
  
  try {
    // 1. Validate parameters
    const validation = validateMonthlyParams(params);
    if (!validation.valid) {
      return {
        success: false,
        message: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }
    
    // 2. Rate limiting check
    const rateLimitKey = `${params.year}_${params.month}_${params.subject}`;
    const canProceed = await calculationRateLimiter.checkLimit(rateLimitKey);
    
    if (!canProceed) {
      return {
        success: false,
        message: 'Rate limit exceeded. Please wait before trying again.',
      };
    }
    
    // 3. Check idempotency
    const idempotentCheck = await ensureIdempotentCalculation(
      params,
      options?.forceRecalculate || false
    );
    
    if (!idempotentCheck.shouldCalculate) {
      return {
        success: false,
        message: idempotentCheck.reason,
        data: idempotentCheck.existingData
          ? {
              totalLectures: idempotentCheck.existingData[0]?.totalLectures || 0,
              studentsProcessed: idempotentCheck.existingData.length,
              studentsData: idempotentCheck.existingData,
              storageKey: '',
            }
          : undefined,
      };
    }
    
    // 4. Estimate time
    const estimate = await estimateCalculationTime(params);
    console.log(
      `[API] Estimated time: ${estimate.estimatedSeconds}s for ${estimate.lectureCount} lectures`
    );
    
    // 5. Perform calculation
    const result = await calculateMonthlyAttendance(params);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Calculation failed',
      };
    }
    
    // 6. Clear cache after successful calculation
    clearAllCaches();
    
    return {
      success: true,
      message: `Successfully calculated attendance for ${result.studentsProcessed} students`,
      data: {
        totalLectures: result.totalLectures,
        studentsProcessed: result.studentsProcessed,
        studentsData: result.studentsData,
        storageKey: result.storageKey,
      },
    };
  } catch (error) {
    console.error('[API] Calculation error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * 2. GET MONTHLY ATTENDANCE DATA
 * 
 * Retrieve previously calculated monthly attendance
 * Returns empty array if not calculated yet
 * 
 * @example
 * const data = await MonthlyAttendanceAPI.getData({
 *   year: 2025,
 *   month: 1,
 *   subject: 'Data Structures',
 *   semester: 3,
 *   division: 'A'
 * });
 */
export async function getData(
  params: MonthlyAttendanceParams
): Promise<StudentMonthlyAttendance[]> {
  console.log('[API] Get monthly attendance data called');
  
  try {
    return await getMonthlyAttendance(params);
  } catch (error) {
    console.error('[API] Get data error:', error);
    return [];
  }
}

/**
 * 3. CHECK IF DATA EXISTS
 * 
 * Check if monthly attendance has been calculated
 * 
 * @example
 * const exists = await MonthlyAttendanceAPI.exists({
 *   year: 2025,
 *   month: 1,
 *   subject: 'Data Structures',
 *   semester: 3,
 *   division: 'A'
 * });
 */
export async function exists(params: MonthlyAttendanceParams): Promise<boolean> {
  try {
    return await monthlyDataExists(params);
  } catch (error) {
    console.error('[API] Exists check error:', error);
    return false;
  }
}

/**
 * 4. GET STATISTICS
 * 
 * Get summary statistics for monthly attendance
 * 
 * @example
 * const stats = await MonthlyAttendanceAPI.getStatistics({
 *   year: 2025,
 *   month: 1,
 *   subject: 'Data Structures',
 *   semester: 3,
 *   division: 'A'
 * });
 */
export async function getStatistics(params: MonthlyAttendanceParams): Promise<{
  totalStudents: number;
  eligible: number;
  notEligible: number;
  averageAttendance: number;
  totalLectures: number;
}> {
  try {
    return await getMonthlyStatistics(params);
  } catch (error) {
    console.error('[API] Get statistics error:', error);
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
 * 5. DOWNLOAD EXCEL REPORT
 * 
 * Generate and download university-ready Excel report
 * 
 * @example
 * await MonthlyAttendanceAPI.downloadExcel(
 *   studentsData,
 *   2025,
 *   1,
 *   'Data Structures',
 *   3,
 *   'A',
 *   teacherId
 * );
 */
export async function downloadExcel(
  studentsData: StudentMonthlyAttendance[],
  year: number,
  month: number,
  subject: string,
  semester: number,
  division: string | undefined,
  teacherId: string,
  config?: UniversityReportConfig
): Promise<void> {
  try {
    await downloadExcelReport(
      studentsData,
      year,
      month,
      subject,
      semester,
      division,
      teacherId,
      config
    );
  } catch (error) {
    console.error('[API] Download Excel error:', error);
    throw error;
  }
}

/**
 * 6. DOWNLOAD PDF REPORT
 * 
 * Generate and download university-ready PDF report
 * 
 * @example
 * await MonthlyAttendanceAPI.downloadPDF(
 *   studentsData,
 *   2025,
 *   1,
 *   'Data Structures',
 *   3,
 *   'A',
 *   teacherId
 * );
 */
export async function downloadPDF(
  studentsData: StudentMonthlyAttendance[],
  year: number,
  month: number,
  subject: string,
  semester: number,
  division: string | undefined,
  teacherId: string,
  config?: UniversityReportConfig
): Promise<void> {
  try {
    await downloadPDFReport(
      studentsData,
      year,
      month,
      subject,
      semester,
      division,
      teacherId,
      config
    );
  } catch (error) {
    console.error('[API] Download PDF error:', error);
    throw error;
  }
}

/**
 * 7. DOWNLOAD BOTH REPORTS
 * 
 * Generate and download both Excel and PDF reports
 * 
 * @example
 * await MonthlyAttendanceAPI.downloadBoth(
 *   studentsData,
 *   2025,
 *   1,
 *   'Data Structures',
 *   3,
 *   'A',
 *   teacherId
 * );
 */
export async function downloadBoth(
  studentsData: StudentMonthlyAttendance[],
  year: number,
  month: number,
  subject: string,
  semester: number,
  division: string | undefined,
  teacherId: string,
  config?: UniversityReportConfig
): Promise<void> {
  try {
    await downloadBothReports(
      studentsData,
      year,
      month,
      subject,
      semester,
      division,
      teacherId,
      config
    );
  } catch (error) {
    console.error('[API] Download both reports error:', error);
    throw error;
  }
}

/**
 * 8. COMPLETE WORKFLOW
 * 
 * Calculate + Download Reports in one call
 * Most convenient function for teachers
 * 
 * @example
 * const result = await MonthlyAttendanceAPI.generateAndDownload({
 *   year: 2025,
 *   month: 1,
 *   subject: 'Data Structures',
 *   semester: 3,
 *   division: 'A'
 * }, teacherId, 'both');
 */
export async function generateAndDownload(
  params: MonthlyAttendanceParams,
  teacherId: string,
  format: 'excel' | 'pdf' | 'both' = 'both',
  config?: UniversityReportConfig
): Promise<{
  success: boolean;
  message: string;
}> {
  console.log('[API] Complete workflow started');
  
  try {
    // 1. Calculate or get existing data
    const exists = await monthlyDataExists(params);
    let studentsData: StudentMonthlyAttendance[];
    
    if (exists) {
      console.log('[API] Using existing data');
      studentsData = await getMonthlyAttendance(params);
    } else {
      console.log('[API] Calculating new data');
      const result = await calculate(params, { teacherId });
      
      if (!result.success || !result.data) {
        return {
          success: false,
          message: result.message,
        };
      }
      
      studentsData = result.data.studentsData;
    }
    
    if (studentsData.length === 0) {
      return {
        success: false,
        message: 'No student data available',
      };
    }
    
    // 2. Download reports
    const { year, month, subject, semester, division } = params;
    
    if (format === 'excel') {
      await downloadExcel(
        studentsData,
        year,
        month,
        subject,
        semester,
        division,
        teacherId,
        config
      );
    } else if (format === 'pdf') {
      await downloadPDF(
        studentsData,
        year,
        month,
        subject,
        semester,
        division,
        teacherId,
        config
      );
    } else {
      await downloadBoth(
        studentsData,
        year,
        month,
        subject,
        semester,
        division,
        teacherId,
        config
      );
    }
    
    return {
      success: true,
      message: `Reports generated and downloaded successfully for ${studentsData.length} students`,
    };
  } catch (error) {
    console.error('[API] Complete workflow error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * 9. BATCH GENERATE FOR ALL SUBJECTS
 * 
 * Generate monthly attendance for all subjects taught in a month
 * Useful for end-of-month bulk processing
 * 
 * @example
 * const result = await MonthlyAttendanceAPI.generateAllSubjects(2025, 1);
 */
export async function generateAllSubjects(
  year: number,
  month: number
): Promise<{
  success: boolean;
  message: string;
  processed: number;
  failed: number;
}> {
  try {
    const result = await batchGenerateMonthlyAttendance(year, month);
    
    return {
      success: true,
      message: `Processed ${result.processed} subjects, ${result.failed} failed`,
      processed: result.processed,
      failed: result.failed,
    };
  } catch (error) {
    console.error('[API] Batch generation error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      processed: 0,
      failed: 0,
    };
  }
}

/**
 * 10. GET SUBJECTS NEEDING CALCULATION
 * 
 * Find all subjects that have lectures but no monthly attendance calculated
 * 
 * @example
 * const subjects = await MonthlyAttendanceAPI.getSubjectsNeedingCalculation(2025, 1);
 */
export async function getSubjectsToCalculate(
  year: number,
  month: number
): Promise<
  Array<{
    subject: string;
    semester: number;
    division: string;
    lectureCount: number;
  }>
> {
  try {
    return await getSubjectsNeedingCalculation(year, month);
  } catch (error) {
    console.error('[API] Get subjects needing calculation error:', error);
    return [];
  }
}

/**
 * 11. SYSTEM HEALTH CHECK
 * 
 * Check if the system is healthy and ready to process requests
 * 
 * @example
 * const health = await MonthlyAttendanceAPI.healthCheck();
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  message: string;
  details: {
    database: boolean;
    latency: number;
    cacheSize: number;
  };
}> {
  try {
    const dbHealth = await checkDatabaseHealth();
    const cacheStats = getCacheStats();
    
    return {
      healthy: dbHealth.healthy,
      message: dbHealth.message,
      details: {
        database: dbHealth.healthy,
        latency: dbHealth.latency,
        cacheSize: cacheStats.lectureCache,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Health check failed',
      details: {
        database: false,
        latency: -1,
        cacheSize: 0,
      },
    };
  }
}

/**
 * 12. GET CURRENT AND PREVIOUS MONTH
 * 
 * Helper to get current and previous month/year
 * 
 * @example
 * const { current, previous } = MonthlyAttendanceAPI.getMonthInfo();
 */
export function getMonthInfo(): {
  current: { year: number; month: number };
  previous: { year: number; month: number };
} {
  return {
    current: getCurrentMonthYear(),
    previous: getPreviousMonthYear(),
  };
}

/**
 * 13. CLEAR ALL CACHES
 * 
 * Clear all caches (call after data updates)
 * 
 * @example
 * MonthlyAttendanceAPI.clearCache();
 */
export function clearCache(): void {
  clearAllCaches();
  console.log('[API] All caches cleared');
}

/**
 * =======================================================================
 * EXPORT AS NAMESPACE FOR CLEAN IMPORTS
 * =======================================================================
 */

export const MonthlyAttendanceAPI = {
  // Core Functions
  calculate,
  getData,
  exists,
  getStatistics,
  
  // Report Generation
  downloadExcel,
  downloadPDF,
  downloadBoth,
  
  // Complete Workflows
  generateAndDownload,
  generateAllSubjects,
  
  // Helpers
  getSubjectsToCalculate,
  getMonthInfo,
  healthCheck,
  clearCache,
};

// Export types
export type {
  MonthlyAttendanceParams,
  StudentMonthlyAttendance,
  UniversityReportConfig,
};
