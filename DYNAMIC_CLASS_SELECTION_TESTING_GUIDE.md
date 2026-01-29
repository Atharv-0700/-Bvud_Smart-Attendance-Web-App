# Dynamic Class Selection Implementation - Testing Guide

## 🎯 Overview

The Smart Attendance System has been upgraded to support **dynamic class selection, strict geofencing, division-wise attendance storage, and multi-semester teaching assignments**.

---

## ✅ What's Been Implemented

### 1. **Normalized Data Structure**

#### Teachers Table
```
teachers/
  {teacherId}/
    - teacherId: string
    - name: string
    - email: string
    - phone: string
    - department: string
    - designation: string
    - qualification: string
    - status: 'active' | 'inactive'
    - uid: string (Firebase Auth UID)
    - createdAt: number
    - updatedAt: number
```

#### Teacher Class Mappings
```
teacherClassMappings/
  {mappingId}/
    - mappingId: string
    - teacherId: string
    - semester: number (1-6)
    - division: 'A' | 'B'
    - subjectCode: string
    - subjectName: string
    - createdAt: number
    - isActive: boolean
```

### 2. **Dynamic Teacher Dashboard**

- **Route**: `/teacher`
- **Component**: `TeacherClassSelectionDashboard`
- **Features**:
  - Dynamic dropdown selection for Semester, Division, and Subject
  - Auto-populates based on teacher's registered mappings
  - Real-time active lecture monitoring
  - GPS location capture on lecture start
  - Quick stats display

### 3. **Dual Geofencing System**

#### Two-Layer Validation:
1. **Teacher Proximity**: Student must be within **15 meters** of teacher's live GPS location
2. **Campus Boundary**: Student must be within **500 meters** of campus center (BVDU Kharghar)

Both conditions must be satisfied for attendance to be marked.

### 4. **Division-Wise Google Sheets**

Separate Google Sheet export for:
- **Division A**: `VITE_SHEET_SEM{X}_DIVA`
- **Division B**: `VITE_SHEET_SEM{X}_DIVB`

Environment variables required for each semester (1-6) and division (A/B).

### 5. **Live GPS Tracking**

- Teacher's location is continuously tracked during active lectures
- Location updates every 5 seconds
- Students validate against teacher's real-time position
- Location accuracy monitoring (rejects if > 50m accuracy)

---

## 🔧 Setup Instructions

### Step 1: Seed Subjects Data

Before teachers can register, you need to populate the subjects database.

