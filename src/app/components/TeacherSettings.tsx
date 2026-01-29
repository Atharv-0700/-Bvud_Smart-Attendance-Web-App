import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, PlayCircle, BarChart3, BookOpen, Settings, Link2, Save, Check, MapPin, Shield, FileEdit } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { useState, useEffect } from 'react';
import { database } from '../../config/firebase';
import { ref, set, get, onValue, off } from 'firebase/database';
import { toast } from 'sonner';

interface TeacherSettingsProps {
  user: User;
  onLogout: () => void;
}

export function TeacherSettings({ user, onLogout }: TeacherSettingsProps) {
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [enforceLocation, setEnforceLocation] = useState(true); // Default: ENABLED
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/teacher' },
    { label: 'Start Lecture', icon: <PlayCircle className="w-5 h-5" />, path: '/teacher/start-lecture' },
    { label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/reports' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/syllabus' },
    { label: 'Device Security', icon: <Shield className="w-5 h-5" />, path: '/teacher/device-management' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/teacher/settings' },
  ];

  useEffect(() => {
    loadSettings();
    
    // Real-time listener for location enforcement setting
    const settingsRef = ref(database, `teacherSettings/${user.id}/enforceLocation`);
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setEnforceLocation(snapshot.val());
      }
    });
    
    return () => {
      off(settingsRef);
    };
  }, [user.id]);

  const loadSettings = async () => {
    try {
      const settingsRef = ref(database, `teacherSettings/${user.id}`);
      const snapshot = await get(settingsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setGoogleSheetUrl(data.googleSheetUrl || '');
        setEnforceLocation(data.enforceLocation !== undefined ? data.enforceLocation : true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    if (!googleSheetUrl.trim()) {
      toast.error('Please enter a Google Sheet URL');
      return;
    }

    // Validate Google Sheet URL
    if (!googleSheetUrl.includes('docs.google.com/spreadsheets')) {
      toast.error('Please enter a valid Google Sheets URL');
      return;
    }

    setLoading(true);
    try {
      const settingsRef = ref(database, `teacherSettings/${user.id}`);
      await set(settingsRef, {
        googleSheetUrl: googleSheetUrl.trim(),
        teacherName: user.name,
        teacherId: user.id,
        enforceLocation: enforceLocation,
        updatedAt: new Date().toISOString(),
      });

      setSaved(true);
      toast.success('Settings saved successfully!');
      
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationToggle = async (checked: boolean) => {
    setEnforceLocation(checked);
    
    try {
      const settingsRef = ref(database, `teacherSettings/${user.id}/enforceLocation`);
      await set(settingsRef, checked);
      
      toast.success(
        checked 
          ? '✅ Location verification ENABLED - Students must be on campus' 
          : '⚠️ Location verification DISABLED - Students can mark from anywhere'
      );
    } catch (error) {
      console.error('Error updating location enforcement:', error);
      toast.error('Failed to update location enforcement setting');
    }
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your attendance tracking preferences</p>
        </div>

        {/* Location Enforcement Control */}
        <Card className="shadow-lg border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle>Campus Location Enforcement</CardTitle>
                <CardDescription>Control 100-meter geofence for attendance scanning</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Toggle Control */}
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-6 border-2 border-primary/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Shield className={`w-6 h-6 ${enforceLocation ? 'text-success' : 'text-warning'}`} />
                    <h3 className="text-lg font-semibold">
                      {enforceLocation ? 'Location Verification Enabled' : 'Location Verification Disabled'}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {enforceLocation 
                      ? 'Students must be within 100 meters of Bharati Vidyapeeth, Kharghar campus to mark attendance'
                      : 'Students can mark attendance from anywhere - Location verification is currently disabled'
                    }
                  </p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                    enforceLocation 
                      ? 'bg-success/10 text-success border border-success/20' 
                      : 'bg-warning/10 text-warning border border-warning/20'
                  }`}>
                    {enforceLocation ? '✓ Strict Enforcement Active' : '⚠ No Location Check'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch
                    id="enforce-location"
                    checked={enforceLocation}
                    onCheckedChange={handleLocationToggle}
                    className="data-[state=checked]:bg-success"
                  />
                  <span className="text-xs text-muted-foreground font-medium">
                    {enforceLocation ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>

            {/* Campus Information */}
            <div className="bg-muted/50 rounded-lg p-5 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Campus Location Details:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Institution:</span>
                  <span className="font-medium">Bharati Vidyapeeth University (BVDU)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-medium">Management Studies</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campus:</span>
                  <span className="font-medium">Sector 3, Belpada, Kharghar, Navi Mumbai</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coordinates:</span>
                  <span className="font-mono text-xs">19.0458°N, 73.0149°E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Geofence Radius:</span>
                  <span className="font-medium">100 meters</span>
                </div>
              </div>
            </div>

            {/* Status Warning */}
            {!enforceLocation && (
              <div className="border-l-4 border-warning bg-warning/10 p-4 rounded-r-lg">
                <h4 className="font-semibold text-warning mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  ⚠️ Warning: Location Verification Disabled
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Students can currently mark attendance from <strong>any location</strong>. This may result in 
                  inaccurate attendance records if students are not physically present on campus.
                </p>
                <p className="text-xs text-muted-foreground">
                  💡 Recommendation: Enable location enforcement to ensure students are physically present during lectures.
                </p>
              </div>
            )}

            {enforceLocation && (
              <div className="border-l-4 border-success bg-success/10 p-4 rounded-r-lg">
                <h4 className="font-semibold text-success mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  ✅ Protected: Location Verification Active
                </h4>
                <p className="text-sm text-muted-foreground">
                  Students must be physically present within 100 meters of the campus to successfully mark attendance.
                  This ensures accurate tracking and prevents proxy attendance.
                </p>
              </div>
            )}

            {/* How It Works */}
            <div className="space-y-3">
              <h4 className="font-semibold">How Location Enforcement Works:</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1">Student Scans QR Code</h5>
                    <p className="text-xs text-muted-foreground">
                      Student opens the app and scans teacher's QR code
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-secondary">2</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1">GPS Location Checked</h5>
                    <p className="text-xs text-muted-foreground">
                      {enforceLocation 
                        ? 'System verifies student is within 100m of campus using GPS'
                        : 'GPS check is skipped - Any location is accepted'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-success">3</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1">Attendance Marked</h5>
                    <p className="text-xs text-muted-foreground">
                      {enforceLocation 
                        ? 'Attendance recorded only if student is on campus'
                        : 'Attendance recorded regardless of location'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Sheets Integration */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Link2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <CardTitle>Google Sheets Integration</CardTitle>
                <CardDescription>Connect your Google Sheet for automatic attendance logging</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Setup Instructions */}
            <div className="bg-muted/50 rounded-lg p-5 space-y-3">
              <h3 className="font-semibold text-lg">📝 Setup Instructions:</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Create a new Google Sheet or open an existing one</li>
                <li>Make sure the sheet is <strong className="text-foreground">publicly accessible</strong> with edit permissions</li>
                <li>The sheet will automatically create these columns: <strong className="text-foreground">Date, Time, Subject, Semester, Student Name, Roll Number, Division, Location</strong></li>
                <li>Copy the Google Sheet URL and paste it below</li>
                <li>Click "Save Settings" to activate the integration</li>
              </ol>
            </div>

            {/* Important Note */}
            <div className="border-l-4 border-warning bg-warning/10 p-4 rounded-r-lg">
              <h4 className="font-semibold text-warning mb-2">⚠️ Important:</h4>
              <p className="text-sm text-muted-foreground">
                Each teacher has their own separate Google Sheet. Attendance data will be automatically 
                synced to your sheet when students scan the QR code. Make sure your sheet has proper 
                sharing permissions set to "Anyone with the link can edit".
              </p>
            </div>

            {/* Google Sheet URL Input */}
            <div className="space-y-3">
              <Label htmlFor="sheetUrl" className="text-base font-semibold">Google Sheet URL</Label>
              <div className="flex gap-3">
                <Input
                  id="sheetUrl"
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSave}
                  disabled={loading || !googleSheetUrl.trim()}
                  className="min-w-[120px]"
                  size="lg"
                >
                  {loading ? (
                    <>Loading...</>
                  ) : saved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: https://docs.google.com/spreadsheets/d/1abc...xyz/edit
              </p>
            </div>

            {/* Current Status */}
            {googleSheetUrl && (
              <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-success">Google Sheets Connected</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Attendance data will be automatically saved to your Google Sheet
                    </p>
                    <a
                      href={googleSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 inline-block"
                    >
                      Open Google Sheet →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Sample Sheet Structure */}
            <div className="space-y-3">
              <h3 className="font-semibold">Sample Sheet Structure:</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse bg-muted/30 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 border border-border text-left">Date</th>
                      <th className="p-2 border border-border text-left">Time</th>
                      <th className="p-2 border border-border text-left">Subject</th>
                      <th className="p-2 border border-border text-left">Semester</th>
                      <th className="p-2 border border-border text-left">Student Name</th>
                      <th className="p-2 border border-border text-left">Roll No</th>
                      <th className="p-2 border border-border text-left">Division</th>
                      <th className="p-2 border border-border text-left">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border border-border">24/12/2024</td>
                      <td className="p-2 border border-border">09:30 AM</td>
                      <td className="p-2 border border-border">Data Structures</td>
                      <td className="p-2 border border-border">3</td>
                      <td className="p-2 border border-border">Rahul Sharma</td>
                      <td className="p-2 border border-border">BCA001</td>
                      <td className="p-2 border border-border">A</td>
                      <td className="p-2 border border-border">19.0330, 73.0297</td>
                    </tr>
                    <tr className="bg-muted/50">
                      <td className="p-2 border border-border">24/12/2024</td>
                      <td className="p-2 border border-border">09:31 AM</td>
                      <td className="p-2 border border-border">Data Structures</td>
                      <td className="p-2 border border-border">3</td>
                      <td className="p-2 border border-border">Priya Patel</td>
                      <td className="p-2 border border-border">BCA002</td>
                      <td className="p-2 border border-border">A</td>
                      <td className="p-2 border border-border">19.0331, 73.0298</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Card */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>Common issues and solutions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <details className="group">
                <summary className="cursor-pointer font-semibold hover:text-primary">
                  How do I make my Google Sheet public?
                </summary>
                <p className="text-muted-foreground mt-2 ml-4">
                  Click "Share" → "Anyone with the link" → Set to "Editor" → Copy link
                </p>
              </details>
              <details className="group">
                <summary className="cursor-pointer font-semibold hover:text-primary">
                  What if data is not syncing?
                </summary>
                <p className="text-muted-foreground mt-2 ml-4">
                  Make sure your sheet has edit permissions and the URL is correct. Try saving the settings again.
                </p>
              </details>
              <details className="group">
                <summary className="cursor-pointer font-semibold hover:text-primary">
                  When should I disable location enforcement?
                </summary>
                <p className="text-muted-foreground mt-2 ml-4">
                  Disable location enforcement for online classes, remote lectures, or special circumstances. Always re-enable it for on-campus lectures.
                </p>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}