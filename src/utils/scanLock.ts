/**
 * Client-Side Scan Lock Manager
 * Prevents rapid duplicate QR scans before Firebase responds
 * This is a UX safeguard - main security is at transaction level
 */

interface ScanLock {
  lectureId: string;
  studentId: string;
  lockedAt: number;
  expiresAt: number;
}

// In-memory lock registry
const scanLocks = new Map<string, ScanLock>();

// Lock configuration
const SCAN_LOCK_DURATION_MS = 5000; // 5 seconds
const CLEANUP_INTERVAL_MS = 10000; // Clean up expired locks every 10s

/**
 * Generate unique lock key
 */
function getLockKey(lectureId: string, studentId: string): string {
  return `${lectureId}:${studentId}`;
}

/**
 * CRITICAL: Acquire scan lock to prevent duplicate scans
 * Returns true if lock acquired, false if already locked
 */
export function acquireScanLock(lectureId: string, studentId: string): boolean {
  const lockKey = getLockKey(lectureId, studentId);
  const now = Date.now();

  // Check if lock exists and is still valid
  const existingLock = scanLocks.get(lockKey);
  if (existingLock) {
    if (now < existingLock.expiresAt) {
      console.log('[SCAN_LOCK] ⚠️ Scan blocked - lock active');
      console.log('  Locked at:', new Date(existingLock.lockedAt).toLocaleTimeString());
      console.log('  Expires in:', Math.round((existingLock.expiresAt - now) / 1000), 'seconds');
      return false; // Lock already held
    } else {
      // Lock expired, remove it
      console.log('[SCAN_LOCK] ℹ️ Expired lock removed');
      scanLocks.delete(lockKey);
    }
  }

  // Acquire new lock
  const lock: ScanLock = {
    lectureId,
    studentId,
    lockedAt: now,
    expiresAt: now + SCAN_LOCK_DURATION_MS,
  };

  scanLocks.set(lockKey, lock);
  console.log('[SCAN_LOCK] ✅ Lock acquired');
  console.log('  Duration:', SCAN_LOCK_DURATION_MS / 1000, 'seconds');

  return true;
}

/**
 * Release scan lock (call after successful or failed attendance)
 */
export function releaseScanLock(lectureId: string, studentId: string): void {
  const lockKey = getLockKey(lectureId, studentId);
  const removed = scanLocks.delete(lockKey);

  if (removed) {
    console.log('[SCAN_LOCK] 🔓 Lock released');
  }
}

/**
 * Check if scan is currently locked
 */
export function isScanLocked(lectureId: string, studentId: string): boolean {
  const lockKey = getLockKey(lectureId, studentId);
  const lock = scanLocks.get(lockKey);

  if (!lock) return false;

  const now = Date.now();
  if (now >= lock.expiresAt) {
    // Lock expired
    scanLocks.delete(lockKey);
    return false;
  }

  return true;
}

/**
 * Get remaining lock time in milliseconds
 */
export function getRemainingLockTime(lectureId: string, studentId: string): number {
  const lockKey = getLockKey(lectureId, studentId);
  const lock = scanLocks.get(lockKey);

  if (!lock) return 0;

  const now = Date.now();
  const remaining = lock.expiresAt - now;

  return remaining > 0 ? remaining : 0;
}

/**
 * Force release all locks (use in emergencies only)
 */
export function releaseAllLocks(): void {
  const count = scanLocks.size;
  scanLocks.clear();
  console.log('[SCAN_LOCK] 🔓 All locks released:', count);
}

/**
 * Clean up expired locks periodically
 */
function cleanupExpiredLocks(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, lock] of scanLocks.entries()) {
    if (now >= lock.expiresAt) {
      scanLocks.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log('[SCAN_LOCK] 🧹 Cleaned up', cleanedCount, 'expired locks');
  }
}

/**
 * Start automatic cleanup
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startScanLockCleanup(): void {
  if (cleanupInterval) {
    console.log('[SCAN_LOCK] Cleanup already running');
    return;
  }

  cleanupInterval = setInterval(cleanupExpiredLocks, CLEANUP_INTERVAL_MS);
  console.log('[SCAN_LOCK] Cleanup started');
}

/**
 * Stop automatic cleanup
 */
export function stopScanLockCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[SCAN_LOCK] Cleanup stopped');
  }
}

/**
 * Get current lock status (for debugging)
 */
export function getScanLockStatus(): {
  totalLocks: number;
  activeLocks: number;
  expiredLocks: number;
} {
  const now = Date.now();
  let activeLocks = 0;
  let expiredLocks = 0;

  for (const lock of scanLocks.values()) {
    if (now < lock.expiresAt) {
      activeLocks++;
    } else {
      expiredLocks++;
    }
  }

  return {
    totalLocks: scanLocks.size,
    activeLocks,
    expiredLocks,
  };
}

/**
 * Auto-start cleanup on module load
 */
if (typeof window !== 'undefined') {
  startScanLockCleanup();
}
