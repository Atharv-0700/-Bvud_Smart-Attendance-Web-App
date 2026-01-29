/**
 * Offline Support & Sync Manager
 * Handles offline attendance storage and automatic synchronization
 * Ensures no data loss during network issues
 */

import { database } from '../config/firebase';
import { ref, set } from 'firebase/database';
import { writeAttendanceTransaction } from './attendanceTransaction';

export interface OfflineAttendanceRecord {
  id: string;
  lectureId: string;
  studentId: string;
  data: any;
  timestamp: number;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  lastSyncAttempt?: number;
  syncError?: string;
}

const OFFLINE_STORAGE_KEY = 'smart_attendance_offline_queue';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000; // 5 seconds
const SYNC_INTERVAL_MS = 10000; // Check for sync every 10 seconds

/**
 * Save attendance to local storage when offline
 */
export function saveAttendanceOffline(
  lectureId: string,
  studentId: string,
  attendanceData: any
): string {
  const record: OfflineAttendanceRecord = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    lectureId,
    studentId,
    data: attendanceData,
    timestamp: Date.now(),
    syncStatus: 'PENDING',
    retryCount: 0,
  };

  const queue = getOfflineQueue();
  queue.push(record);
  saveOfflineQueue(queue);

  console.log('[OFFLINE] Attendance saved offline:', record.id);

  return record.id;
}

/**
 * Get all offline attendance records
 */
function getOfflineQueue(): OfflineAttendanceRecord[] {
  try {
    const data = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (!data) return [];

    return JSON.parse(data);
  } catch (error) {
    console.error('[OFFLINE] Error reading offline queue:', error);
    return [];
  }
}

/**
 * Save offline queue to local storage
 */
function saveOfflineQueue(queue: OfflineAttendanceRecord[]): void {
  try {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[OFFLINE] Error saving offline queue:', error);
  }
}

/**
 * Remove record from offline queue
 */
function removeFromOfflineQueue(recordId: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter((record) => record.id !== recordId);
  saveOfflineQueue(filtered);
}

/**
 * Update record status in offline queue
 */
function updateOfflineRecordStatus(
  recordId: string,
  updates: Partial<OfflineAttendanceRecord>
): void {
  const queue = getOfflineQueue();
  const index = queue.findIndex((record) => record.id === recordId);

  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    saveOfflineQueue(queue);
  }
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Sync all offline attendance records to Firebase
 */
export async function syncOfflineAttendance(): Promise<{
  syncedCount: number;
  failedCount: number;
  pendingCount: number;
}> {
  if (!isOnline()) {
    console.log('[OFFLINE] Device is offline - skipping sync');
    return { syncedCount: 0, failedCount: 0, pendingCount: 0 };
  }

  const queue = getOfflineQueue();
  const pendingRecords = queue.filter(
    (record) =>
      record.syncStatus === 'PENDING' && record.retryCount < MAX_RETRY_ATTEMPTS
  );

  if (pendingRecords.length === 0) {
    console.log('[OFFLINE] No pending records to sync');
    return { syncedCount: 0, failedCount: 0, pendingCount: 0 };
  }

  console.log('[OFFLINE] Starting sync for', pendingRecords.length, 'records');

  let syncedCount = 0;
  let failedCount = 0;

  for (const record of pendingRecords) {
    try {
      // Update status to SYNCING
      updateOfflineRecordStatus(record.id, {
        syncStatus: 'SYNCING',
        lastSyncAttempt: Date.now(),
      });

      // Attempt to write to Firebase using transaction
      const result = await writeAttendanceTransaction(
        record.lectureId,
        record.studentId,
        record.data
      );

      if (result.success) {
        // Sync successful - remove from queue
        console.log('[OFFLINE] Successfully synced record:', record.id);
        removeFromOfflineQueue(record.id);
        syncedCount++;
      } else if (result.isDuplicate) {
        // Duplicate - remove from queue (already synced elsewhere)
        console.log('[OFFLINE] Record already synced:', record.id);
        removeFromOfflineQueue(record.id);
        syncedCount++;
      } else {
        // Sync failed - increment retry count
        console.error('[OFFLINE] Failed to sync record:', record.id, result.reason);

        updateOfflineRecordStatus(record.id, {
          syncStatus: 'FAILED',
          retryCount: record.retryCount + 1,
          syncError: result.reason,
        });

        failedCount++;

        // If max retries reached, mark as permanently failed
        if (record.retryCount + 1 >= MAX_RETRY_ATTEMPTS) {
          console.error('[OFFLINE] Max retries reached for record:', record.id);
          await archiveFailedRecord(record);
          removeFromOfflineQueue(record.id);
        }
      }

      // Small delay between syncs
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error('[OFFLINE] Error syncing record:', record.id, error);

      updateOfflineRecordStatus(record.id, {
        syncStatus: 'FAILED',
        retryCount: record.retryCount + 1,
        syncError: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });

      failedCount++;
    }
  }

  const remainingQueue = getOfflineQueue();
  const pendingCount = remainingQueue.filter(
    (record) => record.syncStatus === 'PENDING' || record.syncStatus === 'FAILED'
  ).length;

  console.log('[OFFLINE] Sync complete:', {
    syncedCount,
    failedCount,
    pendingCount,
  });

  return { syncedCount, failedCount, pendingCount };
}

