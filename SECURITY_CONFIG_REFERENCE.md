# 🔧 Security Configuration Reference

## Quick Access to All Security Settings

This document provides a centralized reference for all security configuration parameters. Use this to quickly adjust security levels without hunting through multiple files.

---

## 📍 Location Validation Settings

**File:** `/src/utils/locationValidator.ts`

### Classroom Coordinates (BVDU Kharghar Campus)

```typescript
export const CLASSROOMS: Classroom[] = [
  {
    id: 'room_101',
    name: 'Room 101',
    building: 'BCA Block',
    floor: 1,
    latitude: 19.0458,    // ← Update with actual GPS coordinates
    longitude: 73.0149,   // ← Update with actual GPS coordinates
    radius: 15,           // ← Validation radius in meters
  },
  // Add more classrooms here...
];
```

### Accuracy Thresholds

```typescript
// Line 129: GPS accuracy check
if (accuracy > 50) {  // ← Change to 30 for stricter, 100 for looser
  return {
    isValid: false,
    reason: 'GPS_POOR_ACCURACY',
  };
}
```

### Location Request Settings

```typescript
// Line 246: Location request options
{
  enableHighAccuracy: true,  // ← Keep true for best accuracy
  timeout: 15000,            // ← 15 seconds (increase if GPS is slow)
  maximumAge: 0,             // ← 0 = always fresh location
}
```

**Recommended Values:**
- **Standard rooms:** 15m radius
- **Computer labs:** 20m radius  
- **Auditoriums:** 25m radius
- **GPS accuracy threshold:** 50m (stricter: 30m, looser: 100m)

---

## ⏱️ Stay Verification Settings

**File:** `/src/utils/stayVerification.ts`

```typescript
// Line 38: Configuration
const STAY_VERIFICATION_CONFIG = {
  DELAY_MINUTES: 10,    // ← Time before re-checking location (default: 10 min)
  ENABLED: true,        // ← Enable/disable stay verification
  MAX_RETRIES: 2,       // ← Retry attempts for failed verifications
};
```

**Recommended Values:**
- **Regular lectures:** 10 minutes
- **Short sessions:** 5 minutes
- **Long lectures:** 15 minutes
- **Disable for tests:** Set ENABLED to false

**To Change:**
```typescript
import { updateStayVerificationConfig } from '/src/utils/stayVerification';

updateStayVerificationConfig({
  DELAY_MINUTES: 15,  // Change to 15 minutes
});
```

---

## 👤 Face Liveness Settings

**File:** `/src/utils/faceLiveness.ts`

```typescript
// Line 23: Configuration
const LIVENESS_CONFIG = {
  ENABLED: true,                    // ← Enable/disable liveness detection
  REQUIRE_BLINK: true,              // ← Require blink detection
  BLINK_DETECTION_TIME_MS: 3000,    // ← Time to detect blink (3 seconds)
  MIN_CONFIDENCE: 0.6,              // ← Minimum confidence (0.0 to 1.0)
  FRAME_CAPTURE_INTERVAL_MS: 100,   // ← Frame capture frequency
  MAX_FRAMES: 30,                   // ← Maximum frames to analyze
};
```

**Recommended Values:**
- **Standard mode:** MIN_CONFIDENCE = 0.6
- **Strict mode:** MIN_CONFIDENCE = 0.8
- **Lenient mode:** MIN_CONFIDENCE = 0.4
- **Disable for testing:** ENABLED = false

**Eye State Detection Threshold:**
```typescript
// Line 107: Brightness threshold for eye detection
return avgBrightness < 80 ? 'CLOSED' : 'OPEN';
//                      ↑
//                      Adjust this value (60-100)
//                      Lower = more sensitive to eye closure
```

**To Change:**
```typescript
import { updateLivenessConfig } from '/src/utils/faceLiveness';

updateLivenessConfig({
  MIN_CONFIDENCE: 0.7,
  BLINK_DETECTION_TIME_MS: 4000,  // 4 seconds
});
```

---

## 📊 Confidence Score Weights

**File:** `/src/utils/confidenceScore.ts`

```typescript
// Line 39: Weight configuration (must total 100)
const CONFIDENCE_WEIGHTS = {
  DEVICE_MATCH: 25,      // ← 25% weight for device binding
  LOCATION_VALID: 30,    // ← 30% weight for location validation
  STAY_VERIFIED: 25,     // ← 25% weight for stay verification
  LIVENESS_DETECTED: 15, // ← 15% weight for liveness check
  TIMING: 5,             // ← 5% weight for QR timing/validity
};
```

**Confidence Level Thresholds:**
```typescript
// Line 70: Level determination
if (score >= 80) level = 'HIGH';        // ← 80-100
else if (score >= 60) level = 'MEDIUM'; // ← 60-79
else if (score >= 40) level = 'LOW';    // ← 40-59
else level = 'VERY_LOW';                // ← 0-39
```

