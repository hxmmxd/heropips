import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCw7MvUz6uO7AKLxiXKbhmDGYu7UhLFqTg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "xyrotrade-938e5.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "xyrotrade-938e5",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "xyrotrade-938e5.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "857424114811",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:857424114811:web:0e16944f44ea9de7fd9ede",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-RM49KPEN7B",
};

// Configure App Check Debug Token for localhost environment
if (typeof window !== 'undefined') {
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = 
    process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN || 
    "Ae0iMNcspMfOtCoA-3Jpi_lViMFHBjqEvpD3OTpcairLDsVShYHb8sPQXM0UgEmwNLiKK9K3H3GncE_I4_-CBtGDLbo-WRqwNZtPgf4TBQ2nYkd5uX7VcA0BLuS5LMyg4iAVIyuaUp_6jQU8MFRDadb4oQ";
}

// Initialize Firebase (singleton instance)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider, RecaptchaVerifier, signInWithPhoneNumber };


