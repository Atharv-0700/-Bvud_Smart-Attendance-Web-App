import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, QrCode, History, BookOpen, Settings, User as UserIcon } from 'lucide-react';

interface StudentSettingsProps {
  user: User;
  onLogout: () => void;
}

export function StudentSettings({ user, onLogout }: StudentSettingsProps) {
  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/student' },
    { label: 'Scan QR', icon: <QrCode className="w-5 h-5" />, path: '/student/qr-scan' },
    { label: 'Attendance History', icon: <History className="w-5 h-5" />, path: '/student/attendance' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/student/syllabus' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/student/settings' },
  ];

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Semester</p>
                <p className="font-medium">Semester {user.semester}</p>
              </div>
              {user.rollNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Roll Number</p>
                  <p className="font-medium">{user.rollNumber}</p>
                </div>
              )}
              {user.division && (
                <div>
                  <p className="text-sm text-muted-foreground">Division</p>
                  <p className="font-medium">{user.division}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}