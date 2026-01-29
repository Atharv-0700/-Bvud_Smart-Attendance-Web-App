import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FirebaseErrorScreen } from './components/FirebaseErrorScreen';
import { Login } from './components/Login';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { TeacherClassSelectionDashboard } from './components/TeacherClassSelectionDashboard';
import TeacherRegistration from './components/TeacherRegistration';
import { AdminDashboard } from './components/AdminDashboard';
import { QRScan } from './components/QRScan';
import { AttendanceHistory } from './components/AttendanceHistory';
import { Syllabus } from './components/Syllabus';
import { StartLecture } from './components/StartLecture';
import { TeacherReports } from './components/TeacherReports';
import { TeacherSettings } from './components/TeacherSettings';
import { Toaster } from 'sonner';
import { StudentSettings } from './components/StudentSettings';
import { DeviceManagement } from './components/DeviceManagement';
import { StudentManagementPage } from './components/StudentManagementPage';
import ActiveLectureSession from './components/ActiveLectureSession';
import { initializeSecurityMiddleware, cleanupSecurityMiddleware } from '../services/securityMiddleware';
import { isFirebaseInitialized, getFirebaseError, getFirebaseStatus } from '../config/firebase';

// Smart Attendance System - Updated
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  semester?: number;
  subjects?: string[];
  rollNumber?: string;
  division?: string;
  class_id?: string; // For teachers: "BCA_1A", for students: their class
  profilePhotoUrl?: string | null;
}

// Wrapper component to handle route state for ActiveLectureSession
function ActiveLectureSessionWrapper({ user, onLogout }: { user: User; onLogout: () => void }) {
  const location = useLocation();
  const navigate = Navigate;
  const state = location.state as { sessionId?: string } | null;

  if (!state?.sessionId) {
    return <Navigate to="/teacher" replace />;
  }

  return (
    <ActiveLectureSession 
      sessionId={state.sessionId} 
      onSessionEnd={() => {
        window.location.href = '/teacher';
      }}
    />
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState<Error | null>(null);

  useEffect(() => {
    // Check Firebase initialization status
    const fbInitialized = isFirebaseInitialized();
    const fbError = getFirebaseError();
    const fbStatus = getFirebaseStatus();

    console.log('🔥 Firebase Status:', fbStatus);

    if (fbError) {
      setFirebaseError(fbError);
      setFirebaseReady(false);
      console.warn('⚠️ Firebase not configured:', fbError.message);
      console.warn('📝 Add your API key to /src/config/firebase.ts (line 13)');
    } else if (fbInitialized) {
      setFirebaseReady(true);
      console.log('✅ Firebase ready');
      
      // Initialize security middleware only after Firebase is ready
      try {
        initializeSecurityMiddleware();
      } catch (error) {
        console.warn('Security middleware initialization skipped:', error);
      }
    } else {
      setFirebaseReady(false);
      console.warn('⚠️ Firebase initialization pending');
    }

    // Display helpful setup message in console
    console.log('%c🎓 Smart Attendance System', 'font-size: 20px; font-weight: bold; color: #2563EB;');
    console.log('%c📊 Bharati Vidyapeeth University - BCA', 'font-size: 14px; color: #06B6D4;');
    
    if (fbInitialized) {
      console.log('%c🔒 Enterprise Security: ACTIVE', 'font-size: 14px; font-weight: bold; color: #22C55E;');
    } else {
      console.log('%c⚠️ Configuration Required', 'font-size: 14px; font-weight: bold; color: #F59E0B;');
      console.log('%c📖 Setup Guide:', 'font-weight: bold; color: #3B82F6;');
      console.log('   1. Open /src/config/firebase.ts');
      console.log('   2. Add your Firebase API key on line 13');
      console.log('   3. Save and the app will auto-reload');
    }

    // Cleanup on unmount
    return () => {
      try {
        cleanupSecurityMiddleware();
      } catch (error) {
        // Silently handle cleanup errors
      }
    };
  }, []);

  // Show Firebase error screen if Firebase failed to initialize
  if (!firebaseReady && firebaseError) {
    return (
      <ThemeProvider>
        <FirebaseErrorScreen error={firebaseError} isDevelopment={true} />
      </ThemeProvider>
    );
  }

  // Show loading screen briefly
  if (!firebaseReady) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">Initializing...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={`/${user.role}`} replace />} />
            
            {/* Student Routes */}
            <Route path="/student" element={user?.role === 'student' ? <StudentDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/student/qr-scan" element={user?.role === 'student' ? <QRScan user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/student/attendance" element={user?.role === 'student' ? <AttendanceHistory user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/student/syllabus" element={user?.role === 'student' ? <Syllabus user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/student/settings" element={user?.role === 'student' ? <StudentSettings user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            
            {/* Teacher Routes */}
            <Route path="/teacher" element={user?.role === 'teacher' ? <TeacherClassSelectionDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/start-lecture" element={user?.role === 'teacher' ? <StartLecture user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/reports" element={user?.role === 'teacher' ? <TeacherReports user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/syllabus" element={user?.role === 'teacher' ? <Syllabus user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/settings" element={user?.role === 'teacher' ? <TeacherSettings user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/device-management" element={user?.role === 'teacher' ? <DeviceManagement user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/teacher/class-selection" element={user?.role === 'teacher' ? <TeacherClassSelectionDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route 
              path="/teacher/active-lecture" 
              element={
                user?.role === 'teacher' ? (
                  <ActiveLectureSessionWrapper user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            <Route path="/teacher-registration" element={<TeacherRegistration />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/admin/student-management" element={user?.role === 'admin' ? <StudentManagementPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            
            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </ThemeProvider>
    </ErrorBoundary>
  );
}