/**
 * Attendance Confidence Score Calculator
 * Computes a 0-100 confidence score based on multiple security factors
 */

import { LocationValidationResult } from './locationValidator';
import { LivenessResult } from './faceLiveness';

export interface ConfidenceFactors {
  deviceMatch: boolean;
  locationValid: boolean;
  locationAccuracy: number;
  locationDistance: number;
  stayVerified: boolean;
  livenessDetected: boolean;
  livenessConfidence: number;
  scanTime: number;
  qrValidity: boolean;
}

export interface ConfidenceScore {
  score: number; // 0-100
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  factors: ConfidenceFactors;
  breakdown: {
    deviceScore: number;
    locationScore: number;
    stayScore: number;
    livenessScore: number;
    timingScore: number;
  };
  flags: string[];
}

/**
 * Weight configuration for each factor
 * Total should equal 100
 */
const CONFIDENCE_WEIGHTS = {
  DEVICE_MATCH: 25, // 25% weight
  LOCATION_VALID: 30, // 30% weight
  STAY_VERIFIED: 25, // 25% weight
  LIVENESS_DETECTED: 15, // 15% weight
  TIMING: 5, // 5% weight
};

/**
 * Calculate comprehensive confidence score
 */
export function calculateConfidenceScore(factors: ConfidenceFactors): ConfidenceScore {
  const breakdown = {
    deviceScore: calculateDeviceScore(factors),
    locationScore: calculateLocationScore(factors),
    stayScore: calculateStayScore(factors),
    livenessScore: calculateLivenessScore(factors),
    timingScore: calculateTimingScore(factors),
  };

  // Calculate weighted total
  const score = Math.round(
    breakdown.deviceScore * (CONFIDENCE_WEIGHTS.DEVICE_MATCH / 100) +
    breakdown.locationScore * (CONFIDENCE_WEIGHTS.LOCATION_VALID / 100) +
    breakdown.stayScore * (CONFIDENCE_WEIGHTS.STAY_VERIFIED / 100) +
    breakdown.livenessScore * (CONFIDENCE_WEIGHTS.LIVENESS_DETECTED / 100) +
    breakdown.timingScore * (CONFIDENCE_WEIGHTS.TIMING / 100)
  );

  // Determine confidence level
  let level: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  if (score >= 80) level = 'HIGH';
  else if (score >= 60) level = 'MEDIUM';
  else if (score >= 40) level = 'LOW';
  else level = 'VERY_LOW';

  // Collect flags for suspicious activity
  const flags: string[] = [];

  if (!factors.deviceMatch) flags.push('DEVICE_MISMATCH');
  if (!factors.locationValid) flags.push('LOCATION_INVALID');
  if (factors.locationAccuracy > 50) flags.push('POOR_GPS_ACCURACY');
  if (factors.locationDistance > 10) flags.push('FAR_FROM_CLASSROOM');
  if (!factors.stayVerified) flags.push('STAY_NOT_VERIFIED');
  if (!factors.livenessDetected) flags.push('LIVENESS_FAILED');
  if (factors.livenessConfidence < 0.6) flags.push('LOW_LIVENESS_CONFIDENCE');
  if (!factors.qrValidity) flags.push('INVALID_QR');

  console.log('[CONFIDENCE] Score calculated:', {
    score,
    level,
    breakdown,
    flagCount: flags.length,
  });

  return {
    score,
    level,
    factors,
    breakdown,
    flags,
  };
}

/**
 * Calculate device score (0-100)
 */
function calculateDeviceScore(factors: ConfidenceFactors): number {
  // Perfect score if device matches
  if (factors.deviceMatch) {
    return 100;
  }

  // Zero score if device doesn't match
  return 0;
}

/**
 * Calculate location score (0-100)
 */
function calculateLocationScore(factors: ConfidenceFactors): number {
  let score = 0;

  // Base score for valid location
  if (factors.locationValid) {
    score += 60;
  }

  // Bonus for high GPS accuracy
  if (factors.locationAccuracy <= 10) {
    score += 20; // Excellent accuracy
  } else if (factors.locationAccuracy <= 20) {
    score += 15; // Good accuracy
  } else if (factors.locationAccuracy <= 30) {
    score += 10; // Acceptable accuracy
  } else if (factors.locationAccuracy <= 50) {
    score += 5; // Poor accuracy
  }

  // Bonus for being close to classroom center
  if (factors.locationDistance <= 5) {
    score += 20; // Very close
  } else if (factors.locationDistance <= 10) {
    score += 15; // Close
  } else if (factors.locationDistance <= 15) {
    score += 10; // Within range
  }

  return Math.min(score, 100);
}

/**
 * Calculate stay verification score (0-100)
 */
function calculateStayScore(factors: ConfidenceFactors): number {
  // Perfect score if stay verified
  if (factors.stayVerified) {
    return 100;
  }

  // Partial score if verification not yet complete
  // (This is for pending verifications)
  return 50;
}

/**
 * Calculate liveness score (0-100)
 */
