import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'lopu-ddf22.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'lopu-ddf22',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'lopu-ddf22.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '895470500244',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-7R986FTTVN',
};

export const googleClientConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
  // Strict scoped access to only files created or opened by LopU
  scope: 'https://www.googleapis.com/auth/drive.file',
};

// Check whether real credentials have been replaced from placeholder
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('THAY_API_KEY') &&
  firebaseConfig.appId &&
  !firebaseConfig.appId.includes('THAY_APP_ID')
);

export const isGoogleClientConfigured = Boolean(
  googleClientConfig.clientId &&
  !googleClientConfig.clientId.includes('THAY_CLIENT_ID')
);

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let analyticsInstance: Analytics | null = null;

try {
  if (isFirebaseConfigured) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firestoreDb = getFirestore(app);
    firebaseAuth = getAuth(app);

    // Initialize Analytics if supported in current browser environment
    if (typeof window !== 'undefined') {
      isSupported().then(supported => {
        if (supported && app) {
          analyticsInstance = getAnalytics(app);
        }
      }).catch(() => {
        // Ignore analytics environment restrictions in preview iframes
      });
    }
  }
} catch (error) {
  console.warn('LopU Firebase initialization notice: Running in offline-first mode.', error);
}

export { app as firebaseApp, firestoreDb as db, firebaseAuth as auth, analyticsInstance as analytics };
