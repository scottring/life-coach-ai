import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Check if Firebase credentials are configured
const hasFirebaseCredentials = 
  process.env.REACT_APP_FIREBASE_API_KEY && 
  process.env.REACT_APP_FIREBASE_API_KEY !== 'your-firebase-api-key';

// Firebase configuration with fallback for demo mode
const firebaseConfig = hasFirebaseCredentials ? {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
} : {
  // Demo configuration - won't work for real auth but prevents initialization errors
  apiKey: "demo-api-key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id"
};

let app: any = null;
let db: any = null;
let auth: any = null;
let functions: any = null;

// Only initialize Firebase if we have credentials or are in demo mode
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  functions = getFunctions(app);
  
  console.log(hasFirebaseCredentials ? '🔥 Firebase initialized with real credentials' : '🎭 Firebase initialized in demo mode');
} catch (error) {
  console.warn('Firebase initialization failed:', error);
  console.log('🎭 Running in offline demo mode');
}

// Connect to emulators in development (only if no real credentials)
if (process.env.NODE_ENV === 'development' && !hasFirebaseCredentials && auth) {
  console.log('🔧 Using Firebase emulators for development...');
  
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    console.warn('Could not connect to Firebase emulators:', error);
  }
}

export { db, auth, functions, hasFirebaseCredentials };

export default app;