import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Home, Users, BookOpen, TrendingUp, BarChart, Loader2, UserPlus } from 'lucide-react';
import { database } from '../../config/firebase';
import { ref, get } from 'firebase/database';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [totalLectures, setTotalLectures] = useState(0);
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [overallAttendancePercentage, setOverallAttendancePercentage] = useState(0);

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/admin' },
    { label: 'Students', icon: <UserPlus className="w-5 h-5" />, path: '/admin/student-management' },
    { label: 'Users', icon: <Users className="w-5 h-5" />, path: '/admin/users' },
    { label: 'Reports', icon: <BarChart className="w-5 h-5" />, path: '/admin/reports' },
  ];

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Load users
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      let students = 0;
      let teachers = 0;
      
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        Object.values(usersData).forEach((userData: any) => {
          if (userData.role === 'student') students++;
          if (userData.role === 'teacher') teachers++;
        });
      }

      // Load lectures
      const lecturesRef = ref(database, 'lectures');
      const lecturesSnapshot = await get(lecturesRef);
      
      let lectures = 0;
      let attendanceMarks = 0;
      
      if (lecturesSnapshot.exists()) {
        const lecturesData = lecturesSnapshot.val();
        lectures = Object.keys(lecturesData).length;
        
        // Count total attendance marks
        Object.values(lecturesData).forEach((lecture: any) => {
          if (lecture.students) {
            attendanceMarks += Object.keys(lecture.students).length;
          }
        });
      }

      // Calculate overall attendance percentage
      const avgPercentage = lectures > 0 && students > 0
        ? Math.round((attendanceMarks / (lectures * students)) * 100)
        : 0;

      setTotalStudents(students);
      setTotalTeachers(teachers);
      setTotalLectures(lectures);
      setTotalAttendance(attendanceMarks);
      setOverallAttendancePercentage(avgPercentage);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Total Students', value: totalStudents.toString(), icon: Users, color: 'text-primary' },
    { label: 'Total Teachers', value: totalTeachers.toString(), icon: Users, color: 'text-secondary' },
    { label: 'Overall Attendance', value: `${overallAttendancePercentage}%`, icon: TrendingUp, color: 'text-success' },
    { label: 'Total Lectures', value: totalLectures.toString(), icon: BookOpen, color: 'text-warning' },
  ];

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">BCA Department Overview</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading admin dashboard...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold mt-2">{stat.value}</p>
                      </div>
                      <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Student Statistics</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>• {totalStudents} registered students</p>
                        <p>• {totalAttendance} total attendance marks</p>
                        <p>• {totalStudents > 0 ? Math.round(totalAttendance / totalStudents) : 0} avg attendance per student</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Teacher Statistics</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>• {totalTeachers} registered teachers</p>
                        <p>• {totalLectures} total lectures conducted</p>
                        <p>• {totalTeachers > 0 ? Math.round(totalLectures / totalTeachers) : 0} avg lectures per teacher</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}