/**
 * Device Fingerprinting Module
 * Generates stable browser/device fingerprints for hard device binding
 * No UI changes - operates silently in background
 */

import { database } from '../config/firebase';
import { ref, get, set } from 'firebase/database';

interface DeviceFingerprint {
  hash: string;
  userAgent: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  language: string;
  colorDepth: number;
  hardwareConcurrency: number;
  deviceMemory: number | undefined;
  createdAt: number;
  lastVerified: number;
}

// Backward compatibility: Old fingerprint format
interface LegacyDeviceFingerprint {
  deviceId: string;
  userAgent: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  language: string;
  colorDepth: number;
  hardwareConcurrency: number;
}

/**
 * Generate a stable fingerprint from browser/device characteristics
 */
export function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.platform,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency?.toString() || '0',
    // @ts-ignore - deviceMemory is not in all TypeScript definitions
    navigator.deviceMemory?.toString() || '0',
    screen.pixelDepth.toString(),
    new Date().getTimezoneOffset().toString(),
  ];

  // Create stable hash from components
  const raw = components.join('|');
  return hashString(raw);
}

/**
 * BACKWARD COMPATIBILITY: Generate device fingerprint (old format)
 * This maintains compatibility with existing Login.tsx and QRScan.tsx
 */
export async function generateDeviceFingerprint(): Promise<LegacyDeviceFingerprint> {
  return {
    deviceId: generateFingerprint(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    colorDepth: screen.colorDepth,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
  };
}

/**
 * BACKWARD COMPATIBILITY: Get human-readable device description
 */
export function getDeviceDescription(fingerprint: LegacyDeviceFingerprint): string {
  const browserName = getBrowserName(fingerprint.userAgent);
  const osName = getOSName(fingerprint.platform, fingerprint.userAgent);
  
  return `${browserName} on ${osName}`;
}

/**
 * Extract browser name from user agent
 */
function getBrowserName(userAgent: string): string {
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown Browser';
}

/**
 * Extract OS name from platform and user agent
 */
function getOSName(platform: string, userAgent: string): string {
  if (platform.includes('Win')) return 'Windows';
  if (platform.includes('Mac')) return 'macOS';
  if (platform.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown OS';
}

/**
 * Simple hash function for fingerprint
 * Using djb2 algorithm for stability and speed
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get detailed device info for storage
 */
function getDeviceInfo(): Omit<DeviceFingerprint, 'hash' | 'createdAt' | 'lastVerified'> {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    colorDepth: screen.colorDepth,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    // @ts-ignore
    deviceMemory: navigator.deviceMemory,
  };
}

/**
 * Bind device to user account on first login
 * Returns true if binding successful, false if already bound
 */
export async function bindDeviceToUser(userId: string): Promise<boolean> {
  const bindingRef = ref(database, `deviceBindings/${userId}`);
  const existingBinding = await get(bindingRef);

  // If already bound, don't re-bind
  if (existingBinding.exists()) {
    return false;
  }

  const fingerprint = generateFingerprint();
  const deviceInfo = getDeviceInfo();

  const binding: DeviceFingerprint = {
    hash: fingerprint,
    ...deviceInfo,
    createdAt: Date.now(),
    lastVerified: Date.now(),
  };

  await set(bindingRef, binding);
  console.log('[SECURITY] Device bound successfully for user:', userId);
  return true;
}

/**
 * Verify device fingerprint matches stored binding
 * Returns true if verified, false if mismatch (SECURITY VIOLATION)
 */
export async function verifyDeviceBinding(userId: string): Promise<{
  verified: boolean;
  reason?: string;
}> {
  try {
    const bindingRef = ref(database, `deviceBindings/${userId}`);
    const bindingSnapshot = await get(bindingRef);

    // No binding exists - this is first login, allow and bind
    if (!bindingSnapshot.exists()) {
      await bindDeviceToUser(userId);
      return { verified: true };
    }

    const storedBinding: DeviceFingerprint = bindingSnapshot.val();
    const currentFingerprint = generateFingerprint();

    // Compare fingerprints
    if (storedBinding.hash !== currentFingerprint) {
      console.error('[SECURITY] Device mismatch detected for user:', userId);
      console.error('[SECURITY] Expected hash:', storedBinding.hash);
      console.error('[SECURITY] Received hash:', currentFingerprint);
      
      // Log security event
      await logSecurityEvent(userId, 'DEVICE_MISMATCH', {
        storedHash: storedBinding.hash,
        currentHash: currentFingerprint,
        storedDevice: storedBinding.userAgent,
        currentDevice: navigator.userAgent,
      });

      return {
        verified: false,
        reason: 'DEVICE_MISMATCH',
      };
    }

    // Update last verified timestamp
    await set(ref(database, `deviceBindings/${userId}/lastVerified`), Date.now());

    console.log('[SECURITY] Device verified successfully for user:', userId);
    return { verified: true };
  } catch (error) {
    console.error('[SECURITY] Error verifying device binding:', error);
    // On error, allow login to prevent legitimate users from being locked out
    return { verified: true };
  }
}

/**
 * Log security events for audit trail
 */
async function logSecurityEvent(
  userId: string,
  eventType: string,
  details: Record<string, any>
): Promise<void> {
  const eventRef = ref(database, `securityEvents/${userId}/${Date.now()}`);
  await set(eventRef, {
    eventType,
    timestamp: Date.now(),
    details,
    userAgent: navigator.userAgent,
  });
}

/**
 * Check if device binding is enforced for a user
 * Can be used for gradual rollout or role-based enforcement
 */
export function isDeviceBindingEnforced(userRole?: string): boolean {
  // Enforce for all users
  // Can be modified to enforce only for students, not teachers, etc.
  return true;
}

/**
 * Get current device info (for admin/debugging)
 */
export async function getCurrentDeviceInfo(userId: string): Promise<any> {
  const bindingRef = ref(database, `deviceBindings/${userId}`);
  const snapshot = await get(bindingRef);
  
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val();
}