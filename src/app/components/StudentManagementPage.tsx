import React from 'react';
import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { StudentManagement } from './StudentManagement';
import { Home, UserPlus, Users, BarChart } from 'lucide-react';

interface StudentManagementPageProps {
  user: User;
  onLogout: () => void;
}

export function StudentManagementPage({ user, onLogout }: StudentManagementPageProps) {
  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/admin' },
    { label: 'Students', icon: <UserPlus className="w-5 h-5" />, path: '/admin/student-management' },
    { label: 'Users', icon: <Users className="w-5 h-5" />, path: '/admin/users' },
    { label: 'Reports', icon: <BarChart className="w-5 h-5" />, path: '/admin/reports' },
  ];

  return (
    <DashboardLayout
      user={user}
      navItems={navItems}
      onLogout={onLogout}
      currentPath="/admin/student-management"
    >
      <StudentManagement />
    </DashboardLayout>
  );
}