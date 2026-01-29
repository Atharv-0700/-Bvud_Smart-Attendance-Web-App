/**
 * Performance Optimization Service
 * Part 8: Performance & Safety for monthly attendance calculations
 * Handles batch processing, caching, and safe operations
 */

import { database } from '../config/firebase';
import { ref, get, set } from 'firebase/database';
import {
  MonthlyAttendanceParams,
  StudentMonthlyAttendance,
} from './monthlyAttendance';

/**
 * Cache for lecture data to avoid repeated database reads
 */
class LectureCache {
  private cache: Map<string, any> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  getCacheKey(params: MonthlyAttendanceParams): string {
    const { year, month, subject, semester, division } = params;
    return `${year}_${month}_${subject}_${semester}_${division || 'all'}`;
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheTimestamps.set(key, Date.now());
  }
  
  get(key: string): any | null {
    const timestamp = this.cacheTimestamps.get(key);
    
    if (!timestamp) {
      return null;
    }
    
    // Check if cache is still valid
    if (Date.now() - timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }
    
    return this.cache.get(key) || null;
  }
  
  clear(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
  
  getSize(): number {
    return this.cache.size;
  }
}

// Global lecture cache instance
const lectureCache = new LectureCache();

/**
 * Batch processor for handling large student datasets
 */
export class BatchProcessor<T> {
  private batchSize: number;
  
  constructor(batchSize: number = 50) {
    this.batchSize = batchSize;
  }
  
  async processBatches<R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];
    const totalBatches = Math.ceil(items.length / this.batchSize);
    
