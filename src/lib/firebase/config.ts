// src/lib/firebase/config.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services with better error handling
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;
let functions: ReturnType<typeof getFunctions>;

try {
  auth = getAuth(app);
  // Set a shorter timeout for auth operations
  auth.settings.appVerificationDisabledForTesting = false;
} catch (error) {
  console.error('Error initializing Firebase Auth:', error);
  throw error;
}

try {
  db = getFirestore(app);
  // Enable offline persistence for faster loads
  // Note: This may throw if already enabled
} catch (error) {
  console.error('Error initializing Firestore:', error);
  throw error;
}

try {
  storage = getStorage(app);
} catch (error) {
  console.error('Error initializing Storage:', error);
  throw error;
}

try {
  functions = getFunctions(app);
} catch (error) {
  console.error('Error initializing Functions:', error);
  throw error;
}

export { auth, db, storage, functions };
export default app;
