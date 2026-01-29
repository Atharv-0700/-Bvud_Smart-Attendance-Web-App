import React, { useState } from 'react';
import loginImage from "../../assets/login.png";
import image_8f475c60ab263c84a45860a35d503e1c9950bfed from "../../assets/image_login.png";
import { User } from '../App';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { GraduationCap, UserCircle, BookOpen, Moon, Sun, Loader2, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { useTheme } from 'next-themes';
import { auth, database } from '../../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { toast } from 'sonner';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { generateDeviceFingerprint, getDeviceDescription } from '../../utils/deviceFingerprint';
import { getTeacherByUID } from '@/services/teacherClassService';

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentSemester, setStudentSemester] = useState('');
  const [studentDivision, setStudentDivision] = useState('');
  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const { theme, setTheme } = useTheme();

  const subjects = [
    'Data Structures',
    'C Programming',
    'Python',
    'DBMS',
    'Web Development',
    'Operating System',
    'Software Engineering',
  ];

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Register new student
        if (!studentName || !studentSemester) {
          toast.error('Please fill all required fields');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, studentEmail, studentPassword);
        const user = userCredential.user;

        // Update profile
        await updateProfile(user, { displayName: studentName });

        // Store user data in database
        await set(ref(database, `users/${user.uid}`), {
          name: studentName,
          email: studentEmail,
          role: 'student',
          semester: parseInt(studentSemester),
          division: studentDivision || '',
          rollNumber: studentRollNumber || '',
          createdAt: new Date().toISOString(),
        });

        toast.success('Account created successfully!');
        
        onLogin({
          id: user.uid,
          name: studentName,
          email: studentEmail,
          role: 'student',
          semester: parseInt(studentSemester),
          rollNumber: studentRollNumber || '',
          division: studentDivision || '',
        });
      } else {
        // Login existing student
        const userCredential = await signInWithEmailAndPassword(auth, studentEmail, studentPassword);
        const user = userCredential.user;

        // Get user data from database
        const userSnapshot = await get(ref(database, `users/${user.uid}`));
        const userData = userSnapshot.val();

        if (!userData || userData.role !== 'student') {
          toast.error('Invalid student credentials');
          await auth.signOut();
          setLoading(false);
          return;
        }

        // Generate device fingerprint
        const fingerprint = await generateDeviceFingerprint();
        const deviceDescription = getDeviceDescription(fingerprint);

        // Check if device is registered
        const deviceRef = ref(database, `devices/${user.uid}`);
        const deviceSnapshot = await get(deviceRef);
        const deviceData = deviceSnapshot.val();

        if (!deviceData) {
          // First login - register device
          await set(deviceRef, {
            deviceId: fingerprint.deviceId,
            description: deviceDescription,
            userAgent: fingerprint.userAgent,
            screenResolution: fingerprint.screenResolution,
            timezone: fingerprint.timezone,
            language: fingerprint.language,
            platform: fingerprint.platform,
            registeredAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          });

          toast.success('Device registered successfully!', {
            description: 'This device has been registered for attendance marking.',
            duration: 5000,
          });
        } else if (deviceData.deviceId !== fingerprint.deviceId) {
          // Device mismatch - block login
          toast.error('Device Not Registered!', {
            description: 'This device is not registered. Contact your teacher to approve this device.',
            duration: 7000,
          });

          // Log the mismatch attempt
          await set(ref(database, `deviceMismatchLogs/${user.uid}/${Date.now()}`), {
            attemptedDeviceId: fingerprint.deviceId,
            registeredDeviceId: deviceData.deviceId,
            description: deviceDescription,
            userAgent: fingerprint.userAgent,
            timestamp: new Date().toISOString(),
            studentName: userData.name,
            studentEmail: userData.email,
            rollNumber: userData.rollNumber || '',
          });

          await auth.signOut();
          setLoading(false);
          return;
        } else {
          // Device match - update last login
          await set(ref(database, `devices/${user.uid}/lastLoginAt`), new Date().toISOString());
        }

        toast.success('Login successful!');
        
        onLogin({
          id: user.uid,
          name: userData.name || user.displayName || 'Student',
          email: userData.email || user.email || '',
          role: 'student',
          semester: userData.semester || 1,
          rollNumber: userData.rollNumber || '',
          division: userData.division || '',
        });
      }
    } catch (error: any) {
      console.error('Student auth error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use. Please login instead.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password');
      } else if (error.code === 'auth/user-not-found') {
        toast.error('User not found. Please register first.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email format');
      } else {
        toast.error('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Register new teacher
        if (!teacherName || teacherSubjects.length === 0) {
          toast.error('Please fill all required fields and select at least one subject');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, teacherEmail, teacherPassword);
        const user = userCredential.user;

        // Update profile
        await updateProfile(user, { displayName: teacherName });

        // Store user data in database
        await set(ref(database, `users/${user.uid}`), {
          name: teacherName,
          email: teacherEmail,
          role: 'teacher',
          subjects: teacherSubjects,
          department: 'BCA',
          createdAt: new Date().toISOString(),
        });

        toast.success('Account created successfully!');
        
        onLogin({
          id: user.uid,
          name: teacherName,
          email: teacherEmail,
          role: 'teacher',
          subjects: teacherSubjects,
        });
      } else {
        // Login existing teacher
        const userCredential = await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
        const user = userCredential.user;

        // Get user data from database
        const userSnapshot = await get(ref(database, `users/${user.uid}`));
        const userData = userSnapshot.val();

        if (!userData || userData.role !== 'teacher') {
          toast.error('Invalid teacher credentials');
          await auth.signOut();
          setLoading(false);
          return;
        }

        toast.success('Login successful!');
        
        onLogin({
          id: user.uid,
          name: userData.name || user.displayName || 'Teacher',
          email: userData.email || user.email || '',
          role: 'teacher',
          subjects: userData.subjects || [],
        });
      }
    } catch (error: any) {
      console.error('Teacher auth error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use. Please login instead.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password. Please check your credentials or register first.');
      } else if (error.code === 'auth/user-not-found') {
        toast.error('User not found. Please register first.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email format');
      } else {
        toast.error('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subject: string) => {
    setTeacherSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-full backdrop-blur-md bg-background/40 hover:bg-background/60 border border-background/20"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      {/* Glassmorphism Login Card - 30% Clarity (70% Blur) */}
      <Card className="w-full max-w-md shadow-2xl z-10 relative backdrop-blur-xl bg-background/70 dark:bg-background/75 border-2 border-white/20 dark:border-white/10">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-20 h-20 flex items-center justify-center overflow-hidden bg-white/90 dark:bg-white/95 rounded-full p-3 backdrop-blur-sm shadow-lg">
            <ImageWithFallback 
              src={image_8f475c60ab263c84a45860a35d503e1c9950bfed}
              alt="Bharati Vidyapeeth University Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl drop-shadow-lg">Smart Attendance System</CardTitle>
          <CardDescription className="drop-shadow">Bharati Vidyapeeth University - BCA Department</CardDescription>
        </CardHeader>
        <CardContent className="backdrop-blur-md bg-background/50 dark:bg-background/60 rounded-lg p-6 m-4 mt-0">
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="student" className="gap-2">
                <GraduationCap className="w-4 h-4" />
                Student
              </TabsTrigger>
              <TabsTrigger value="teacher" className="gap-2">
                <UserCircle className="w-4 h-4" />
                Teacher
              </TabsTrigger>
            </TabsList>

            {/* Student Login/Register */}
            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4">
                {isRegister && (
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Full Name *</Label>
                    <Input 
                      id="student-name" 
                      placeholder="Enter your full name" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      required={isRegister}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="student-email">Email *</Label>
                  <Input
                    id="student-email"
                    type="email"
                    placeholder="student@bvdu.edu"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="student-password"
                      type={showStudentPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowStudentPassword(!showStudentPassword)}
                      size="icon"
                      variant="ghost"
                      tabIndex={-1}
                    >
                      {showStudentPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                {isRegister && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="semester">Semester *</Label>
                      <Select value={studentSemester} onValueChange={setStudentSemester} required>
                        <SelectTrigger id="semester">
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((sem) => (
                            <SelectItem key={sem} value={sem.toString()}>
                              Semester {sem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="division">Division / Batch (Optional)</Label>
                      <Input 
                        id="division" 
                        placeholder="e.g., A, B, Batch 1" 
                        value={studentDivision}
                        onChange={(e) => setStudentDivision(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roll-number">Roll Number (Optional)</Label>
                      <Input 
                        id="roll-number" 
                        placeholder="e.g., 12345" 
                        value={studentRollNumber}
                        onChange={(e) => setStudentRollNumber(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isRegister ? 'Registering...' : 'Logging in...'}
                    </>
                  ) : (
                    <>{isRegister ? 'Register' : 'Login'} as Student</>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
                </button>
              </form>
            </TabsContent>

            {/* Teacher Login/Register */}
            <TabsContent value="teacher">
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                {isRegister && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="teacher-name">Full Name *</Label>
                      <Input
                        id="teacher-name"
                        placeholder="Dr. John Doe"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        required={isRegister}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="teacher-email">Email *</Label>
                  <Input
                    id="teacher-email"
                    type="email"
                    placeholder="teacher@bvdu.edu"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher-password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="teacher-password"
                      type={showTeacherPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                      size="icon"
                      variant="ghost"
                      tabIndex={-1}
                    >
                      {showTeacherPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                {isRegister && (
                  <>
                    <div className="space-y-3">
                      <Label>Subjects Taught *</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {subjects.map((subject) => (
                          <div key={subject} className="flex items-center space-x-2">
                            <Checkbox
                              id={subject}
                              checked={teacherSubjects.includes(subject)}
                              onCheckedChange={() => toggleSubject(subject)}
                            />
                            <label
                              htmlFor={subject}
                              className="text-sm cursor-pointer flex-1 select-none"
                            >
                              {subject}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input value="BCA" disabled className="bg-muted" />
                    </div>
                  </>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isRegister ? 'Registering...' : 'Logging in...'}
                    </>
                  ) : (
                    <>{isRegister ? 'Register' : 'Login'} as Teacher</>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}