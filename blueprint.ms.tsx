# Smart Attendance Web App - System Blueprint

## 📋 Document Information

- **Project Name**: Smart Attendance Web App
- **Version**: 1.0.0
- **Date**: January 26, 2026
- **Institution**: Bharati Vidyapeeth University (BVDU), Kharghar
- **Target Users**: BCA Students and Teachers
- **Document Type**: System Architecture & Design Blueprint

---

## 🎯 Project Overview

### Executive Summary

The Smart Attendance Web App is a comprehensive, cloud-based attendance management system designed specifically for Bharati Vidyapeeth University's BCA program. The system leverages QR code technology combined with geofencing to ensure accurate, tamper-proof attendance tracking while providing real-time analytics and automated reporting capabilities.

### Business Objectives

1. **Eliminate Proxy Attendance**: Use geolocation validation to ensure physical presence
2. **Reduce Administrative Burden**: Automate attendance calculation and report generation
3. **Improve Student Accountability**: Provide real-time attendance visibility
4. **Ensure Compliance**: Enforce BVDU's 75% minimum attendance rule
5. **Enhance Decision Making**: Provide data-driven insights through analytics

### Key Success Metrics

- 100% elimination of proxy attendance through geofencing
- 90% reduction in manual attendance processing time
- Real-time attendance updates (< 2 seconds latency)
- 99.9% system uptime during class hours
- Support for 500+ concurrent users during peak times

---

## 👥 System Actors

### 1. Student (Primary User)

**Role**: Marks attendance by scanning QR codes and monitors their attendance status

**Capabilities**:
- Register account with student ID and email
- Login with secure credentials
- Scan QR codes to mark attendance (with geofencing validation)
- View subject-wise attendance records
- Check attendance percentage with color-coded status
- View eligibility for semester exams (75% rule)
- Download monthly and semester attendance reports (PDF)
- Access complete BCA syllabus (Semesters 1-6)
- Update profile information
- Toggle dark/light mode

**Constraints**:
- Must be within campus geofence to mark attendance
- Can only scan valid, unexpired QR codes
- Cannot modify attendance records
- Cannot access teacher or admin features

### 2. Teacher (Secondary User)

**Role**: Generates QR codes for lectures and manages attendance records

**Capabilities**:
- Login with teacher credentials
- Generate time-limited QR codes (5-10 minute validity)
- View real-time attendance marking status
- Access subject-wise student attendance lists
- Generate class-level attendance reports
- Export reports in Excel and PDF formats
- View low attendance alerts for at-risk students
- Manage subject and lecture information
- Access class analytics and statistics

**Constraints**:
- Cannot modify student profile information
- Cannot delete attendance records
- Cannot access admin-level system settings
- QR codes automatically expire after set time

### 3. Admin (System Administrator)

**Role**: Manages system configuration, users, and overall database

**Capabilities**:
- Full admin dashboard access
- Add, view, edit, and delete student records
- Bulk upload students from Excel/CSV files
- Manage teacher accounts
- Configure subjects and semesters
- View system-wide analytics
- Export comprehensive reports for all users
- Manage device security settings
- Access Firebase database directly
- Configure system settings and parameters
- Monitor system health and usage

**Constraints**:
- Cannot mark attendance on behalf of students
- Changes to attendance rules require system configuration
- Must maintain data integrity and backup protocols

---

## 🔄 Data Flow Architecture

### Overall System Data Flow

