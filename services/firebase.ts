import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Fail gracefully if config is missing
let app;
let analytics;
let auth;
let db;
let storage;

try {
    if (!firebaseConfig.apiKey) {
        console.warn("Firebase credentials missing! App running in limited mode.");
    }
    app = initializeApp(firebaseConfig);

    // Only init analytics if supported/configured
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
        try {
            analytics = getAnalytics(app);
        } catch (e) {
            console.warn("Analytics failed to load", e);
        }
    }

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

export { app, analytics, auth, db, storage };