**Location Score Bonuses:**
```typescript
// Line 128: GPS accuracy bonuses
if (accuracy <= 10) score += 20;     // Excellent
else if (accuracy <= 20) score += 15; // Good
else if (accuracy <= 30) score += 10; // Acceptable
else if (accuracy <= 50) score += 5;  // Poor

// Line 139: Distance bonuses
if (distance <= 5) score += 20;      // Very close
else if (distance <= 10) score += 15; // Close
else if (distance <= 15) score += 10; // Within range
```

**To Change:**
```typescript
import { updateWeightConfiguration } from '/src/utils/confidenceScore';

updateWeightConfiguration({
  DEVICE_MATCH: 30,      // Increase device importance
  LOCATION_VALID: 35,    // Increase location importance
  LIVENESS_DETECTED: 10, // Decrease liveness importance
});
```

---

## 💾 Offline Sync Settings

**File:** `/src/utils/offlineSync.ts`

```typescript
// Line 23-26: Configuration
const OFFLINE_STORAGE_KEY = 'smart_attendance_offline_queue';
const MAX_RETRY_ATTEMPTS = 5;        // ← Maximum retry attempts
const RETRY_DELAY_MS = 5000;         // ← 5 seconds between retries
const SYNC_INTERVAL_MS = 10000;      // ← Check for sync every 10 seconds
```

**Recommended Values:**
- **Normal network:** SYNC_INTERVAL = 10000 (10 sec)
- **Poor network:** SYNC_INTERVAL = 30000 (30 sec)
- **Max retries:** 3-5 attempts
- **Retry delay:** 5000-10000 ms

**Sync Behavior:**
```typescript
// Line 188: Delay between individual syncs
await new Promise((resolve) => setTimeout(resolve, 100));
//                                                    ↑
//                                                    100ms between each record
```

---

## 🔐 Device Fingerprint Settings

**File:** `/src/utils/deviceFingerprint.ts`

### Components Used for Fingerprint:
```typescript
// Line 40: Fingerprint components
const components = [
  navigator.userAgent,           // Browser and version
  navigator.platform,            // Operating system
  `${screen.width}x${screen.height}x${screen.colorDepth}`, // Screen
  Intl.DateTimeFormat().resolvedOptions().timeZone,        // Timezone
  navigator.language,            // Language preference
  navigator.hardwareConcurrency, // CPU cores
  navigator.deviceMemory,        // RAM (if available)
  screen.pixelDepth,             // Color depth
  new Date().getTimezoneOffset(), // Timezone offset
];
```

**Hash Algorithm:**
```typescript
// Line 113: djb2 hash algorithm
function hashString(str: string): string {
  let hash = 5381;  // ← Initial hash value
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
```

**Enforcement:**
```typescript
// Line 241: Device binding enforcement
export function isDeviceBindingEnforced(userRole?: string): boolean {
  return true;  // ← Set to false to disable for all users
  
  // Or role-based enforcement:
  // return userRole === 'student'; // Enforce only for students
}
```

---

## 🔄 Transaction Settings

**File:** `/src/utils/attendanceTransaction.ts`

### Duplicate Prevention:
```typescript
// Line 44: Pre-check before transaction
const preCheck = await get(attendanceRef);
if (preCheck.exists()) {
  // Fast fail for obvious duplicates
  return { success: false, isDuplicate: true };
}

// Line 61: Transaction with abort on conflict
const result = await runTransaction(attendanceRef, (currentData) => {
  if (currentData !== null) {
    return; // Abort transaction
  }
  return attendanceData; // Write new data
});
```

**No configuration needed** - transactions are automatic.

---

## 🚦 Security Middleware Settings

**File:** `/src/services/securityMiddleware.ts`

### Schedule Stay Verification:
```typescript
// Line 426: Delay before stay verification
const DELAY_MS = 10 * 60 * 1000; // 10 minutes
//                ↑
//                Change to 5, 15, or 20 minutes
```

### QR Code Expiry Check:
```typescript
// Line 380: QR code expiry validation
if (now > qrData.expiryTime) {
  return { valid: false, reason: 'QR_EXPIRED' };
}
```

### Lecture Status Check:
```typescript
// Line 403: Lecture must be active
if (lecture.status !== 'active') {
  return { valid: false, reason: 'LECTURE_ENDED' };
}
```

---

## 📱 Browser Permissions

### Location Permission:
```typescript
// In locationValidator.ts, line 246
navigator.geolocation.getCurrentPosition(
  (position) => { /* Success */ },
  (error) => { /* Error */ },
  {
    enableHighAccuracy: true,  // Request GPS (not WiFi/cell tower)
    timeout: 15000,            // Wait up to 15 seconds
    maximumAge: 0,             // Don't use cached location
  }
);
```

