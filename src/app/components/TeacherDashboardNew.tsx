/**
 * Dynamic Teacher Dashboard
 * Supports multi-semester, multi-division, multi-subject teaching
 * No hardcoded semester routes - all context resolved at runtime
 */

import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  getTeacherByUID,
  getTeacherSemesters,
  getTeacherDivisions,
  getTeacherSubjects,
} from '@/services/teacherClassService';
import {
  createLectureSession,
  getActiveSessionForTeacher,
  hasActiveSession,
} from '@/services/lectureSessionService';
import type { Teacher } from '@/types/teacherTypes';
import { BookOpen, Users, Clock, Play, AlertCircle, CheckCircle } from 'lucide-react';
import ActiveLectureSession from './ActiveLectureSession';

export default function TeacherDashboardNew() {
  const [user] = useAuthState(auth);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Class selection state
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<('A' | 'B')[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ code: string; name: string }>>(
    []
  );

  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<'A' | 'B' | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<{ code: string; name: string } | null>(
    null
  );

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [startingLecture, setStartingLecture] = useState(false);

  // Load teacher data
  useEffect(() => {
    if (user) {
      loadTeacherData();
    }
  }, [user]);

  // Load semesters when teacher is loaded
  useEffect(() => {
    if (teacher) {
      loadSemesters();
    }
  }, [teacher]);

  // Load divisions when semester changes
  useEffect(() => {
    if (teacher && selectedSemester) {
      loadDivisions(selectedSemester);
    }
  }, [teacher, selectedSemester]);

  // Load subjects when division changes
  useEffect(() => {
    if (teacher && selectedSemester && selectedDivision) {
      loadSubjects(selectedSemester, selectedDivision);
    }
  }, [teacher, selectedSemester, selectedDivision]);

  async function loadTeacherData() {
    try {
      setLoading(true);
      const teacherData = await getTeacherByUID(user!.uid);

      if (!teacherData) {
        setError('Teacher profile not found');
        return;
      }

      setTeacher(teacherData);

      // Check for active session
      const activeSession = await getActiveSessionForTeacher(teacherData.teacherId);
      if (activeSession) {
        setActiveSessionId(activeSession.sessionId);
      }
    } catch (err) {
      console.error('Error loading teacher data:', err);
      setError('Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  }

  async function loadSemesters() {
    if (!teacher) return;

    try {
      const semesters = await getTeacherSemesters(teacher.teacherId);
      setAvailableSemesters(semesters);

      // Auto-select first semester if available
      if (semesters.length > 0 && !selectedSemester) {
        setSelectedSemester(semesters[0]);
      }
    } catch (err) {
      console.error('Error loading semesters:', err);
    }
  }

  async function loadDivisions(semester: number) {
    if (!teacher) return;

    try {
      const divisions = await getTeacherDivisions(teacher.teacherId, semester);
      setAvailableDivisions(divisions);

      // Auto-select first division if available
      if (divisions.length > 0 && !selectedDivision) {
        setSelectedDivision(divisions[0]);
      } else if (divisions.length === 0) {
        setSelectedDivision(null);
        setAvailableSubjects([]);
        setSelectedSubject(null);
      }
    } catch (err) {
      console.error('Error loading divisions:', err);
    }
  }

  async function loadSubjects(semester: number, division: 'A' | 'B') {
    if (!teacher) return;

    try {
      const subjects = await getTeacherSubjects(teacher.teacherId, semester, division);
      setAvailableSubjects(subjects);

      // Auto-select first subject if available
      if (subjects.length > 0 && !selectedSubject) {
        setSelectedSubject(subjects[0]);
      } else if (subjects.length === 0) {
        setSelectedSubject(null);
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
    }
  }

  async function handleStartLecture() {
    if (!teacher || !selectedSemester || !selectedDivision || !selectedSubject) {
      setError('Please select semester, division, and subject');
      return;
    }

    // Check for active session
    const hasActive = await hasActiveSession(teacher.teacherId);
    if (hasActive) {
      setError('You already have an active lecture session. Please end it before starting a new one.');
      return;
    }

    setStartingLecture(true);
    setError('');

    try {
      // Get current location
      const position = await getCurrentLocation();
      const { latitude, longitude, accuracy } = position.coords;

      // Create lecture session
      const sessionId = await createLectureSession(
        teacher.teacherId,
        teacher.name,
        selectedSemester,
        selectedDivision,
        selectedSubject.code,
        selectedSubject.name,
        { latitude, longitude, accuracy }
      );

      setActiveSessionId(sessionId);
    } catch (err: any) {
      console.error('Error starting lecture:', err);
      if (err.code === 1) {
        setError('Location permission denied. Please enable location access.');
      } else if (err.code === 2) {
        setError('Location unavailable. Please check your device settings.');
      } else if (err.code === 3) {
        setError('Location request timed out. Please try again.');
      } else {
        setError('Failed to start lecture. Please try again.');
      }
    } finally {
      setStartingLecture(false);
    }
  }

  function getCurrentLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }

  function handleSessionEnd() {
    setActiveSessionId(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Profile Not Found</h2>
          <p className="text-gray-600 text-center">
            Teacher profile not found. Please contact administrator.
          </p>
        </div>
      </div>
    );
  }

  // Show active session if exists
  if (activeSessionId) {
    return <ActiveLectureSession sessionId={activeSessionId} onSessionEnd={handleSessionEnd} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-gray-600">Welcome, {teacher.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{teacher.designation}</p>
              <p className="text-sm text-gray-500">{teacher.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Class Selection Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Start a Lecture</h2>
              <p className="text-gray-600">Select class details to begin attendance marking</p>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Semester Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Semester
              </label>
              <select
                value={selectedSemester || ''}
                onChange={(e) => {
                  setSelectedSemester(Number(e.target.value));
                  setSelectedDivision(null);
                  setSelectedSubject(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Choose Semester</option>
                {availableSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Division Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Division
              </label>
              <select
                value={selectedDivision || ''}
                onChange={(e) => {
                  setSelectedDivision(e.target.value as 'A' | 'B');
                  setSelectedSubject(null);
                }}
                disabled={!selectedSemester}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Choose Division</option>
                {availableDivisions.map((div) => (
                  <option key={div} value={div}>
                    Division {div}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subject
              </label>
              <select
                value={selectedSubject?.code || ''}
                onChange={(e) => {
                  const subject = availableSubjects.find((s) => s.code === e.target.value);
                  setSelectedSubject(subject || null);
                }}
                disabled={!selectedDivision}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Choose Subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.code} value={subject.code}>
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Class Summary */}
          {selectedSemester && selectedDivision && selectedSubject && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Ready to start: Semester {selectedSemester} - Division {selectedDivision}
                  </p>
                  <p className="text-blue-700 text-sm">
                    {selectedSubject.code} - {selectedSubject.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Start Lecture Button */}
          <button
            onClick={handleStartLecture}
            disabled={!selectedSemester || !selectedDivision || !selectedSubject || startingLecture}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
          >
            {startingLecture ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Starting Lecture...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Lecture Session
              </>
            )}
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Semesters</p>
                <p className="text-2xl font-bold text-gray-900">{availableSemesters.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Classes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {availableSemesters.length * 2}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-bold text-green-600">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">How to Start a Lecture</h3>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </span>
              <span>Select the <strong>Semester</strong> you are teaching</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span>
              <span>Choose the <strong>Division</strong> (A or B)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </span>
              <span>Select the <strong>Subject</strong> from the dropdown</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </span>
              <span>Click <strong>"Start Lecture Session"</strong> to begin</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                5
              </span>
              <span>Students will scan QR code to mark attendance within <strong>15-meter radius</strong></span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
