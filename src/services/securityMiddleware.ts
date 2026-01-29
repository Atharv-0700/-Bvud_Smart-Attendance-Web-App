/**
 * Security Middleware - Central Security Layer
 * Orchestrates all security checks for attendance marking
 * NO UI changes - operates as background validation layer
 */

import {
  generateFingerprint,
  verifyDeviceBinding,
  bindDeviceToUser,
} from '../utils/deviceFingerprint';

import {
  validateLocationForAttendance,
  getCurrentLocationHighAccuracy,
  validateClassroomLocation,
} from '../utils/locationValidator';

import {
  markAttendancePending,
  AttendanceStatus,
} from '../utils/stayVerification';

import {
  performLivenessCheck,
  performQuickLivenessCheck,
  LivenessResult,
} from '../utils/faceLiveness';

import {
  calculateConfidenceScore,
  createConfidenceFactors,
  ConfidenceScore,
} from '../utils/confidenceScore';

import {
  writeAttendanceTransaction,
  checkAttendanceExists,
} from '../utils/attendanceTransaction';

import {
  saveAttendanceOffline,
  isOnline,
  syncOfflineAttendance,
  startAutoSync,
  stopAutoSync,
} from '../utils/offlineSync';

import { database, auth } from '../config/firebase';
import { ref, get } from 'firebase/database';

export interface AttendanceRequest {
  lectureId: string;
  studentId: string;
  studentName: string;
  qrData: any;
  videoElement?: HTMLVideoElement;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
  requiresManualReview?: boolean;
  confidenceScore?: ConfidenceScore;
  offlineMode?: boolean;
  debugInfo?: any;
}

/**
 * Main security middleware - validates all checks before marking attendance
 * This is the SINGLE ENTRY POINT for all attendance marking
 */
