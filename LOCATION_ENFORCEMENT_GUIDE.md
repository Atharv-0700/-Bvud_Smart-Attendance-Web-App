# 📍 Location Enforcement Control - Teacher Portal Guide

## ✅ Feature Overview

Teachers now have **complete control** over the 100-meter campus geofence requirement for student attendance scanning through a real-time toggle in the Teacher Portal Settings.

---

## 🎯 What This Feature Does

### **Toggle Control:**
- **ENABLED (Default)** → Students **must** be within 100 meters of campus
- **DISABLED** → Students can mark attendance from **anywhere**

### **Real-Time Application:**
- Changes apply **instantly** without page refresh
- No restart required
- Firebase real-time database sync

### **Role-Based Access:**
- ✅ **Teachers:** Full control via toggle in Settings
- ❌ **Students:** Cannot see or modify this setting
- ✅ **Per-Teacher:** Each teacher controls their own lectures

---

## 📍 Campus Location Details

```
Institution: Bharati Vidyapeeth (Deemed to be University)
Department: Department of Management Studies
Location: Sector 3, Belpada, Kharghar, Navi Mumbai
Coordinates: 19.0458°N, 73.0149°E
Geofence Radius: 100 meters
```

---

## 🔧 How to Use (Teacher)

### **Step 1: Access Settings**
1. Login as Teacher
2. Navigate to **Settings** in the sidebar
3. Look for the **"Campus Location Enforcement"** card at the top

### **Step 2: Toggle Location Enforcement**
1. Find the **Switch** control in the card
2. **ON (Green)** = Location verification **ENABLED**
3. **OFF (Gray)** = Location verification **DISABLED**
4. Click the switch to toggle

### **Step 3: Confirm Change**
- Toast notification appears immediately:
  - **Enabled:** "✅ Location verification ENABLED - Students must be on campus"
  - **Disabled:** "⚠️ Location verification DISABLED - Students can mark from anywhere"
- Setting saves automatically to Firebase

---

## 🎓 Student Experience

### **When Location Enforcement is ENABLED:**

**Scanning Process:**
1. Student clicks "Start Scanning"
2. **Location captured** → GPS coordinates obtained
3. **Distance calculated** → Using Haversine formula
4. **Verification:**
   - ✅ Within 100m → Attendance marked
   - ❌ Outside 100m → Error: "You must be on campus. You are X meters away."
5. Success toast: "✅ Attendance marked successfully! (Campus verified)"

**Firebase Record:**
```json
{
  "location": {
    "latitude": 19.0458,
    "longitude": 73.0149,
    "verifiedOnCampus": true,
    "enforcementEnabled": true
  }
}
```

---

### **When Location Enforcement is DISABLED:**

**Scanning Process:**
1. Student clicks "Start Scanning"
2. **Location captured** → GPS coordinates obtained (always collected)
3. **Verification SKIPPED** → No distance check
4. **Attendance marked** → Regardless of location
5. Success toast: "✅ Attendance marked successfully! (Location check disabled)"

**Firebase Record:**
```json
{
  "location": {
    "latitude": 12.9716,  // Could be anywhere
    "longitude": 77.5946,
    "verifiedOnCampus": false,
    "enforcementEnabled": false
  }
}
```

---

## 📊 Firebase Data Structure

### **Teacher Settings Path:**
```
teacherSettings/
  └── {teacherId}/
        ├── enforceLocation: true/false
        ├── googleSheetUrl: "..."
        ├── teacherName: "Prof. John Doe"
        ├── teacherId: "teacher_xyz"
        └── updatedAt: "2024-12-24T..."
```

### **Real-Time Listener:**
- Path: `teacherSettings/{teacherId}/enforceLocation`
- Default value: `true` (ENABLED)
- Updates: Instant via Firebase `onValue` listener

### **Attendance Record Fields:**
```json
{
  "location": {
    "latitude": 19.0458,
    "longitude": 73.0149,
    "verifiedOnCampus": true/false,      // TRUE if within 100m AND enforcement enabled
    "enforcementEnabled": true/false     // Teacher's setting at scan time
  }
}
```

---

## 🔐 Security Features

### **Role-Based Access Control:**
```typescript
// ✅ ALLOWED: Teachers only
Path: /teacher/settings → TeacherSettings component

// ❌ BLOCKED: Students
Path: /student/* → No access to location enforcement settings
```

