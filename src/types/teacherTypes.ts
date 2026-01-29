/**
 * Teacher Types for Smart Attendance System
 * Supports multi-semester, multi-division, multi-subject teaching assignments
 */

export interface Teacher {
  teacherId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  qualification: string;
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
  uid: string; // Firebase Auth UID
}

export interface TeacherClassMapping {
  mappingId: string;
  teacherId: string;
  semester: number; // 1-6
  division: 'A' | 'B';
  subjectCode: string;
  subjectName: string;
  createdAt: number;
  isActive: boolean;
}

export interface LectureSession {
  sessionId: string;
  teacherId: string;
  teacherName: string;
  semester: number;
  division: 'A' | 'B';
  subjectCode: string;
  subjectName: string;
  startTime: number;
  endTime: number | null;
  status: 'active' | 'completed' | 'cancelled';
  teacherLocation: {
    latitude: number;
    longitude: number;
    timestamp: number;
    accuracy: number;
  };
  geofenceRadius: number; // in meters (default: 15)
  campusBoundary: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
  };
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface TeacherLocationUpdate {
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface ClassSelectionFormData {
  semester: number;
  division: 'A' | 'B';
  subjectCode: string;
  subjectName: string;
}

export interface TeacherRegistrationData {
  name: string;
  email: string;
  password: string;
  phone: string;
  department: string;
  designation: string;
  qualification: string;
  classAssignments: Array<{
    semester: number;
    division: 'A' | 'B';
    subjectCode: string;
    subjectName: string;
  }>;
}

export interface SubjectOption {
  code: string;
  name: string;
  semester: number;
  credits: number;
}
