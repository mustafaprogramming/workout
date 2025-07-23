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
    useState(false)

  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId = import.meta.env.VITE_FIREBASE_APP_ID||'workout-tracker-app-local' // Or any unique string for your local app

  useEffect(() => {
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
          // Set default settings if none exist
          setDoc(userSettingsDocRef, calendarSettings, { merge: true }).catch(
            (e) => console.error('Error setting default calendar settings:', e)
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
  }, [db, userId, isAuthReady, appId])

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

  const handleDeleteAllAccountData = async () => {
    if (!db || !userId || !auth) {
      setMessage('Error: Firebase not initialized or user not logged in.')
      setMessageType('error')
      return
    }

    setMessage('Deleting account data...')
    setMessageType('info')

    try {
      const batch = writeBatch(db)

      // Define paths to all user-specific collections
      const collectionsToDelete = [
        'workouts',
        'measurements',
        'calendarSettings',
        'userProfile',
        'workoutPlans', // Add workoutPlans to collections to delete
      ]

      for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(
          db,
          `artifacts/${appId}/users/${userId}/${collectionName}`
        )
        const q = query(collectionRef) // Query all documents in the subcollection
        const snapshot = await getDocs(q)

        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref)
        })
      }

      // Commit the batch deletion
      await batch.commit()

      // Delete the user's authentication record
      // Note: Firebase security rules should allow this if the user is authenticated
      // If you implement re-authentication, it should happen before this step.
      if (auth.currentUser && auth.currentUser.uid === userId) {
        await auth.currentUser.delete()
      } else {
        console.warn(
          'User auth record not found or mismatch, skipping auth.currentUser.delete()'
        )
      }

      setMessage('All account data deleted successfully! Signing you out...')
      setMessageType('success')
      setShowConfirmDeleteAccountModal(false)
      stopTimers()
      await signOut(auth) // Sign out after data deletion
    } catch (error) {
      console.error('Error deleting all account data:', error.message)
      setMessage(
        `Deletion Failed: ${
          error.message == 'Firebase: Error (auth/requires-recent-login).'
            ? 'Re-login required before deleting all data'
            : error.message
        }`
      )
      setMessageType('error')
      setShowConfirmDeleteAccountModal(false)
    }
  }
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    if (!userId) return
    try {
      await navigator.clipboard.writeText(userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
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
      <div className='bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-lg space-x-4 mb-8'>
        {userId && (
          <div className='text-sm flex flex-wrap items-center gap-2 text-gray-400'>
            <span>User ID:</span>
            <span
              className='font-mono text-blue-300 break-all'
              aria-live='polite'
              aria-atomic='true'
            >
              {userId}
            </span>
            <button
              onClick={copyToClipboard}
              className='text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 ml-auto border border-gray-950 shadow-[3px_3px_0px_0px_#030712] transition'
              aria-label={
                copied
                  ? 'User ID copied to clipboard'
                  : 'Copy user ID to clipboard'
              }
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
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
          onClick={() => setShowConfirmDeleteAccountModal(true)}
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-red-800 text-white rounded-md hover:bg-red-900 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
          aria-label='Permanently clear all account data'
        >
          ⚠️ Clear All Account Data
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

      {showConfirmDeleteAccountModal && (
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
            <span className='font-bold text-red-300'>WARNING:</span> This action
            will permanently delete ALL your workout logs, measurements, and
            settings. This cannot be undone.
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
              onClick={handleDeleteAllAccountData}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-red-800 text-white rounded-md hover:bg-red-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors'
              aria-label='Confirm and delete all my data'
            >
              Delete All My Data
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