### **Default Security:**
- **Initial state:** ENABLED (strict enforcement)
- **Default on new accounts:** ENABLED
- **Missing setting in DB:** Defaults to ENABLED
- **Firebase fail-safe:** If setting can't be loaded → ENABLED

### **Audit Trail:**
Every attendance record contains:
- `enforcementEnabled` → Was location check active?
- `verifiedOnCampus` → Did student pass verification?
- `latitude`, `longitude` → Actual student location
- `markedAt` → Timestamp

---

## 🎨 UI Components

### **Teacher Settings Page:**

**Location Enforcement Card:**
```
┌────────────────────────────────────────────────────┐
│ 📍 Campus Location Enforcement                    │
│ Control 100-meter geofence for attendance scanning│
├────────────────────────────────────────────────────┤
│                                                    │
│  🛡️ Location Verification Enabled                 │
│  Students must be within 100 meters of campus    │
│  ✓ Strict Enforcement Active          [ON] ←─┐   │
│                                               │   │
│  Campus: Bharati Vidyapeeth, Kharghar       │   │
│  Coordinates: 19.0458°N, 73.0149°E          │   │
│  Radius: 100 meters                         │   │
│                                               │   │
│  ✅ Protected: Location Verification Active  │   │
│  Students must be physically present...      │   │
│                                               │   │
│  How It Works: [1][2][3] → Steps             │   │
└───────────────────────────────────────────────────┘
                                                  Toggle Switch
```

**Status Indicators:**
- **Green border + Green icon** → ENABLED
- **Yellow border + Warning icon** → DISABLED
- **Real-time text updates** → Status changes immediately

---

## ⚡ Real-Time Functionality

### **Implementation:**

**1. React State:**
```typescript
const [enforceLocation, setEnforceLocation] = useState(true); // Default: ENABLED
```

**2. Firebase Listener:**
```typescript
useEffect(() => {
  const settingsRef = ref(database, `teacherSettings/${user.id}/enforceLocation`);
  const unsubscribe = onValue(settingsRef, (snapshot) => {
    if (snapshot.exists()) {
      setEnforceLocation(snapshot.val());
    }
  });
  return () => off(settingsRef);
}, [user.id]);
```

**3. Toggle Handler:**
```typescript
const handleLocationToggle = async (checked: boolean) => {
  setEnforceLocation(checked);
  await set(ref(database, `teacherSettings/${teacherId}/enforceLocation`), checked);
  toast.success(checked ? '✅ ENABLED' : '⚠️ DISABLED');
};
```

**4. Student Scanner Check:**
```typescript
// Load teacher's setting
const teacherSettingsRef = ref(database, `teacherSettings/${teacherId}/enforceLocation`);
const enforceLocationSnapshot = await get(teacherSettingsRef);
const enforceLocation = enforceLocationSnapshot.exists() 
  ? enforceLocationSnapshot.val() 
  : true; // Default: ENABLED

// Conditional verification
if (enforceLocation) {
  const distance = calculateDistance(...);
  if (distance > 100) throw new Error("Too far");
}
```

---

## 📋 Use Cases

### **✅ When to ENABLE (Default):**
- Regular on-campus lectures
- Physical attendance required
- Need to verify student presence
- Prevent proxy attendance
- Official attendance records

### **⚠️ When to DISABLE:**
- **Online/Remote Classes** → Students attending from home
- **Hybrid Sessions** → Some students remote, some on campus
- **Special Circumstances** → Medical emergencies, quarantine
- **Guest Lectures** → External venue
- **Field Trips** → Off-campus events
- **Testing/Debug** → Teacher wants to test system

---

## 🔄 Workflow Example

### **Scenario 1: Regular On-Campus Lecture**

**Teacher Actions:**
1. ✅ Location enforcement: **ENABLED** (default)
2. Start lecture → Generate QR code
3. Display QR code to class

**Student Actions:**
1. Open app → Scan QR
2. Location captured: `19.0458, 73.0149` (on campus)
3. Distance: 45m ✅
4. ✅ Attendance marked successfully (Campus verified)

**Result:** Attendance recorded with `verifiedOnCampus: true`

---

### **Scenario 2: Online Lecture**

**Teacher Actions:**
1. Open Settings → Toggle OFF location enforcement
2. ⚠️ Toast: "Location verification DISABLED"
3. Start lecture → Generate QR code
4. Share QR code on screen/chat