```
┌─────────────┐
│   Student   │
│   Device    │
└──────┬──────┘
       │ 1. Login Request
       ↓
┌─────────────────────┐
│  Firebase Auth      │ ← 2. Authenticate
└─────────┬───────────┘
          │ 3. Token
          ↓
┌─────────────────────┐
│   React Frontend    │
│   (Vite App)        │
└─────────┬───────────┘
          │ 4. Request QR Code
          ↓
┌─────────────────────┐
│   Teacher Portal    │ → 5. Generate QR (with timestamp + classID)
└─────────┬───────────┘
          │ 6. Display QR
          ↓
┌─────────────────────┐
│   Student Scans QR  │
└─────────┬───────────┘
          │ 7. Extract QR data + Get GPS location
          ↓
┌─────────────────────┐
│  Geofencing Logic   │ ← 8. Validate location (within campus radius?)
└─────────┬───────────┘
          │ 9. Location Valid
          ↓
┌─────────────────────┐
│  Timestamp Check    │ ← 10. Check if QR still valid (< 10 min)
└─────────┬───────────┘
          │ 11. QR Valid
          ↓
┌─────────────────────┐
│ Firebase Realtime   │ ← 12. Write attendance record
│    Database         │
└─────────┬───────────┘
          │ 13. Real-time sync
          ↓
┌─────────────────────┐
│  Student Dashboard  │ → 14. Update attendance percentage
└─────────────────────┘
```

### Attendance Marking Flow (Detailed)

```
START → Student Login → Access Dashboard → Open Attendance Scanner
   ↓
Teacher generates QR code (valid for 10 min, contains: lectureID, subjectCode, timestamp, classID)
   ↓
Student scans QR code with device camera
   ↓
System extracts QR data (lectureID, subjectCode, timestamp)
   ↓
System requests GPS location from student device
   ↓
Geofencing validation:
   - Calculate distance from campus center (19.0434°N, 73.0618°E)
   - If distance > 500 meters → REJECT (Location Error)
   - If distance ≤ 500 meters → PROCEED
   ↓
Timestamp validation:
   - Calculate time difference: current_time - qr_timestamp
   - If difference > 10 minutes → REJECT (QR Expired)
   - If difference ≤ 10 minutes → PROCEED
   ↓
Duplicate check:
   - Query database: Has this student already marked attendance for this lecture?
   - If YES → REJECT (Already Marked)
   - If NO → PROCEED
   ↓
Write to Firebase Realtime Database:
   - Path: /attendance/{studentID}/{subjectCode}/{lectureID}
   - Data: { marked: true, timestamp: current_time, location: {lat, lng} }
   ↓
Real-time update triggers:
   - Update student's subject attendance count
   - Recalculate attendance percentage
   - Update eligibility status (Green/Yellow/Red)
   ↓
Display success message to student
   ↓
END
```

### Report Generation Flow

