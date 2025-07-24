import Modal from '../components/Modal'
import { useFirebase } from '../context/FirebaseContext'
import { useState, useEffect } from 'react'
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  writeBatch,
  query,
  getDocs,
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useTimer } from '../context/TimerContext'
import { copyToClipboard } from '../util/utils' // Assuming this utility is available

export default function SettingsPage() {
  const { db, auth, userId, isAuthReady } = useFirebase()
  const { stopTimers } = useTimer()
  const [calendarSettings, setCalendarSettings] = useState({
    workoutDaysOfWeek: [1, 2, 3, 4, 5], // Monday=1, Sunday=0
    restDaysOfWeek: [0, 6], // Sunday=0, Saturday=6
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  const [showConfirmSignOutModal, setShowConfirmSignOutModal] = useState(false)
  const [showConfirmDeleteAccountModal, setShowConfirmDeleteAccountModal] =
    useState(false) // This will now handle deleting account + all data
  const [showConfirmClearDataModal, setShowConfirmClearDataModal] =
    useState(false) // New state for clearing data only
  // State to hold the user's email
  const [userEmail, setUserEmail] = useState('')
  const [copied, setCopied] = useState('')

  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local' // Or any unique string for your local app

  useEffect(() => {
    if (auth && auth.currentUser) {
      setUserEmail(auth.currentUser.email)
    } else {
      setUserEmail('') // Clear email if user logs out
    }
  }, [auth, auth?.currentUser]) // Re-run when auth or currentUser changes

  useEffect(() => {
    // This useEffect now *only* listens for calendar settings.
    // The initial creation of calendar settings for a new user is handled in App.jsx.
    if (!db || !userId || !isAuthReady) return

    const userSettingsDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/calendarSettings`,
      'settings'
    )
    const unsubscribeSettings = onSnapshot(
      userSettingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setCalendarSettings(docSnap.data())
        } else {
          // If the document doesn't exist (e.g., after data clear or account deletion),
          // reset local state to default. Do NOT attempt to create it here.
          setCalendarSettings({
            workoutDaysOfWeek: [1, 2, 3, 4, 5],
            restDaysOfWeek: [0, 6],
          })
          console.warn(
            `Calendar settings document not found for user ${userId}. Resetting local state to defaults.`
          )
        }
      },
      (error) => {
        console.error('Error fetching calendar settings:', error)
        setMessage('Error loading calendar settings.')
        setMessageType('error')
      }
    )

    return () => unsubscribeSettings()
  }, [db, userId, isAuthReady, appId]) // Removed `calendarSettings` from dependencies as it's not used for writing here

  const handleSaveSettings = async () => {
    if (!db || !userId) return
    const userSettingsDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/calendarSettings`,
      'settings'
    )
    try {
      await setDoc(userSettingsDocRef, calendarSettings, { merge: true })
      setMessage('Calendar settings saved successfully!')
      setMessageType('success')
    } catch (e) {
      console.error('Error saving calendar settings:', e)
      setMessage('Failed to save calendar settings.')
      setMessageType('error')
    }
  }

  const handleSignOut = async () => {
    if (auth) {
      try {
        await signOut(auth)
        console.log('User signed out.')
        setMessage('Signed out successfully!')
        setMessageType('success')
        setShowConfirmSignOutModal(false)
        stopTimers()
        // The App component will handle resetting state due to onAuthStateChanged
      } catch (error) {
        console.error('Error signing out:', error)
        setMessage('Error signing out.')
        setMessageType('error')
      }
    }
  }

  // Function: Clears all user data in Firestore but keeps the Auth account
  const handleClearData = async () => {
    if (!db || !userId || !auth) {
      setMessage('Error: Firebase not initialized or user not logged in.')
      setMessageType('error')
      return
    }

    setMessage('Clearing all your data...')
    setMessageType('info')

    try {
      stopTimers() // Stop timers before data manipulation

      const batch = writeBatch(db)

      // Define paths to all user-specific collections
      const collectionsToClear = [
        'calendarSettings',
        'measurements',
        'userProfile', // User profile data will be cleared, but Auth account remains
        'workoutPlans',
        'workouts',
      ]

      for (const collectionName of collectionsToClear) {
        const collectionRef = collection(
          db,
          `artifacts/${appId}/users/${userId}/${collectionName}`
        )
        const q = query(collectionRef)
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
          console.log(
            `Collection ${collectionName} for user ${userId} is empty, skipping batch delete.`
          )
        } else {
          snapshot.forEach((docSnap) => {
            console.log(
              `Adding document ${docSnap.id} from ${collectionName} to batch for deletion.`
            )
            batch.delete(docSnap.ref)
          })
        }
      }

      // Commit the batch deletion
      await batch.commit()

      setMessage(
        'All data cleared successfully! Signing you out for a fresh start...'
      )
      setMessageType('success')
      setShowConfirmClearDataModal(false)
      await signOut(auth) // Sign out after data deletion to force a fresh state
    } catch (error) {
      console.error('Error clearing all data:', error.message)
      setMessage(
        `Data Clearing Failed: ${
          error.message === 'Firebase: Error (auth/requires-recent-login).'
            ? 'Re-login required before clearing data'
            : error.message
        }`
      )
      setMessageType('error')
      setShowConfirmClearDataModal(false)
    }
  }

  // Function: Deletes the Firebase Auth account AND all associated Firestore data
  const handleDeleteAccount = async () => {
    if (!db || !userId || !auth) {
      setMessage('Error: Firebase not initialized or user not logged in.')
      setMessageType('error')
      return
    }

    setMessage('Deleting account and all data...')
    setMessageType('info')

    try {
      stopTimers() // Stop timers before data manipulation

      const batch = writeBatch(db)

      // Define paths to all user-specific collections
      const collectionsToDelete = [
        'calendarSettings',
        'measurements',
        'userProfile',
        'workoutPlans',
        'workouts',
      ]

      for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(
          db,
          `artifacts/${appId}/users/${userId}/${collectionName}`
        )
        const q = query(collectionRef)
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
          console.log(
            `Collection ${collectionName} for user ${userId} is empty, skipping batch delete.`
          )
        } else {
          snapshot.forEach((docSnap) => {
            console.log(
              `Adding document ${docSnap.id} from ${collectionName} to batch for deletion.`
            )
            batch.delete(docSnap.ref)
          })
        }
      }

      // Commit the batch deletion
      await batch.commit()

      // Delete the user's authentication record
      if (auth.currentUser && auth.currentUser.uid === userId) {
        await auth.currentUser.delete()
      } else {
        console.warn(
          'User auth record not found or mismatch, skipping auth.currentUser.delete()'
        )
      }

      setMessage('Account and all data deleted successfully! Signing you out...')
      setMessageType('success')
      setShowConfirmDeleteAccountModal(false)
      await signOut(auth) // Sign out after auth record deletion
    } catch (error) {
      console.error('Error deleting account and data:', error.message)
      setMessage(
        `Deletion Failed: ${
          error.message === 'Firebase: Error (auth/requires-recent-login).'
            ? 'Re-login required before deleting your account'
            : error.message
        }`
      )
      setMessageType('error')
      setShowConfirmDeleteAccountModal(false)
    }
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 p-3 rounded-xl text-gray-100'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6'>
        ⚙️ Settings
      </h2>

      {message && (
        <div
          role='status'
          aria-live='polite'
          className={`sm:p-3 p-1.5 mb-4 rounded-md text-center ${
            messageType === 'success'
              ? 'bg-green-800 text-green-200'
              : messageType === 'error'
              ? 'bg-red-800 text-red-200'
              : 'bg-blue-800 text-blue-200'
          }`}
        >
          {message}
        </div>
      )}

      <fieldset className='mb-8 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg '>
        <h3 className='sm:text-xl text-lg font-semibold text-gray-200 mb-2 sm:mb-3'>
          Calendar Preferences
        </h3>
        <div className='mb-4'>
          <label className='flex flex-col text-gray-300 font-semibold mb-2 '>
            <span>Workout Days:</span>
            <span
              className='text-gray-400 italic text-xs sm:text-sm '
              aria-hidden='true'
            >
              Unmarked Days are Recorded as Rest Days
            </span>
          </label>
          <div
            className='flex flex-wrap gap-1 sm:gap-2'
            role='group'
            aria-label='Select workout days of the week'
          >
            {daysOfWeek.map((day, index) => (
              <label
                key={`workout-${index}`}
                className='flex items-center sm:space-x-2 space-x-1  py-1 px-2  rounded-md cursor-pointer border border-gray-950 bg-gray-900 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[5px_5px_0px_0px_#030712] duration-500'
              >
                <input
                  type='checkbox'
                  checked={calendarSettings.workoutDaysOfWeek.includes(index)}
                  onChange={(e) => {
                    const newWorkDays = e.target.checked
                      ? [...calendarSettings.workoutDaysOfWeek, index]
                      : calendarSettings.workoutDaysOfWeek.filter(
                          (d) => d !== index
                        )
                    const newRestDays = e.target.checked
                      ? calendarSettings.restDaysOfWeek.filter(
                          (d) => d !== index
                        )
                      : [...calendarSettings.restDaysOfWeek, index]

                    setCalendarSettings((prev) => ({
                      ...prev,
                      restDaysOfWeek: newRestDays,
                      workoutDaysOfWeek: newWorkDays,
                    }))
                  }}
                  className='form-checkbox h-3 w-3 sm:h-5 sm:w-5 text-blue-500 rounded-md bg-gray-700 border-gray-500 checked:bg-blue-500'
                  aria-label={`Toggle ${day} as a workout day`}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={handleSaveSettings}
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
          aria-label='Save calendar settings'
        >
          Save Calendar Settings
        </button>
      </fieldset>

      <div className='bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-lg flex flex-col gap-2 mb-8'>
        <h3 className='sm:text-xl text-lg font-semibold text-gray-200 mb-3'>
          Account Details
        </h3>
        {/* user id */}
        {userId && (
          <div className='text-sm flex flex-col xs:flex-row  xs:items-center gap-1 text-gray-400'>
            <span>User ID:</span>
            <div
              className='font-mono text-blue-300 break-all flex items-center flex-1'
              aria-live='polite'
              aria-atomic='true'
            >
              <span>{userId}</span>
              <button
                onClick={() => copyToClipboard(userId, setCopied)}
                className='text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 ml-auto border border-gray-950 shadow-[3px_3px_0px_0px_#030712] transition'
                aria-label={
                  copied === userId
                    ? 'User ID copied to clipboard'
                    : 'Copy user ID to clipboard'
                }
              >
                {copied === userId ? '✨' : '📋'}
              </button>
            </div>
          </div>
        )}
        {/* user email */}
        {userEmail && (
          <div className='text-sm flex flex-col xs:flex-row  xs:items-center gap-1 text-gray-400'>
            <span>Email:</span>
            <div
              className='font-mono text-blue-300 break-all flex items-center flex-1'
              aria-live='polite'
              aria-atomic='true'
            >
              <span>{userEmail}</span>
              <button
                onClick={() => copyToClipboard(userEmail, setCopied)}
                className='text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 ml-auto border border-gray-950 shadow-[3px_3px_0px_0px_#030712] transition'
                aria-label={
                  copied === userEmail
                    ? 'User Email copied to clipboard'
                    : 'Copy user Email to clipboard'
                }
              >
                {copied === userEmail ? '✨' : '📋'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* account actions */}
      <div className='bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg  space-y-4'>
        <h3 className='sm:text-xl text-lg font-semibold text-gray-200 mb-3'>
          Account Actions
        </h3>
        <button
          onClick={() => setShowConfirmSignOutModal(true)}
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
          aria-label='Sign out of your account'
        >
          Sign Out
        </button>
        <button
          onClick={() => setShowConfirmClearDataModal(true)} // This button now clears data only
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
          aria-label='Clear all your workout data'
        >
          🧹 Clear Data
        </button>
        <button
          onClick={() => setShowConfirmDeleteAccountModal(true)} // This button now deletes account + all data
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-red-800 text-white rounded-md hover:bg-red-900 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
          aria-label='Permanently delete your account and all associated data'
        >
          🗑️ Delete Account
        </button>
      </div>

      {showConfirmSignOutModal && (
        <Modal
          onClose={() => setShowConfirmSignOutModal(false)}
          aria-labelledby='sign-out-modal-title'
        >
          <h3
            id='sign-out-modal-title'
            className='text-xl font-bold text-blue-400 mb-4 mr-[34px]'
          >
            Confirm Sign Out
          </h3>
          <p className='text-gray-200 mb-6'>
            Are you sure you want to sign out?
          </p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowConfirmSignOutModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
              aria-label='Cancel sign out'
            >
              Cancel
            </button>
            <button
              onClick={handleSignOut}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors'
              aria-label='Confirm sign out'
            >
              Sign Out
            </button>
          </div>
        </Modal>
      )}

      {showConfirmClearDataModal && ( // Modal for clearing data only
        <Modal
          onClose={() => setShowConfirmClearDataModal(false)}
          aria-labelledby='clear-data-modal-title'
        >
          <h3
            id='clear-data-modal-title'
            className='text-xl font-bold text-orange-400 mb-4 mr-[34px]'
          >
            Confirm Clear All Data
          </h3>
          <p className='text-gray-200 mb-6'>
            <span className='font-bold text-orange-300'>WARNING:</span> This
            action will permanently delete ALL your workout logs, measurements,
            and settings from the database. Your **user account will remain**,
            and you will be signed out. You can sign back in to a brand new,
            empty account. This cannot be undone.
            <br />
            <br />
            Are you absolutely sure you want to proceed?
          </p>
          <div className='flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3'>
            <button
              onClick={() => setShowConfirmClearDataModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
              aria-label='Cancel data clearing'
            >
              Cancel
            </button>
            <button
              onClick={handleClearData}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors'
              aria-label='Confirm and clear all my data'
            >
              Clear All My Data
            </button>
          </div>
        </Modal>
      )}

      {showConfirmDeleteAccountModal && ( // Modal for deleting account + all data
        <Modal
          onClose={() => setShowConfirmDeleteAccountModal(false)}
          aria-labelledby='delete-account-modal-title'
        >
          <h3
            id='delete-account-modal-title'
            className='text-xl font-bold text-red-400 mb-4 mr-[34px]'
          >
            Confirm Account Deletion
          </h3>
          <p className='text-gray-200 mb-6'>
            <span className='font-bold text-red-300'>FINAL WARNING:</span> This
            action will permanently delete your **user account AND ALL** your
            workout logs, measurements, and settings. This cannot be undone.
            <br />
            <br />
            Are you absolutely sure you want to proceed?
          </p>
          <div className='flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3'>
            <button
              onClick={() => setShowConfirmDeleteAccountModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
              aria-label='Cancel account deletion'
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-red-800 text-white rounded-md hover:bg-red-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors'
              aria-label='Confirm and delete my account and all data'
            >
              Delete My Account
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
