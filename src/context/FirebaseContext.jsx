import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase/initFirebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

// Set your app ID here
const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID||'workout-tracker-app-local'

const FirebaseContext = createContext()

export const FirebaseProvider = ({ children }) => {
  const [userId, setUserId] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [userCreatedAt, setUserCreatedAt] = useState(null)

  useEffect(() => {
    if (!auth || !db) {
      setIsAuthReady(true)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
          await setDoc(profileRef, { createdAt: serverTimestamp() })
          setUserCreatedAt(new Date())
        }
      } else {
        setUserId(null)
        setUserCreatedAt(null)
      }
      setIsAuthReady(true)
    })

    return () => unsubscribe()
  }, [])

  return (
    <FirebaseContext.Provider
      value={{ db, auth, userId, isAuthReady, userCreatedAt }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext)