**Student Actions:**
1. Open app from home
2. Location captured: `12.9716, 77.5946` (Bangalore - 1000+ km away)
3. Distance check: **SKIPPED** ✅
4. ✅ Attendance marked successfully (Location check disabled)

**Result:** Attendance recorded with `verifiedOnCampus: false, enforcementEnabled: false`

---

### **Scenario 3: Hybrid Class**

**Teacher Actions:**
1. ⚠️ **Temporary disable** for hybrid session
2. Share QR code (on screen + online platform)
3. Both on-campus and remote students can mark attendance
4. **Re-enable after class** for next on-campus session

**Student Experience:**
- **On-campus students:** Attendance marked (not verified)
- **Remote students:** Attendance marked (not verified)
- **Admin can review:** `enforcementEnabled: false` in records

---

## 📈 Benefits

### **For Teachers:**
- ✅ **Flexibility:** Control based on lecture type (on-campus vs online)
- ✅ **Real-time:** Changes apply instantly
- ✅ **No IT support needed:** Self-service toggle
- ✅ **Audit trail:** Every record shows enforcement status
- ✅ **Per-teacher:** Independent control for each faculty

### **For Students:**
- ✅ **Clear feedback:** Know if location is required
- ✅ **Better UX:** No confusing errors during online classes
- ✅ **Transparency:** Toast messages explain verification status

### **For Administration:**
- ✅ **Compliance:** Can enforce strict policies when needed
- ✅ **Flexibility:** Allow remote learning when required
- ✅ **Tracking:** All records show enforcement status for audits
- ✅ **Data integrity:** Location always captured (even when not verified)

---

## 🚨 Important Notes

### **⚠️ Best Practices:**

1. **Always Re-Enable:** After remote sessions, toggle back ON
2. **Check Before Lecture:** Verify setting matches lecture type
3. **Communicate to Students:** Inform if location check is disabled
4. **Admin Oversight:** Administrators should monitor toggle usage

### **⚠️ Warnings Displayed:**

**When DISABLED:**
```
⚠️ Warning: Location Verification Disabled

Students can currently mark attendance from any location. 
This may result in inaccurate attendance records if students 
are not physically present on campus.

💡 Recommendation: Enable location enforcement to ensure 
students are physically present during lectures.
```

### **⚠️ Security Considerations:**

- Location is **always captured** (even when verification disabled)
- Admins can audit records using `enforcementEnabled` field
- Students cannot manipulate teacher's settings
- Toggle state persists in Firebase (survives page refresh)

---

## 🧪 Testing

### **Test Case 1: Enable → Scan On-Campus**
```
✅ Expected: Attendance marked with verifiedOnCampus: true
```

### **Test Case 2: Enable → Scan Off-Campus**
```
❌ Expected: Error "You are X meters away from college"
```

### **Test Case 3: Disable → Scan Anywhere**
```
✅ Expected: Attendance marked with verifiedOnCampus: false, enforcementEnabled: false
```

### **Test Case 4: Real-Time Toggle**
```
1. Teacher disables enforcement
2. Student scans QR (within seconds)
3. ✅ Expected: Setting applies immediately (no refresh needed)
```

---

## 📞 Support

### **For Teachers:**
- Toggle not working? Check internet connection
- Setting not saving? Verify Firebase permissions
- Students reporting errors? Check toggle status

### **For Students:**
- "Must be on campus" error during online class? 
  → Contact teacher to disable enforcement
- Location not captured? Enable GPS on device

### **For Admins:**
- Monitor usage: Query `teacherSettings/{*}/enforceLocation`
- Audit records: Check `enforcementEnabled` field
- Policy enforcement: Can set Firebase rules to restrict toggle

---

## 🎉 Summary

| Feature | Status |
|---------|--------|
| **Teacher Toggle** | ✅ Implemented |
| **Real-Time Sync** | ✅ Firebase Listeners |
| **Default State** | ✅ ENABLED (Strict) |
| **Student UI** | ✅ Hidden from students |
| **Role-Based** | ✅ Teachers only |
| **Audit Trail** | ✅ Full tracking |
| **Location Capture** | ✅ Always recorded |
| **Verification** | ✅ Conditional based on toggle |

---

**🎊 Location Enforcement Control is now LIVE and fully operational!**

Teachers have complete, real-time control over the 100-meter geofence requirement, enabling flexible attendance policies for both on-campus and remote learning scenarios.

*Last Updated: December 24, 2024*