```
Teacher/Student requests report → Specify parameters (subject, semester, date range)
   ↓
Query Firebase Realtime Database:
   - Fetch all attendance records for specified filters
   - Fetch student information
   - Fetch subject/lecture metadata
   ↓
Data Processing:
   - Calculate total lectures per subject
   - Calculate attended lectures
   - Calculate absences (total - attended)
   - Calculate percentage: (attended / total) × 100
   - Determine status: Green (≥75%), Yellow (70-74%), Red (<70%)
   - Check eligibility: All subjects ≥75% → Eligible, else Not Eligible
   ↓
Report Formatting:
   - For PDF: Use jsPDF to create formatted document with BVDU branding
   - For Excel: Use xlsx library to create spreadsheet with multiple sheets
   ↓
Download/Export report to user device
   ↓
END
```

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Student    │  │   Teacher    │  │    Admin     │    │
│  │   Browser    │  │   Browser    │  │   Browser    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ↓
┌────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                       │
│                 React + Vite Frontend                      │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Components:                                         │  │
│  │  - Auth (Login, Register)                           │  │
│  │  - Student Dashboard                                 │  │
│  │  - Teacher Dashboard                                 │  │
│  │  - Admin Panel                                       │  │
│  │  - QR Scanner/Generator                             │  │
│  │  - Reports Module                                    │  │
│  │  - Syllabus Viewer                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                             │                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  State Management: React Hooks (useState, useEffect)│  │
│  └─────────────────────────────────────────────────────┘  │
│                             │                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Styling: Tailwind CSS + Custom Theme               │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ↓
┌────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Utilities & Services:                              │  │
│  │  - Authentication Service                           │  │
│  │  - Geofencing Service                               │  │
│  │  - Attendance Calculation Service                   │  │
│  │  - Report Generation Service                        │  │
│  │  - QR Code Service                                  │  │
│  │  - Validation Service                               │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ↓
┌────────────────────────────────────────────────────────────┐
│                     DATA LAYER                             │
│                   Firebase Backend                         │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │  Firebase Auth       │  │  Realtime Database   │       │
│  │  - Email/Password    │  │  - /students         │       │
│  │  - Role-based tokens │  │  - /teachers         │       │
│  └──────────────────────┘  │  - /attendance       │       │
│                            │  - /subjects         │       │
│  ┌──────────────────────┐  │  - /lectures         │       │
│  │  Firebase Storage    │  │  - /settings         │       │
│  │  - Reports (PDF)     │  └──────────────────────┘       │
│  │  - Student photos    │                                 │
│  └──────────────────────┘                                 │
└────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌────────────────────────────────────────────────────────────┐
│                   HOSTING LAYER                            │
│                     Vercel CDN                             │
│  - Global Edge Network                                     │
│  - Auto HTTPS/SSL                                          │
│  - Automatic Scaling                                       │
└────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
src/
├── app/
│   ├── App.tsx                          # Root component with routing
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.tsx               # Role-based login (Student/Teacher)
│   │   │   ├── StudentRegister.tsx     # Student registration form
│   │   │   └── PrivateRoute.tsx        # Protected route wrapper
│   │   ├── student/
│   │   │   ├── StudentDashboard.tsx    # Main dashboard with attendance
│   │   │   ├── QRScanner.tsx           # QR code scanner with camera
│   │   │   ├── AttendanceCard.tsx      # Subject-wise attendance display
│   │   │   ├── Reports.tsx             # Student report viewer/downloader
│   │   │   └── Syllabus.tsx            # BCA syllabus viewer
│   │   ├── teacher/
│   │   │   ├── TeacherDashboard.tsx    # Teacher main dashboard
│   │   │   ├── QRGenerator.tsx         # Time-limited QR code generator
│   │   │   ├── AttendanceList.tsx      # View student attendance lists
│   │   │   ├── ClassAnalytics.tsx      # Attendance statistics/charts
│   │   │   └── ReportExport.tsx        # Export Excel/PDF reports
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx      # Admin control panel
│   │   │   ├── StudentManagement.tsx   # Add/Edit/Delete students
│   │   │   ├── BulkUpload.tsx          # Excel/CSV student import
│   │   │   └── SystemSettings.tsx      # Configuration panel
│   │   └── common/
│   │       ├── Navbar.tsx              # Navigation bar with role-based menu
│   │       ├── Footer.tsx              # Footer component
│   │       ├── ThemeToggle.tsx         # Dark/Light mode toggle
│   │       └── LoadingSpinner.tsx      # Loading state component
│   └── main.tsx                         # App entry point
├── utils/
│   ├── firebase.ts                      # Firebase configuration & initialization
│   ├── geolocation.ts                   # Geofencing logic
│   ├── qrUtils.ts                       # QR generation/validation
│   ├── reportGenerator.ts               # PDF/Excel generation
│   └── validators.ts                    # Form validation functions
├── types/
│   ├── user.types.ts                    # User/Student/Teacher interfaces
│   ├── attendance.types.ts              # Attendance record types
│   └── report.types.ts                  # Report data structures
└── styles/
    ├── theme.css                        # CSS custom properties (color scheme)
    └── fonts.css                        # Font imports
