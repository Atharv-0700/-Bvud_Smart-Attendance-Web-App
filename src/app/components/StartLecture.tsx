import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, PlayCircle, BarChart3, BookOpen, Timer, Users, MapPin, Shield, FileEdit } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useState, useEffect } from 'react';
import { Progress } from './ui/progress';
import QRCode from 'qrcode';
import { database } from '../../config/firebase';
import { ref, set, push, onValue, off, get } from 'firebase/database';
import { toast } from 'sonner';

interface StartLectureProps {
  user: User;
  onLogout: () => void;
}

export function StartLecture({ user, onLogout }: StartLectureProps) {
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [lectureStarted, setLectureStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [lectureId, setLectureId] = useState('');
  const [studentsMarked, setStudentsMarked] = useState(0);
  const [enforceLocation, setEnforceLocation] = useState(true); // NEW: Location enforcement toggle

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/teacher' },
    { label: 'Start Lecture', icon: <PlayCircle className="w-5 h-5" />, path: '/teacher/start-lecture' },
    { label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/reports' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/syllabus' },
    { label: 'Device Security', icon: <Shield className="w-5 h-5" />, path: '/teacher/device-management' },
  ];

  useEffect(() => {
    if (lectureStarted && lectureId) {
      // Listen for real-time attendance updates
      const lectureRef = ref(database, `lectures/${lectureId}/students`);
      const unsubscribe = onValue(lectureRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setStudentsMarked(Object.keys(data).length);
        } else {
          setStudentsMarked(0);
        }
      });

      return () => {
        off(lectureRef);
      };
    }
  }, [lectureStarted, lectureId]);

  useEffect(() => {
    if (lectureStarted && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && lectureStarted) {
      toast.info('QR code expired. Refresh to generate a new code.');
    }
  }, [timeLeft, lectureStarted]);

  const handleStartLecture = async () => {
    if (!subject || !semester) {
      toast.error('Please select subject and semester');
      return;
    }

    try {
      // Capture teacher's live GPS coordinates
      toast.info('Capturing your location...');
      
      let teacherLocation = null;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            (error) => {
              console.error('[TEACHER GPS] Error getting location:', error);
              reject(error);
            },
            {
              enableHighAccuracy: true, // Use GPS + high accuracy
              timeout: 20000,
              maximumAge: 0,
            }
          );
        });

        teacherLocation = {
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy),
          timestamp: new Date().toISOString(),
        };

        console.log('[TEACHER GPS] ✅ Teacher location captured:', {
          latitude: teacherLocation.latitude.toFixed(6),
          longitude: teacherLocation.longitude.toFixed(6),
          accuracy: `${teacherLocation.accuracy.toFixed(2)}m`,
        });

        toast.success('Location captured! Generating QR code...');
      } catch (locationError) {
        console.error('[TEACHER GPS] Failed to get teacher location:', locationError);
        toast.warning('Could not capture your location. Students will use campus-level validation instead.');
      }

      // Generate unique lecture ID
      const lecturesRef = ref(database, 'lectures');
      const newLectureRef = push(lecturesRef);
      const newLectureId = newLectureRef.key;

      if (!newLectureId) {
        toast.error('Failed to create lecture');
        return;
      }

      const lectureData = {
        teacherId: user.id,
        teacherName: user.name,
        subject,
        semester: parseInt(semester),
        timestamp: new Date().toISOString(),
        active: true,
        expiresAt: new Date(Date.now() + 120000).toISOString(), // 2 minutes
        enforceLocation: enforceLocation, // NEW: Add location enforcement to lecture data
        teacherLocation: teacherLocation, // NEW: Store teacher's GPS coordinates
      };

      // Save lecture data to Firebase
      await set(newLectureRef, lectureData);

      // Generate QR code with lecture ID
      const qrData = JSON.stringify({
        lectureId: newLectureId,
        subject,
        semester,
        teacherId: user.id,
        timestamp: Date.now(),
      });

      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#2563EB',
          light: '#FFFFFF',
        },
      });

      setQrCodeUrl(qrUrl);
      setLectureId(newLectureId);
      setLectureStarted(true);
      setTimeLeft(120);
      
      toast.success('Lecture started! QR code generated');
    } catch (error) {
      console.error('Error starting lecture:', error);
      toast.error('Failed to start lecture. Please try again.');
    }
  };

  const handleStopLecture = async () => {
    if (lectureId) {
      try {
        // Mark lecture as inactive
        await set(ref(database, `lectures/${lectureId}/active`), false);
        toast.success(`Lecture ended. ${studentsMarked} students marked present.`);
      } catch (error) {
        console.error('Error stopping lecture:', error);
      }
    }
    
    setLectureStarted(false);
    setTimeLeft(120);
    setQrCodeUrl('');
    setLectureId('');
    setStudentsMarked(0);
    setSubject('');
    setSemester('');
  };

  const handleRefreshQR = async () => {
    if (!lectureId) return;

    try {
      // Update expiry time
      await set(ref(database, `lectures/${lectureId}/expiresAt`), new Date(Date.now() + 120000).toISOString());
      
      // Regenerate QR code
      const qrData = JSON.stringify({
        lectureId,
        subject,
        semester,
        teacherId: user.id,
        timestamp: Date.now(),
      });

      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#2563EB',
          light: '#FFFFFF',
        },
      });

      setQrCodeUrl(qrUrl);
      setTimeLeft(120);
      toast.success('QR code refreshed!');
    } catch (error) {
      console.error('Error refreshing QR:', error);
      toast.error('Failed to refresh QR code');
    }
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Start New Lecture</h1>
          <p className="text-muted-foreground mt-1">Generate QR code for attendance marking</p>
        </div>

        {!lectureStarted ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Lecture Details</CardTitle>
              <CardDescription>Select subject and semester to begin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {user.subjects?.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Semester</label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger>
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

                {/* NEW: Location enforcement toggle */}
                <Card className={`border-2 ${enforceLocation ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${enforceLocation ? 'bg-success/10' : 'bg-warning/10'}`}>
                          {enforceLocation ? (
                            <Shield className="w-5 h-5 text-success" />
                          ) : (
                            <MapPin className="w-5 h-5 text-warning" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Label className="text-base font-semibold cursor-pointer">
                            100-Meter Location Enforcement
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {enforceLocation 
                              ? '✅ Students must be on campus within 100m to mark attendance'
                              : '⚠️ Students can mark attendance from anywhere'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          id="enforce-location-toggle"
                          checked={enforceLocation}
                          onCheckedChange={setEnforceLocation}
                          className="data-[state=checked]:bg-success"
                        />
                        <span className={`text-xs font-medium ${enforceLocation ? 'text-success' : 'text-warning'}`}>
                          {enforceLocation ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button
                onClick={handleStartLecture}
                disabled={!subject || !semester}
                className="w-full"
                size="lg"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                Start Lecture
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* QR Code Display */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{subject}</CardTitle>
                    <CardDescription>Semester {semester} • Active Session</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-primary">
                    <Timer className="w-5 h-5" />
                    <span className="text-2xl font-bold">{timeLeft}s</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Large QR Code */}
                <div className="aspect-square max-w-md mx-auto bg-white p-8 rounded-lg shadow-inner flex items-center justify-center">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Attendance QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg flex items-center justify-center border-4 border-primary">
                      <p className="text-muted-foreground">Generating QR Code...</p>
                    </div>
                  )}
                </div>

                {/* Timer Ring */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time Remaining</span>
                    <span className="font-medium">{timeLeft}s / 120s</span>
                  </div>
                  <Progress value={(timeLeft / 120) * 100} className="h-2" />
                </div>

                {/* Instructions */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Instructions for Students
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open the Smart Attendance app on your device</li>
                    <li>Navigate to "Scan QR" section</li>
                    <li>Scan this QR code within {timeLeft} seconds</li>
                    <li>Wait for confirmation message</li>
                  </ol>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={handleStopLecture} variant="destructive" className="flex-1">
                    Stop Lecture
                  </Button>
                  <Button onClick={handleRefreshQR} variant="outline" className="flex-1">
                    Refresh QR (120s)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Live Statistics</CardTitle>
                <CardDescription>Real-time attendance marking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">{studentsMarked}</p>
                    <p className="text-sm text-muted-foreground">Students Marked Present</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-success">{lectureStarted ? 'Active' : 'Inactive'}</p>
                    <p className="text-sm text-muted-foreground">Lecture Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}