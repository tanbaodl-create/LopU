import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import appletConfig from '../../firebase-applet-config.json';

// Suppress Firestore connection warnings in offline/sandbox preview
setLogLevel('silent');

export const firebaseConfig = {
  apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0465436218.firebaseapp.com',
  projectId: appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0465436218',
  storageBucket: appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0465436218.firebasestorage.app',
  messagingSenderId: appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '999770107772',
  appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || '1:999770107772:web:3cc0f1b3ce7391931d3ef9',
  measurementId: appletConfig.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const googleClientConfig = {
  clientId: appletConfig.oAuthClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '999770107772-bprimeadqahj7etfdsel6oi5frci04s4.apps.googleusercontent.com',
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
  scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
};

// Check whether real credentials are present
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