/**
 * Archive failed record for manual review
 */
async function archiveFailedRecord(record: OfflineAttendanceRecord): Promise<void> {
  try {
    const archiveRef = ref(
      database,
      `failedOfflineSync/${record.id}`
    );

    await set(archiveRef, {
      ...record,
      archivedAt: Date.now(),
      reason: 'MAX_RETRIES_EXCEEDED',
    });

    console.log('[OFFLINE] Archived failed record:', record.id);
  } catch (error) {
    console.error('[OFFLINE] Error archiving failed record:', error);
  }
}

/**
 * Start automatic sync process
 * Checks for pending records and syncs when online
 */
let syncIntervalId: NodeJS.Timeout | null = null;

export function startAutoSync(): void {
  if (syncIntervalId) {
    console.log('[OFFLINE] Auto-sync already running');
    return;
  }

  console.log('[OFFLINE] Starting auto-sync');

  // Initial sync
  syncOfflineAttendance();

  // Periodic sync
  syncIntervalId = setInterval(() => {
    if (isOnline()) {
      syncOfflineAttendance();
    }
  }, SYNC_INTERVAL_MS);

  // Listen for online event
  window.addEventListener('online', handleOnline);

  // Listen for before unload to attempt final sync
  window.addEventListener('beforeunload', handleBeforeUnload);
}

/**
 * Stop automatic sync
 */
export function stopAutoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[OFFLINE] Auto-sync stopped');
  }

  window.removeEventListener('online', handleOnline);
  window.removeEventListener('beforeunload', handleBeforeUnload);
}

/**
 * Handle online event
 */
function handleOnline(): void {
  console.log('[OFFLINE] Device came online - triggering sync');
  syncOfflineAttendance();
}

/**
 * Handle before unload - attempt final sync
 */
function handleBeforeUnload(): void {
  const queue = getOfflineQueue();
  if (queue.length > 0) {
    console.warn('[OFFLINE] Pending records exist, attempting final sync');
    // Note: This may not complete before page closes
    syncOfflineAttendance();
  }
}

/**
 * Get offline queue status
 */
export function getOfflineStatus(): {
  hasPending: boolean;
  pendingCount: number;
  failedCount: number;
  totalCount: number;
} {
  const queue = getOfflineQueue();

  const pendingCount = queue.filter(
    (record) => record.syncStatus === 'PENDING'
  ).length;

  const failedCount = queue.filter(
    (record) => record.syncStatus === 'FAILED'
  ).length;

  return {
    hasPending: pendingCount > 0 || failedCount > 0,
    pendingCount,
    failedCount,
    totalCount: queue.length,
  };
}

/**
 * Clear all synced records from queue
 */
export function clearSyncedRecords(): void {
  const queue = getOfflineQueue();
  const unsyncedRecords = queue.filter(
    (record) => record.syncStatus !== 'SYNCED'
  );
  saveOfflineQueue(unsyncedRecords);

  console.log('[OFFLINE] Cleared synced records');
}

/**
 * Manually retry failed record
 */
export async function retryFailedRecord(recordId: string): Promise<boolean> {
  const queue = getOfflineQueue();
  const record = queue.find((r) => r.id === recordId);

  if (!record) {
    console.error('[OFFLINE] Record not found:', recordId);
    return false;
  }

  if (!isOnline()) {
    console.error('[OFFLINE] Cannot retry - device is offline');
    return false;
  }

  try {
    updateOfflineRecordStatus(recordId, {
      syncStatus: 'SYNCING',
      lastSyncAttempt: Date.now(),
      retryCount: 0, // Reset retry count for manual retry
    });

    const result = await writeAttendanceTransaction(
      record.lectureId,
      record.studentId,
      record.data
    );

    if (result.success || result.isDuplicate) {
      removeFromOfflineQueue(recordId);
      console.log('[OFFLINE] Manual retry successful:', recordId);
      return true;
    } else {
      updateOfflineRecordStatus(recordId, {
        syncStatus: 'FAILED',
        syncError: result.reason,
      });
      console.error('[OFFLINE] Manual retry failed:', recordId);
      return false;
    }
  } catch (error) {
    console.error('[OFFLINE] Error during manual retry:', error);
    updateOfflineRecordStatus(recordId, {
      syncStatus: 'FAILED',
      syncError: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    });
    return false;
  }
}

/**
 * Clear all offline data (use with caution)
 */
export function clearAllOfflineData(): void {
  localStorage.removeItem(OFFLINE_STORAGE_KEY);
  console.log('[OFFLINE] All offline data cleared');
}

/**
 * Export offline queue for backup
 */
export function exportOfflineQueue(): string {
  const queue = getOfflineQueue();
  return JSON.stringify(queue, null, 2);
}

/**
 * Import offline queue from backup
 */
export function importOfflineQueue(jsonData: string): boolean {
  try {
    const queue = JSON.parse(jsonData);
    if (!Array.isArray(queue)) {
      throw new Error('Invalid queue format');
    }

    saveOfflineQueue(queue);
    console.log('[OFFLINE] Imported', queue.length, 'records');
    return true;
  } catch (error) {
    console.error('[OFFLINE] Error importing queue:', error);
    return false;
  }
}
