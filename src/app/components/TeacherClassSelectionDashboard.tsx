/**
 * Teacher Class Selection Dashboard
 * Dynamic multi-semester, multi-division, multi-subject selection interface
 * Replaces hardcoded semester-specific dashboards
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { User } from '../App';
import { 
  getTeacherByUID, 
  getTeacherSemesters, 
  getTeacherDivisions, 
  getTeacherSubjects 
} from '@/services/teacherClassService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Play, 
  Loader2, 
  GraduationCap, 
  AlertCircle,
  CheckCircle2,
  MapPin,
  Clock,
  Home,
  PlayCircle,
  BarChart3,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import type { Teacher, ClassSelectionFormData } from '@/types/teacherTypes';
import { useNavigate } from 'react-router-dom';
import { database } from '@/config/firebase';
import { ref, set, push, get, onValue, off } from 'firebase/database';
import { getCurrentLocation } from '@/utils/dualGeofencing';

interface TeacherClassSelectionDashboardProps {
  user: User;
  onLogout: () => void;
}

export function TeacherClassSelectionDashboard({ user, onLogout }: TeacherClassSelectionDashboardProps) {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingLecture, setStartingLecture] = useState(false);

  // Navigation items for sidebar
  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/teacher' },
    { label: 'Start Lecture', icon: <PlayCircle className="w-5 h-5" />, path: '/teacher/start-lecture' },
    { label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/reports' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/syllabus' },
    { label: 'Device Security', icon: <Shield className="w-5 h-5" />, path: '/teacher/device-management' },
  ];

  // Class selection state
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<'A' | 'B' | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Available options based on teacher's mappings
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<('A' | 'B')[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ code: string; name: string }>>([]);

  // Active lectures
  const [activeLectures, setActiveLectures] = useState<any[]>([]);

  // Load teacher data and mappings
  useEffect(() => {
    loadTeacherData();
    loadActiveLectures();
  }, [user.id]);

  // Load divisions when semester changes
  useEffect(() => {
    if (selectedSemester && teacher) {
      loadDivisions(selectedSemester);
    }
  }, [selectedSemester, teacher]);

  // Load subjects when division changes
  useEffect(() => {
    if (selectedSemester && selectedDivision && teacher) {
      loadSubjects(selectedSemester, selectedDivision);
    }
  }, [selectedSemester, selectedDivision, teacher]);

  async function loadTeacherData() {
    try {
      setLoading(true);
      const teacherData = await getTeacherByUID(user.id);

      if (!teacherData) {
        toast.error('Teacher profile not found. Please contact admin.');
        return;
      }

      setTeacher(teacherData);

      // Load available semesters
      const semesters = await getTeacherSemesters(teacherData.teacherId);
      setAvailableSemesters(semesters);

      if (semesters.length === 1) {
        // Auto-select if only one semester
        setSelectedSemester(semesters[0]);
      }
    } catch (error) {
      console.error('Error loading teacher data:', error);
      toast.error('Failed to load teacher profile');
    } finally {
      setLoading(false);
    }
  }

  async function loadDivisions(semester: number) {
    if (!teacher) return;

    try {
      const divisions = await getTeacherDivisions(teacher.teacherId, semester);
      setAvailableDivisions(divisions);

      if (divisions.length === 1) {
        // Auto-select if only one division
        setSelectedDivision(divisions[0]);
      } else {
        setSelectedDivision(null);
        setSelectedSubject(null);
      }
    } catch (error) {
      console.error('Error loading divisions:', error);
      toast.error('Failed to load divisions');
    }
  }

  async function loadSubjects(semester: number, division: 'A' | 'B') {
    if (!teacher) return;

    try {
      const subjects = await getTeacherSubjects(teacher.teacherId, semester, division);
      setAvailableSubjects(subjects);

      if (subjects.length === 1) {
        // Auto-select if only one subject
        setSelectedSubject(subjects[0].code);
      } else {
        setSelectedSubject(null);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load subjects');
    }
  }

  async function loadActiveLectures() {
    if (!user.id) return;

    const lecturesRef = ref(database, 'lectureSessions');
    const unsubscribe = onValue(lecturesRef, (snapshot) => {
      if (snapshot.exists()) {
        const lectures = Object.values(snapshot.val()).filter(
          (lecture: any) => lecture.teacherId === user.id && lecture.status === 'active'
        );
        setActiveLectures(lectures);
      } else {
        setActiveLectures([]);
      }
    });

    return () => off(lecturesRef);
  }

  async function handleStartLecture() {
    if (!selectedSemester || !selectedDivision || !selectedSubject || !teacher) {
      toast.error('Please select semester, division, and subject');
      return;
    }

    setStartingLecture(true);

    try {
      // Get teacher's current GPS location
      toast.info('Getting your GPS location...', { duration: 2000 });
      const position = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      const teacherLat = position.coords.latitude;
      const teacherLon = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // Validate GPS accuracy
      if (accuracy > 50) {
        toast.warning('GPS accuracy is low. Please move to an open area and try again.', {
          description: `Current accuracy: ${accuracy.toFixed(0)}m`,
          duration: 5000,
        });
        setStartingLecture(false);
        return;
      }

      // Find selected subject name
      const subjectData = availableSubjects.find((s) => s.code === selectedSubject);
      if (!subjectData) {
        toast.error('Subject not found');
        setStartingLecture(false);
        return;
      }

      // Create lecture session
      const sessionRef = push(ref(database, 'lectureSessions'));
      const sessionId = sessionRef.key!;

      const lectureSession = {
        sessionId,
        teacherId: teacher.teacherId,
        teacherName: teacher.name,
        teacherUid: user.id,
        semester: selectedSemester,
        division: selectedDivision,
        subjectCode: selectedSubject,
        subjectName: subjectData.name,
        startTime: Date.now(),
        endTime: null,
        status: 'active',
        teacherLocation: {
          latitude: teacherLat,
          longitude: teacherLon,
          timestamp: Date.now(),
          accuracy,
        },
        geofenceRadius: 15, // 15 meters
        campusBoundary: {
          latitude: 19.0434, // Bharati Vidyapeeth University, Kharghar
          longitude: 73.0618,
          radius: 500, // 500 meters
        },
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await set(sessionRef, lectureSession);

      toast.success('Lecture started successfully!', {
        description: `${subjectData.name} - Sem ${selectedSemester} Div ${selectedDivision}`,
        duration: 3000,
      });

      // Navigate to active lecture session
      navigate('/teacher/active-lecture', { 
        state: { 
          sessionId,
          semester: selectedSemester,
          division: selectedDivision,
          subjectCode: selectedSubject,
          subjectName: subjectData.name,
        } 
      });
    } catch (error: any) {
      console.error('Error starting lecture:', error);
      
      if (error.code === 1) {
        toast.error('Location permission denied', {
          description: 'Please enable location access to start a lecture',
          duration: 5000,
        });
      } else if (error.code === 3) {
        toast.error('Location timeout', {
          description: 'Unable to get your location. Please try again.',
          duration: 5000,
        });
      } else {
        toast.error('Failed to start lecture. Please try again.');
      }
    } finally {
      setStartingLecture(false);
    }
  }

  function handleContinueLecture(lecture: any) {
    navigate('/teacher/active-lecture', {
      state: {
        sessionId: lecture.sessionId,
        semester: lecture.semester,
        division: lecture.division,
        subjectCode: lecture.subjectCode,
        subjectName: lecture.subjectName,
      },
    });
  }

  const canStartLecture = selectedSemester && selectedDivision && selectedSubject;

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, {teacher?.name || user.name}
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <GraduationCap className="w-5 h-5 mr-2" />
            {teacher?.department || 'BCA Department'}
          </Badge>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && (
          <>
            {/* Active Lectures Section */}
            {activeLectures.length > 0 && (
              <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Active Lectures
                  </CardTitle>
                  <CardDescription>You have ongoing lecture sessions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeLectures.map((lecture) => (
                    <div
                      key={lecture.sessionId}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {lecture.subjectName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Semester {lecture.semester} - Division {lecture.division}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Started: {new Date(lecture.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <Button onClick={() => handleContinueLecture(lecture)} variant="default">
                        Continue
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Class Selection Section */}
            <Card>
              <CardHeader>
                <CardTitle>Start New Lecture</CardTitle>
                <CardDescription>
                  Select semester, division, and subject to begin a new lecture session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Semester Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Select Semester
                  </label>
                  <Select
                    value={selectedSemester?.toString() || ''}
                    onValueChange={(value) => setSelectedSemester(parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSemesters.map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Division Selection */}
                {selectedSemester && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Select Division
                    </label>
                    <Select
                      value={selectedDivision || ''}
                      onValueChange={(value) => setSelectedDivision(value as 'A' | 'B')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose division" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDivisions.map((div) => (
                          <SelectItem key={div} value={div}>
                            Division {div}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Subject Selection */}
                {selectedSemester && selectedDivision && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Select Subject
                    </label>
                    <Select
                      value={selectedSubject || ''}
                      onValueChange={(value) => setSelectedSubject(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubjects.map((subject) => (
                          <SelectItem key={subject.code} value={subject.code}>
                            {subject.code} - {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Selection Summary */}
                {canStartLecture && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-semibold">
                      <CheckCircle2 className="w-5 h-5" />
                      Ready to Start Lecture
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-7">
                      <p>
                        <strong>Semester:</strong> {selectedSemester}
                      </p>
                      <p>
                        <strong>Division:</strong> {selectedDivision}
                      </p>
                      <p>
                        <strong>Subject:</strong>{' '}
                        {availableSubjects.find((s) => s.code === selectedSubject)?.name} (
                        {selectedSubject})
                      </p>
                    </div>
                  </div>
                )}

                {/* Start Lecture Button */}
                <Button
                  onClick={handleStartLecture}
                  disabled={!canStartLecture || startingLecture}
                  className="w-full"
                  size="lg"
                >
                  {startingLecture ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Starting Lecture...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Lecture
                    </>
                  )}
                </Button>

                {/* Location Notice */}
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Location Required</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Your GPS location will be captured to enable attendance geofencing.
                        Students must be within 15 meters of your location to mark attendance.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {availableSemesters.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Semesters</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {availableSemesters.length}
                        </p>
                      </div>
                      <Calendar className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Active Lectures</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {activeLectures.length}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {teacher?.department || 'BCA'}
                        </p>
                      </div>
                      <GraduationCap className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}