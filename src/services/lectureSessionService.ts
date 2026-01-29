/**
 * Lecture Session Management Service
 * Handles session creation, live GPS tracking, and session lifecycle
 */

import { database } from '@/config/firebase';
import { ref, set, get, push, update, query, orderByChild, equalTo } from 'firebase/database';
import type { LectureSession, TeacherLocationUpdate } from '@/types/teacherTypes';

/**
 * Create a new lecture session
 */
export async function createLectureSession(
  teacherId: string,
  teacherName: string,
  semester: number,
  division: 'A' | 'B',
  subjectCode: string,
  subjectName: string,
  teacherLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  }
): Promise<string> {
  const sessionRef = push(ref(database, 'lectureSessions'));
  const sessionId = sessionRef.key!;

  const session: LectureSession = {
    sessionId,
    teacherId,
    teacherName,
    semester,
    division,
    subjectCode,
    subjectName,
    startTime: Date.now(),
    endTime: null,
    status: 'active',
    teacherLocation: {
      latitude: teacherLocation.latitude,
      longitude: teacherLocation.longitude,
      timestamp: Date.now(),
      accuracy: teacherLocation.accuracy,
    },
    geofenceRadius: 15, // 15 meters
    campusBoundary: {
      latitude: 19.0434, // BVDU Kharghar
      longitude: 73.0618,
      radius: 500, // 500 meters
    },
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await set(sessionRef, session);
  return sessionId;
}

/**
 * Get active session by ID
 */
export async function getLectureSession(sessionId: string): Promise<LectureSession | null> {
  const sessionRef = ref(database, `lectureSessions/${sessionId}`);
  const snapshot = await get(sessionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as LectureSession;
}

/**
 * Get active session for a teacher
 */
export async function getActiveSessionForTeacher(teacherId: string): Promise<LectureSession | null> {
  const sessionsRef = ref(database, 'lectureSessions');
  const activeSessionQuery = query(sessionsRef, orderByChild('teacherId'), equalTo(teacherId));
  const snapshot = await get(activeSessionQuery);

  if (!snapshot.exists()) {
    return null;
  }

  const sessions = Object.values(snapshot.val()) as LectureSession[];
  const activeSessions = sessions.filter((s) => s.status === 'active');

  if (activeSessions.length === 0) {
    return null;
  }

  // Return the most recent active session
  return activeSessions.sort((a, b) => b.startTime - a.startTime)[0];
}

/**
 * Update teacher's live location in the session
 */
export async function updateTeacherLocation(
  sessionId: string,
  latitude: number,
  longitude: number,
  accuracy: number
): Promise<void> {
  const sessionRef = ref(database, `lectureSessions/${sessionId}`);

  await update(sessionRef, {
    teacherLocation: {
      latitude,
      longitude,
      timestamp: Date.now(),
      accuracy,
    },
    updatedAt: Date.now(),
  });
}

/**
 * Update session attendance counts
 */
export async function updateSessionAttendanceCounts(
  sessionId: string,
  presentCount: number,
  totalStudents: number
): Promise<void> {
  const sessionRef = ref(database, `lectureSessions/${sessionId}`);

  await update(sessionRef, {
    presentCount,
    totalStudents,
    absentCount: totalStudents - presentCount,
    updatedAt: Date.now(),
  });
}

/**
 * End a lecture session
 */
export async function endLectureSession(sessionId: string): Promise<void> {
  const sessionRef = ref(database, `lectureSessions/${sessionId}`);

  await update(sessionRef, {
    endTime: Date.now(),
    status: 'completed',
    updatedAt: Date.now(),
  });
}

/**
 * Cancel a lecture session
 */
export async function cancelLectureSession(sessionId: string): Promise<void> {
  const sessionRef = ref(database, `lectureSessions/${sessionId}`);

  await update(sessionRef, {
    status: 'cancelled',
    updatedAt: Date.now(),
  });
}

/**
 * Get all sessions for a teacher (with optional filters)
 */
export async function getTeacherSessions(
  teacherId: string,
  options?: {
    semester?: number;
    division?: 'A' | 'B';
    subjectCode?: string;
    status?: 'active' | 'completed' | 'cancelled';
    startDate?: number;
    endDate?: number;
  }
): Promise<LectureSession[]> {
  const sessionsRef = ref(database, 'lectureSessions');
  const teacherSessionQuery = query(sessionsRef, orderByChild('teacherId'), equalTo(teacherId));
  const snapshot = await get(teacherSessionQuery);

  if (!snapshot.exists()) {
    return [];
  }

  let sessions = Object.values(snapshot.val()) as LectureSession[];

  // Apply filters
  if (options) {
    if (options.semester) {
      sessions = sessions.filter((s) => s.semester === options.semester);
    }
    if (options.division) {
      sessions = sessions.filter((s) => s.division === options.division);
    }
    if (options.subjectCode) {
      sessions = sessions.filter((s) => s.subjectCode === options.subjectCode);
    }
    if (options.status) {
      sessions = sessions.filter((s) => s.status === options.status);
    }
    if (options.startDate) {
      sessions = sessions.filter((s) => s.startTime >= options.startDate!);
    }
    if (options.endDate) {
      sessions = sessions.filter((s) => s.startTime <= options.endDate!);
    }
  }

  // Sort by start time (most recent first)
  return sessions.sort((a, b) => b.startTime - a.startTime);
}

/**
 * Check if a teacher has an active session
 */
export async function hasActiveSession(teacherId: string): Promise<boolean> {
  const activeSession = await getActiveSessionForTeacher(teacherId);
  return activeSession !== null;
}

/**
 * Get session statistics
 */
export async function getSessionStatistics(sessionId: string): Promise<{
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
  duration: number; // in minutes
}> {
  const session = await getLectureSession(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  const duration = session.endTime
    ? Math.floor((session.endTime - session.startTime) / 60000)
    : Math.floor((Date.now() - session.startTime) / 60000);

  const attendancePercentage =
    session.totalStudents > 0 ? (session.presentCount / session.totalStudents) * 100 : 0;

  return {
    totalStudents: session.totalStudents,
    presentCount: session.presentCount,
    absentCount: session.absentCount,
    attendancePercentage: Math.round(attendancePercentage * 10) / 10,
    duration,
  };
}

/**
 * Get current teacher location from active session
 */
export async function getCurrentTeacherLocation(sessionId: string): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
} | null> {
  const session = await getLectureSession(sessionId);

  if (!session || session.status !== 'active') {
    return null;
  }

  return session.teacherLocation;
}
