/**
 * Classroom-Level Location Validation
 * Precise geo-fencing (10-15m radius) for specific classrooms
 * Replaces campus-level validation internally
 */

export interface Classroom {
  id: string;
  name: string;
  building: string;
  floor: number;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export interface LocationValidationResult {
  isValid: boolean;
  distance: number;
  nearestClassroom?: Classroom;
  accuracy: number;
  reason?: string;
}

/**
 * Pre-defined classroom coordinates for BVDU Kharghar Campus
 * Updated with actual campus coordinates (Bharati Vidyapeeth, Kharghar, Belpada, Sector 3)
 */
export const CLASSROOMS: Classroom[] = [
  {
    id: 'room_101',
    name: 'Room 101',
    building: 'BCA Block',
    floor: 1,
    latitude: 19.0458, // BVDU Kharghar campus coordinates
    longitude: 73.0149,
    radius: 15, // 15 meters - classroom level precision
  },
  {
    id: 'room_102',
    name: 'Room 102',
    building: 'BCA Block',
    floor: 1,
    latitude: 19.0459,
    longitude: 73.0150,
    radius: 15,
  },
  {
    id: 'room_201',
    name: 'Room 201',
    building: 'BCA Block',
    floor: 2,
    latitude: 19.0457,
    longitude: 73.0148,
    radius: 15,
  },
  {
    id: 'room_202',
    name: 'Room 202',
    building: 'BCA Block',
    floor: 2,
    latitude: 19.0458,
    longitude: 73.0151,
    radius: 15,
  },
  {
    id: 'lab_301',
    name: 'Computer Lab 301',
    building: 'BCA Block',
    floor: 3,
    latitude: 19.0460,
    longitude: 73.0149,
    radius: 20, // Larger radius for lab (more spacious)
  },
  {
    id: 'lab_302',
    name: 'Computer Lab 302',
    building: 'BCA Block',
    floor: 3,
    latitude: 19.0461,
    longitude: 73.0150,
    radius: 20,
  },
  {
    id: 'auditorium',
    name: 'Main Auditorium',
    building: 'Main Building',
    floor: 1,
    latitude: 19.0456,
    longitude: 73.0147,
    radius: 25, // Larger radius for auditorium
  },
  // Add more classrooms as needed
];

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  
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

  return R * c; // Distance in meters
}

/**
 * Find nearest classroom to given coordinates
 */
function findNearestClassroom(
  latitude: number,
  longitude: number
): { classroom: Classroom; distance: number } | null {
  let nearest: { classroom: Classroom; distance: number } | null = null;

  for (const classroom of CLASSROOMS) {
    const distance = haversineDistance(
      latitude,
      longitude,
      classroom.latitude,
      classroom.longitude
    );

    if (!nearest || distance < nearest.distance) {
      nearest = { classroom, distance };
    }
  }

  return nearest;
}

/**
 * Validate if user is inside any classroom
 * More precise than campus-level validation
 */
export function validateClassroomLocation(
  latitude: number,
  longitude: number,
  accuracy: number
): LocationValidationResult {
  // Check GPS accuracy first
  if (accuracy > 50) {
    return {
      isValid: false,
      distance: 0,
      accuracy,
      reason: 'GPS_POOR_ACCURACY',
    };
  }

  // Find nearest classroom
  const nearest = findNearestClassroom(latitude, longitude);

  if (!nearest) {
    return {
      isValid: false,
      distance: 0,
      accuracy,
      reason: 'NO_CLASSROOMS_DEFINED',
    };
  }

  const { classroom, distance } = nearest;

  // Check if within classroom radius
  const isValid = distance <= classroom.radius;

  return {
    isValid,
    distance: Math.round(distance),
    nearestClassroom: classroom,
    accuracy: Math.round(accuracy),
    reason: isValid ? undefined : 'OUTSIDE_CLASSROOM',
  };
}

/**
 * Validate location for specific classroom (when classroom is known)
 */
