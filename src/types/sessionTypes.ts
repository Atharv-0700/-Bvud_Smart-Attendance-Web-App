/**
 * Session and Attendance Types for Smart Attendance System
 */

export interface AttendanceSubmission {
  sessionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  semester: number;
  division: 'A' | 'B';
  subjectCode: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  deviceInfo: {
    userAgent: string;
    deviceId: string;
  };
  submittedAt: number;
  validationStatus: 'pending' | 'approved' | 'rejected';
  validationDetails: {
    teacherProximityCheck: boolean;
    campusBoundaryCheck: boolean;
    distanceFromTeacher: number; // in meters
    distanceFromCampus: number; // in meters
    validationTimestamp: number;
  };
}

export interface AttendanceRecord {
  recordId: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  semester: number;
  division: 'A' | 'B';
  subjectCode: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  marked: boolean;
  markedAt: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  distanceFromTeacher: number;
  distanceFromCampus: number;
  validationPassed: boolean;
  googleSheetExported: boolean;
  createdAt: number;
}

export interface GeofenceValidationResult {
  isValid: boolean;
  teacherProximityCheck: boolean;
  campusBoundaryCheck: boolean;
  distanceFromTeacher: number;
  distanceFromCampus: number;
  errorMessage?: string;
}

export interface GoogleSheetExportData {
  sessionId: string;
  semester: number;
  division: 'A' | 'B';
  subjectCode: string;
  subjectName: string;
  date: string;
  time: string;
  studentRecords: Array<{
    rollNumber: string;
    studentId: string;
    name: string;
    status: 'Present' | 'Absent';
    markedAt?: string;
    distanceFromTeacher?: number;
  }>;
}
