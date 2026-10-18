import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

// Firebase web config, supplied through Vite env vars (see .env.example).
// The API key is a public identifier for the project; access is controlled by
// Firestore security rules, not by hiding this value.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Firebase is optional: when the config is missing the app still runs, it just
// hides the save/load features instead of crashing on startup.
export const firebaseEnabled = Boolean(
  config.apiKey && config.projectId && config.appId,
)

let app: FirebaseApp | null = null
let db: Firestore | null = null

if (firebaseEnabled) {
  app = initializeApp(config)
  db = getFirestore(app)
}

export { app, db }
