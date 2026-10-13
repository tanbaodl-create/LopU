import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import appletConfig from '../../firebase-applet-config.json';

// Suppress Firestore connection warnings in offline/sandbox preview
setLogLevel('silent');

// Kiểm tra cấu hình LopU được lưu tùy chỉnh trong localStorage
let localLopUConfig: Partial<typeof appletConfig> | null = null;
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('lopu_custom_firebase_config');
    if (raw) {
      localLopUConfig = JSON.parse(raw);
    }
  } catch (e) {
    // Ignore JSON parse error
  }
}

// Cấu hình duy nhất của dự án LopU
export const firebaseConfig = {
  apiKey: localLopUConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || '',
  authDomain: localLopUConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || 'lopu-ddf22.firebaseapp.com',
  projectId: localLopUConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || 'lopu-ddf22',
  storageBucket: localLopUConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || 'lopu-ddf22.firebasestorage.app',
  messagingSenderId: localLopUConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || '895470500244',
  appId: localLopUConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || '',
  measurementId: localLopUConfig?.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || '',
};

export const googleClientConfig = {
  clientId: localLopUConfig?.oAuthClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || appletConfig.oAuthClientId || '',
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
  scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
};

// Kiểm tra trạng thái cấu hình của Firebase LopU
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

    // Initialize Analytics if supported in current browser environment and valid measurementId is configured
    if (typeof window !== 'undefined' && firebaseConfig.measurementId && firebaseConfig.measurementId.startsWith('G-')) {
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
