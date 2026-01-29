/**
 * Stay Verification System
 * Prevents "scan and run" by re-validating location after delay
 * Attendance starts as PENDING, becomes CONFIRMED after stay verification
 */

import { database } from '../config/firebase';
import { ref, get, set, update } from 'firebase/database';
import { validateClassroomLocation, getCurrentLocationHighAccuracy } from './locationValidator';

export type AttendanceStatus = 'PENDING' | 'CONFIRMED' | 'INVALIDATED' | 'FAILED_VERIFICATION';

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  lectureId: string;
  scanTime: number;
  status: AttendanceStatus;
  initialLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    nearestClassroom?: string;
  };
  verificationLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  verificationScheduledAt?: number;
  verificationCompletedAt?: number;
}

/**
 * Configuration for stay verification
 */
const STAY_VERIFICATION_CONFIG = {
  DELAY_MINUTES: 10, // Re-check location after 10 minutes
  ENABLED: true,
  MAX_RETRIES: 2,
};

/**
 * Mark attendance as PENDING and schedule verification
 * This replaces the immediate "CONFIRMED" status
 */
export async function markAttendancePending(
  lectureId: string,
  studentId: string,
  studentName: string,
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    nearestClassroom?: string;
  }
): Promise<void> {
  const attendanceRef = ref(
    database,
    `lectures/${lectureId}/students/${studentId}`
  );

  const record: AttendanceRecord = {
    studentId,
    studentName,
    lectureId,
    scanTime: Date.now(),
    status: 'PENDING',
    initialLocation: location,
    verificationScheduledAt: Date.now() + STAY_VERIFICATION_CONFIG.DELAY_MINUTES * 60 * 1000,
  };

  await set(attendanceRef, record);
  console.log('[STAY_VERIFY] Attendance marked as PENDING for student:', studentId);

  // Schedule verification
  if (STAY_VERIFICATION_CONFIG.ENABLED) {
    scheduleStayVerification(lectureId, studentId);
  }
}

/**
 * Schedule stay verification after delay
 * Uses setTimeout in browser (for production, use Firebase Cloud Functions)
 */
function scheduleStayVerification(lectureId: string, studentId: string): void {
  const delayMs = STAY_VERIFICATION_CONFIG.DELAY_MINUTES * 60 * 1000;

  console.log(
    `[STAY_VERIFY] Scheduled verification in ${STAY_VERIFICATION_CONFIG.DELAY_MINUTES} minutes for student:`,
    studentId
  );

  setTimeout(() => {
    performStayVerification(lectureId, studentId);
  }, delayMs);
}

/**
 * Perform stay verification - re-check student location
 */
async function performStayVerification(
  lectureId: string,
  studentId: string
): Promise<void> {
  try {
    console.log('[STAY_VERIFY] Performing verification for student:', studentId);

    const attendanceRef = ref(
      database,
      `lectures/${lectureId}/students/${studentId}`
    );
    const snapshot = await get(attendanceRef);

    if (!snapshot.exists()) {
      console.log('[STAY_VERIFY] Attendance record not found');
      return;
    }

    const record: AttendanceRecord = snapshot.val();

    // Only verify if still pending
    if (record.status !== 'PENDING') {
      console.log('[STAY_VERIFY] Attendance already verified or invalidated');
      return;
    }

    // Get current location (silently, no user interaction)
    const currentLocation = await getCurrentLocationHighAccuracy();
    const validation = validateClassroomLocation(
      currentLocation.latitude,
      currentLocation.longitude,
      currentLocation.accuracy
    );

    const verificationData = {
      verificationLocation: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        timestamp: Date.now(),
      },
      verificationCompletedAt: Date.now(),
    };

    if (validation.isValid) {
      // Student still in classroom - CONFIRM attendance
      await update(attendanceRef, {
        ...verificationData,
        status: 'CONFIRMED',
      });

      console.log('[STAY_VERIFY] ✅ Attendance CONFIRMED for student:', studentId);
    } else {
      // Student left classroom - INVALIDATE attendance
      await update(attendanceRef, {
        ...verificationData,
        status: 'INVALIDATED',
      });

      console.log(
        '[STAY_VERIFY] ❌ Attendance INVALIDATED for student:',
        studentId,
        '- Distance:',
        validation.distance,
        'm'
      );

      // Log security event
      await logStayVerificationFailure(lectureId, studentId, validation);
    }
  } catch (error) {
    console.error('[STAY_VERIFY] Error during verification:', error);

    // On error (e.g., location permission removed), mark as FAILED_VERIFICATION
    const attendanceRef = ref(
      database,
      `lectures/${lectureId}/students/${studentId}`
    );

    await update(attendanceRef, {
      status: 'FAILED_VERIFICATION',
      verificationCompletedAt: Date.now(),
      verificationError: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    });
  }
}

