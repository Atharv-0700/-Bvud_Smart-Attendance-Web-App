import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, QrCode, History, BookOpen, Calendar, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState, useEffect } from 'react';
import { database } from '../../config/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';

interface AttendanceHistoryProps {
  user: User;
  onLogout: () => void;
}

interface SubjectStats {
  name: string;
  attended: number;
  total: number;
  percentage: number;
}

interface AttendanceRecord {
  lectureId: string;
  date: string;
  subject: string;
  status: string;
  time: string;
  teacherName: string;
}

export function AttendanceHistory({ user, onLogout }: AttendanceHistoryProps) {
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/student' },
    { label: 'Scan QR', icon: <QrCode className="w-5 h-5" />, path: '/student/qr-scan' },
    { label: 'Attendance History', icon: <History className="w-5 h-5" />, path: '/student/attendance' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/student/syllabus' },
  ];

  useEffect(() => {
    loadAttendanceData();
  }, [user.id, user.semester]);

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      // Load student's attendance records
      const studentAttendanceRef = ref(database, `studentAttendance/${user.id}`);
      const snapshot = await get(studentAttendanceRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const records: AttendanceRecord[] = [];
        const subjectMap: Record<string, { attended: number; total: number }> = {};

        // Process attendance records
        for (const [lectureId, record] of Object.entries(data)) {
          const recordData = record as any;
          records.push({
            lectureId,
            date: new Date(recordData.timestamp).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            subject: recordData.subject,
            status: 'present',
            time: new Date(recordData.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            teacherName: recordData.teacherName || 'Unknown',
          });

          // Count by subject
          if (!subjectMap[recordData.subject]) {
            subjectMap[recordData.subject] = { attended: 0, total: 0 };
          }
          subjectMap[recordData.subject].attended++;
        }

        // Load all lectures for the student's semester to calculate total
        const lecturesRef = ref(database, 'lectures');
        const lecturesSnapshot = await get(lecturesRef);

        if (lecturesSnapshot.exists()) {
          const lecturesData = lecturesSnapshot.val();
          
          for (const [lectureId, lecture] of Object.entries(lecturesData)) {
            const lectureInfo = lecture as any;
            
            // Only count lectures from the student's semester
            if (lectureInfo.semester === user.semester) {
              if (!subjectMap[lectureInfo.subject]) {
                subjectMap[lectureInfo.subject] = { attended: 0, total: 0 };
              }
              subjectMap[lectureInfo.subject].total++;
            }
          }
        }

        // Convert to stats array
        const stats: SubjectStats[] = Object.entries(subjectMap).map(([subject, data]) => ({
          name: subject,
          attended: data.attended,
          total: data.total,
          percentage: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
        }));

        // Sort records by date (newest first)
        records.sort((a, b) => {
          const dateA = new Date(a.date + ' ' + a.time);
          const dateB = new Date(b.date + ' ' + b.time);
          return dateB.getTime() - dateA.getTime();
        });

        setSubjectStats(stats);
        setAttendanceRecords(records);
      } else {
        setSubjectStats([]);
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = selectedSubject === 'all' 
    ? attendanceRecords 
    : attendanceRecords.filter(r => r.subject.toLowerCase() === selectedSubject.toLowerCase());

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Attendance History</h1>
          <p className="text-muted-foreground mt-1">Track your attendance records</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading attendance data...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Subject-wise Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>Subject-wise Attendance</CardTitle>
                <CardDescription>Attendance breakdown by subject for Semester {user.semester}</CardDescription>
              </CardHeader>
              <CardContent>
                {subjectStats.length > 0 ? (
                  <div className="space-y-4">
                    {subjectStats.map((subject) => {
                      const color = subject.percentage >= 75 ? 'success' : subject.percentage >= 70 ? 'warning' : 'destructive';
                      const bgColor = subject.percentage >= 75 ? 'bg-success' : subject.percentage >= 70 ? 'bg-warning' : 'bg-destructive';
                      const textColor = subject.percentage >= 75 ? 'text-success' : subject.percentage >= 70 ? 'text-warning' : 'text-destructive';
                      return (
                        <div key={subject.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{subject.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {subject.attended} / {subject.total} classes
                              </p>
                            </div>
                            <div className={textColor}>
                              {subject.percentage}%
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${bgColor} transition-all`}
                              style={{ width: `${subject.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No attendance records found</p>
                    <p className="text-sm">Start scanning QR codes to track your attendance</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Records */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Attendance Records</CardTitle>
                    <CardDescription>Detailed attendance history</CardDescription>
                  </div>
                  {subjectStats.length > 0 && (
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjectStats.map((subject) => (
                          <SelectItem key={subject.name} value={subject.name.toLowerCase()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredRecords.length > 0 ? (
                  <div className="space-y-3">
                    {filteredRecords.map((record) => (
                      <div
                        key={record.lectureId}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-20">
                            <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-sm font-medium">{record.date.split(',')[0]}</p>
                            <p className="text-xs text-muted-foreground">{record.date.split(',')[1]?.trim()}</p>
                          </div>
                          <div className="h-12 w-px bg-border" />
                          <div>
                            <p className="font-medium">{record.subject}</p>
                            <p className="text-sm text-muted-foreground">{record.time} • {record.teacherName}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                          Present
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No records found</p>
                    {selectedSubject !== 'all' && (
                      <p className="text-sm">Try selecting a different subject</p>
                    )}
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