import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
  );
}

function getFirebaseApp(): FirebaseApp {
  const defaultApp = getApps().find((app) => app.name === '[DEFAULT]');
  if (defaultApp) return defaultApp;

  const sanitizedConfig = {
    apiKey: firebaseConfig.apiKey || 'demo-api-key',
    authDomain: firebaseConfig.authDomain || 'demo-project.firebaseapp.com',
    projectId: firebaseConfig.projectId || 'demo-project',
    storageBucket: firebaseConfig.storageBucket || 'demo-project.appspot.com',
    messagingSenderId: firebaseConfig.messagingSenderId || '0000000000',
    appId: firebaseConfig.appId || '1:0000000000:web:demo',
    measurementId: firebaseConfig.measurementId || 'G-DEMO000000',
  };

  return initializeApp(sanitizedConfig);
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    const a = getFirebaseAuth();
    return Reflect.get(a, prop);
  },
});

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    const d = getFirebaseDb();
    return Reflect.get(d, prop);
  },
});

export default new Proxy({} as FirebaseApp, {
  get(_, prop) {
    return Reflect.get(getFirebaseApp(), prop);
  },
});
