import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
// --- UPDATED: Only import 'getFirestore' and 'initializeFirestore' ---
import { getFirestore, initializeFirestore } from 'firebase/firestore'
// --- END UPDATED ---

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app = null
let auth = null
let db = null

if (!firebaseConfig.apiKey) {
  console.warn('Missing Firebase config in environment variables')
} else {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)

  // --- UPDATED: Use initializeFirestore with 'indexeddb' string literal for cache kind ---
  try {
    db = initializeFirestore(app, {
      cache: {
        kind: 'indexeddb',
        synchronizeTabs: true,
      },
    })
    console.log(
      '[Firestore] Offline persistence enabled using FirestoreSettings.cache.'
    )
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn(
        '[Firestore] Offline persistence failed — multiple tabs open. Using in-memory cache.'
      )
      // Fallback to in-memory cache if persistence fails (e.g., multiple tabs open)
      db = getFirestore(app) // Initialize without persistence
    } else if (err.code === 'unimplemented') {
      console.warn(
        '[Firestore] Persistence not supported in this browser. Using in-memory cache.'
      )
      // Fallback to in-memory cache if not supported
      db = getFirestore(app) // Initialize without persistence
    } else {
      console.error('[Firestore] Error initializing persistence:', err)
      db = getFirestore(app) // Fallback to in-memory cache on other errors
    }
  }
  // --- END UPDATED ---
}

export { app, auth, db }