    console.log(`[BATCH] Processing ${items.length} items in ${totalBatches} batches`);
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      
      console.log(`[BATCH] Processing batch ${batchNumber}/${totalBatches}`);
      
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Small delay to avoid overwhelming Firebase
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[BATCH] Completed processing all batches`);
    
    return results;
  }
}

/**
 * Safe database write with retry logic
 */
export async function safeWrite(
  path: string,
  data: any,
  retries: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const dbRef = ref(database, path);
      await set(dbRef, data);
      return true;
    } catch (error) {
      console.error(`[SAFE-WRITE] Attempt ${attempt}/${retries} failed:`, error);
      
      if (attempt === retries) {
        console.error(`[SAFE-WRITE] All attempts failed for path: ${path}`);
        return false;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

/**
 * Safe database read with retry logic
 */
export async function safeRead(
  path: string,
  retries: number = 3
): Promise<any | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const dbRef = ref(database, path);
      const snapshot = await get(dbRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      
      return null;
    } catch (error) {
      console.error(`[SAFE-READ] Attempt ${attempt}/${retries} failed:`, error);
      
      if (attempt === retries) {
        console.error(`[SAFE-READ] All attempts failed for path: ${path}`);
        return null;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

/**
 * Optimized lecture data fetcher with caching
 */
export async function getOptimizedLectureData(
  params: MonthlyAttendanceParams
): Promise<{ lectureIds: string[]; lectures: Map<string, any> }> {
  const cacheKey = lectureCache.getCacheKey(params);
  
  // Check cache first
  const cached = lectureCache.get(cacheKey);
  if (cached) {
    console.log('[CACHE] Using cached lecture data');
    return cached;
  }
  
  console.log('[CACHE] Cache miss, fetching from database');
  
  // Fetch from database
  const lecturesRef = ref(database, 'lectures');
  const snapshot = await get(lecturesRef);
  
  if (!snapshot.exists()) {
    return { lectureIds: [], lectures: new Map() };
  }
  
  const allLectures = snapshot.val();
  const lectureIds: string[] = [];
  const lectures = new Map<string, any>();
  
  const { year, month, subject, semester, division } = params;
  
  // Filter lectures
  for (const [lectureId, lectureData] of Object.entries(allLectures)) {
    const lecture = lectureData as any;
    
    const matchesSubject = lecture.subject === subject;
    const matchesSemester = parseInt(lecture.semester) === semester;
    const matchesDivision = !division || lecture.division === division;
    
    const lectureDate = new Date(lecture.timestamp || lecture.date || lecture.createdAt);
    const matchesMonth =
      lectureDate.getFullYear() === year &&
      lectureDate.getMonth() + 1 === month;
    
    if (matchesSubject && matchesSemester && matchesDivision && matchesMonth) {
      lectureIds.push(lectureId);
      lectures.set(lectureId, lecture);
    }
  }
  
  const result = { lectureIds, lectures };
  
  // Cache the result
  lectureCache.set(cacheKey, result);
  
  return result;
}

/**
 * Clear all caches (call when data is updated)
 */
export function clearAllCaches(): void {
  lectureCache.clear();
  console.log('[CACHE] All caches cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  lectureCache: number;
} {
  return {
    lectureCache: lectureCache.getSize(),
  };
}

/**
 * Validate input parameters
 */
export function validateMonthlyParams(
  params: MonthlyAttendanceParams
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const { year, month, subject, semester, division } = params;
  
  // Validate year
  if (!year || year < 2020 || year > 2100) {
    errors.push('Invalid year (must be between 2020 and 2100)');
  }
  
  // Validate month
  if (!month || month < 1 || month > 12) {
    errors.push('Invalid month (must be between 1 and 12)');
  }
  
  // Validate subject
  if (!subject || subject.trim().length === 0) {
    errors.push('Subject is required');
  }
  
  // Validate semester
  if (!semester || semester < 1 || semester > 6) {
    errors.push('Invalid semester (must be between 1 and 6)');
  }
  
  // Check for future dates
  const now = new Date();
  const targetDate = new Date(year, month - 1, 1);
  
  if (targetDate > now) {
    errors.push('Cannot calculate attendance for future months');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Idempotent calculation check
 * Prevents duplicate calculations and ensures data consistency
 */
export async function ensureIdempotentCalculation(
  params: MonthlyAttendanceParams,
  forceRecalculate: boolean = false
): Promise<{
  shouldCalculate: boolean;
  reason: string;
  existingData?: StudentMonthlyAttendance[];
}> {
  const { year, month, subject, semester, division } = params;
  const divisionKey = division || 'all';
  const storageKey = `${year}/${month}/${subject}_sem${semester}_${divisionKey}`;
  
  // Check if data already exists
  const metadataRef = ref(database, `monthlyAttendance/${storageKey}/_metadata`);
  const snapshot = await get(metadataRef);
  
  if (!snapshot.exists()) {
    return {
      shouldCalculate: true,
      reason: 'No existing data found',
    };
  }
  
  if (forceRecalculate) {
    return {
      shouldCalculate: true,
      reason: 'Force recalculation requested',
    };
  }
  
  // Data exists and no force recalculation
  const existingMetadata = snapshot.val();
  
  // Get existing student data
  const dataRef = ref(database, `monthlyAttendance/${storageKey}`);
  const dataSnapshot = await get(dataRef);
  
  const existingData: StudentMonthlyAttendance[] = [];
  
  if (dataSnapshot.exists()) {
    const data = dataSnapshot.val();
    for (const [key, value] of Object.entries(data)) {
      if (key !== '_metadata') {
        existingData.push(value as StudentMonthlyAttendance);
      }
    }
  }
  
  return {
    shouldCalculate: false,
    reason: `Data already exists (generated on ${existingMetadata.generatedAt})`,
    existingData,
  };
}

/**
 * Handle zero lecture case safely
 */
export function handleZeroLectures(params: MonthlyAttendanceParams): {
  success: boolean;
  message: string;
  studentsData: StudentMonthlyAttendance[];
} {
  const { year, month, subject, semester } = params;
  
  console.log('[PERFORMANCE] Zero lectures found - returning empty result');
  
  return {
    success: true,
    message: `No lectures found for ${subject} (Semester ${semester}) in the specified month`,
    studentsData: [],
  };
}

/**
 * Memory-efficient student processing
 * Process students in chunks to avoid memory issues with large datasets
 */
export async function processStudentsEfficiently(
  lectureIds: string[],
  chunkSize: number = 10
): Promise<Map<string, { attended: number; studentData: any }>> {
  console.log(`[PERFORMANCE] Processing ${lectureIds.length} lectures efficiently`);
  
  const studentAttendanceMap = new Map<string, { attended: number; studentData: any }>();
  
  // Process lectures in chunks
  for (let i = 0; i < lectureIds.length; i += chunkSize) {
    const chunk = lectureIds.slice(i, i + chunkSize);
    
    // Fetch student data for this chunk
    const chunkPromises = chunk.map(async (lectureId) => {
      const studentsRef = ref(database, `lectures/${lectureId}/students`);
      const snapshot = await get(studentsRef);
      
      if (!snapshot.exists()) {
        return null;
      }
      
      return { lectureId, students: snapshot.val() };
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    
    // Process chunk results
    for (const result of chunkResults) {
      if (!result) continue;
      
      const students = result.students;
      
      for (const [studentId, studentData] of Object.entries(students)) {
        const student = studentData as any;
        
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
        }
      }
    }
    
    // Small delay between chunks
    if (i + chunkSize < lectureIds.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  console.log(`[PERFORMANCE] Processed ${studentAttendanceMap.size} unique students`);
  
  return studentAttendanceMap;
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  message: string;
}> {
  const startTime = Date.now();
  
  try {
    // Test read operation
    const testRef = ref(database, '.info/connected');
    await get(testRef);
    
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency,
      message: `Database is healthy (latency: ${latency}ms)`,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: -1,
      message: error instanceof Error ? error.message : 'Database health check failed',
    };
  }
}

/**
 * Estimate calculation time based on data size
 */
export async function estimateCalculationTime(
  params: MonthlyAttendanceParams
): Promise<{
  estimatedSeconds: number;
  lectureCount: number;
  estimatedStudents: number;
}> {
  const { lectureIds } = await getOptimizedLectureData(params);
  
  // Rough estimates based on testing:
  // - 1 lecture = ~50-100ms processing time
  // - Average 30 students per lecture
  
  const lectureCount = lectureIds.length;
  const estimatedStudents = Math.min(lectureCount * 30, 500); // Cap at 500
  const estimatedMs = lectureCount * 75; // 75ms per lecture average
  const estimatedSeconds = Math.ceil(estimatedMs / 1000);
  
  return {
    estimatedSeconds: Math.max(estimatedSeconds, 1),
    lectureCount,
    estimatedStudents,
  };
}

/**
 * Performance monitoring decorator
 */
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    console.log(`[PERFORMANCE] ${name} started`);
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      console.log(`[PERFORMANCE] ${name} completed in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[PERFORMANCE] ${name} failed after ${duration}ms:`, error);
      throw error;
    }
  }) as T;
}

/**
 * Rate limiter to prevent API abuse
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (validRequests.length >= this.maxRequests) {
      console.warn(`[RATE-LIMIT] Limit exceeded for ${key}`);
      return false;
    }
    
    // Add new request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  reset(key: string): void {
    this.requests.delete(key);
  }
}

// Global rate limiter for monthly calculations
export const calculationRateLimiter = new RateLimiter(5, 60000); // 5 per minute