function calculateLivenessScore(factors: ConfidenceFactors): number {
  if (!factors.livenessDetected) {
    return 0;
  }

  // Convert confidence (0-1) to score (0-100)
  return Math.round(factors.livenessConfidence * 100);
}

/**
 * Calculate timing score (0-100)
 */
function calculateTimingScore(factors: ConfidenceFactors): number {
  // Perfect score if QR is valid
  if (factors.qrValidity) {
    return 100;
  }

  // Zero if QR expired or invalid
  return 0;
}

/**
 * Create confidence factors from attendance data
 */
export function createConfidenceFactors(data: {
  deviceMatch: boolean;
  locationValidation: LocationValidationResult;
  stayVerified: boolean;
  livenessResult: LivenessResult;
  qrExpiry: number;
  scanTime: number;
}): ConfidenceFactors {
  const qrValidity = data.scanTime <= data.qrExpiry;

  return {
    deviceMatch: data.deviceMatch,
    locationValid: data.locationValidation.isValid,
    locationAccuracy: data.locationValidation.accuracy,
    locationDistance: data.locationValidation.distance,
    stayVerified: data.stayVerified,
    livenessDetected: data.livenessResult.isLive,
    livenessConfidence: data.livenessResult.confidence,
    scanTime: data.scanTime,
    qrValidity,
  };
}

/**
 * Get confidence level color (for UI)
 */
export function getConfidenceLevelColor(level: string): string {
  switch (level) {
    case 'HIGH':
      return '#22C55E'; // Green
    case 'MEDIUM':
      return '#F59E0B'; // Yellow
    case 'LOW':
      return '#EF4444'; // Red
    case 'VERY_LOW':
      return '#DC2626'; // Dark Red
    default:
      return '#6B7280'; // Gray
  }
}

/**
 * Get confidence level description
 */
export function getConfidenceLevelDescription(level: string): string {
  switch (level) {
    case 'HIGH':
      return 'High confidence - All security checks passed';
    case 'MEDIUM':
      return 'Medium confidence - Most checks passed';
    case 'LOW':
      return 'Low confidence - Some checks failed';
    case 'VERY_LOW':
      return 'Very low confidence - Multiple checks failed';
    default:
      return 'Unknown confidence level';
  }
}

/**
 * Check if attendance should be flagged for manual review
 */
export function shouldFlagForReview(confidenceScore: ConfidenceScore): boolean {
  // Flag if score is LOW or VERY_LOW
  if (confidenceScore.level === 'LOW' || confidenceScore.level === 'VERY_LOW') {
    return true;
  }

  // Flag if there are critical security flags
  const criticalFlags = ['DEVICE_MISMATCH', 'LOCATION_INVALID', 'LIVENESS_FAILED'];
  const hasCriticalFlag = confidenceScore.flags.some((flag) =>
    criticalFlags.includes(flag)
  );

  return hasCriticalFlag;
}

/**
 * Get recommended action based on confidence score
 */
export function getRecommendedAction(
  confidenceScore: ConfidenceScore
): 'APPROVE' | 'REVIEW' | 'REJECT' {
  if (confidenceScore.level === 'HIGH') {
    return 'APPROVE';
  }

  if (confidenceScore.level === 'MEDIUM') {
    // Check for critical flags
    if (confidenceScore.flags.includes('DEVICE_MISMATCH')) {
      return 'REJECT';
    }
    return 'REVIEW';
  }

  if (confidenceScore.level === 'LOW') {
    return 'REVIEW';
  }

  // VERY_LOW
  return 'REJECT';
}

/**
 * Generate human-readable confidence report
 */
export function generateConfidenceReport(confidenceScore: ConfidenceScore): string {
  const { score, level, breakdown, flags } = confidenceScore;

  let report = `Confidence Score: ${score}/100 (${level})\n\n`;

  report += `Score Breakdown:\n`;
  report += `  • Device Match: ${breakdown.deviceScore}/100\n`;
  report += `  • Location Valid: ${breakdown.locationScore}/100\n`;
  report += `  • Stay Verified: ${breakdown.stayScore}/100\n`;
  report += `  • Liveness Check: ${breakdown.livenessScore}/100\n`;
  report += `  • Timing: ${breakdown.timingScore}/100\n\n`;

  if (flags.length > 0) {
    report += `Security Flags:\n`;
    flags.forEach((flag) => {
      report += `  ⚠️ ${flag}\n`;
    });
  } else {
    report += `✅ No security flags\n`;
  }

  return report;
}

/**
 * Get weight configuration (for admin settings)
 */
export function getWeightConfiguration() {
  return { ...CONFIDENCE_WEIGHTS };
}

/**
 * Update weight configuration
 */
export function updateWeightConfiguration(weights: Partial<typeof CONFIDENCE_WEIGHTS>) {
  Object.assign(CONFIDENCE_WEIGHTS, weights);
  console.log('[CONFIDENCE] Weights updated:', CONFIDENCE_WEIGHTS);
}