export async function validateAndMarkAttendance(
  request: AttendanceRequest
): Promise<AttendanceResponse> {
  const startTime = Date.now();
  console.log('');
  console.log('='.repeat(60));
  console.log('[SECURITY MIDDLEWARE] Starting attendance validation');
  console.log('Student:', request.studentName);
  console.log('Lecture:', request.lectureId);
  console.log('='.repeat(60));

  try {
    // ============================================
    // STEP 1: Pre-checks
    // ============================================
    console.log('[STEP 1] Pre-checks');

    // Check if online
    const online = isOnline();
    console.log('  ✓ Online status:', online);

    // Check user authentication
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== request.studentId) {
      console.log('  ✗ Authentication failed');
      return {
        success: false,
        message: 'Authentication failed. Please login again.',
      };
    }
    console.log('  ✓ User authenticated');

    // Check for duplicate scan
    const duplicateCheck = await checkAttendanceExists(
      request.lectureId,
      request.studentId
    );

    if (duplicateCheck.exists) {
      console.log('  ✗ Duplicate scan detected');
      const existingTime = new Date(duplicateCheck.data.scanTime).toLocaleTimeString();
      return {
        success: false,
        message: `You already marked attendance for this lecture at ${existingTime}.`,
      };
    }
    console.log('  ✓ No duplicate scan');

    // Verify QR code validity
    const qrValid = await verifyQRCode(request.qrData);
    if (!qrValid.valid) {
      console.log('  ✗ QR code invalid:', qrValid.reason);
      return {
        success: false,
        message: qrValid.message || 'QR code is invalid or expired.',
      };
    }
    console.log('  ✓ QR code valid');

    // ============================================
    // STEP 2: Device binding verification
    // ============================================
    console.log('[STEP 2] Device binding verification');

    const deviceCheck = await verifyDeviceBinding(request.studentId);

    if (!deviceCheck.verified) {
      console.log('  ✗ Device mismatch detected');
      console.log('  ! SECURITY VIOLATION - Logging event');

      // Log security event
      await logSecurityViolation(request.studentId, 'DEVICE_MISMATCH', {
        lectureId: request.lectureId,
        expectedDevice: 'stored_fingerprint',
        actualDevice: generateFingerprint(),
      });

      return {
        success: false,
        message: 'Access denied. You can only mark attendance from your registered device.',
      };
    }
    console.log('  ✓ Device verified');

    // ============================================
    // STEP 3: Location validation (classroom-level)
    // ============================================
    console.log('[STEP 3] Location validation');

    let locationValidation;
    try {
      const locationResult = await validateLocationForAttendance();

      if (!locationResult.valid) {
        console.log('  ✗ Location validation failed');
        return {
          success: false,
          message: locationResult.message || 'You must be in the classroom to mark attendance.',
        };
      }

      locationValidation = locationResult.validationResult!;
      console.log('  ✓ Location verified');
      console.log('    - Distance:', locationValidation.distance, 'm');
      console.log('    - Accuracy:', locationValidation.accuracy, 'm');
      console.log('    - Classroom:', locationValidation.nearestClassroom?.name);
    } catch (error: any) {
      console.log('  ✗ Location check failed:', error.message);
      return {
        success: false,
        message: 'Unable to verify your location. Please enable GPS.',
      };
    }

    // ============================================
    // STEP 4: Liveness detection (if camera available)
    // ============================================
    console.log('[STEP 4] Liveness detection');

    let livenessResult: LivenessResult = {
      isLive: true,
      confidence: 1.0,
      reason: 'SKIPPED',
      detectionTime: 0,
    };

    if (request.videoElement) {
      try {
        // Perform quick liveness check (don't block attendance for this)
        livenessResult = await performQuickLivenessCheck(request.videoElement);

        if (!livenessResult.isLive) {
          console.log('  ! Liveness check failed (low confidence)');
          console.log('    - Confidence:', livenessResult.confidence);
          // Don't block attendance, but log for review
        } else {
          console.log('  ✓ Liveness verified');
          console.log('    - Confidence:', livenessResult.confidence);
        }
      } catch (error) {
        console.log('  ! Liveness check error (allowing attendance)');
        livenessResult = {
          isLive: true,
          confidence: 0,
          reason: 'ERROR',
          detectionTime: 0,
        };
      }
    } else {
      console.log('  ! Camera not available (skipping liveness check)');
    }

    // ============================================
    // STEP 5: Calculate confidence score
    // ============================================
    console.log('[STEP 5] Confidence score calculation');

    const scanTime = Date.now();
    const confidenceFactors = createConfidenceFactors({
      deviceMatch: deviceCheck.verified,
      locationValidation,
      stayVerified: false, // Will be verified later
      livenessResult,
      qrExpiry: request.qrData.expiryTime,
      scanTime,
    });

    const confidenceScore = calculateConfidenceScore(confidenceFactors);

    console.log('  ✓ Confidence score:', confidenceScore.score, '/ 100');
    console.log('    - Level:', confidenceScore.level);
    console.log('    - Flags:', confidenceScore.flags.length);

    // ============================================
    // STEP 6: Prepare attendance data
    // ============================================
    console.log('[STEP 6] Preparing attendance data');

    const attendanceData = {
      studentId: request.studentId,
      studentName: request.studentName,
      lectureId: request.lectureId,
      scanTime,
      status: 'PENDING' as AttendanceStatus,
      initialLocation: {
        latitude: locationValidation.nearestClassroom?.latitude || 0,
        longitude: locationValidation.nearestClassroom?.longitude || 0,
        accuracy: locationValidation.accuracy,
        distance: locationValidation.distance,
        nearestClassroom: locationValidation.nearestClassroom?.name,
      },
      deviceInfo: {
        fingerprint: generateFingerprint(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
      livenessCheck: {
        performed: request.videoElement !== undefined,
        passed: livenessResult.isLive,
        confidence: livenessResult.confidence,
      },
      confidenceScore: {
        score: confidenceScore.score,
        level: confidenceScore.level,
        flags: confidenceScore.flags,
      },
      verificationScheduledAt: scanTime + 10 * 60 * 1000, // +10 minutes
    };

    console.log('  ✓ Attendance data prepared');

    // ============================================
    // STEP 7: Write attendance (online or offline)
    // ============================================
    console.log('[STEP 7] Writing attendance');

    if (online) {
      // Write using transaction
      const writeResult = await writeAttendanceTransaction(
        request.lectureId,
        request.studentId,
        attendanceData
      );

      if (!writeResult.success) {
        console.log('  ✗ Write failed:', writeResult.reason);
        return {
          success: false,
          message: 'Failed to mark attendance. Please try again.',
        };
      }

      console.log('  ✓ Attendance written to Firebase');

      // Schedule stay verification
      scheduleStayVerification(request.lectureId, request.studentId);

      // Trigger background sync for any pending offline records
      syncOfflineAttendance();
    } else {
      // Save offline
      const offlineId = saveAttendanceOffline(
        request.lectureId,
        request.studentId,
        attendanceData
      );

      console.log('  ✓ Attendance saved offline:', offlineId);
    }

    // ============================================
    // STEP 8: Generate response
    // ============================================
    const processingTime = Date.now() - startTime;

    console.log('[STEP 8] Attendance marked successfully');
    console.log('  - Processing time:', processingTime, 'ms');
    console.log('  - Confidence:', confidenceScore.level);
    console.log('  - Status: PENDING (awaiting stay verification)');
    console.log('='.repeat(60));
    console.log('');

    return {
      success: true,
      message: online
        ? 'Attendance marked successfully!'
        : 'Attendance saved offline. Will sync when online.',
      requiresManualReview: confidenceScore.level === 'LOW' || confidenceScore.level === 'VERY_LOW',
      confidenceScore,
      offlineMode: !online,
      debugInfo: {
        processingTime,
        deviceVerified: true,
        locationDistance: locationValidation.distance,
        livenessConfidence: livenessResult.confidence,
      },
    };
  } catch (error: any) {
    console.error('[SECURITY MIDDLEWARE] Critical error:', error);
    console.log('='.repeat(60));
    console.log('');

    return {
      success: false,
      message: 'An error occurred while marking attendance. Please try again.',
    };
  }
}

/**
 * Verify QR code validity
 */
async function verifyQRCode(qrData: any): Promise<{
  valid: boolean;
  reason?: string;
  message?: string;
}> {
  try {
    // Check if QR has required fields
    if (!qrData.lectureId || !qrData.expiryTime) {
      return {
        valid: false,
        reason: 'INVALID_QR_FORMAT',
        message: 'Invalid QR code format.',
      };
    }

    // Check if QR is expired
    const now = Date.now();
    if (now > qrData.expiryTime) {
      return {
        valid: false,
        reason: 'QR_EXPIRED',
        message: 'QR code has expired. Please ask teacher to generate a new one.',
      };
    }

    // Verify lecture exists in database
    const lectureRef = ref(database, `lectures/${qrData.lectureId}`);
    const lectureSnapshot = await get(lectureRef);

    if (!lectureSnapshot.exists()) {
      return {
        valid: false,
        reason: 'LECTURE_NOT_FOUND',
        message: 'Lecture not found.',
      };
    }

    const lecture = lectureSnapshot.val();

    // Check if lecture is still active
    if (lecture.status !== 'active') {
      return {
        valid: false,
        reason: 'LECTURE_ENDED',
        message: 'This lecture has ended.',
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('[QR VERIFY] Error:', error);
    return {
      valid: false,
      reason: 'VERIFICATION_ERROR',
      message: 'Failed to verify QR code.',
    };
  }
}

/**
 * Schedule stay verification for later
 */
function scheduleStayVerification(lectureId: string, studentId: string): void {
  const DELAY_MS = 10 * 60 * 1000; // 10 minutes

  console.log('[STAY_VERIFY] Scheduled for', studentId, 'in 10 minutes');

  setTimeout(async () => {
    console.log('[STAY_VERIFY] Performing verification for', studentId);

    try {
      // Re-check location
      const location = await getCurrentLocationHighAccuracy();
      const validation = validateClassroomLocation(
        location.latitude,
        location.longitude,
        location.accuracy
      );

      // Update attendance status
      const status = validation.isValid ? 'CONFIRMED' : 'INVALIDATED';

      const attendanceRef = ref(
        database,
        `lectures/${lectureId}/students/${studentId}`
      );

      const { update } = await import('firebase/database');
      await update(attendanceRef, {
        status,
        verificationLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: Date.now(),
        },
        verificationCompletedAt: Date.now(),
      });

      console.log('[STAY_VERIFY] Status updated to:', status);
    } catch (error) {
      console.error('[STAY_VERIFY] Error during verification:', error);

      // Mark as failed verification
      const attendanceRef = ref(
        database,
        `lectures/${lectureId}/students/${studentId}`
      );

      const { update } = await import('firebase/database');
      await update(attendanceRef, {
        status: 'FAILED_VERIFICATION',
        verificationError: error instanceof Error ? error.message : 'UNKNOWN',
        verificationCompletedAt: Date.now(),
      });
    }
  }, DELAY_MS);
}

/**
 * Log security violation
 */
async function logSecurityViolation(
  userId: string,
  violationType: string,
  details: any
): Promise<void> {
  try {
    const logRef = ref(database, `securityViolations/${userId}/${Date.now()}`);
    const { set } = await import('firebase/database');

    await set(logRef, {
      userId,
      violationType,
      timestamp: Date.now(),
      details,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    });

    console.log('[SECURITY] Violation logged:', violationType);
  } catch (error) {
    console.error('[SECURITY] Error logging violation:', error);
  }
}

/**
 * Initialize security middleware
 * Call this on app startup
 */
export function initializeSecurityMiddleware(): void {
  console.log('[SECURITY MIDDLEWARE] Initializing...');

  // Start offline sync
  startAutoSync();

  console.log('[SECURITY MIDDLEWARE] Initialized successfully');
}

/**
 * Cleanup on app shutdown
 */
export function cleanupSecurityMiddleware(): void {
  stopAutoSync();

  console.log('[SECURITY MIDDLEWARE] Cleaned up');
}