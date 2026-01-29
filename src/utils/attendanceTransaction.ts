/**
 * Transaction-Safe Attendance Writer
 * Ensures atomic, idempotent, and concurrent-safe attendance writes
 * Prevents duplicate scans and race conditions
 * 
 * CRITICAL FIX: Prevents double attendance under high concurrency
 */

import { database } from '../config/firebase';
import { ref, get, set, runTransaction, serverTimestamp } from 'firebase/database';

export interface AttendanceWriteResult {
  success: boolean;
  reason?: string;
  isDuplicate?: boolean;
  timestamp?: number;
  existingRecord?: any;
}

export interface AttendanceExistsResult {
  exists: boolean;
  data?: any;
}

/**
 * Check if attendance already exists for a student in a lecture
 * Used for pre-validation before attempting to write
 */
export async function checkAttendanceExists(
  lectureId: string,
  studentId: string
): Promise<AttendanceExistsResult> {
  try {
    const attendanceRef = ref(
      database,
      `lectures/${lectureId}/students/${studentId}`
    );
    
    const snapshot = await get(attendanceRef);
    
    if (snapshot.exists()) {
      return {
        exists: true,
        data: snapshot.val(),
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('[ATTENDANCE_CHECK] Error checking attendance:', error);
    // On error, assume doesn't exist to allow retry
    return { exists: false };
  }
}

/**
 * CRITICAL FIX: Write attendance using Firebase transaction for atomicity
 * Guarantees exactly-once semantics even under high concurrency
 * 
 * THIS IS THE MAIN FIX FOR DUPLICATE ATTENDANCE BUG
 */
export async function writeAttendanceTransaction(
  lectureId: string,
  studentId: string,
  attendanceData: any
): Promise<AttendanceWriteResult> {
  const attendanceRef = ref(
    database,
    `lectures/${lectureId}/students/${studentId}`
  );

  try {
    console.log('[TRANSACTION] Starting atomic attendance write');
    console.log('  Lecture:', lectureId);
    console.log('  Student:', studentId);

    // STEP 1: Pre-check (fast fail for obvious duplicates)
    // This saves a transaction if attendance clearly exists
    const preCheck = await get(attendanceRef);
    if (preCheck.exists()) {
      const existing = preCheck.val();
      console.warn('[TRANSACTION] ⚠️ Duplicate detected in pre-check');
      
      // Log duplicate attempt
      await logDuplicateAttempt(lectureId, studentId, 'PRE_CHECK_DUPLICATE');
      
      return {
        success: false,
        reason: 'DUPLICATE_SCAN',
        isDuplicate: true,
        timestamp: existing.scanTime,
        existingRecord: existing,
      };
    }

    // STEP 2: Atomic transaction (handles race conditions)
    const result = await runTransaction(attendanceRef, (currentData) => {
      // CRITICAL: Check if data already exists
      if (currentData !== null) {
        // Attendance already marked by another request
        // ABORT transaction by returning undefined
        console.log('[TRANSACTION] ⚠️ Race condition detected - aborting');
        return; // undefined = abort
      }

      // No existing data - safe to write
      console.log('[TRANSACTION] ✅ Writing new attendance record');
      return {
        ...attendanceData,
        transactionTimestamp: Date.now(),
        // Use server timestamp for extra accuracy
        serverTimestamp: serverTimestamp(),
      };
    });

    // STEP 3: Check transaction result
    if (!result.committed) {
      // Transaction aborted - attendance already exists
      console.warn('[TRANSACTION] ❌ Transaction aborted - duplicate attendance');

      // Get existing record for details
      const existing = await get(attendanceRef);
      const existingData = existing.val();

      // Log duplicate attempt
      await logDuplicateAttempt(lectureId, studentId, 'TRANSACTION_ABORTED');

      return {
        success: false,
        reason: 'DUPLICATE_SCAN',
        isDuplicate: true,
        timestamp: existingData?.scanTime || Date.now(),
        existingRecord: existingData,
      };
    }

    // STEP 4: Success - attendance written
    console.log('[TRANSACTION] ✅ Attendance written successfully');
    console.log('  Timestamp:', attendanceData.scanTime);

    return {
      success: true,
      timestamp: attendanceData.scanTime,
    };
  } catch (error: any) {
    console.error('[TRANSACTION] ❌ Critical error:', error);

    // On error, check if attendance exists anyway
    // (Could have succeeded despite error)
    try {
      const finalCheck = await get(attendanceRef);
      if (finalCheck.exists()) {
        console.log('[TRANSACTION] ℹ️ Attendance exists despite error');
        return {
          success: true, // Treat as success (idempotent)
          timestamp: finalCheck.val().scanTime,
        };
      }
    } catch (checkError) {
      console.error('[TRANSACTION] Error during final check:', checkError);
    }

    return {
      success: false,
      reason: error.message || 'TRANSACTION_ERROR',
    };
  }
}

/**
 * CRITICAL: Log duplicate scan attempts for security monitoring
 */
async function logDuplicateAttempt(
  lectureId: string,
  studentId: string,
  reason: string
): Promise<void> {
  try {
    const logRef = ref(
      database,
      `securityLogs/duplicateScanAttempts/${lectureId}/${studentId}/${Date.now()}`
    );

    await set(logRef, {
      lectureId,
      studentId,
      timestamp: Date.now(),
      reason,
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    console.log('[SECURITY] Duplicate attempt logged:', reason);
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('[SECURITY] Failed to log duplicate attempt:', error);
  }
}

/**
 * Verify transaction integrity (debugging utility)
 */
export async function verifyTransactionIntegrity(lectureId: string): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    const lectureRef = ref(database, `lectures/${lectureId}/students`);
    const snapshot = await get(lectureRef);
    
    if (!snapshot.exists()) {
      return { isValid: true, issues: [] };
    }
    
    const students = snapshot.val();
    const studentIds = Object.keys(students);
    
    // Check for duplicates (shouldn't happen with transactions)
    const duplicates = studentIds.filter((id, index) => 
      studentIds.indexOf(id) !== index
    );
    
    if (duplicates.length > 0) {
      issues.push(`Duplicate student IDs found: ${duplicates.join(', ')}`);
    }
    
    // Check for missing timestamps
    for (const [studentId, data] of Object.entries(students)) {
      const studentData = data as any;
      if (!studentData.transactionTimestamp) {
        issues.push(`Missing transactionTimestamp for student ${studentId}`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
    };
  } catch (error: any) {
    issues.push(`Error checking integrity: ${error.message}`);
    return { isValid: false, issues };
  }
}