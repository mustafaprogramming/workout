import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase/initFirebase' // Assuming db is the firestore instance
import { onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

// Set your app ID here
const APP_ID =
  import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

const FirebaseContext = createContext()

export const FirebaseProvider = ({ children }) => {
  const [userId, setUserId] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [userCreatedAt, setUserCreatedAt] = useState(null)

  useEffect(() => {
    console.log('run effect')
    if (!auth || !db) {
      setIsAuthReady(true)
      console.error(
        'Firebase Auth or Firestore not initialized in FirebaseContext.'
      )
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('run unsubscribe')

      if (user) {
        console.log('user  exists')
        // IMPORTANT: Only proceed if the user is NOT anonymous.
        // Anonymous users might be implicitly signed in by Firebase after a console deletion.
        if (!user.isAnonymous) {
          setUserId(user.uid)

          const profileRef = doc(
            db,
            `artifacts/${APP_ID}/users/${user.uid}/userProfile`,
            'profile'
          )
          const profileSnap = await getDoc(profileRef)

          if (profileSnap.exists()) {
            setUserCreatedAt(profileSnap.data().createdAt?.toDate())
          } else {
            // If profile doesn't exist for a non-anonymous user, create it
            await setDoc(profileRef, { createdAt: serverTimestamp() })
            setUserCreatedAt(new Date()) // Set immediately for UI, Firestore will store precise server time

            // Also create default calendar settings for this brand new, non-anonymous user
            const defaultCalendarSettings = {
              workoutDaysOfWeek: [1, 2, 3, 4, 5], // Monday=1, Sunday=0
              restDaysOfWeek: [0, 6], // Sunday=0, Saturday=6
            }
            const userSettingsDocRef = doc(
              db,
              `artifacts/${APP_ID}/users/${user.uid}/calendarSettings`,
              'settings'
            )
            await setDoc(userSettingsDocRef, defaultCalendarSettings, {
              merge: true,
            }).catch((e) =>
              console.error(
                'Error setting initial default calendar settings:',
                e
              )
            )
            console.log(
              `Initial default calendar settings created for new user ID: ${user.uid}`
            )
          }
        } else {
          // If an anonymous user is detected, do NOT create persistent data.
          // Clear userId and userCreatedAt to reflect a non-logged-in state for the app's purpose.
          setUserId(null)
          setUserCreatedAt(null)
          console.log(
            'Anonymous user detected. Not creating persistent profile/settings for this session.'
          )
        }
      } else {
        console.log('user does not exists')
        // User is truly logged out (no user object, not even anonymous)
        setUserId(null)
        setUserCreatedAt(null)
        console.log('User logged out or session invalidated (no user object).')
      }
      setIsAuthReady(true)
    })

    return () => unsubscribe()
  }, [db, auth]) // Added db and auth to dependencies for completeness, though they are stable references

  return (
    <FirebaseContext.Provider
      value={{ db, auth, userId, isAuthReady, userCreatedAt }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext)
