# 🚀 Quick Start Guide - Dynamic Class Selection System

## ✅ What's New?

Your Smart Attendance System now supports:
- **Dynamic Class Selection** - Teachers select semester/division/subject at lecture start
- **Multi-Semester Teaching** - One teacher account can teach multiple semesters
- **Strict Dual Geofencing** - 15m from teacher + 500m campus boundary
- **Division-Wise Storage** - Separate data for Division A and Division B
- **Live GPS Tracking** - Continuous teacher location updates during lectures

---

## 📝 Setup (One-Time)

### Step 1: Seed Subjects Data

**Option A - Firebase Console (Easiest)**
1. Go to: https://console.firebase.google.com/project/athgo-5b01d/database/athgo-5b01d-default-rtdb/data
2. Click on root node → Click `+` icon
3. Name it: `subjects`
4. Open `/src/data/seedData.ts` and copy the entire `SUBJECTS_SEED_DATA` object
5. Paste into Firebase and click "Add"

**Option B - Manual Entry**
Add each subject manually following this structure:
```
subjects/
  BCA101/
    code: "BCA101"
    name: "C Programming"
    semester: 1
    credits: 4
```

### Step 2: Update Firebase Rules (If Needed)

Make sure your Firebase rules allow these paths:
```json
{
  "rules": {
    "teachers": { ".read": "auth != null", ".write": "auth != null" },
    "teacherClassMappings": { ".read": "auth != null", ".write": "auth != null" },
    "subjects": { ".read": true, ".write": "auth != null" },
    "lectureSessions": { ".read": "auth != null", ".write": "auth != null" }
  }
}
```

---

## 🎓 Using the System

### For Teachers

#### 1. Register (First Time Only)
- Navigate to: `/teacher-registration`
- Fill in your details
- **Add Class Assignments:**
  - Select Semester (1-6)
  - Select Division (A or B)
  - Select Subject from dropdown
  - Click "Add Class Assignment"
  - Repeat for all classes you teach
- Submit registration

**Example:**
- Semester 1, Division A, BCA101 - C Programming
- Semester 1, Division B, BCA101 - C Programming
- Semester 2, Division A, BCA201 - Data Structures

#### 2. Login
- Use your registered email and password
- You'll be redirected to `/teacher` (Dynamic Dashboard)

#### 3. Start a Lecture
1. **Select Class:**
   - Choose Semester from dropdown
   - Choose Division (A or B)
   - Choose Subject
2. **Click "Start Lecture"**
3. **Allow Location Permission** when prompted
4. **Wait for GPS** to be captured (must be < 50m accuracy)
5. **Success!** You'll see:
   - QR code displayed
   - Live GPS tracking active
   - Real-time attendance count

#### 4. Monitor Attendance
- Students will scan your QR code
- Watch attendance count update in real-time
- See present/absent/total statistics

#### 5. End Lecture
- Click "End Session" button
- Confirm the action
- Session data is saved

---

### For Students

#### 1. Login
- Use your registered email and password

#### 2. Mark Attendance
1. Click "Scan QR" in navigation
2. Click "Start Scanning"
3. **Allow Location Permission** (must be on campus)
4. **Allow Camera Permission**
5. Point camera at teacher's QR code
6. Wait for scan...

**Success Conditions:**
- ✅ You are within **15 meters** of teacher
- ✅ You are within **500 meters** of campus center
- ✅ You haven't already marked attendance for this lecture

**Failure Reasons:**
- ❌ Too far from teacher (>15m)
- ❌ Outside campus boundary (>500m)
- ❌ Already marked attendance
- ❌ GPS accuracy too low

---

## 🔍 Key Changes from Old System

### Before
- Fixed routes: `/teacher/sem1`, `/teacher/sem2`, etc.
- One teacher account per semester
- Static class assignments
- 50-meter teacher proximity check

### After
- Dynamic route: `/teacher` (universal)
- One teacher account for all semesters
- Runtime class selection
- **15-meter** teacher proximity check (strict)
- **500-meter** campus boundary check (dual geofencing)

---

## 🧪 Testing Checklist

### Teacher Tests
- [ ] Register with multiple semesters/divisions/subjects
- [ ] Login and verify dashboard shows all assigned classes
- [ ] Select Sem 1, Div A, Subject
- [ ] Start lecture and verify GPS capture
- [ ] Verify QR code displayed
- [ ] Verify live location tracking
- [ ] End lecture and verify stats saved

### Student Tests
- [ ] Login as student
- [ ] Navigate to QR Scan
- [ ] Scan teacher's QR code
- [ ] Verify attendance marked if within 15m + 500m
- [ ] Verify error if too far from teacher
- [ ] Verify error if outside campus
- [ ] Verify cannot mark duplicate attendance

### Data Verification
- [ ] Check `teachers/` table in Firebase
- [ ] Check `teacherClassMappings/` table
- [ ] Check `lectureSessions/{sessionId}/` has correct data
- [ ] Check attendance stored under correct session
- [ ] Verify Division A and B data separate

---

## 📊 Where is Data Stored?

### Firebase Paths
```
teachers/
  {teacherId}/              ← Teacher profile (name, email, etc.)

teacherClassMappings/
  {mappingId}/              ← Teacher's class assignments
    teacherId: "..."
    semester: 1
    division: "A"
    subjectCode: "BCA101"

lectureSessions/
  {sessionId}/              ← Active lecture session
    teacherId: "..."
    semester: 1
    division: "A"
    subjectCode: "BCA101"
    teacherLocation: {...}  ← Live GPS coordinates
    attendance/
      {studentId}/          ← Student attendance records
```

### Google Sheets
- Division A → `VITE_SHEET_SEM{X}_DIVA`
- Division B → `VITE_SHEET_SEM{X}_DIVB`

---

## ❓ Troubleshooting

### "No subjects available" during registration
→ Seed the subjects data (see Step 1 above)

### "GPS accuracy too low"
→ Go outdoors with clear sky view, wait 30 seconds

### "Too far from teacher" (but you're close)
→ Wait for both GPS readings to stabilize (5-10 seconds)

### Dashboard shows no semesters
→ Verify `teacherClassMappings` exist in Firebase with correct teacherId

### Google Sheets not working
→ Requires additional setup (see `/DYNAMIC_CLASS_SELECTION_TESTING_GUIDE.md`)

---

## 📚 Full Documentation

- **Complete Testing Guide**: `/DYNAMIC_CLASS_SELECTION_TESTING_GUIDE.md`
- **Implementation Details**: `/IMPLEMENTATION_COMPLETE_DYNAMIC_CLASSES.md`
- **Seed Data**: `/src/data/seedData.ts`

---

## 🎯 Summary

**Old Way:**
- 6 hardcoded routes: `/teacher/sem1` through `/teacher/sem6`
- 6 teacher accounts needed if teaching all semesters
- 50m proximity check only

**New Way:**
- 1 dynamic route: `/teacher`
- 1 teacher account for all classes
- Select class at runtime
- **15m proximity + 500m campus boundary** (both must pass)

**Result:** Scalable, flexible, and more secure! 🎉

---

**Ready to start? Visit `/teacher-registration` to register your first teacher account!**