**Option A: Manual (Firebase Console)**
1. Go to [Firebase Console](https://console.firebase.google.com/project/athgo-5b01d/database/athgo-5b01d-default-rtdb/data)
2. Click on root node
3. Click `+` to add child
4. Name it `subjects`
5. Copy JSON from `/src/data/seedData.ts` (SUBJECTS_SEED_DATA)
6. Paste and save

**Option B: Programmatic**
```typescript
import { database } from '@/config/firebase';
import { ref, set } from 'firebase/database';
import { SUBJECTS_SEED_DATA } from '@/data/seedData';

async function seedSubjects() {
  const subjectsRef = ref(database, 'subjects');
  await set(subjectsRef, SUBJECTS_SEED_DATA);
  console.log('✅ Subjects seeded successfully!');
}
```

### Step 2: Configure Google Sheets (Optional)

Create a `.env` file in project root:

```env
# Google Sheets API Configuration
VITE_GOOGLE_SHEETS_API_KEY=your_api_key
VITE_GOOGLE_SHEETS_CLIENT_ID=your_client_id

# Division A Sheets
VITE_SHEET_SEM1_DIVA=spreadsheet_id_for_sem1_divA
VITE_SHEET_SEM2_DIVA=spreadsheet_id_for_sem2_divA
VITE_SHEET_SEM3_DIVA=spreadsheet_id_for_sem3_divA
VITE_SHEET_SEM4_DIVA=spreadsheet_id_for_sem4_divA
VITE_SHEET_SEM5_DIVA=spreadsheet_id_for_sem5_divA
VITE_SHEET_SEM6_DIVA=spreadsheet_id_for_sem6_divA

# Division B Sheets
VITE_SHEET_SEM1_DIVB=spreadsheet_id_for_sem1_divB
VITE_SHEET_SEM2_DIVB=spreadsheet_id_for_sem2_divB
VITE_SHEET_SEM3_DIVB=spreadsheet_id_for_sem3_divB
VITE_SHEET_SEM4_DIVB=spreadsheet_id_for_sem4_divB
VITE_SHEET_SEM5_DIVB=spreadsheet_id_for_sem5_divB
VITE_SHEET_SEM6_DIVB=spreadsheet_id_for_sem6_divB
```

### Step 3: Update Firebase Rules

Ensure your Firebase Realtime Database rules allow read/write to these paths:
```json
{
  "rules": {
    "teachers": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "teacherClassMappings": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "subjects": {
      ".read": true,
      ".write": "auth != null"
    },
    "lectureSessions": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

## 🧪 Testing Flow

### Test Case 1: Teacher Registration with Multi-Semester Support

1. **Navigate to**: Teacher Registration Page
2. **Use**: `/teacher-registration` route (or add link in Login component)
3. **Fill in**:
   - Name: Dr. John Doe
   - Email: john.doe@bvdu.edu.in
   - Password: Test@123
   - Phone: +91 9876543210
   - Designation: Assistant Professor
   - Qualification: M.Tech, Ph.D

4. **Add Class Assignments**:
   - Semester 1, Division A, Subject: BCA101 - C Programming
   - Semester 1, Division B, Subject: BCA101 - C Programming  
   - Semester 2, Division A, Subject: BCA201 - Data Structures

5. **Submit** and verify success

### Test Case 2: Teacher Login and Class Selection

1. **Login** with registered teacher credentials
2. **Verify** redirect to `/teacher` (TeacherClassSelectionDashboard)
3. **Check**:
   - Semester dropdown shows: Sem 1, Sem 2
   - Division dropdown updates based on semester selection
   - Subject dropdown shows only subjects for selected semester+division

4. **Select**:
   - Semester: 1
   - Division: A
   - Subject: BCA101 - C Programming

5. **Verify** "Ready to Start Lecture" message appears

### Test Case 3: Start Lecture with GPS Capture

1. **Click** "Start Lecture" button
2. **Allow** location permission when prompted
3. **Verify**:
   - GPS coordinates captured
   - GPS accuracy shown (should be < 50m)
   - Success message displayed
   - Redirected to `/teacher/active-lecture`

4. **Check Active Lecture Page**:
   - QR code displayed
   - Live location tracking active
   - Session details correct (semester, division, subject)

### Test Case 4: Student Attendance with Dual Geofencing

**Prerequisite**: Teacher must have an active lecture session

1. **Login** as student
2. **Navigate** to QR Scan page
3. **Click** "Start Scanning"
4. **Allow** location and camera permissions
5. **Scan** teacher's QR code

**Expected Behavior**:

| Scenario | Student Location | Teacher Location | Campus Check | Result |
|----------|-----------------|------------------|--------------|--------|
| ✅ Valid | Within 15m of teacher | Within 500m of campus | Both Pass | Attendance Marked |
| ❌ Too Far from Teacher | 20m from teacher | Within campus | Fail | Error: "Too far from teacher" |
| ❌ Outside Campus | Within 15m of teacher | 600m from campus | Fail | Error: "Outside campus boundary" |
| ❌ Both Fail | 50m from teacher | 600m from campus | Both Fail | Error: "Too far + Outside campus" |

6. **Verify** attendance record created in Firebase:
```
lectureSessions/{sessionId}/attendance/{studentId}/
  - studentId
  - studentName
  - markedAt
  - location: { latitude, longitude, accuracy }
  - distanceFromTeacher: number
  - distanceFromCampus: number
```

### Test Case 5: Division-Wise Data Storage

1. **Create** two lecture sessions:
   - Session 1: Semester 1, Division A, Subject: BCA101
   - Session 2: Semester 1, Division B, Subject: BCA101

2. **Mark attendance** for students in both divisions

3. **Verify** in Firebase:
   - Data stored under correct semester/division paths
   - Google Sheets export uses correct sheet ID based on division
   - No data mixing between divisions

### Test Case 6: End Lecture Session

1. **In active lecture page**, click "End Session"
2. **Confirm** the action
3. **Verify**:
   - Session status changes to 'completed'
   - Redirected back to teacher dashboard
   - Session statistics saved (present count, absent count, duration)

---

## 🔍 Verification Checklist

### Firebase Database Structure
- [ ] `teachers/` table exists with teacher profiles
- [ ] `teacherClassMappings/` table contains class assignments
- [ ] `subjects/` table populated with BCA subjects (Sem 1-6)
- [ ] `lectureSessions/` table has active/completed sessions
- [ ] `lectureSessions/{sessionId}/attendance/` has student records

### Teacher Flow
- [ ] Teacher can register with multiple semesters/divisions/subjects
- [ ] Teacher dashboard shows only their assigned classes
- [ ] Semester dropdown shows unique semesters
- [ ] Division dropdown filters by selected semester
- [ ] Subject dropdown filters by semester + division
- [ ] GPS location captured on lecture start (accuracy check)
- [ ] QR code generated with session context

### Student Flow
- [ ] Student can scan QR code
- [ ] Dual geofencing enforced (15m + 500m)
- [ ] Location validation errors shown clearly
- [ ] Duplicate attendance prevented
- [ ] Attendance marked only if both geofence checks pass

### Data Integrity
- [ ] No duplicate teacher accounts for different semesters
- [ ] Division A and Division B data stored separately
- [ ] Google Sheets export uses correct sheet based on division
- [ ] Location data stored with every attendance record
- [ ] Session metadata includes semester, division, subject

---

## 📊 Key Metrics to Monitor

1. **GPS Accuracy**: Should be < 50m for both teacher and student
2. **Geofence Pass Rate**: Track how many students pass/fail each check
3. **Session Duration**: Average lecture duration
4. **Attendance Rate**: Present count / Total students
5. **Location Enforcement**: Verify campus boundary violations logged

---

## 🐛 Common Issues and Solutions

### Issue: "No subjects available" during teacher registration
**Solution**: Seed the subjects data (see Step 1 above)

### Issue: "GPS accuracy too low"
**Solution**: Move to open area with clear sky view. Wait 30 seconds for GPS to stabilize.

### Issue: "Student too far from teacher" (but physically close)
**Solution**: 
- Check teacher's live GPS is updating
- Verify teacher's GPS accuracy is good
- Wait a few seconds for both GPS readings to stabilize

### Issue: Teacher dashboard shows no semesters
**Solution**: 
- Verify teacher-class mappings exist in Firebase
- Check that mappings have `isActive: true`
- Ensure teacher logged in with correct UID

### Issue: Google Sheets export not working
**Solution**:
- Verify environment variables are set
- Check spreadsheet IDs are correct
- Ensure Google Sheets API is enabled
- Verify permissions on the sheets

---

## 🚀 Next Steps (Optional Enhancements)

1. **Student List Pre-loading**: Load enrolled students for semester/division
2. **Auto-mark Absent**: Mark remaining students as absent when session ends
3. **Biometric Verification**: Add face recognition for extra security
4. **Geofence Analytics**: Dashboard showing geofence violation patterns
5. **Multiple Teachers**: Support for team-teaching scenarios
6. **Lecture Recording**: Link video recording to attendance session

---

## 📞 Support

For issues or questions:
1. Check Firebase Console for errors
2. Review browser console for location/camera errors
3. Verify network connectivity
4. Check Firebase rules are properly configured

---

## ✨ Summary

This implementation provides a **scalable, secure, and physically verified attendance system** that:
- ✅ Supports multi-semester teaching assignments
- ✅ Enforces strict dual geofencing (15m + 500m)
- ✅ Stores data separately by division
- ✅ Tracks live GPS locations
- ✅ Prevents proxy attendance
- ✅ Exports to division-specific Google Sheets
- ✅ Dynamically resolves class context at runtime

**No more hardcoded routes. No more duplicate teacher accounts. True multi-class support.**
