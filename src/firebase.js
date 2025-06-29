import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

let db, auth;

try {
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };

  if (!firebaseConfig.apiKey) {
    throw new Error("Missing Firebase API Key. Please check your .env file.");
  }

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  // Get a reference to the database service and auth
  db = getFirestore(app);
  auth = getAuth(app);

} catch (error) {
  console.error("Firebase initialization error:", error);
  // Keep db and auth as undefined or null to be handled by components
  db = null;
  auth = null;
}

export { db, auth }; 