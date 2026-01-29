import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, PlayCircle, BarChart3, BookOpen, Users, CheckCircle, Clock, Calendar, Shield, FileEdit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { database } from '../../config/firebase';
import { ref, query, orderByChild, equalTo, onValue, off, get } from 'firebase/database';

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

interface Lecture {
  lectureId: string;
  subject: string;
  semester: number;
  timestamp: string;
  active: boolean;
  studentsCount: number;
  enforceLocation?: boolean;
}

export function TeacherDashboard({ user, onLogout }: TeacherDashboardProps) {
  const [todayLectures, setTodayLectures] = useState<Lecture[]>([]);
  const [totalLectures, setTotalLectures] = useState(0);
  const [totalStudentsMarked, setTotalStudentsMarked] = useState(0);
  const [activeLectures, setActiveLectures] = useState(0);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/teacher' },
    { label: 'Start Lecture', icon: <PlayCircle className="w-5 h-5" />, path: '/teacher/start-lecture' },
    { label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/reports' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/syllabus' },
    { label: 'Device Security', icon: <Shield className="w-5 h-5" />, path: '/teacher/device-management' },
  ];

  useEffect(() => {
    loadDashboardData();

    // Real-time listener for lectures
    const lecturesRef = ref(database, 'lectures');
    const teacherLecturesQuery = query(lecturesRef, orderByChild('teacherId'), equalTo(user.id));
    
    const unsubscribe = onValue(teacherLecturesQuery, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        processLectureData(data);
      } else {
        setTodayLectures([]);
        setTotalLectures(0);
        setTotalStudentsMarked(0);
        setActiveLectures(0);
      }
      setLoading(false);
    });

    return () => {
      off(lecturesRef);
    };
  }, [user.id]);

  const loadDashboardData = async () => {
    try {
      const lecturesRef = ref(database, 'lectures');
      const teacherLecturesQuery = query(lecturesRef, orderByChild('teacherId'), equalTo(user.id));
      const snapshot = await get(teacherLecturesQuery);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        processLectureData(data);
      } else {
        // No lectures found - reset to defaults
        setTodayLectures([]);
        setTotalLectures(0);
        setTotalStudentsMarked(0);
        setActiveLectures(0);
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      
      // Check if it's an index error
      if (error?.message?.includes('Index not defined') || error?.message?.includes('indexOn')) {
        console.error('');
        console.error('🚨 FIREBASE INDEXING ERROR DETECTED!');
        console.error('');
        console.error('📖 QUICK FIX (5 minutes):');
        console.error('1. Go to: https://console.firebase.google.com/project/athgo-5b01d/database/athgo-5b01d-default-rtdb/rules');
        console.error('2. Copy rules from /firebase-database-rules.json');
        console.error('3. Click Publish');
        console.error('');
        console.error('📄 Detailed guide: Open /FIREBASE_RULES_FIX_NOW.md');
        console.error('');
        
        // Still try to load data without optimization
        try {
          const lecturesRef = ref(database, 'lectures');
          const allSnapshot = await get(lecturesRef);
          
          if (allSnapshot.exists()) {
            const allData = allSnapshot.val();
            // Manually filter for teacher's lectures
            const filteredData: any = {};
            Object.entries(allData).forEach(([id, lecture]: [string, any]) => {
              if (lecture.teacherId === user.id) {
                filteredData[id] = lecture;
              }
            });
            
            if (Object.keys(filteredData).length > 0) {
              processLectureData(filteredData);
            }
          }
        } catch (fallbackError) {
          console.error('Fallback load also failed:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const processLectureData = (data: any) => {
    const lectures: Lecture[] = [];
    let totalStudents = 0;
    let activeCount = 0;
    const today = new Date().toDateString();

    for (const [lectureId, lectureData] of Object.entries(data)) {
      const lecture = lectureData as any;
      const lectureDate = new Date(lecture.timestamp);
      
      // Count students marked in this lecture
      const studentsCount = lecture.students ? Object.keys(lecture.students).length : 0;
      totalStudents += studentsCount;

      // Count active lectures
      if (lecture.active) {
        activeCount++;
      }

      // Add to today's lectures if it's from today
      if (lectureDate.toDateString() === today) {
        lectures.push({
          lectureId,
          subject: lecture.subject,
          semester: lecture.semester,
          timestamp: lecture.timestamp,
          active: lecture.active,
          studentsCount,
          enforceLocation: lecture.enforceLocation,
        });
      }
    }

    // Sort by timestamp (newest first)
    lectures.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setTodayLectures(lectures);
    setTotalLectures(Object.keys(data).length);
    setTotalStudentsMarked(totalStudents);
    setActiveLectures(activeCount);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const stats = [
    { label: "Today's Lectures", value: todayLectures.length.toString(), icon: Calendar, color: 'text-primary' },
    { label: 'Active Lectures', value: activeLectures.toString(), icon: Clock, color: 'text-success' },
    { label: 'Total Lectures', value: totalLectures.toString(), icon: PlayCircle, color: 'text-secondary' },
    { label: 'Students Marked', value: totalStudentsMarked.toString(), icon: CheckCircle, color: 'text-accent' },
  ];

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-semibold">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground mt-1">
            BCA Department • {user.subjects?.join(', ')}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your lectures and attendance</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button asChild size="lg" className="h-auto py-4">
              <Link to="/teacher/start-lecture" className="flex flex-col items-center gap-2">
                <PlayCircle className="w-8 h-8" />
                <div className="text-center">
                  <div>Start New Lecture</div>
                  <div className="text-xs opacity-80 font-normal">Generate QR for attendance</div>
                </div>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto py-4">
              <Link to="/teacher/reports" className="flex flex-col items-center gap-2">
                <BarChart3 className="w-8 h-8" />
                <div className="text-center">
                  <div>View Reports</div>
                  <div className="text-xs opacity-80 font-normal">Check student attendance</div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Today's Lectures */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Today's Lectures</CardTitle>
            <CardDescription>{formatDate(new Date().toISOString())}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50 animate-spin" />
                <p>Loading lectures...</p>
              </div>
            ) : todayLectures.length > 0 ? (
              <div className="space-y-3">
                {todayLectures.map((lecture) => (
                  <div
                    key={lecture.lectureId}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[80px]">
                        <p className="text-sm font-medium">{formatTime(lecture.timestamp)}</p>
                        <p className="text-xs text-muted-foreground">
                          Sem {lecture.semester}
                        </p>
                      </div>
                      <div className="h-12 w-px bg-border" />
                      <div>
                        <p className="font-semibold">{lecture.subject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {lecture.studentsCount} students marked
                          </p>
                          {lecture.enforceLocation === false && (
                            <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                              Location OFF
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {lecture.active ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No lectures scheduled for today</p>
                <p className="text-sm mt-1">Start a new lecture to begin marking attendance</p>
                <Button asChild className="mt-4" size="sm">
                  <Link to="/teacher/start-lecture">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start Lecture
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {!loading && totalLectures > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
              <CardDescription>Your recent teaching statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <PlayCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Total Lectures Conducted</p>
                      <p className="text-sm text-muted-foreground">All time</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{totalLectures}</p>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">Total Attendance Marked</p>
                      <p className="text-sm text-muted-foreground">All lectures combined</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{totalStudentsMarked}</p>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium">Average Students Per Lecture</p>
                      <p className="text-sm text-muted-foreground">Based on all lectures</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {totalLectures > 0 ? Math.round(totalStudentsMarked / totalLectures) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}