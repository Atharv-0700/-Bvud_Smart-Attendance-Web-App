/**
 * Attendance Automation Service
 * Part 7: Automation for monthly attendance calculation
 * Handles automatic generation on last day of month + manual triggers
 */

import {
  calculateMonthlyAttendance,
  calculateAllSubjectsMonthly,
  monthlyDataExists,
  MonthlyAttendanceParams,
} from './monthlyAttendance';
import {
  getCurrentMonthYear,
  getPreviousMonthYear,
  isLastDayOfMonth,
} from '../utils/dateUtils';
import { database } from '../config/firebase';
import { ref, get, set } from 'firebase/database';

export interface AutomationConfig {
  enabled: boolean;
  autoGenerateOnLastDay: boolean;
  notifyTeachers: boolean;
  subjects?: string[];
  semesters?: number[];
}

export interface AutomationLog {
  timestamp: string;
  type: 'manual' | 'automatic';
  year: number;
  month: number;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  processedSubjects?: number;
  totalStudents?: number;
}

/**
 * Get automation configuration
 */
async function getAutomationConfig(): Promise<AutomationConfig> {
  try {
    const configRef = ref(database, 'automationConfig/monthlyAttendance');
    const snapshot = await get(configRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
  } catch (error) {
    console.error('[AUTOMATION] Error fetching config:', error);
  }
  
  // Default configuration
  return {
    enabled: true,
    autoGenerateOnLastDay: true,
    notifyTeachers: false,
  };
}

/**
 * Log automation activity
 */
async function logAutomationActivity(log: AutomationLog): Promise<void> {
  try {
    const logRef = ref(
      database,
      `automationLogs/monthlyAttendance/${Date.now()}`
    );
    await set(logRef, log);
    console.log('[AUTOMATION] Activity logged:', log.type, log.status);
  } catch (error) {
    console.error('[AUTOMATION] Error logging activity:', error);
  }
}

/**
 * PART 7A: Manual Generation
 * Teacher manually triggers monthly attendance calculation
 */
export async function manualGenerateMonthlyAttendance(
  params: MonthlyAttendanceParams,
  forceRegenerate: boolean = false
): Promise<{
  success: boolean;
  message: string;
  studentsProcessed?: number;
  totalLectures?: number;
}> {
  console.log('');
  console.log('='.repeat(60));
  console.log('[AUTOMATION] Manual generation triggered');
  console.log('Parameters:', params);
  console.log('Force Regenerate:', forceRegenerate);
  console.log('='.repeat(60));
  
  const { year, month, subject, semester, division } = params;
  
  try {
    // Check if data already exists
    const exists = await monthlyDataExists(params);
    
    if (exists && !forceRegenerate) {
      console.log('[AUTOMATION] Data already exists, skipping');
      
      await logAutomationActivity({
        timestamp: new Date().toISOString(),
        type: 'manual',
        year,
        month,
        status: 'skipped',
        message: 'Data already exists',
      });
      
      return {
        success: false,
        message: 'Monthly attendance for this subject already exists. Use force regenerate to recalculate.',
      };
    }
    
    // Calculate monthly attendance
    const result = await calculateMonthlyAttendance(params);
    
    if (!result.success) {
      await logAutomationActivity({
        timestamp: new Date().toISOString(),
        type: 'manual',
        year,
        month,
        status: 'failed',
        message: result.message || 'Calculation failed',
      });
      
      return {
        success: false,
        message: result.message || 'Failed to calculate monthly attendance',
      };
    }
    
    // Log success
    await logAutomationActivity({
      timestamp: new Date().toISOString(),
      type: 'manual',
      year,
      month,
      status: 'success',
      message: `Processed ${result.studentsProcessed} students`,
      processedSubjects: 1,
      totalStudents: result.studentsProcessed,
    });
    
    console.log('[AUTOMATION] Manual generation completed successfully');
    
    return {
      success: true,
      message: `Successfully generated monthly attendance for ${result.studentsProcessed} students`,
      studentsProcessed: result.studentsProcessed,
      totalLectures: result.totalLectures,
    };
  } catch (error) {
    console.error('[AUTOMATION] Manual generation error:', error);
    
    await logAutomationActivity({
      timestamp: new Date().toISOString(),
      type: 'manual',
      year,
      month,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * PART 7B: Automatic Generation
 * Runs on last day of month to calculate all subjects
 */
export async function automaticMonthlyGeneration(): Promise<{
  success: boolean;
  message: string;
  processedSubjects?: number;
  totalStudents?: number;
}> {
  console.log('');
  console.log('='.repeat(60));
  console.log('[AUTOMATION] Automatic generation started');
  console.log('Date:', new Date().toISOString());
  console.log('='.repeat(60));
  
  try {
    // Check if automation is enabled
    const config = await getAutomationConfig();
    
    if (!config.enabled || !config.autoGenerateOnLastDay) {
      console.log('[AUTOMATION] Automatic generation is disabled');
      return {
        success: false,
        message: 'Automatic generation is disabled in configuration',
      };
    }
    
    // Check if today is last day of month
    if (!isLastDayOfMonth()) {
      console.log('[AUTOMATION] Not the last day of month, skipping');
      return {
        success: false,
        message: 'Not the last day of month',
      };
    }
    
    // Get previous month (we calculate for the month that just ended)
    const { year, month } = getPreviousMonthYear();
    
    console.log(`[AUTOMATION] Calculating for ${month}/${year}`);
    
    // Calculate for all subjects
    const result = await calculateAllSubjectsMonthly(year, month);
    
    if (!result.success) {
      await logAutomationActivity({
        timestamp: new Date().toISOString(),
        type: 'automatic',
        year,
        month,
        status: 'failed',
        message: 'Failed to calculate all subjects',
      });
      
      return {
        success: false,
        message: 'Failed to calculate monthly attendance for all subjects',
      };
    }
    
    // Calculate total students processed
    const totalStudents = result.results.reduce(
      (sum, r) => sum + r.studentsProcessed,
      0
    );
    
    // Log success
    await logAutomationActivity({
      timestamp: new Date().toISOString(),
      type: 'automatic',
      year,
      month,
      status: 'success',
      message: `Processed ${result.processed} subjects`,
      processedSubjects: result.processed,
      totalStudents,
    });
    
    console.log('[AUTOMATION] Automatic generation completed');
    console.log('  - Subjects processed:', result.processed);
    console.log('  - Total students:', totalStudents);
    console.log('='.repeat(60));
    
    return {
      success: true,
      message: `Successfully generated monthly attendance for ${result.processed} subjects`,
      processedSubjects: result.processed,
      totalStudents,
    };
  } catch (error) {
    console.error('[AUTOMATION] Automatic generation error:', error);
    
    const { year, month } = getPreviousMonthYear();
    
    await logAutomationActivity({
      timestamp: new Date().toISOString(),
      type: 'automatic',
      year,
      month,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Schedule automatic generation (to be called daily)
 * This function should be called once per day at end of day
 */
export async function scheduleAutomaticGeneration(): Promise<void> {
  console.log('[AUTOMATION] Checking if automatic generation should run...');
  
  // Check if today is last day of month
  if (!isLastDayOfMonth()) {
    console.log('[AUTOMATION] Not last day of month, skipping');
    return;
  }
  
  // Check if already run today
  const today = new Date().toISOString().split('T')[0];
  const lastRunRef = ref(database, 'automationStatus/monthlyAttendance/lastRun');
  const lastRunSnapshot = await get(lastRunRef);
  
  if (lastRunSnapshot.exists()) {
    const lastRun = lastRunSnapshot.val();
    if (lastRun === today) {
      console.log('[AUTOMATION] Already run today, skipping');
      return;
    }
  }
  
  // Run automatic generation
  await automaticMonthlyGeneration();
  
  // Update last run date
  await set(lastRunRef, today);
}

/**
 * Get automation logs (for admin/teacher review)
 */
export async function getAutomationLogs(limit: number = 50): Promise<AutomationLog[]> {
  try {
    const logsRef = ref(database, 'automationLogs/monthlyAttendance');
    const snapshot = await get(logsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const logs: AutomationLog[] = [];
    const logsData = snapshot.val();
    
    // Convert to array and sort by timestamp (newest first)
    for (const [key, value] of Object.entries(logsData)) {
      logs.push(value as AutomationLog);
    }
    
    logs.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    return logs.slice(0, limit);
  } catch (error) {
    console.error('[AUTOMATION] Error fetching logs:', error);
    return [];
  }
}

/**
 * Update automation configuration
 */
export async function updateAutomationConfig(
  config: Partial<AutomationConfig>
): Promise<void> {
  try {
    const currentConfig = await getAutomationConfig();
    const updatedConfig = { ...currentConfig, ...config };
    
    const configRef = ref(database, 'automationConfig/monthlyAttendance');
    await set(configRef, updatedConfig);
    
    console.log('[AUTOMATION] Configuration updated:', updatedConfig);
  } catch (error) {
    console.error('[AUTOMATION] Error updating config:', error);
    throw error;
  }
}

/**
 * Get all subjects that need monthly calculation
 * Useful for manual bulk generation
 */
export async function getSubjectsNeedingCalculation(
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
  console.log(`[AUTOMATION] Finding subjects needing calculation for ${month}/${year}`);
  
  const lecturesRef = ref(database, 'lectures');
  const snapshot = await get(lecturesRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const allLectures = snapshot.val();
  const subjectsMap = new Map<
    string,
    { subject: string; semester: number; division: string; count: number }
  >();
  
  // Find all unique combinations
  for (const lectureData of Object.values(allLectures)) {
    const lecture = lectureData as any;
    const lectureDate = new Date(lecture.timestamp || lecture.date);
    
    if (
      lectureDate.getFullYear() === year &&
      lectureDate.getMonth() + 1 === month
    ) {
      const key = `${lecture.subject}|${lecture.semester}|${lecture.division || 'all'}`;
      
      if (!subjectsMap.has(key)) {
        subjectsMap.set(key, {
          subject: lecture.subject,
          semester: parseInt(lecture.semester),
          division: lecture.division || 'all',
          count: 0,
        });
      }
      
      const current = subjectsMap.get(key)!;
      current.count += 1;
      subjectsMap.set(key, current);
    }
  }
  
  // Filter out subjects that already have calculations
  const needsCalculation: Array<{
    subject: string;
    semester: number;
    division: string;
    lectureCount: number;
  }> = [];
  
  for (const [key, value] of subjectsMap.entries()) {
    const exists = await monthlyDataExists({
      year,
      month,
      subject: value.subject,
      semester: value.semester,
      division: value.division === 'all' ? undefined : value.division,
    });
    
    if (!exists) {
      needsCalculation.push({
        subject: value.subject,
        semester: value.semester,
        division: value.division,
        lectureCount: value.count,
      });
    }
  }
  
  console.log(`[AUTOMATION] Found ${needsCalculation.length} subjects needing calculation`);
  
  return needsCalculation;
}

/**
 * Batch generate for multiple subjects (manual bulk operation)
 */
export async function batchGenerateMonthlyAttendance(
  year: number,
  month: number,
  subjects?: Array<{
    subject: string;
    semester: number;
    division?: string;
  }>
): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    subject: string;
    semester: number;
    division?: string;
    success: boolean;
    message: string;
  }>;
}> {
  console.log('[AUTOMATION] Starting batch generation');
  
  let targetSubjects = subjects;
  
  // If no subjects provided, find all that need calculation
  if (!targetSubjects) {
    const needsCalc = await getSubjectsNeedingCalculation(year, month);
    targetSubjects = needsCalc.map(s => ({
      subject: s.subject,
      semester: s.semester,
      division: s.division === 'all' ? undefined : s.division,
    }));
  }
  
  if (targetSubjects.length === 0) {
    return {
      success: true,
      processed: 0,
      failed: 0,
      results: [],
    };
  }
  
  const results: Array<{
    subject: string;
    semester: number;
    division?: string;
    success: boolean;
    message: string;
  }> = [];
  
  let processed = 0;
  let failed = 0;
  
  // Process each subject
  for (const subj of targetSubjects) {
    console.log(`[AUTOMATION] Processing: ${subj.subject} Sem${subj.semester}`);
    
    const result = await manualGenerateMonthlyAttendance(
      {
        year,
        month,
        subject: subj.subject,
        semester: subj.semester,
        division: subj.division,
      },
      false // Don't force regenerate
    );
    
    results.push({
      subject: subj.subject,
      semester: subj.semester,
      division: subj.division,
      success: result.success,
      message: result.message,
    });
    
    if (result.success) {
      processed++;
    } else {
      failed++;
    }
    
    // Small delay to avoid overwhelming Firebase
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('[AUTOMATION] Batch generation complete');
  console.log('  - Processed:', processed);
  console.log('  - Failed:', failed);
  
  return {
    success: true,
    processed,
    failed,
    results,
  };
}
