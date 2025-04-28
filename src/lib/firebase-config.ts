import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app: any;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let googleProvider: GoogleAuthProvider;
let analytics: any;

if (typeof window !== 'undefined') {
  try {
    console.log("Firebase ინიციალიზაცია...");
    
    // წინასწარი შემოწმება
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
      console.error("Firebase კონფიგურაცია არასრულია! შეამოწმეთ გარემოს ცვლადები:", { 
        apiKey: !!firebaseConfig.apiKey, 
        authDomain: !!firebaseConfig.authDomain, 
        projectId: !!firebaseConfig.projectId 
      });
    }
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    analytics = getAnalytics(app);
    googleProvider = new GoogleAuthProvider();
    
    // პარამეტრების კონფიგურაცია
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    console.log("Firebase ინიციალიზაცია წარმატებულია");
  } catch (error: any) {
    console.error("Firebase ინიციალიზაციის შეცდომა:", error);
    console.error("შეცდომის დეტალები:", error.message);
    console.error("შეცდომის კოდი:", error.code);
    
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
  }
}

export { app, auth, db, storage, analytics, googleProvider, signInWithPopup }; 