```

---

## 🗄️ Database Schema

### Firebase Realtime Database Structure

```json
{
  "users": {
    "{userID}": {
      "email": "string",
      "role": "student | teacher | admin",
      "createdAt": "timestamp",
      "lastLogin": "timestamp"
    }
  },
  
  "students": {
    "{studentID}": {
      "studentId": "string (e.g., BCA001)",
      "name": "string",
      "email": "string",
      "phone": "string",
      "semester": "number (1-6)",
      "division": "string (A, B, C)",
      "rollNumber": "number",
      "enrollmentYear": "number (e.g., 2023)",
      "photoURL": "string (optional)",
      "address": "string",
      "dateOfBirth": "string (YYYY-MM-DD)",
      "gender": "male | female | other",
      "parentContact": "string",
      "status": "active | inactive",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  },
  
  "teachers": {
    "{teacherID}": {
      "teacherId": "string (e.g., TCH001)",
      "name": "string",
      "email": "string",
      "phone": "string",
      "department": "BCA",
      "subjects": ["subjectCode1", "subjectCode2"],
      "designation": "string (Asst. Professor, etc.)",
      "qualification": "string",
      "status": "active | inactive",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  },
  
  "subjects": {
    "{subjectCode}": {
      "code": "string (e.g., BCA101)",
      "name": "string (e.g., Programming in C)",
      "semester": "number (1-6)",
      "credits": "number",
      "type": "theory | practical | both",
      "totalLectures": "number",
      "teacherID": "string"
    }
  },
  
  "lectures": {
    "{lectureID}": {
      "lectureId": "string (unique)",
      "subjectCode": "string",
      "teacherId": "string",
      "semester": "number",
      "division": "string",
      "date": "string (YYYY-MM-DD)",
      "startTime": "string (HH:MM)",
      "endTime": "string (HH:MM)",
      "qrCode": {
        "data": "string (encoded lecture info)",
        "generatedAt": "timestamp",
        "expiresAt": "timestamp",
        "isActive": "boolean"
      },
      "totalStudents": "number",
      "presentCount": "number",
      "absentCount": "number",
      "status": "scheduled | ongoing | completed"
    }
  },
  
  "attendance": {
    "{studentID}": {
      "{subjectCode}": {
        "{lectureID}": {
          "lectureId": "string",
          "studentId": "string",
          "subjectCode": "string",
          "marked": "boolean",
          "markedAt": "timestamp",
          "location": {
            "latitude": "number",
            "longitude": "number",
            "accuracy": "number (meters)"
          },
          "deviceInfo": {
            "userAgent": "string",
            "ipAddress": "string (optional)"
          }
        },
        "summary": {
          "totalLectures": "number",
          "attended": "number",
          "absent": "number",
          "percentage": "number (0-100)",
          "status": "green | yellow | red",
          "isEligible": "boolean (≥75%)",
          "lastUpdated": "timestamp"
        }
      }
    }
  },
  
  "reports": {
    "{reportID}": {
      "reportId": "string",
      "type": "monthly | semester | custom",
      "generatedBy": "studentID | teacherID | adminID",
      "generatedFor": "studentID (optional, if individual)",
      "semester": "number",
      "subject": "string (optional)",
      "dateRange": {
        "startDate": "string (YYYY-MM-DD)",
        "endDate": "string (YYYY-MM-DD)"
      },
      "format": "pdf | excel",
      "fileURL": "string (Firebase Storage URL)",
      "generatedAt": "timestamp",
      "expiresAt": "timestamp (optional)"
    }
  },
  
  "syllabus": {
    "semester1": {
      "subjects": [
        {
          "code": "BCA101",
          "name": "Programming in C",
          "credits": 4,
          "units": [
            {
              "unitNumber": 1,
              "title": "Introduction to C",
              "topics": ["History", "Features", "Structure of C Program"]
            }
          ]
        }
      ]
    },
    "semester2": { "...": "..." },
    "semester3": { "...": "..." },
    "semester4": { "...": "..." },
    "semester5": { "...": "..." },
    "semester6": { "...": "..." }
  },
  
  "settings": {
    "attendance": {
      "minimumPercentage": 75,
      "qrCodeValidityMinutes": 10,
      "geofence": {
        "latitude": 19.0434,
        "longitude": 73.0618,
        "radiusMeters": 500
      },
      "allowLateMarking": false,
      "lateMarkingGracePeriodMinutes": 5
    },
    "academic": {
      "currentSemester": 4,
      "academicYear": "2025-2026",
      "semesterStartDate": "2026-01-15",
      "semesterEndDate": "2026-06-15"
    },
    "notifications": {
      "lowAttendanceThreshold": 75,
      "sendEmailAlerts": true,
      "sendPushNotifications": false
    }
  },
  
  "deviceSecurity": {
    "{studentID}": {
      "registeredDevices": [
        {
          "deviceId": "string (unique identifier)",
          "deviceName": "string",
          "userAgent": "string",
          "firstLoginAt": "timestamp",
          "lastLoginAt": "timestamp",
          "isActive": "boolean"
        }
      ],
      "maxDevicesAllowed": 2,
      "lastSecurityCheck": "timestamp"
    }
  }
}
```

### Database Security Rules (Firebase)

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'"
      }
    },
    "students": {
      ".read": "auth != null",
      "$studentId": {
        ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'teacher'"
      }
    },
    "teachers": {
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "attendance": {
      "$studentId": {
        ".read": "$studentId === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "$studentId === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin'"
      }
    },
    "lectures": {
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "reports": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "syllabus": {
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "settings": {
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    }
  }
}
```

---

## 🔌 API Endpoints (Firebase SDK)

### Authentication APIs

```javascript
// 1. Register Student
createUserWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Create student record in database
    set(ref(database, 'students/' + userCredential.user.uid), studentData);
  });

// 2. Login (Student/Teacher/Admin)
signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Fetch user role and redirect accordingly
  });

// 3. Logout
signOut(auth);

// 4. Password Reset
sendPasswordResetEmail(auth, email);

// 5. Update Profile
updateProfile(auth.currentUser, { displayName, photoURL });
```

### Student APIs

```javascript
// 1. Get Student Profile
get(ref(database, 'students/' + studentID));

// 2. Get Student Attendance (All Subjects)
get(ref(database, 'attendance/' + studentID));

// 3. Get Subject-wise Attendance
get(ref(database, 'attendance/' + studentID + '/' + subjectCode));

// 4. Mark Attendance
const attendanceRef = ref(database, `attendance/${studentID}/${subjectCode}/${lectureID}`);
set(attendanceRef, {
  marked: true,
  markedAt: serverTimestamp(),
  location: { latitude, longitude },
  deviceInfo: { userAgent }
});

// 5. Get Attendance Summary
get(ref(database, `attendance/${studentID}/${subjectCode}/summary`));

// 6. Get BCA Syllabus
get(ref(database, 'syllabus/semester' + semesterNumber));
```

### Teacher APIs

```javascript
// 1. Generate QR Code for Lecture
const lectureRef = ref(database, 'lectures/' + lectureID);
update(lectureRef, {
  qrCode: {
    data: encodedData,
    generatedAt: serverTimestamp(),
    expiresAt: expiryTimestamp,
    isActive: true
  }
});

// 2. Get Attendance List for Lecture
get(ref(database, 'lectures/' + lectureID + '/attendanceList'));

// 3. Get Subject-wise Student List
get(ref(database, 'students'))
  .then((snapshot) => {
    // Filter by semester and subject
  });

// 4. Get Class Analytics
const analyticsQuery = query(
  ref(database, 'attendance'),
  orderByChild('subjectCode'),
  equalTo(subjectCode)
);
get(analyticsQuery);

// 5. Expire QR Code
update(ref(database, 'lectures/' + lectureID + '/qrCode'), {
  isActive: false
});
```

### Admin APIs

```javascript
// 1. Add Student
set(ref(database, 'students/' + newStudentID), studentData);

// 2. Update Student
update(ref(database, 'students/' + studentID), updatedData);

// 3. Delete Student
remove(ref(database, 'students/' + studentID));

// 4. Bulk Upload Students
students.forEach((student) => {
  set(ref(database, 'students/' + student.id), student);
});

// 5. Get All Students
get(ref(database, 'students'));

// 6. Get System Settings
get(ref(database, 'settings'));

// 7. Update System Settings
update(ref(database, 'settings/attendance'), newSettings);

// 8. Get System Analytics
get(ref(database, 'attendance')).then((snapshot) => {
  // Calculate overall statistics
});
```

### Report APIs

```javascript
// 1. Generate Student Report (Monthly)
const reportData = await generateReport(studentID, 'monthly', month, year);
const pdfBlob = await createPDF(reportData);
downloadFile(pdfBlob, `${studentID}_monthly_report.pdf`);

// 2. Generate Student Report (Semester)
const reportData = await generateReport(studentID, 'semester', semester);
const excelBlob = await createExcel(reportData);
downloadFile(excelBlob, `${studentID}_semester_report.xlsx`);

// 3. Generate Class Report (Teacher)
const classData = await getClassAttendance(subjectCode, semester, division);
const pdfBlob = await createPDF(classData);
downloadFile(pdfBlob, `${subjectCode}_class_report.pdf`);

// 4. Generate University Report (Admin)
const allStudentsData = await getAllStudentsAttendance(semester);
const excelBlob = await createExcel(allStudentsData);
downloadFile(excelBlob, `university_submission_report.xlsx`);
```

---

## 🔐 Authentication Flow

### Student Registration Flow

```
1. Student visits registration page
   ↓
2. Fills form: Name, Student ID, Email, Password, Semester, Division
   ↓
3. Frontend validates:
   - Email format (must be valid email)
   - Student ID format (BCA + 3 digits)
   - Password strength (min 6 characters)
   - All required fields filled
   ↓
4. Submit to Firebase Authentication
   ↓
5. If successful:
   - Create user in Firebase Auth
   - Get userID (UID)
   ↓
6. Create student record in Realtime Database:
   - Path: /students/{UID}
   - Data: { studentId, name, email, semester, division, ... }
   ↓
7. Create user role record:
   - Path: /users/{UID}
   - Data: { email, role: "student", createdAt }
   ↓
8. Auto-login and redirect to Student Dashboard
   ↓
9. Display welcome message
```

### Login Flow (Role-Based)

```
1. User enters email and password
   ↓
2. Submit to Firebase Authentication
   ↓
3. If authentication successful:
   - Get userID (UID)
   - Fetch user role from /users/{UID}/role
   ↓
4. Role-based redirection:
   - If role === "student" → Student Dashboard
   - If role === "teacher" → Teacher Dashboard
   - If role === "admin" → Admin Dashboard
   ↓
5. Store authentication token in localStorage
   ↓
6. Set up real-time database listeners for user data
   ↓
7. Load user-specific data (profile, attendance, etc.)
```

### Session Management

```
- Token stored in localStorage: "authToken"
- Token expiry: 1 hour (Firebase default)
- Auto-refresh: Firebase SDK handles automatically
- Session validation on every protected route
- Logout: Clear localStorage + signOut(auth)
```

### Protected Route Logic

```javascript
// PrivateRoute component
const PrivateRoute = ({ children, allowedRoles }) => {
  const [user, loading] = useAuthState(auth);
  const [userRole, setUserRole] = useState(null);
  
  useEffect(() => {
    if (user) {
      // Fetch user role from database
      get(ref(database, 'users/' + user.uid + '/role'))
        .then((snapshot) => setUserRole(snapshot.val()));
    }
  }, [user]);
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};

// Usage in routing
<Route path="/student/*" element={
  <PrivateRoute allowedRoles={['student']}>
    <StudentDashboard />
  </PrivateRoute>
} />
```

---

## 🛡️ Security Considerations

### 1. Authentication Security

- **Password Hashing**: Firebase handles bcrypt hashing automatically
- **HTTPS Only**: All communication over SSL/TLS
- **Token Expiry**: 1-hour session tokens with auto-refresh
- **Role-Based Access**: Enforced at database level with Firebase rules
- **Email Verification**: Optional email verification for new accounts

### 2. Database Security

- **Firebase Security Rules**: Row-level security based on user roles
- **Read Access**: Students can only read their own data
- **Write Access**: Students can only write attendance, not modify records
- **Admin Privileges**: Full CRUD access only for admin role
- **Data Validation**: Type checking and format validation in rules

### 3. Geofencing Security

- **Client-Side Validation**: Initial check on device
- **Server-Side Verification**: Re-validate location on backend (if using Cloud Functions)
- **Location Spoofing Detection**: Cross-check with device sensors
- **Accuracy Threshold**: Reject if GPS accuracy > 50 meters
- **Multiple Validation Points**: Check distance from multiple campus coordinates

### 4. QR Code Security

- **Time-Limited**: Auto-expire after 10 minutes
- **One-Time Use**: Prevent re-scanning same QR for same lecture
- **Encrypted Data**: QR contains encrypted lecture info
- **Server-Side Validation**: Check QR validity on backend
- **Unique Identifiers**: Each QR contains unique lectureID + timestamp

### 5. Data Privacy

- **Personal Data**: Store only necessary student information
- **Location Data**: Store only for attendance verification, not tracking
- **Data Retention**: Auto-delete old attendance after 2 years
- **GDPR Compliance**: Allow students to request data export/deletion
- **No PII Leakage**: Mask sensitive data in logs

### 6. API Security

- **Rate Limiting**: Prevent brute force attacks (handled by Firebase)
- **Input Validation**: Sanitize all user inputs
- **SQL Injection**: Not applicable (NoSQL database)
- **XSS Prevention**: React automatically escapes JSX
- **CSRF Protection**: Firebase SDK handles CSRF tokens

### 7. Device Security

- **Device Fingerprinting**: Track registered devices per student
- **Max Devices**: Limit to 2 devices per student
- **Device Blocking**: Admin can block suspicious devices
- **Login Alerts**: Notify on new device login

---

## 🚀 Deployment Architecture

### Vercel Deployment

```
┌─────────────────────────────────────────────┐
│         GitHub Repository                    │
│  - main branch (production)                  │
│  - develop branch (staging)                  │
└──────────────┬──────────────────────────────┘
               │
               │ Git push triggers webhook
               ↓
┌─────────────────────────────────────────────┐
│         Vercel Build System                  │
│  1. Clone repository                         │
│  2. Install dependencies (pnpm install)      │
│  3. Run build (npm run build)                │
│  4. Optimize assets                          │
│  5. Generate static files                    │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│         Vercel Edge Network                  │
│  - Deploy to global CDN                      │
│  - Enable HTTPS/SSL                          │
│  - Configure custom domain                   │
│  - Set environment variables                 │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│      Production URL (Live)                   │
│  https://smart-attendance-bvdu.vercel.app    │
└─────────────────────────────────────────────┘
```

### Environment Configuration

**Production Environment Variables (Vercel)**:
```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=smart-attendance-prod.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://smart-attendance-prod.firebaseio.com
VITE_FIREBASE_PROJECT_ID=smart-attendance-prod
VITE_CAMPUS_LATITUDE=19.0434
VITE_CAMPUS_LONGITUDE=73.0618
VITE_CAMPUS_RADIUS_METERS=500
VITE_QR_CODE_VALIDITY_MINUTES=10
```

### CI/CD Pipeline

```
Developer commits code to GitHub
   ↓
GitHub Actions triggered (optional)
   - Run tests
   - Run linting
   - Check build
   ↓
If tests pass, merge to main branch
   ↓
Vercel webhook triggered automatically
   ↓
Vercel starts build process
   ↓
Build completes successfully
   ↓
Deploy to production (automatic)
   ↓
Post-deployment checks
   - Health check API
   - Smoke tests
   ↓
Deployment complete
   ↓
Notify team (Slack/Email)
```

### Scaling Strategy

- **Horizontal Scaling**: Vercel auto-scales based on traffic
- **Database Scaling**: Firebase handles scaling automatically
- **CDN Caching**: Static assets cached at edge locations
- **Load Balancing**: Vercel distributes traffic globally
- **Serverless Functions**: Use Firebase Cloud Functions for heavy computations

### Monitoring & Logging

- **Vercel Analytics**: Track page views, performance
- **Firebase Analytics**: Track user behavior, events
- **Error Tracking**: Sentry or Firebase Crashlytics
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Performance Monitoring**: Lighthouse CI, Web Vitals

---

## 📊 Performance Optimization

### Frontend Optimization

- **Code Splitting**: Lazy load components with React.lazy()
- **Image Optimization**: Use WebP format, lazy loading
- **Bundle Size**: Minimize with Vite tree-shaking
- **Caching**: Service worker for offline capability
- **Minification**: Auto-minify CSS and JS in production

### Database Optimization

- **Indexing**: Index frequently queried fields
- **Denormalization**: Store summary data for quick access
- **Pagination**: Load data in chunks (50 records at a time)
- **Real-time Listeners**: Use selective listeners, not entire database
- **Data Pruning**: Archive old attendance records

### Network Optimization

- **HTTP/2**: Enabled by default on Vercel
- **Compression**: Gzip/Brotli compression
- **CDN**: Serve static assets from edge locations
- **DNS Prefetch**: Preconnect to Firebase domains
- **Resource Hints**: Preload critical resources

---

## 🔄 Backup & Recovery

### Database Backup

- **Automatic Backups**: Firebase daily backups (paid plan)
- **Manual Exports**: Admin can export all data to JSON
- **Versioning**: Keep last 7 days of backups
- **Recovery Point**: 24-hour RPO (Recovery Point Objective)

### Disaster Recovery Plan

1. **Incident Detection**: Monitor alerts for database issues
2. **Assessment**: Determine severity and data loss
3. **Restore**: Import from latest backup
4. **Verification**: Test data integrity
5. **Communication**: Notify users of downtime

---

## 📝 Compliance & Standards

- **Data Protection**: Follow university data handling policies
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Browser Support**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Support**: iOS 13+, Android 8+
- **Code Standards**: ESLint + Prettier for consistent code
- **Version Control**: Git with semantic versioning (semver)

---

## 🎓 Academic Context

### Bharati Vidyapeeth University Rules

- **Minimum Attendance**: 75% required for semester exam eligibility
- **Attendance Calculation**: (Attended / Total Lectures) × 100
- **Eligibility Criteria**: All subjects must have ≥75% attendance
- **Grace Period**: No grace period (strict 75% rule)
- **Medical Leave**: Handled separately (admin adjustment)

### BCA Program Structure

- **Total Semesters**: 6 (3 years)
- **Subjects per Semester**: 5-7 subjects
- **Lectures per Subject**: Varies (60-80 lectures per semester)
- **Theory vs Practical**: Both types tracked separately

---

## 📚 References & Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **React Documentation**: https://react.dev
- **Vite Documentation**: https://vitejs.dev
- **Vercel Documentation**: https://vercel.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Geolocation API**: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- **QR Code Libraries**: react-qr-code, html5-qrcode

---

**Blueprint Version**: 1.0.0  
**Last Updated**: January 26, 2026  
**Maintained By**: Smart Attendance Development Team  
**Institution**: Bharati Vidyapeeth University, Kharghar

---

*This blueprint is a living document and will be updated as the system evolves.*
