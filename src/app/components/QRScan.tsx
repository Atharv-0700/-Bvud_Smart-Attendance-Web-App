import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, QrCode, History, BookOpen, CheckCircle, Camera, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { database } from '../../config/firebase';
import { ref, set, get, query, limitToLast } from 'firebase/database';
import { toast } from 'sonner';
import { writeToGoogleSheet } from '../../utils/googleSheets';
import { generateDeviceFingerprint } from '../../utils/deviceFingerprint';
import { writeAttendanceTransaction } from '../../utils/attendanceTransaction';
import { acquireScanLock, releaseScanLock, isScanLocked } from '../../utils/scanLock';

interface QRScanProps {
  user: User;
  onLogout: () => void;
}

interface RecentScan {
  lectureId: string;
  subject: string;
  timestamp: string;
  teacherName: string;
}

export function QRScan({ user, onLogout }: QRScanProps) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [scanMessage, setScanMessage] = useState('');
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerMountedRef = useRef(false);

  // College location: Bharati Vidyapeeth, Kharghar, Belpada, Sector 3
  const COLLEGE_LAT = 19.0458;
  const COLLEGE_LNG = 73.0149;
  const ALLOWED_RADIUS_METERS = 100; // 100 meters radius

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/student' },
    { label: 'Scan QR', icon: <QrCode className="w-5 h-5" />, path: '/student/qr-scan' },
    { label: 'Attendance History', icon: <History className="w-5 h-5" />, path: '/student/attendance' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/student/syllabus' },
  ];

  useEffect(() => {
    loadRecentScans();
    scannerMountedRef.current = true;
    
    return () => {
      scannerMountedRef.current = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
        html5QrCodeRef.current = null;
      }
    };
  }, []);

  const loadRecentScans = async () => {
    try {
      const attendanceRef = ref(database, `studentAttendance/${user.id}`);
      const snapshot = await get(query(attendanceRef, limitToLast(5)));
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const scansArray: RecentScan[] = [];
        
        for (const [lectureId, scanData] of Object.entries(data)) {
          const scanInfo = scanData as any;
          scansArray.push({
            lectureId,
            subject: scanInfo.subject || 'Unknown',
            timestamp: scanInfo.timestamp || new Date().toISOString(),
            teacherName: scanInfo.teacherName || 'Unknown Teacher',
          });
        }
        
        setRecentScans(scansArray.reverse());
      }
    } catch (error) {
      console.error('Error loading recent scans:', error);
    }
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    
    // Ensure all coordinates are properly converted to numbers
    const latitude1 = Number(lat1);
    const longitude1 = Number(lon1);
    const latitude2 = Number(lat2);
    const longitude2 = Number(lon2);
    
    const φ1 = (latitude1 * Math.PI) / 180;
    const φ2 = (latitude2 * Math.PI) / 180;
    const Δφ = ((latitude2 - latitude1) * Math.PI) / 180;
    const Δλ = ((longitude2 - longitude1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    
    console.log('[DISTANCE] Calculation:', {
      from: `${latitude1.toFixed(6)}, ${longitude1.toFixed(6)}`,
      to: `${latitude2.toFixed(6)}, ${longitude2.toFixed(6)}`,
      distance: `${distance.toFixed(2)}m`,
    });
    
    return distance;
  };

  // Request location permission and get coordinates
  const requestLocationPermission = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationPermission('granted');
          resolve(position);
        },
        (error) => {
          setLocationPermission('denied');
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location permission denied. Please enable location access in your browser settings.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out.'));
              break;
            default:
              reject(new Error('An unknown error occurred while getting location.'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Verify if user is within college campus
  const verifyLocation = async (): Promise<{ latitude: number; longitude: number }> => {
    try {
      const position = await requestLocationPermission();
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const distance = calculateDistance(userLat, userLng, COLLEGE_LAT, COLLEGE_LNG);

      if (distance > ALLOWED_RADIUS_METERS) {
        throw new Error(
          `You must be on campus to mark attendance. You are ${Math.round(distance)} meters away from the college.`
        );
      }

      return { latitude: userLat, longitude: userLng };
    } catch (error: any) {
      throw error;
    }
  };

  // Request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Stop the stream immediately as we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      return true;
    } catch (error: any) {
      setCameraPermission('denied');
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No camera found on this device.');
      } else {
        toast.error('Failed to access camera.');
      }
      
      return false;
    }
  };

  const handleScan = async () => {
    setScanResult(null);
    setScanMessage('');

    try {
      // Step 1: Get location data (always capture, but may not enforce distance)
      toast.info('Getting your location...');
      const position = await requestLocationPermission();
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      
      toast.success('Location captured! Starting camera...');
      
      // Step 2: Request camera permission
      const cameraAllowed = await requestCameraPermission();
      if (!cameraAllowed) {
        throw new Error('Camera access required');
      }

      setScanning(true);

      // Wait for DOM to update before initializing scanner
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if element exists
      const element = document.getElementById('qr-reader');
      if (!element || !scannerMountedRef.current) {
        throw new Error('Scanner element not found');
      }

      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // QR code detected - pass location data
          await handleQRCodeDetected(decodedText, locationData);
          
          // Stop scanning
          html5QrCode.stop().then(() => {
            setScanning(false);
          }).catch(console.error);
        },
        (errorMessage) => {
          // Scanning in progress (ignore errors)
        }
      );
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      setScanning(false);
      
      setScanResult('error');
      setScanMessage(error.message || 'Failed to start scanner');
      toast.error(error.message || 'Failed to start scanner. Please try again.');
    }
  };

  const handleQRCodeDetected = async (decodedText: string, locationData: { latitude: number; longitude: number }) => {
    try {
      // Parse QR code data
      const qrData = JSON.parse(decodedText);
      const { lectureId, subject, semester, teacherId, timestamp } = qrData;

      if (!lectureId || !subject) {
        throw new Error('Invalid QR code format');
      }

      // ========================================
      // CRITICAL FIX: Check scan lock FIRST
      // Prevents rapid duplicate scans
      // ========================================
      if (isScanLocked(lectureId, user.id)) {
        console.warn('[SCAN] Scan blocked - already processing');
        toast.warning('Please wait, processing your previous scan...');
        return;
      }

      // ========================================
      // CRITICAL FIX: Acquire scan lock
      // This prevents duplicate scans while processing
      // ========================================
      const lockAcquired = acquireScanLock(lectureId, user.id);
      if (!lockAcquired) {
        console.warn('[SCAN] Failed to acquire lock');
        toast.warning('Please wait a moment before scanning again');
        return;
      }

      console.log('[SCAN] Lock acquired - processing attendance');

      try {
        // Verify lecture exists and is active
          const lectureRef = ref(database, `lectures/${lectureId}`);
          const lectureSnapshot = await get(lectureRef);

          if (!lectureSnapshot.exists()) {
            throw new Error('Lecture not found');
          }

          const lectureData = lectureSnapshot.val();

          if (!lectureData.active) {
            throw new Error('Lecture has ended');
          }

          // Check if QR code is expired
          const expiresAt = new Date(lectureData.expiresAt).getTime();
          if (Date.now() > expiresAt) {
            throw new Error('QR code expired');
          }

          // Check if student's semester matches
          if (parseInt(semester) !== user.semester) {
            throw new Error(`This lecture is for Semester ${semester}. You are in Semester ${user.semester}.`);
          }

          // ✨ Check if THIS lecture has location enforcement enabled
          const enforceLocation = lectureData.enforceLocation !== undefined ? lectureData.enforceLocation : true; // Default: ENABLED

          // 🎯 NEW: Check teacher location for proximity matching
          let verifiedNearTeacher = false;
          let teacherStudentDistance = null;
          
          // Verify location only if enforcement is enabled for this lecture
          let verifiedOnCampus = false;
          if (enforceLocation) {
            console.log('[LOCATION] 📍 Location enforcement is ENABLED for this lecture');
            console.log('[LOCATION] Student GPS:', {
              latitude: locationData.latitude.toFixed(6),
              longitude: locationData.longitude.toFixed(6),
            });
            
            // 🎯 PRIORITY 1: Teacher-Student Coordinate Matching (15m radius - STRICT)
            if (lectureData.teacherLocation) {
              console.log('[LOCATION] 👨‍🏫 Teacher location found:', {
                latitude: lectureData.teacherLocation.latitude.toFixed(6),
                longitude: lectureData.teacherLocation.longitude.toFixed(6),
                accuracy: `${lectureData.teacherLocation.accuracy.toFixed(2)}m`,
              });
              
              // Calculate distance between student and teacher
              const distanceToTeacher = calculateDistance(
                locationData.latitude,
                locationData.longitude,
                lectureData.teacherLocation.latitude,
                lectureData.teacherLocation.longitude
              );
              
              teacherStudentDistance = Math.round(distanceToTeacher);
              
              console.log('[LOCATION] 📏 Distance to teacher:', `${teacherStudentDistance}m`);
              
              // Check if within 15 meters of teacher (STRICT)
              if (distanceToTeacher > 15) {
                console.error('[LOCATION] ❌ Student too far from teacher:', {
                  distance: `${teacherStudentDistance}m`,
                  required: '15m',
                });
                
                throw new Error(
                  `You are too far from the teacher's location. You are ${teacherStudentDistance}m away (max 15m allowed).`
                );
              }
              
              verifiedNearTeacher = true;
              
              // DUAL GEOFENCING: Also verify campus boundary (500m radius)
              console.log('[LOCATION] 🏫 Verifying campus boundary...');
              const campusDistance = calculateDistance(
                locationData.latitude,
                locationData.longitude,
                COLLEGE_LAT,
                COLLEGE_LNG
              );
              
              console.log('[LOCATION] 📏 Distance to campus center:', `${Math.round(campusDistance)}m`);
              
              if (campusDistance > 500) {
                console.error('[LOCATION] ❌ Student outside campus boundary:', {
                  distance: `${Math.round(campusDistance)}m`,
                  required: '500m',
                });
                
                throw new Error(
                  `You are outside the campus boundary. You are ${Math.round(campusDistance)}m away from campus center (max 500m allowed).`
                );
              }
              
              verifiedOnCampus = true;
              console.log('[LOCATION] ✅ Student verified: Within 15m of teacher AND inside campus boundary');
            } else {
              // 🎯 FALLBACK: Campus-level validation (100m from campus center)
              console.log('[LOCATION] 🏫 No teacher location - using campus-level validation');
              console.log('[LOCATION] Campus GPS:', {
                latitude: COLLEGE_LAT.toFixed(6),
                longitude: COLLEGE_LNG.toFixed(6),
              });
              
              const distance = calculateDistance(
                locationData.latitude,
                locationData.longitude,
                COLLEGE_LAT,
                COLLEGE_LNG
              );
              
              console.log('[LOCATION] 📏 Distance to campus:', `${Math.round(distance)}m`);

              if (distance > ALLOWED_RADIUS_METERS) {
                console.error('[LOCATION] ❌ Student too far from campus:', {
                  distance: `${Math.round(distance)}m`,
                  required: `${ALLOWED_RADIUS_METERS}m`,
                });
                
                throw new Error(
                  `You must be on campus to mark attendance. You are ${Math.round(distance)} meters away from the college.`
                );
              }
              verifiedOnCampus = true;
              console.log('[LOCATION] ✅ Student verified on campus');
            }
          } else {
            // Location enforcement disabled for this lecture - allow from anywhere
            console.log('[LOCATION] ⚠️ Location enforcement is DISABLED for this lecture');
            verifiedOnCampus = false; // Mark as not verified since check was skipped
          }

          // ========================================
        // CRITICAL FIX: Use transaction-safe write
        // This prevents race conditions and duplicates
        // ========================================
        const attendanceData = {
            studentId: user.id,
            studentName: user.name,
            studentEmail: user.email,
            rollNumber: user.rollNumber || '',
            division: user.division || '',
            markedAt: new Date().toISOString(),
            scanTime: Date.now(),
          location: {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              verifiedOnCampus: verifiedOnCampus,
              verifiedNearTeacher: verifiedNearTeacher,
              teacherStudentDistance: teacherStudentDistance,
              enforcementEnabled: enforceLocation,
            },
          };

        console.log('[SCAN] Writing attendance with transaction...');

        const writeResult = await writeAttendanceTransaction(
          lectureId,
          user.id,
          attendanceData
        );

        // ========================================
        // Check if write was successful or duplicate
        // ========================================
        if (!writeResult.success) {
          if (writeResult.isDuplicate) {
            console.warn('[SCAN] Duplicate attendance detected');
            
            setScanResult('error');
            setScanMessage('Already marked present for this lecture');
            toast.warning('You have already marked attendance for this lecture!');
            
            // Release lock and return
            releaseScanLock(lectureId, user.id);
            return;
          } else {
            throw new Error(writeResult.reason || 'Failed to mark attendance');
          }
        }

        console.log('[SCAN] Attendance written successfully');

        // Also save in student's personal attendance record
          const personalAttendanceRef = ref(database, `studentAttendance/${user.id}/${lectureId}`);
          await set(personalAttendanceRef, {
            subject,
            semester: parseInt(semester),
            teacherId,
            teacherName: lectureData.teacherName,
            timestamp: new Date().toISOString(),
            lectureDate: lectureData.timestamp,
            rollNumber: user.rollNumber || '',
            division: user.division || '',
            location: {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              verifiedOnCampus: verifiedOnCampus,
              enforcementEnabled: enforceLocation,
            },
          });

          // Write to Google Sheet
          try {
            const teacherSettingsRef = ref(database, `teacherSettings/${teacherId}`);
            const settingsSnapshot = await get(teacherSettingsRef);
            
            if (settingsSnapshot.exists()) {
              const settings = settingsSnapshot.val();
              const sheetUrl = settings.googleSheetUrl;
              
              if (sheetUrl) {
                const attendanceData = {
                  date: new Date().toLocaleDateString('en-IN'),
                  time: new Date().toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }),
                  subject: subject,
                  semester: semester.toString(),
                  studentName: user.name,
                  rollNumber: user.rollNumber || '',
                  division: user.division || '',
                  location: `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`,
                };
                
                await writeToGoogleSheet(sheetUrl, attendanceData);
              }
            }
          } catch (sheetError) {
            console.error('Error writing to Google Sheet:', sheetError);
            // Don't fail attendance marking if Google Sheets write fails
          }

          setScanResult('success');
          setScanMessage(`Attendance marked for ${subject}!`);
          
          if (enforceLocation) {
            toast.success(`✅ Attendance marked successfully for ${subject}! (Campus verified)`);
          } else {
            toast.success(`✅ Attendance marked successfully for ${subject}! (Location check disabled)`);
          }
          
          // Reload recent scans
          loadRecentScans();

      } finally {
        // ========================================
        // CRITICAL: Always release lock
        // Even if error occurs
        // ========================================
        console.log('[SCAN] Releasing scan lock');
        releaseScanLock(lectureId, user.id);
      }

    } catch (error: any) {
      console.error('Error processing QR code:', error);
      setScanResult('error');
      setScanMessage(error.message || 'Invalid QR code');
      toast.error(error.message || 'Failed to mark attendance. Please try again.');
    }
  };

  const handleStopScanning = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        setScanning(false);
      }).catch(console.error);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Scan Attendance QR</h1>
          <p className="text-muted-foreground mt-1">Mark your attendance for today's lecture</p>
        </div>

        {/* Permissions Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Location & Camera Access Required</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  To ensure you're physically present on campus, we need:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Location permission</strong> - Verify you're within {ALLOWED_RADIUS_METERS}m of the college campus</li>
                  <li>• <strong>Camera permission</strong> - Scan the QR code displayed by your teacher</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Location: Bharati Vidyapeeth, Kharghar, Belpada, Sector 3
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>QR Code Scanner</CardTitle>
            <CardDescription>
              Position the QR code within the frame to mark your attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Camera Placeholder */}
            <div className="relative aspect-square max-w-md mx-auto bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {!scanning && !scanResult && (
                <div className="text-center p-8">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Click "Start Scanning" to begin</p>
                </div>
              )}

              {scanning && (
                <div className="w-full h-full">
                  <div id="qr-reader" className="w-full h-full" />
                </div>
              )}

              {scanResult === 'success' && (
                <div className="absolute inset-0 bg-success/10 flex items-center justify-center">
                  <div className="text-center p-4">
                    <CheckCircle className="w-20 h-20 mx-auto mb-4 text-success" />
                    <h3 className="text-2xl font-semibold text-success mb-2">Success!</h3>
                    <p className="text-foreground">{scanMessage}</p>
                  </div>
                </div>
              )}

              {scanResult === 'error' && (
                <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
                  <div className="text-center p-4">
                    <XCircle className="w-20 h-20 mx-auto mb-4 text-destructive" />
                    <h3 className="text-2xl font-semibold text-destructive mb-2">Error!</h3>
                    <p className="text-foreground">{scanMessage}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <h4 className="font-semibold">Instructions:</h4>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Click the "Start Scanning" button below</li>
                <li>Allow <strong>location access</strong> when prompted (required for campus verification)</li>
                <li>Allow <strong>camera access</strong> when prompted</li>
                <li>Position the QR code displayed by your teacher within the frame</li>
                <li>Wait for automatic detection and confirmation</li>
              </ol>
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  <strong>Note:</strong> You must be physically present on campus within 100 meters of the college to mark attendance.
                </p>
              </div>
            </div>

            {/* Scan Button */}
            {!scanResult && !scanning && (
              <Button
                onClick={handleScan}
                className="w-full"
                size="lg"
              >
                <QrCode className="w-5 h-5 mr-2" />
                Start Scanning
              </Button>
            )}

            {scanning && (
              <Button
                onClick={handleStopScanning}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                Stop Scanning
              </Button>
            )}

            {scanResult && (
              <Button onClick={() => {
                setScanResult(null);
                setScanMessage('');
              }} className="w-full" size="lg" variant="outline">
                Scan Another Code
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Your latest attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            {recentScans.length > 0 ? (
              <div className="space-y-3">
                {recentScans.map((scan) => (
                  <div key={scan.lectureId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <div>
                        <p className="font-medium">{scan.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(scan.timestamp)} • {scan.teacherName}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-success/10 text-success">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent scans</p>
                <p className="text-sm">Scan your first QR code to mark attendance</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}