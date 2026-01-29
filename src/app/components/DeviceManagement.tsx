import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, PlayCircle, BarChart3, BookOpen, Settings, Smartphone, Shield, AlertTriangle, CheckCircle, XCircle, Loader2, FileEdit } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { database } from '../../config/firebase';
import { ref, get, set, remove } from 'firebase/database';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface DeviceManagementProps {
  user: User;
  onLogout: () => void;
}

interface StudentDevice {
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string;
  semester: number;
  deviceId?: string;
  description?: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  registeredAt?: string;
  lastLoginAt?: string;
}

interface DeviceMismatchLog {
  id: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string;
  attemptedDeviceId: string;
  registeredDeviceId: string;
  description: string;
  userAgent: string;
  timestamp: string;
}

export function DeviceManagement({ user, onLogout }: DeviceManagementProps) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentDevice[]>([]);
  const [mismatchLogs, setMismatchLogs] = useState<DeviceMismatchLog[]>([]);
  const [resettingDevice, setResettingDevice] = useState<string | null>(null);

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/teacher' },
    { label: 'Start Lecture', icon: <PlayCircle className="w-5 h-5" />, path: '/teacher/start-lecture' },
    { label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/reports' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/syllabus' },
    { label: 'Device Security', icon: <Shield className="w-5 h-5" />, path: '/teacher/device-management' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/teacher/settings' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all students
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      const usersData = usersSnapshot.val();

      if (usersData) {
        const studentDevices: StudentDevice[] = [];

        for (const uid in usersData) {
          const userData = usersData[uid];
          if (userData.role === 'student') {
            // Get device info for this student
            const deviceRef = ref(database, `devices/${uid}`);
            const deviceSnapshot = await get(deviceRef);
            const deviceData = deviceSnapshot.val();

            studentDevices.push({
              studentId: uid,
              studentName: userData.name || 'Unknown',
              studentEmail: userData.email || '',
              rollNumber: userData.rollNumber || 'N/A',
              semester: userData.semester || 0,
              deviceId: deviceData?.deviceId,
              description: deviceData?.description,
              userAgent: deviceData?.userAgent,
              screenResolution: deviceData?.screenResolution,
              timezone: deviceData?.timezone,
              language: deviceData?.language,
              platform: deviceData?.platform,
              registeredAt: deviceData?.registeredAt,
              lastLoginAt: deviceData?.lastLoginAt,
            });
          }
        }

        // Sort by semester then by name
        studentDevices.sort((a, b) => {
          if (a.semester !== b.semester) return a.semester - b.semester;
          return a.studentName.localeCompare(b.studentName);
        });

        setStudents(studentDevices);
      }

      // Load mismatch logs
      const logsRef = ref(database, 'deviceMismatchLogs');
      const logsSnapshot = await get(logsRef);
      const logsData = logsSnapshot.val();

      if (logsData) {
        const logs: DeviceMismatchLog[] = [];
        
        for (const studentId in logsData) {
          const studentLogs = logsData[studentId];
          for (const logId in studentLogs) {
            logs.push({
              id: `${studentId}-${logId}`,
              ...studentLogs[logId],
            });
          }
        }

        // Sort by timestamp descending (newest first)
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMismatchLogs(logs);
      }

    } catch (error) {
      console.error('Error loading device data:', error);
      toast.error('Failed to load device information');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDevice = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to reset the device registration for ${studentName}?\n\nThey will be able to register a new device on their next login.`)) {
      return;
    }

    setResettingDevice(studentId);
    try {
      // Remove device registration
      const deviceRef = ref(database, `devices/${studentId}`);
      await remove(deviceRef);

      toast.success(`Device reset successful for ${studentName}`, {
        description: 'Student can now register a new device on next login.',
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error resetting device:', error);
      toast.error('Failed to reset device registration');
    } finally {
      setResettingDevice(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const registeredStudents = students.filter(s => s.deviceId);
  const unregisteredStudents = students.filter(s => !s.deviceId);

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold">Device Security Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage student device registrations and monitor security attempts
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading device information...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Smartphone className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold">{students.length}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Devices Registered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <CheckCircle className="w-6 h-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold">{registeredStudents.length}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Security Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="text-3xl font-bold">{mismatchLogs.length}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="registered" className="w-full">
              <TabsList>
                <TabsTrigger value="registered">
                  Registered Devices ({registeredStudents.length})
                </TabsTrigger>
                <TabsTrigger value="unregistered">
                  Not Registered ({unregisteredStudents.length})
                </TabsTrigger>
                <TabsTrigger value="alerts">
                  Security Alerts ({mismatchLogs.length})
                </TabsTrigger>
              </TabsList>

              {/* Registered Devices Tab */}
              <TabsContent value="registered" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Students with Registered Devices</CardTitle>
                    <CardDescription>
                      These students have successfully registered their devices for attendance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {registeredStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No registered devices yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {registeredStudents.map((student) => (
                          <Card key={student.studentId} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{student.studentName}</h3>
                                    <Badge variant="secondary">Sem {student.semester}</Badge>
                                    <Badge variant="outline">{student.rollNumber}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{student.studentEmail}</p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Device:</span>
                                      <br />
                                      <span className="font-mono text-xs">{student.description}</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Screen:</span>
                                      <br />
                                      <span className="font-mono text-xs">{student.screenResolution}</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Registered:</span>
                                      <br />
                                      <span>{formatDate(student.registeredAt)}</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Last Login:</span>
                                      <br />
                                      <span>{formatDate(student.lastLoginAt)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleResetDevice(student.studentId, student.studentName)}
                                  disabled={resettingDevice === student.studentId}
                                >
                                  {resettingDevice === student.studentId ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Resetting...
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reset Device
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Unregistered Devices Tab */}
              <TabsContent value="unregistered" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Students Without Registered Devices</CardTitle>
                    <CardDescription>
                      These students need to login to register their device
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {unregisteredStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                        <p>All students have registered their devices!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {unregisteredStudents.map((student) => (
                          <div
                            key={student.studentId}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{student.studentName}</p>
                                <Badge variant="secondary">Sem {student.semester}</Badge>
                                <Badge variant="outline">{student.rollNumber}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{student.studentEmail}</p>
                            </div>
                            <Badge variant="outline" className="text-warning">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Not Registered
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Alerts Tab */}
              <TabsContent value="alerts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Device Mismatch Attempts</CardTitle>
                    <CardDescription>
                      Log of all unauthorized device login attempts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {mismatchLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="w-12 h-12 mx-auto mb-2 text-success" />
                        <p>No security alerts - all logins are from registered devices!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mismatchLogs.map((log) => (
                          <Card key={log.id} className="border-destructive/50 bg-destructive/5">
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                    <div>
                                      <p className="font-semibold">{log.studentName}</p>
                                      <p className="text-sm text-muted-foreground">{log.studentEmail}</p>
                                    </div>
                                  </div>
                                  <Badge variant="destructive">Blocked</Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Attempted Device:</span>
                                    <br />
                                    <span className="font-mono text-xs">{log.description}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Attempt Time:</span>
                                    <br />
                                    <span>{formatDate(log.timestamp)}</span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t">
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-semibold">Security Note:</span> This student tried to login from a different device. 
                                    Their registered device has been protected.
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Information Card */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Device Security Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>🔒 How it works:</strong> Each student can only mark attendance from their registered device. 
              The system uses advanced browser fingerprinting to create a unique device ID.
            </p>
            <p>
              <strong>🛡️ Security:</strong> If a student tries to login from a different device, they will be blocked 
              and you will see it in the Security Alerts tab.
            </p>
            <p>
              <strong>🔄 Reset Device:</strong> Use the "Reset Device" button to allow a student to register a new device 
              (e.g., if they got a new computer or browser).
            </p>
            <p>
              <strong>⚠️ Important:</strong> Resetting a device will allow the student to login from a different device 
              on their next login attempt.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}