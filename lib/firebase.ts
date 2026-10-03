import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

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

export function isFirebaseStorageConfigured(): boolean {
  return isFirebaseConfigured() && Boolean(firebaseConfig.storageBucket);
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
let _storage: FirebaseStorage | null = null;

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getFirebaseApp());
  return _storage;
}

export const auth: Auth = getFirebaseAuth();
export const db: Firestore = getFirebaseDb();
export const storage: FirebaseStorage = getFirebaseStorage();

const firebaseAppProxy = new Proxy({} as FirebaseApp, {
  get(_, prop) {
    return Reflect.get(getFirebaseApp(), prop);
  },
});

export default firebaseAppProxy;
