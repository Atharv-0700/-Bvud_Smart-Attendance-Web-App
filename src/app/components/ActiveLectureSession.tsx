/**
 * Active Lecture Session Component
 * Displays QR code, tracks teacher's live GPS location, shows real-time attendance
 */

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getLectureSession,
  updateTeacherLocation,
  endLectureSession,
  getSessionStatistics,
} from '@/services/lectureSessionService';
import { watchTeacherLocation, clearLocationWatch } from '@/utils/dualGeofencing';
import type { LectureSession } from '@/types/teacherTypes';
import {
  MapPin,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  StopCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  sessionId: string;
  onSessionEnd: () => void;
}

export default function ActiveLectureSession({ sessionId, onSessionEnd }: Props) {
  const [session, setSession] = useState<LectureSession | null>(null);
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    attendancePercentage: 0,
    duration: 0,
  });
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [ending, setEnding] = useState(false);

  const locationWatchId = useRef<number | null>(null);
  const statsInterval = useRef<NodeJS.Timeout | null>(null);

  // Load session data
  useEffect(() => {
    loadSession();
    startLocationTracking();
    startStatsUpdates();

    return () => {
      stopLocationTracking();
      stopStatsUpdates();
    };
  }, [sessionId]);

  async function loadSession() {
    try {
      const sessionData = await getLectureSession(sessionId);
      if (sessionData) {
        setSession(sessionData);
        setCurrentLocation(sessionData.teacherLocation);
      }
    } catch (err) {
      console.error('Error loading session:', err);
    }
  }

  function startLocationTracking() {
    try {
      const watchId = watchTeacherLocation(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setCurrentLocation({ latitude, longitude, accuracy });
          setLocationError('');

          // Update location in Firebase
          updateTeacherLocation(sessionId, latitude, longitude, accuracy).catch((err) => {
            console.error('Error updating teacher location:', err);
          });
        },
        (error) => {
          console.error('Location error:', error);
          setLocationError('Unable to track location. Please check GPS settings.');
        }
      );

      locationWatchId.current = watchId;
    } catch (err) {
      console.error('Error starting location tracking:', err);
      setLocationError('Location tracking not supported');
    }
  }

  function stopLocationTracking() {
    if (locationWatchId.current !== null) {
      clearLocationWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
  }

  function startStatsUpdates() {
    // Update statistics every 5 seconds
    statsInterval.current = setInterval(async () => {
      try {
        const stats = await getSessionStatistics(sessionId);
        setStatistics(stats);
      } catch (err) {
        console.error('Error updating statistics:', err);
      }
    }, 5000);
  }

  function stopStatsUpdates() {
    if (statsInterval.current) {
      clearInterval(statsInterval.current);
      statsInterval.current = null;
    }
  }

  async function handleEndSession() {
    if (!confirm('Are you sure you want to end this lecture session?')) {
      return;
    }

    setEnding(true);

    try {
      await endLectureSession(sessionId);
      stopLocationTracking();
      stopStatsUpdates();
      onSessionEnd();
    } catch (err) {
      console.error('Error ending session:', err);
      alert('Failed to end session. Please try again.');
    } finally {
      setEnding(false);
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  // QR Code data
  const qrData = JSON.stringify({
    sessionId: session.sessionId,
    teacherId: session.teacherId,
    semester: session.semester,
    division: session.division,
    subjectCode: session.subjectCode,
    timestamp: session.startTime,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-green-500">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <h1 className="text-2xl font-bold text-gray-900">Lecture Session Active</h1>
              </div>
              <p className="text-gray-600">
                Semester {session.semester} - Division {session.division} - {session.subjectCode}
              </p>
              <p className="text-sm text-gray-500">{session.subjectName}</p>
            </div>
            <button
              onClick={handleEndSession}
              disabled={ending}
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              <StopCircle className="w-5 h-5" />
              {ending ? 'Ending...' : 'End Session'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Code Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Scan QR Code to Mark Attendance
              </h2>

              {/* QR Code Display */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-6 rounded-2xl shadow-lg border-4 border-blue-500">
                  <QRCodeSVG value={qrData} size={300} level="H" includeMargin />
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions for Students</h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Open Smart Attendance app and scan this QR code</li>
                  <li>• Must be within <strong>15 meters</strong> of teacher's location</li>
                  <li>• Must be inside <strong>campus boundary</strong> (500m radius)</li>
                  <li>• Enable GPS/Location services on your device</li>
                  <li>• Each student can mark attendance only once</li>
                </ul>
              </div>

              {/* Session Info */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Session ID</p>
                  <p className="font-mono text-sm text-gray-900">{session.sessionId.slice(0, 12)}...</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Started At</p>
                  <p className="text-sm text-gray-900">
                    {new Date(session.startTime).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics and Location Panel */}
          <div className="space-y-6">
            {/* Real-time Statistics */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Attendance Statistics</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Present</span>
                  <span className="flex items-center gap-2 font-bold text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    {statistics.presentCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Absent</span>
                  <span className="flex items-center gap-2 font-bold text-red-600">
                    <XCircle className="w-4 h-4" />
                    {statistics.absentCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold text-gray-900">{statistics.totalStudents}</span>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Attendance Rate</span>
                    <span className="font-bold text-blue-600">
                      {statistics.attendancePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${statistics.attendancePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Duration */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Session Duration</h3>
              </div>
              <p className="text-3xl font-bold text-purple-600">{statistics.duration} min</p>
            </div>

            {/* Teacher Location */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900">Your Location</h3>
              </div>

              {locationError ? (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{locationError}</p>
                </div>
              ) : currentLocation ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600 font-semibold">Tracking Active</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Lat: {currentLocation.latitude.toFixed(6)}</p>
                    <p>Lng: {currentLocation.longitude.toFixed(6)}</p>
                    <p>Accuracy: {currentLocation.accuracy.toFixed(0)}m</p>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      Students must be within <strong>15 meters</strong> of this location
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Getting location...</span>
                </div>
              )}
            </div>

            {/* Geofence Info */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-3">Geofence Protection</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>15m radius from your position</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Campus boundary verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Real-time GPS validation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
