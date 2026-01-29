import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Home, QrCode, History, BookOpen, Loader2, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { database } from '../../config/firebase';
import { ref, get } from 'firebase/database';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
}

interface RecentActivity {
  lectureId: string;
  subject: string;
  timestamp: string;
  teacherName: string;
}

export function StudentDashboard({ user, onLogout }: StudentDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [classesAttended, setClassesAttended] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const attendanceColor = attendancePercentage >= 75 ? 'text-success' : attendancePercentage >= 70 ? 'text-warning' : 'text-destructive';
  const attendanceBgColor = attendancePercentage >= 75 ? 'bg-success' : attendancePercentage >= 70 ? 'bg-warning' : 'bg-destructive';

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/student' },
    { label: 'Scan QR', icon: <QrCode className="w-5 h-5" />, path: '/student/qr-scan' },
    { label: 'Attendance History', icon: <History className="w-5 h-5" />, path: '/student/attendance' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/student/syllabus' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/student/settings' },
  ];

  useEffect(() => {
    loadDashboardData();
  }, [user.id, user.semester]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load student's attendance
      const studentAttendanceRef = ref(database, `studentAttendance/${user.id}`);
      const snapshot = await get(studentAttendanceRef);

      let attended = 0;
      const activities: RecentActivity[] = [];

      if (snapshot.exists()) {
        const data = snapshot.val();
        attended = Object.keys(data).length;

        // Get recent 4 activities
        const sorted = Object.entries(data)
          .sort((a: any, b: any) => {
            const timeA = new Date(a[1].timestamp).getTime();
            const timeB = new Date(b[1].timestamp).getTime();
            return timeB - timeA;
          })
          .slice(0, 4);

        sorted.forEach(([lectureId, record]: [string, any]) => {
          activities.push({
            lectureId,
            subject: record.subject || 'Unknown',
            timestamp: record.timestamp || new Date().toISOString(),
            teacherName: record.teacherName || 'Unknown',
          });
        });
      }

      // Load total lectures for student's semester
      const lecturesRef = ref(database, 'lectures');
      const lecturesSnapshot = await get(lecturesRef);

      let total = 0;
      if (lecturesSnapshot.exists()) {
        const lecturesData = lecturesSnapshot.val();
        total = Object.values(lecturesData).filter(
          (lecture: any) => lecture.semester === user.semester
        ).length;
      }

      setClassesAttended(attended);
      setTotalClasses(total);
      setAttendancePercentage(total > 0 ? Math.round((attended / total) * 100) : 0);
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const actionCards = [
    {
      title: 'Scan Attendance QR',
      description: 'Mark your attendance for today\'s lecture',
      icon: <QrCode className="w-8 h-8" />,
      link: '/student/qr-scan',
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Attendance History',
      description: 'View your detailed attendance records',
      icon: <History className="w-8 h-8" />,
      link: '/student/attendance',
      color: 'bg-secondary/10 text-secondary',
    },
    {
      title: 'BCA Syllabus',
      description: 'Explore semester-wise course structure',
      icon: <BookOpen className="w-8 h-8" />,
      link: '/student/syllabus',
      color: 'bg-success/10 text-success',
    },
  ];

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-semibold">Welcome back, {user.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground mt-1">
            Semester {user.semester} • BCA Department
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading dashboard...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Attendance Overview Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
                <CardDescription>Your overall attendance this semester</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Overall Attendance</p>
                    <p className={`text-4xl font-bold ${attendanceColor}`}>{attendancePercentage}%</p>
                  </div>
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center ${attendanceBgColor}/10`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${attendanceBgColor}/20`}>
                      <span className={`text-2xl font-bold ${attendanceColor}`}>{attendancePercentage}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress value={attendancePercentage} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Target: 75%</span>
                    <span>{attendancePercentage >= 75 ? '✓ On track' : '⚠ Below target'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Classes Attended</p>
                    <p className="text-xl font-semibold">{classesAttended}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Classes</p>
                    <p className="text-xl font-semibold">{totalClasses}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Classes Missed</p>
                    <p className="text-xl font-semibold text-destructive">{totalClasses - classesAttended}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Cards */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actionCards.map((card) => (
                  <Link key={card.title} to={card.link}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${card.color}`}>
                            {card.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{card.title}</h3>
                            <p className="text-sm text-muted-foreground">{card.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div key={activity.lectureId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-success" />
                            <div>
                              <p className="font-medium">{activity.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                Attended • {formatDate(activity.timestamp)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-success/10 text-success">
                            Present
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4" asChild>
                      <Link to="/student/attendance">View All History</Link>
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No attendance records yet</p>
                    <p className="text-sm">Start scanning QR codes to build your attendance history</p>
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