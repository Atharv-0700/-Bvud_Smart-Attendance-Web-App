import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Global flag to track Firebase initialization status
let firebaseInitialized = false;
let firebaseError: Error | null = null;

// Firebase configuration - Direct connection (no environment variables)
const firebaseConfig = {
  apiKey: "AIzaSyDsUJYjyEiknudIm12nfPQXiSghJPFEGeg", // Add your API key here
  authDomain: "athgo-5b01d.firebaseapp.com",
  databaseURL: "https://athgo-5b01d-default-rtdb.firebaseio.com",
  projectId: "athgo-5b01d",
  storageBucket: "athgo-5b01d.firebasestorage.app",
  messagingSenderId: "991007865844",
  appId: "1:991007865844:web:da47a8d0ef8be91e5317a1",
  measurementId: "G-NYYBK3JQ7F"
};

/**
 * Validate Firebase configuration before initialization
 */
function validateFirebaseConfig(config: any): { valid: boolean; error?: string } {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingFields = requiredFields.filter(field => !config[field] || config[field] === '');
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required Firebase configuration: ${missingFields.join(', ')}`
    };
  }

  return { valid: true };
}

// Validate Firebase config
const configValidation = validateFirebaseConfig(firebaseConfig);
if (!configValidation.valid) {
  firebaseError = new Error(configValidation.error || 'Invalid Firebase configuration');
  console.warn('⚠️ Firebase Config Warning:', firebaseError.message);
  console.warn('📝 Please add your Firebase API key to /src/config/firebase.ts');
}

// Initialize Firebase - Check if app already exists
let app: FirebaseApp | null = null;
let auth: any = null;
let database: any = null;
let storage: any = null;
let analytics: any = null;

try {
  if (!firebaseError) {
    if (!getApps().length) {
      // No Firebase app exists, create a new one
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase initialized successfully');
    } else {
      // Firebase app already exists, use it
      app = getApp();
      console.log('✅ Firebase app already initialized');
    }

    // Initialize Firebase services
    auth = getAuth(app);
    database = getDatabase(app);
    storage = getStorage(app);
    
    // Initialize Analytics (only in browser environment)
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics initialized');
      } catch (error) {
        console.warn('⚠️ Firebase Analytics could not be initialized:', error);
      }
    }
    
    firebaseInitialized = true;
  } else {
    console.warn('⚠️ Firebase not initialized - API key required');
    console.warn('📝 Add your API key to line 13 in /src/config/firebase.ts');
  }
} catch (error: any) {
  firebaseError = error;
  console.error('🔥 Firebase Initialization Error:', error.message);
  
  // Provide helpful error messages based on error type
  if (error.code === 'auth/invalid-api-key') {
    console.error('❌ Invalid Firebase API key. Please check your configuration.');
  } else if (error.code === 'app/duplicate-app') {
    console.warn('⚠️ Firebase app already initialized. Using existing instance.');
    try {
      app = getApp();
      auth = getAuth(app);
      database = getDatabase(app);
      storage = getStorage(app);
      if (typeof window !== 'undefined') {
        try {
          analytics = getAnalytics(app);
        } catch (e) {
          console.warn('Analytics initialization skipped');
        }
      }
      firebaseInitialized = true;
      firebaseError = null;
    } catch (e) {
      console.error('Failed to get existing Firebase app:', e);
    }
  } else {
    console.error('❌ Failed to initialize Firebase.');
  }
}

/**
 * Check if Firebase is properly initialized
 */
export function isFirebaseInitialized(): boolean {
  return firebaseInitialized;
}

/**
 * Get Firebase initialization error if any
 */
export function getFirebaseError(): Error | null {
  return firebaseError;
}

/**
 * Get Firebase configuration status for debugging
 */
export function getFirebaseStatus() {
  return {
    initialized: firebaseInitialized,
    error: firebaseError?.message || null,
    hasApp: app !== null,
    configuredServices: {
      auth: auth !== null,
      database: database !== null,
      storage: storage !== null,
      analytics: analytics !== null
    }
  };
}

// Export Firebase services (will be null if initialization failed)
export { auth, database, storage, analytics, app };

export default app;