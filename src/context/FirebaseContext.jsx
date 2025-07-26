import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase/initFirebase' // Assuming db is the firestore instance
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'

// Set your app ID here
const APP_ID =
  import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

const FirebaseContext = createContext()

export const FirebaseProvider = ({ children }) => {
  const [userId, setUserId] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [userCreatedAt, setUserCreatedAt] = useState(null)
  const [messagePopUpTime, setMessagePopUpTime] = useState(5000) // Default to 5 seconds (in ms)
  const [lockProtectionEnabled, setLockProtectionEnabled] = useState(false)
  const [userEmail, setUserEmail] = useState(null) // To store the authenticated user's email

  useEffect(() => {
    if (!auth || !db) {
      setIsAuthReady(true)
      console.error(
        'Firebase Auth or Firestore not initialized in FirebaseContext.'
      )
      return
    }

    let unsubscribeSettings = null // To hold the unsubscribe function for settings listener

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Always clean up previous settings listener when auth state changes
      if (unsubscribeSettings) {
        unsubscribeSettings()
        unsubscribeSettings = null // Reset to null after unsubscribing
      }

      if (user) {
        if (!user.isAnonymous) {
          setUserId(user.uid)
          setUserEmail(user.email) // Set user email from auth object

          const profileRef = doc(
            db,
            `artifacts/${APP_ID}/users/${user.uid}/userProfile`,
            'profile'
          )
          const profileSnap = await getDoc(profileRef)

          if (profileSnap.exists()) {
            setUserCreatedAt(profileSnap.data().createdAt?.toDate())
          } else {
            // Create userProfile for a brand new, non-anonymous user
            await setDoc(profileRef, { createdAt: serverTimestamp() })
            setUserCreatedAt(new Date())
            console.log(
              `FirebaseContext: User profile created for new user ID: ${user.uid}`
            )
          }

          // --- UPDATED: Path changed from 'calendarSettings' to 'settings' ---
          const userSettingsDocRef = doc(
            db,
            `artifacts/${APP_ID}/users/${user.uid}/userSettings`,
            'settings' // Now points to the general 'settings' document
          )
          // --- END UPDATED ---

          // Set up onSnapshot listener for general settings
          unsubscribeSettings = onSnapshot(
            userSettingsDocRef,
            (settingsSnap) => {
              if (settingsSnap.exists()) {
                const fetchedSettings = settingsSnap.data()
                // Safely read popUpTime
                if (typeof fetchedSettings.popUpTime === 'number') {
                  setMessagePopUpTime(fetchedSettings.popUpTime)
                } else {
                  setMessagePopUpTime(5000) // Fallback to default if field is missing or invalid
                }
                // Safely read lockProtectionEnabled
                if (
                  typeof fetchedSettings.lockProtectionEnabled === 'boolean'
                ) {
                  setLockProtectionEnabled(
                    fetchedSettings.lockProtectionEnabled
                  )
                } else {
                  setLockProtectionEnabled(false) // Default to false if missing or invalid
                }
                // Note: workoutDaysOfWeek/restDaysOfWeek are not read here, as they are handled by CalendarPage/SettingsPage
              } else {
                // If settings document doesn't exist, reset to defaults in context state
                setMessagePopUpTime(5000)
                setLockProtectionEnabled(false)
                console.log(
                  'FirebaseContext: Settings document not found for user. NOT creating defaults here.'
                )
              }
            },
            (error) => {
              console.error(
                'FirebaseContext: Error fetching real-time settings:', // Updated log message
                error
              )
              // Fallback to defaults on error
              setMessagePopUpTime(5000)
              setLockProtectionEnabled(false)
            }
          )
        } else {
          // Anonymous user detected
          setUserId(null)
          setUserEmail(null) // Clear email for anonymous users
          setUserCreatedAt(null)
          setMessagePopUpTime(5000) // Reset to default for anonymous users
          setLockProtectionEnabled(false) // Reset for anonymous users
          console.log(
            'FirebaseContext: Anonymous user detected. Not creating persistent profile/settings for this session.'
          )
        }
      } else {
        // User is truly logged out (no user object, not even anonymous)
        setUserId(null)
        setUserEmail(null) // Clear email on logout
        setUserCreatedAt(null)
        setMessagePopUpTime(5000) // Reset to default when logged out
        setLockProtectionEnabled(false) // Reset on logout
        console.log(
          'FirebaseContext: User logged out or session invalidated (no user object).'
        )
      }
      setIsAuthReady(true)
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeSettings) {
        unsubscribeSettings()
      }
    }
  }, [db, auth])

  return (
    <FirebaseContext.Provider
      value={{
        db,
        auth,
        userId,
        isAuthReady,
        userCreatedAt,
        messagePopUpTime,
        lockProtectionEnabled, // Expose lock protection state
        userEmail, // Expose user email
      }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext)