/**
 * Log stay verification failures for audit
 */
async function logStayVerificationFailure(
  lectureId: string,
  studentId: string,
  validation: any
): Promise<void> {
  const logRef = ref(
    database,
    `stayVerificationLogs/${lectureId}/${studentId}/${Date.now()}`
  );

  await set(logRef, {
    studentId,
    lectureId,
    timestamp: Date.now(),
    reason: 'LEFT_CLASSROOM',
    distance: validation.distance,
    nearestClassroom: validation.nearestClassroom?.name,
  });
}

/**
 * Check if stay verification is complete for an attendance record
 */
export async function isStayVerificationComplete(
  lectureId: string,
  studentId: string
): Promise<{
  complete: boolean;
  status?: AttendanceStatus;
}> {
  const attendanceRef = ref(
    database,
    `lectures/${lectureId}/students/${studentId}`
  );
  const snapshot = await get(attendanceRef);

  if (!snapshot.exists()) {
    return { complete: false };
  }

  const record: AttendanceRecord = snapshot.val();

  if (record.status === 'CONFIRMED' || record.status === 'INVALIDATED') {
    return { complete: true, status: record.status };
  }

  return { complete: false, status: record.status };
}

/**
 * Get attendance records filtered by status
 * Teachers can use this to see only CONFIRMED attendance
 */
export async function getConfirmedAttendance(lectureId: string): Promise<any[]> {
  const lectureRef = ref(database, `lectures/${lectureId}/students`);
  const snapshot = await get(lectureRef);

  if (!snapshot.exists()) {
    return [];
  }

  const allStudents = snapshot.val();
  const confirmed = [];

  for (const [studentId, data] of Object.entries(allStudents)) {
    const record = data as AttendanceRecord;
    if (record.status === 'CONFIRMED') {
      confirmed.push(record);
    }
  }

  return confirmed;
}

/**
 * Get pending verifications count
 */
export async function getPendingVerificationsCount(lectureId: string): Promise<number> {
  const lectureRef = ref(database, `lectures/${lectureId}/students`);
  const snapshot = await get(lectureRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const allStudents = snapshot.val();
  let count = 0;

  for (const data of Object.values(allStudents)) {
    const record = data as AttendanceRecord;
    if (record.status === 'PENDING') {
      count++;
    }
  }

  return count;
}

/**
 * Manual verification trigger (for admin/teacher override)
 */
export async function manuallyConfirmAttendance(
  lectureId: string,
  studentId: string,
  reason: string
): Promise<void> {
  const attendanceRef = ref(
    database,
    `lectures/${lectureId}/students/${studentId}`
  );

  await update(attendanceRef, {
    status: 'CONFIRMED',
    manuallyConfirmed: true,
    manualConfirmationReason: reason,
    manualConfirmationTimestamp: Date.now(),
  });

  console.log('[STAY_VERIFY] Manually confirmed attendance for student:', studentId);
}

/**
 * Export configuration (for testing/debugging)
 */
export function getStayVerificationConfig() {
  return { ...STAY_VERIFICATION_CONFIG };
}

/**
 * Update configuration (for admin panel)
 */
export function updateStayVerificationConfig(config: Partial<typeof STAY_VERIFICATION_CONFIG>) {
  Object.assign(STAY_VERIFICATION_CONFIG, config);
  console.log('[STAY_VERIFY] Configuration updated:', STAY_VERIFICATION_CONFIG);
}
