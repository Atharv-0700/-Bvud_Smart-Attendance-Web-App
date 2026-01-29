/**
 * Environment Variables Configuration
 * Centralized access to all environment variables
 */

interface EnvironmentConfig {
  // Firebase
  firebase: {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  
  // Campus Location
  campus: {
    latitude: number;
    longitude: number;
    radius: number;
    teacherProximityRadius: number;
  };
  
  // Application Info
  app: {
    name: string;
    university: string;
    department: string;
  };
  
  // Environment
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback: string = ''): string {
  const value = import.meta.env[key];
  
  if (!value && !fallback) {
    if (import.meta.env.DEV) {
      // In development, return a placeholder instead of throwing
      console.warn(`⚠️ Environment variable ${key} is not set - using placeholder`);
      return `PLACEHOLDER_${key}`;
    }
    console.warn(`Environment variable ${key} is not set`);
  }
  
  return value || fallback;
}

/**
 * Get numeric environment variable with fallback
 */
function getNumericEnvVar(key: string, fallback: number): number {
  const value = import.meta.env[key];
  return value ? parseFloat(value) : fallback;
}

/**
 * Environment configuration
 */
export const env: EnvironmentConfig = {
  firebase: {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY', ''),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', ''),
    databaseURL: getEnvVar('VITE_FIREBASE_DATABASE_URL', ''),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', ''),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', ''),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', ''),
    appId: getEnvVar('VITE_FIREBASE_APP_ID', ''),
    measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', ''),
  },
  
  campus: {
    latitude: getNumericEnvVar('VITE_CAMPUS_LATITUDE', 19.0434),
    longitude: getNumericEnvVar('VITE_CAMPUS_LONGITUDE', 73.0618),
    radius: getNumericEnvVar('VITE_CAMPUS_RADIUS', 500),
    teacherProximityRadius: getNumericEnvVar('VITE_TEACHER_PROXIMITY_RADIUS', 15),
  },
  
  app: {
    name: getEnvVar('VITE_APP_NAME', 'Smart Attendance System'),
    university: getEnvVar('VITE_APP_UNIVERSITY', 'Bharati Vidyapeeth University'),
    department: getEnvVar('VITE_APP_DEPARTMENT', 'BCA Department'),
  },
  
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

/**
 * Validate that all required environment variables are set
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_DATABASE_URL',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];
  
  const missing = requiredVars.filter(key => {
    const value = import.meta.env[key];
    return !value || value.startsWith('PLACEHOLDER_');
  });
  
  if (missing.length > 0 && !import.meta.env.DEV) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please check your .env file or deployment environment variables.');
  } else if (missing.length > 0 && import.meta.env.DEV) {
    console.warn('⚠️ Missing required environment variables:', missing);
    console.warn('The app will show a configuration screen. To run locally, create .env.local with your Firebase credentials.');
  } else {
    console.log('✅ All required environment variables are set');
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Log environment status (development only)
 */
if (env.isDevelopment) {
  console.log('%c🔧 Development Mode', 'font-size: 14px; font-weight: bold; color: #F59E0B;');
  console.log('🏫 University:', env.app.university);
  console.log('🎓 Department:', env.app.department);
  validateEnvironment();
}

export default env;