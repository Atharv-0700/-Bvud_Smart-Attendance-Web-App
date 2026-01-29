/**
 * Dual Geofencing Validation System
 * Validates student location against:
 * 1. Teacher's live GPS location (15-meter radius)
 * 2. College campus boundary (predefined radius)
 */

import type { GeofenceValidationResult } from '@/types/sessionTypes';

// Bharati Vidyapeeth University, Kharghar Campus Coordinates
const CAMPUS_COORDINATES = {
  latitude: 19.0434,
  longitude: 73.0618,
  radius: 500, // 500 meters campus boundary
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in meters
  return distance;
}

/**
 * Validate if student is within teacher's proximity (15-meter radius)
 */
export function validateTeacherProximity(
  studentLat: number,
  studentLon: number,
  teacherLat: number,
  teacherLon: number,
  radiusMeters: number = 15
): { isValid: boolean; distance: number } {
  const distance = calculateDistance(studentLat, studentLon, teacherLat, teacherLon);
  const isValid = distance <= radiusMeters;

  return { isValid, distance };
}

/**
 * Validate if student is within college campus boundary
 */
export function validateCampusBoundary(
  studentLat: number,
  studentLon: number,
  campusLat: number = CAMPUS_COORDINATES.latitude,
  campusLon: number = CAMPUS_COORDINATES.longitude,
  campusRadius: number = CAMPUS_COORDINATES.radius
): { isValid: boolean; distance: number } {
  const distance = calculateDistance(studentLat, studentLon, campusLat, campusLon);
  const isValid = distance <= campusRadius;

  return { isValid, distance };
}

/**
 * Dual Geofencing Validation
 * Both conditions must be satisfied:
 * 1. Student within 15m of teacher's live location
 * 2. Student within campus boundary
 */
export function validateDualGeofence(
  studentLat: number,
  studentLon: number,
  teacherLat: number,
  teacherLon: number,
  teacherRadius: number = 15,
  campusLat: number = CAMPUS_COORDINATES.latitude,
  campusLon: number = CAMPUS_COORDINATES.longitude,
  campusRadius: number = CAMPUS_COORDINATES.radius
): GeofenceValidationResult {
  // Check 1: Teacher Proximity (15-meter radius)
  const teacherProximityResult = validateTeacherProximity(
    studentLat,
    studentLon,
    teacherLat,
    teacherLon,
    teacherRadius
  );

  // Check 2: Campus Boundary
  const campusBoundaryResult = validateCampusBoundary(
    studentLat,
    studentLon,
    campusLat,
    campusLon,
    campusRadius
  );

  // Both conditions must be satisfied
  const isValid = teacherProximityResult.isValid && campusBoundaryResult.isValid;

  let errorMessage: string | undefined;
  if (!isValid) {
    if (!teacherProximityResult.isValid && !campusBoundaryResult.isValid) {
      errorMessage = `You are ${teacherProximityResult.distance.toFixed(
        1
      )}m away from teacher (required: within ${teacherRadius}m) and ${campusBoundaryResult.distance.toFixed(
        1
      )}m away from campus center (required: within ${campusRadius}m).`;
    } else if (!teacherProximityResult.isValid) {
      errorMessage = `You are ${teacherProximityResult.distance.toFixed(
        1
      )}m away from teacher. You must be within ${teacherRadius}m to mark attendance.`;
    } else if (!campusBoundaryResult.isValid) {
      errorMessage = `You are ${campusBoundaryResult.distance.toFixed(
        1
      )}m away from campus center. You must be within campus boundary (${campusRadius}m radius).`;
    }
  }

  return {
    isValid,
    teacherProximityCheck: teacherProximityResult.isValid,
    campusBoundaryCheck: campusBoundaryResult.isValid,
    distanceFromTeacher: teacherProximityResult.distance,
    distanceFromCampus: campusBoundaryResult.distance,
    errorMessage,
  };
}

/**
 * Check if GPS accuracy is acceptable
 * Returns false if accuracy is too low (>50 meters)
 */
export function validateGPSAccuracy(accuracyMeters: number): {
  isValid: boolean;
  message?: string;
} {
  const MAX_ACCEPTABLE_ACCURACY = 50; // meters

  if (accuracyMeters > MAX_ACCEPTABLE_ACCURACY) {
    return {
      isValid: false,
      message: `GPS accuracy too low (${accuracyMeters.toFixed(
        0
      )}m). Please move to an open area with clear sky view and try again.`,
    };
  }

  return { isValid: true };
}

/**
 * Get current GPS location with high accuracy
 */
export function getCurrentLocation(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  }
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Watch teacher's location continuously
 * Returns a watchId that can be used to clear the watch
 */
export function watchTeacherLocation(
  onLocationUpdate: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser');
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  };

  return navigator.geolocation.watchPosition(onLocationUpdate, onError, options);
}

/**
 * Clear location watch
 */
export function clearLocationWatch(watchId: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1) {
    return `${Math.round(meters * 100)} cm`;
  } else if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(2)} km`;
  }
}