### Camera Permission:
```typescript
// In QRScan.tsx
navigator.mediaDevices.getUserMedia({ 
  video: { facingMode: 'environment' }  // Use back camera on mobile
})
```

---

## 🎛️ Quick Configuration Presets

### Strict Mode (High Security):
```typescript
// Location
CLASSROOMS[].radius = 10;  // 10m radius
GPS_ACCURACY_THRESHOLD = 30; // 30m max

// Stay Verification
DELAY_MINUTES = 15;  // 15 minutes

// Liveness
MIN_CONFIDENCE = 0.8;
REQUIRE_BLINK = true;

// Confidence Weights
DEVICE_MATCH = 30;
LOCATION_VALID = 35;
STAY_VERIFIED = 25;
LIVENESS_DETECTED = 10;
```

### Balanced Mode (Recommended):
```typescript
// Location
CLASSROOMS[].radius = 15;  // 15m radius
GPS_ACCURACY_THRESHOLD = 50; // 50m max

// Stay Verification
DELAY_MINUTES = 10;  // 10 minutes

// Liveness
MIN_CONFIDENCE = 0.6;
REQUIRE_BLINK = true;

// Confidence Weights (default)
DEVICE_MATCH = 25;
LOCATION_VALID = 30;
STAY_VERIFIED = 25;
LIVENESS_DETECTED = 15;
```

### Lenient Mode (For Testing):
```typescript
// Location
CLASSROOMS[].radius = 25;  // 25m radius
GPS_ACCURACY_THRESHOLD = 100; // 100m max

// Stay Verification
DELAY_MINUTES = 5;  // 5 minutes
// OR set ENABLED = false;

// Liveness
MIN_CONFIDENCE = 0.4;
// OR set ENABLED = false;

// Confidence Weights
DEVICE_MATCH = 40;  // Focus on device only
LOCATION_VALID = 40;
STAY_VERIFIED = 10;
LIVENESS_DETECTED = 10;
```

---

## 🐛 Debug Mode

### Enable Verbose Logging:

```typescript
// Add to any file
console.log('[DEBUG] Your debug message');
```

All security modules already have extensive logging:
- `[SECURITY]` - Security events
- `[TRANSACTION]` - Database transactions
- `[LOCATION]` - Location validation
- `[LIVENESS]` - Face liveness checks
- `[STAY_VERIFY]` - Stay verification
- `[OFFLINE]` - Offline sync
- `[CONFIDENCE]` - Confidence scoring

**View logs:** Open browser DevTools → Console tab

---

## 📊 Performance Tuning

### Reduce Liveness Detection Time:
```typescript
// faceLiveness.ts
BLINK_DETECTION_TIME_MS: 2000,  // 2 seconds instead of 3
MAX_FRAMES: 20,  // Analyze fewer frames
```

### Reduce Location Timeout:
```typescript
// locationValidator.ts
timeout: 10000,  // 10 seconds instead of 15
```

### Increase Sync Frequency:
```typescript
// offlineSync.ts
SYNC_INTERVAL_MS: 5000,  // Check every 5 seconds
```

---

## 🔒 Disable Features (For Testing)

```typescript
// Disable stay verification
// stayVerification.ts, line 38
ENABLED: false,

// Disable liveness detection
// faceLiveness.ts, line 23
ENABLED: false,

// Disable device binding
// deviceFingerprint.ts, line 241
return false;

// Disable offline sync
// offlineSync.ts
// Don't call startAutoSync()
```

---

## 📝 Configuration Change Log

Keep track of your configuration changes:

```
Date       | Changed By | Setting                    | Old Value | New Value | Reason
-----------|------------|----------------------------|-----------|-----------|------------------
2025-01-08 | Admin      | DELAY_MINUTES              | 10        | 15        | Longer lectures
2025-01-08 | Admin      | MIN_CONFIDENCE             | 0.6       | 0.7       | Stricter liveness
2025-01-08 | Admin      | room_101.radius            | 15        | 12        | Smaller classroom
```

---

## 🚀 Production Checklist

Before going live, verify:

- [ ] All classroom coordinates are accurate (test with GPS app)
- [ ] Stay verification delay matches lecture duration
- [ ] Confidence score thresholds are appropriate
- [ ] Offline sync is enabled and tested
- [ ] Device binding is enforced for students
- [ ] Liveness detection is enabled (or intentionally disabled)
- [ ] All console logs are reviewed (no errors)
- [ ] Firebase security rules are updated
- [ ] Test with multiple concurrent users

---

**Last Updated:** January 8, 2025  
**Version:** 1.0  
**Maintainer:** System Administrator
