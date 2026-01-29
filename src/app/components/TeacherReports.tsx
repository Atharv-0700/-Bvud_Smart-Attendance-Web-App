import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, PlayCircle, BarChart3, BookOpen, Download, Filter, Users, TrendingDown, TrendingUp, Shield, Loader2, AlertCircle, FileEdit } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { useState, useEffect } from 'react';
import { database } from '../../config/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { toast } from 'sonner';

interface TeacherReportsProps {
  user: User;
  onLogout: () => void;
}

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  semester: number;
  division: string;
  rollNumber: string;
  attendance: number;
  totalLectures: number;
  attendedLectures: number;
  status: string;
  trend: 'up' | 'down' | 'stable';
}

export function TeacherReports({ user, onLogout }: TeacherReportsProps) {
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [avgAttendance, setAvgAttendance] = useState(0);
  const [studentsAbove75, setStudentsAbove75] = useState(0);
  const [studentsAtRisk, setStudentsAtRisk] = useState(0);

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/teacher' },
    { label: 'Start Lecture', icon: <PlayCircle className="w-5 h-5" />, path: '/teacher/start-lecture' },
    { label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/reports' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/syllabus' },
    { label: 'Device Security', icon: <Shield className="w-5 h-5" />, path: '/teacher/device-management' },
  ];

  useEffect(() => {
    loadStudentReports();
  }, [user.id, selectedSubject, selectedSemester]);

  const loadStudentReports = async () => {
    setLoading(true);
    try {
      // Step 1: Load all lectures by this teacher
      const lecturesRef = ref(database, 'lectures');
      const teacherLecturesQuery = query(lecturesRef, orderByChild('teacherId'), equalTo(user.id));
      const lecturesSnapshot = await get(teacherLecturesQuery);

      if (!lecturesSnapshot.exists()) {
        // No lectures found
        setStudents([]);
        setTotalStudents(0);
        setAvgAttendance(0);
        setStudentsAbove75(0);
        setStudentsAtRisk(0);
        setLoading(false);
        return;
      }

      const lecturesData = lecturesSnapshot.val();
      
      // Filter lectures by selected subject and semester
      const filteredLectures: any = {};
      Object.entries(lecturesData).forEach(([lectureId, lecture]: [string, any]) => {
        let includeThis = true;

        // Filter by subject
        if (selectedSubject !== 'all') {
          if (lecture.subject?.toLowerCase() !== selectedSubject) {
            includeThis = false;
          }
        }

        // Filter by semester
        if (selectedSemester !== 'all') {
          if (lecture.semester !== parseInt(selectedSemester)) {
            includeThis = false;
          }
        }

        if (includeThis) {
          filteredLectures[lectureId] = lecture;
        }
      });

      if (Object.keys(filteredLectures).length === 0) {
        // No lectures match the filters
        setStudents([]);
        setTotalStudents(0);
        setAvgAttendance(0);
        setStudentsAbove75(0);
        setStudentsAtRisk(0);
        setLoading(false);
        return;
      }

      // Step 2: Collect all unique student IDs from these lectures
      const studentAttendanceMap: { [studentId: string]: { attended: number; total: number } } = {};

      Object.values(filteredLectures).forEach((lecture: any) => {
        const totalLectures = Object.keys(filteredLectures).length;

        if (lecture.students) {
          // Students who attended this lecture
          Object.keys(lecture.students).forEach((studentId) => {
            if (!studentAttendanceMap[studentId]) {
              studentAttendanceMap[studentId] = { attended: 0, total: totalLectures };
            }
            studentAttendanceMap[studentId].attended += 1;
          });
        }

        // For students who didn't attend, we still need to count them if they're in the semester
        // We'll handle this in Step 3
      });

      // Step 3: Load student details from users
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);

      if (!usersSnapshot.exists()) {
        setStudents([]);
        setTotalStudents(0);
        setAvgAttendance(0);
        setStudentsAbove75(0);
        setStudentsAtRisk(0);
        setLoading(false);
        return;
      }

      const usersData = usersSnapshot.val();
      const studentRecords: StudentRecord[] = [];

      // Get total lectures count for each semester
      const lecturesBySemester: { [semester: number]: number } = {};
      Object.values(filteredLectures).forEach((lecture: any) => {
        const sem = lecture.semester;
        lecturesBySemester[sem] = (lecturesBySemester[sem] || 0) + 1;
      });

      // Process each student
      Object.entries(usersData).forEach(([userId, userData]: [string, any]) => {
        if (userData.role !== 'student') return;

        // Filter by semester if selected
        if (selectedSemester !== 'all' && userData.semester !== parseInt(selectedSemester)) {
          return;
        }

        const studentSemester = userData.semester;
        const totalLecturesForSemester = lecturesBySemester[studentSemester] || 0;

        // Skip if no lectures for this semester
        if (totalLecturesForSemester === 0) return;

        const attendedLectures = studentAttendanceMap[userId]?.attended || 0;
        const attendancePercentage = totalLecturesForSemester > 0
          ? Math.round((attendedLectures / totalLecturesForSemester) * 100)
          : 0;

        let status = 'risk';
        if (attendancePercentage >= 90) status = 'excellent';
        else if (attendancePercentage >= 75) status = 'good';
        else if (attendancePercentage >= 70) status = 'warning';

        // Calculate trend (simplified - could be enhanced with historical data)
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (attendancePercentage >= 80) trend = 'up';
        else if (attendancePercentage < 70) trend = 'down';

        studentRecords.push({
          id: userId,
          name: userData.name || 'Unknown Student',
          email: userData.email || '',
          semester: studentSemester,
          division: userData.division || '',
          rollNumber: userData.rollNumber || '',
          attendance: attendancePercentage,
          totalLectures: totalLecturesForSemester,
          attendedLectures,
          status,
          trend,
        });
      });

      // Sort by attendance (lowest first to highlight at-risk students)
      studentRecords.sort((a, b) => a.attendance - b.attendance);

      // Calculate statistics
      const total = studentRecords.length;
      const avgAtt = total > 0
        ? Math.round(studentRecords.reduce((sum, s) => sum + s.attendance, 0) / total)
        : 0;
      const above75 = studentRecords.filter(s => s.attendance >= 75).length;
      const atRisk = studentRecords.filter(s => s.attendance < 70).length;

      setStudents(studentRecords);
      setTotalStudents(total);
      setAvgAttendance(avgAtt);
      setStudentsAbove75(above75);
      setStudentsAtRisk(atRisk);
    } catch (error: any) {
      console.error('Error loading student reports:', error);
      toast.error('Failed to load student reports');
      
      // Check for indexing error
      if (error?.message?.includes('Index not defined') || error?.message?.includes('indexOn')) {
        console.error('');
        console.error('🚨 FIREBASE INDEXING ERROR!');
        console.error('📖 Fix: Open /COPY_PASTE_FIREBASE_RULES.txt and apply rules to Firebase Console');
        console.error('');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-success/10 text-success border-success/20';
      case 'good':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'risk':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (attendance: number) => {
    if (attendance >= 90) return 'Excellent';
    if (attendance >= 75) return 'Good';
    if (attendance >= 70) return 'Warning';
    return 'At Risk';
  };

  const handleExportReport = () => {
    if (students.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Create CSV content
    let csv = 'Name,Email,Semester,Division,Roll Number,Attendance %,Attended,Total Lectures,Status\n';
    students.forEach(student => {
      csv += `"${student.name}","${student.email}",${student.semester},"${student.division}","${student.rollNumber}",${student.attendance},${student.attendedLectures},${student.totalLectures},${getStatusLabel(student.attendance)}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Report exported successfully!');
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Student Reports</h1>
            <p className="text-muted-foreground mt-1">Track and analyze student attendance</p>
          </div>
          <Button className="gap-2" onClick={handleExportReport} disabled={loading || students.length === 0}>
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle>Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {user.subjects?.map((subject) => (
                    <SelectItem key={subject} value={subject.toLowerCase()}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading student reports...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                      <p className="text-3xl font-bold mt-2">{totalStudents}</p>
                    </div>
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Attendance</p>
                      <p className="text-3xl font-bold mt-2">{avgAttendance}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Above 75%</p>
                      <p className="text-3xl font-bold mt-2">{studentsAbove75}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">At Risk</p>
                      <p className="text-3xl font-bold mt-2">{studentsAtRisk}</p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student List */}
            <Card>
              <CardHeader>
                <CardTitle>Student Attendance List</CardTitle>
                <CardDescription>
                  {students.length > 0
                    ? `Detailed attendance records for ${students.length} student${students.length !== 1 ? 's' : ''}`
                    : 'No student records found'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {students.length > 0 ? (
                  <div className="space-y-3">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Semester {student.semester}
                              {student.division && ` • ${student.division}`}
                              {student.rollNumber && ` • Roll: ${student.rollNumber}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {student.attendedLectures} / {student.totalLectures} lectures attended
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{student.attendance}%</p>
                            <p className="text-xs text-muted-foreground">Attendance</p>
                          </div>

                          <Badge className={getStatusColor(student.status)} variant="outline">
                            {getStatusLabel(student.attendance)}
                          </Badge>

                          <div className="w-6">
                            {student.trend === 'up' && <TrendingUp className="w-5 h-5 text-success" />}
                            {student.trend === 'down' && <TrendingDown className="w-5 h-5 text-destructive" />}
                            {student.trend === 'stable' && <div className="w-5 h-px bg-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-2">No student records found</p>
                    <p className="text-sm">
                      {selectedSubject !== 'all' || selectedSemester !== 'all'
                        ? 'Try adjusting your filters or start a lecture to collect attendance data'
                        : 'Start a lecture to begin tracking student attendance'}
                    </p>
                    <Button asChild className="mt-4" size="sm">
                      <a href="/teacher/start-lecture">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Start Your First Lecture
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}