export function validateSpecificClassroom(
  latitude: number,
  longitude: number,
  accuracy: number,
  classroomId: string
): LocationValidationResult {
  const classroom = CLASSROOMS.find((c) => c.id === classroomId);

  if (!classroom) {
    return {
      isValid: false,
      distance: 0,
      accuracy,
      reason: 'CLASSROOM_NOT_FOUND',
    };
  }

  if (accuracy > 50) {
    return {
      isValid: false,
      distance: 0,
      accuracy,
      reason: 'GPS_POOR_ACCURACY',
    };
  }

  const distance = haversineDistance(
    latitude,
    longitude,
    classroom.latitude,
    classroom.longitude
  );

  const isValid = distance <= classroom.radius;

  return {
    isValid,
    distance: Math.round(distance),
    nearestClassroom: classroom,
    accuracy: Math.round(accuracy),
    reason: isValid ? undefined : 'OUTSIDE_CLASSROOM',
  };
}

/**
 * Get current location with high accuracy
 * Returns promise that resolves with coordinates or rejects with error
 */
export function getCurrentLocationHighAccuracy(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GEOLOCATION_NOT_SUPPORTED'));
      return;
    }

    // Log attempt to get location
    console.log('[GPS] Requesting high-accuracy location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Ensure coordinates are properly converted to numbers
        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);
        const accuracy = Number(position.coords.accuracy);

        console.log('[GPS] ✅ Location obtained successfully:', {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          accuracy: `${accuracy.toFixed(2)}m`,
          timestamp: new Date(position.timestamp).toISOString(),
        });

        resolve({
          latitude,
          longitude,
          accuracy,
        });
      },
      (error) => {
        let reason = 'LOCATION_ERROR';
        if (error.code === error.PERMISSION_DENIED) {
          reason = 'PERMISSION_DENIED';
          console.error('[GPS] ❌ Permission denied by user');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reason = 'POSITION_UNAVAILABLE';
          console.error('[GPS] ❌ Position unavailable:', error.message);
        } else if (error.code === error.TIMEOUT) {
          reason = 'TIMEOUT';
          console.error('[GPS] ❌ Request timed out');
        }
        reject(new Error(reason));
      },
      {
        enableHighAccuracy: true, // Use GPS + high accuracy mode
        timeout: 20000, // Increase timeout to 20 seconds for better GPS acquisition
        maximumAge: 0, // Don't use cached location - always get fresh coordinates
      }
    );
  });
}

/**
 * Validate location and return user-friendly error messages
 * Maintains existing UI messages
 */
export async function validateLocationForAttendance(): Promise<{
  valid: boolean;
  message?: string;
  validationResult?: LocationValidationResult;
}> {
  try {
    const location = await getCurrentLocationHighAccuracy();
    const validation = validateClassroomLocation(
      location.latitude,
      location.longitude,
      location.accuracy
    );

    if (validation.isValid) {
      return { valid: true, validationResult: validation };
    }

    // Generate user-friendly error messages
    let message = 'Unable to verify your location.';

    if (validation.reason === 'GPS_POOR_ACCURACY') {
      message = 'Poor GPS signal. Please move to an area with better reception.';
    } else if (validation.reason === 'OUTSIDE_CLASSROOM') {
      message = `You are ${validation.distance}m away from the nearest classroom. Please enter the classroom to mark attendance.`;
    }

    return { valid: false, message, validationResult: validation };
  } catch (error: any) {
    let message = 'Location access failed.';

    if (error.message === 'PERMISSION_DENIED') {
      message = 'Location permission denied. Please enable location access.';
    } else if (error.message === 'POSITION_UNAVAILABLE') {
      message = 'Unable to determine your location. Please try again.';
    } else if (error.message === 'TIMEOUT') {
      message = 'Location request timed out. Please try again.';
    }

    return { valid: false, message };
  }
}

/**
 * Helper: Add new classroom (for admin/config)
 */
export function addClassroom(classroom: Classroom): void {
  CLASSROOMS.push(classroom);
  console.log('[LOCATION] Added classroom:', classroom.name);
}

/**
 * Helper: Get all classrooms
 */
export function getAllClassrooms(): Classroom[] {
  return [...CLASSROOMS];
}
