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
import {
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth'
import { useTimer } from '../context/TimerContext'
import { copyToClipboard } from '../util/utils'
import { deleteCloudinaryImage } from '../util/cloudinaryUtils'
import { useMessage } from '../context/MessageContext'

export default function SettingsPage() {
  const { db, auth, userId, isAuthReady } = useFirebase()
  const { stopTimers } = useTimer()
  const { setMessage, setMessageType } = useMessage()

  const [calendarSettings, setCalendarSettings] = useState({
    workoutDaysOfWeek: [1, 2, 3, 4, 5], // Monday=1, Sunday=0
    restDaysOfWeek: [0, 6], // Sunday=0, Saturday=6
    popUpTime: 5000, // Default for local state
    lockProtectionEnabled: false, // Default to false
  })

  const [showConfirmSignOutModal, setShowConfirmSignOutModal] = useState(false)
  const [showConfirmDeleteAccountModal, setShowConfirmDeleteAccountModal] =
    useState(false)
  const [showConfirmClearDataModal, setShowConfirmClearDataModal] =
    useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [copied, setCopied] = useState('')
  const [editSettings, setEditSettings] = useState(false)
  const [deletionSpinner, setDeletionSpinner] = useState(false)
  const [clearSpinner, setClearSpinner] = useState(false)

  const [showReauthModal, setShowReauthModal] = useState(false)
  const [reauthPassword, setReauthPassword] = useState('')
  const [reauthError, setReauthError] = useState('')

  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

  useEffect(() => {
    if (auth && auth.currentUser) {
      setUserEmail(auth.currentUser.email)
    } else {
      setUserEmail('')
    }
  }, [auth, auth?.currentUser])

  useEffect(() => {
    if (!db || !userId || !isAuthReady || !auth?.currentUser) {
      return
    }

    const userSettingsDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/calendarSettings`,
      'settings'
    )

    const unsubscribeSettings = onSnapshot(
      userSettingsDocRef,
      (docSnap) => {
        // --- CRITICAL FIX: Check auth.currentUser here to prevent updates for deleted users ---
        // This is the primary guard for the SettingsPage's own listener.
        if (!auth.currentUser || auth.currentUser.uid !== userId) {
          console.log(
            'SettingsPage Snapshot: User changed or deleted. Skipping state update/creation.'
          )
          return
        }
        // --- END CRITICAL FIX ---

        if (docSnap.exists()) {
          const fetchedSettings = docSnap.data()
          setCalendarSettings({
            workoutDaysOfWeek: fetchedSettings.workoutDaysOfWeek || [
              1, 2, 3, 4, 5,
            ],
            restDaysOfWeek: fetchedSettings.restDaysOfWeek || [0, 6],
            popUpTime:
              typeof fetchedSettings.popUpTime === 'number'
                ? fetchedSettings.popUpTime
                : 5000,
            lockProtectionEnabled:
              typeof fetchedSettings.lockProtectionEnabled === 'boolean'
                ? fetchedSettings.lockProtectionEnabled
                : false,
          })
        } else {
          // If settings document doesn't exist, create it with defaults here.
          // This ensures it's created for new, authenticated users, or re-created if deleted.
          const defaultCalendarSettings = {
            workoutDaysOfWeek: [1, 2, 3, 4, 5],
            restDaysOfWeek: [0, 6],
            popUpTime: 5000,
            lockProtectionEnabled: false,
          }
          console.log(
            `SettingsPage: Calendar settings document not found for user ${userId}. Creating defaults.`
          )
          setDoc(userSettingsDocRef, defaultCalendarSettings, { merge: true })
            .then(() => {
              setCalendarSettings(defaultCalendarSettings)
              setMessage('Default calendar settings created.')
              setMessageType('info')
            })
            .catch((e) => {
              console.error('Error creating default calendar settings:', e)
              setMessage('Failed to create default settings.')
              setMessageType('error')
            })
        }
      },
      (error) => {
        console.error('Error fetching calendar settings:', error)
        setMessage('Error loading calendar settings.')
        setMessageType('error')
      }
    )
    // Store the unsubscribe function globally so it can be called during deletion
    window.unsubscribeSettings = unsubscribeSettings

    return () => {
      // Cleanup on component unmount
      if (unsubscribeSettings) {
        unsubscribeSettings()
      }
    }
  }, [db, userId, isAuthReady, appId, auth?.currentUser]) // Added auth?.currentUser to dependencies
  const setDeletionSpinnerShow = () => {
    setTimeout(() => {
      document.body.style.overflow = 'hidden'
    }, 0)
    setDeletionSpinner(true)
  }
  const setDeletionSpinnerHide = () => {
    document.body.style.overflow = ''
    setDeletionSpinner(false)
  }
  const setClearSpinnerShow = () => {
    setTimeout(() => {
      document.body.style.overflow = 'hidden'
    }, 0)
    setClearSpinner(true)
  }
  const setClearSpinnerHide = () => {
    document.body.style.overflow = ''
    setClearSpinner(false)
  }
  const saveSettings = () => {
    if (editSettings) {
      if (
        calendarSettings.popUpTime < 1000 ||
        calendarSettings.popUpTime > 30000
      ) {
        setCalendarSettings((prev) => ({
          ...prev,
          popUpTime: calendarSettings.popUpTime < 1000 ? 1000 : 30000,
        }))
        setMessage(
          `Notification active time cannot be  ${
            calendarSettings.popUpTime < 1000 ? 'less than 1' : 'more than 30'
          } seconds `
        )
        setMessageType('error')
        return
      }
      handleSaveSettings()
    } else {
      setEditSettings(!editSettings)
    }
  }
  const handleSaveSettings = async () => {
    if (!db || !userId) return

    const userSettingsDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/calendarSettings`,
      'settings'
    )
    try {
      await setDoc(userSettingsDocRef, calendarSettings, { merge: true })
      setMessage('Settings saved successfully!')
      setMessageType('success')
      setEditSettings(!editSettings)
    } catch (e) {
      console.error('Error saving settings:', e)
      setMessage('Failed to save settings.')
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
      } catch (error) {
        console.error('Error signing out:', error)
        setMessage('Error signing out.')
        setMessageType('error')
      }
    }
  }

  const deleteAllUserCloudinaryImages = async () => {
    const publicIdsToDelete = []

    const measurementsCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/measurements`
    )
    const measurementsSnapshot = await getDocs(query(measurementsCollectionRef))
    measurementsSnapshot.forEach((docSnap) => {
      const data = docSnap.data()
      if (data.imageUrls && Array.isArray(data.imageUrls)) {
        data.imageUrls.forEach((img) => {
          if (img.public_id) {
            publicIdsToDelete.push(img.public_id)
          }
        })
      }
    })

    const galleryCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/userGalleryImages`
    )
    const gallerySnapshot = await getDocs(query(galleryCollectionRef))
    gallerySnapshot.forEach((docSnap) => {
      const data = docSnap.data()
      if (data.public_id) {
        publicIdsToDelete.push(data.public_id)
      }
    })

    if (publicIdsToDelete.length > 0) {
      console.log(
        `Attempting to delete ${publicIdsToDelete.length} images from Cloudinary.`
      )
      const deletePromises = publicIdsToDelete.map(async (publicId) => {
        try {
          await deleteCloudinaryImage(publicId)
          console.log(`Deleted Cloudinary image: ${publicId}`)
        } catch (e) {
          console.error(`Error deleting Cloudinary image ${publicId}:`, e)
        }
      })
      await Promise.all(deletePromises)
      console.log('Finished attempting to delete all user Cloudinary images.')
    } else {
      console.log('No Cloudinary images found to delete for this user.')
    }
  }

  const handleClearData = async () => {
    if (!db || !userId || !auth) {
      setMessage('Error: Firebase not initialized or user not logged in.')
      setMessageType('error')
      return
    }
    setShowConfirmClearDataModal(false)
    setMessage('Clearing all your data...')
    setMessageType('info')

    try {
      stopTimers()
      setClearSpinnerShow()
      await deleteAllUserCloudinaryImages()

      const batch = writeBatch(db)

      const collectionsToClear = [
        'calendarSettings',
        'measurements',
        'userGalleryImages',
        'userProfile',
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

      await batch.commit()

      setMessage('All data cleared successfully!')
      setMessageType('success')
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
    }
    setClearSpinnerHide()
  }

  const executeAccountAndDataDeletion = async () => {
    if (!db || !userId || !auth || !auth.currentUser) {
      setMessage('Error: Firebase not initialized or user not logged in.')
      setMessageType('error')
      return false
    }

    // --- CRITICAL: Explicitly unsubscribe the SettingsPage's listener here ---
    // This is vital to prevent it from reacting to the deletion and re-creating data.
    if (typeof window.unsubscribeSettings === 'function') {
      try {
        window.unsubscribeSettings()
        console.log(
          'SettingsPage: Unsubscribed from calendarSettings snapshot before deletion.'
        )
      } catch (e) {
        console.error('SettingsPage: Failed to unsubscribe snapshot:', e)
      }
    }
    // --- END CRITICAL ---

    setMessage('Finalizing data deletion...')
    setMessageType('info')

    try {
      stopTimers()

      await deleteAllUserCloudinaryImages()

      const batch = writeBatch(db)
      const collectionsToDelete = [
        'calendarSettings', // This will be deleted by the batch
        'measurements',
        'userGalleryImages',
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
      await batch.commit()

      setMessage('All data deleted successfully!')
      setMessageType('success')
      return true
    } catch (error) {
      console.error('Error during final data deletion:', error.message)
      setMessage(
        `Deletion Failed: ${error.message || 'An unexpected error occurred.'}`
      )
      setMessageType('error')
      return false
    }
  }

  const handleReauthenticate = async () => {
    setReauthError('')
    if (!auth.currentUser || !userEmail || !reauthPassword) {
      setReauthError('Please enter your email and password.')
      return
    }

    const credential = EmailAuthProvider.credential(userEmail, reauthPassword)

    try {
      await reauthenticateWithCredential(auth.currentUser, credential)
      console.log('User re-authenticated successfully.')
      setShowReauthModal(false)
      setReauthPassword('')
      setDeletionSpinnerShow()
      const dataDeleted = await executeAccountAndDataDeletion()
      if (dataDeleted) {
        // --- This is where the actual Firebase Auth user deletion happens ---
        await auth.currentUser.delete()
        await signOut(auth) // Sign out after deletion to ensure state is clear
        setMessage(
          'Account and all data deleted successfully! You have been signed out.'
        )
        setMessageType('success')
      } else {
        setMessage('Data deletion failed, account not deleted.')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Re-authentication failed:', error)
      let errorMessage = 'Re-authentication failed. Please check your password.'
      if (
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        errorMessage = 'Incorrect password. Please try again.'
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please log in again.'
      }
      setReauthError(errorMessage)
    }
    setDeletionSpinnerHide()
  }

  const handleDeleteAccount = async () => {
    if (!auth || !auth.currentUser || !userEmail) {
      setMessage('Error: User not logged in or email not available.')
      setMessageType('error')
      setShowConfirmDeleteAccountModal(false)
      return
    }

    setShowConfirmDeleteAccountModal(false)
    setShowReauthModal(true)
    setMessage(
      'For your security, please re-enter your password to confirm account deletion.'
    )
    setMessageType('info')
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 p-3 rounded-xl text-gray-100 select-none'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6'>
        ⚙️ Settings
      </h2>

      <div className='mb-8 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg '>
        <h3 className='sm:text-xl text-lg font-semibold text-gray-200 mb-2 sm:mb-3'>
          Calendar Preferences
        </h3>
        <fieldset className='mb-4'>
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
                className={`flex items-center sm:space-x-2 space-x-1  py-1 px-2  rounded-md  border border-gray-950 bg-gray-900 ${
                  editSettings
                    ? 'hover:shadow-[0px_0px_0px_0px_#030712] cursor-pointer'
                    : ''
                } shadow-[5px_5px_0px_0px_#030712] duration-500`}
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
                  disabled={!editSettings}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className='flex items-center justify-between w-full mt-10'>
          <h3 className='sm:text-xl text-lg font-semibold text-gray-200 mb-2 sm:mb-3'>
            Notification Active Time (sec) :
          </h3>
          <input
            type='number'
            min={1}
            max={30}
            aria-label='pop up time'
            value={calendarSettings.popUpTime / 1000} // Derive from calendarSettings
            onChange={(e) =>
              setCalendarSettings((prev) => ({
                ...prev,
                popUpTime: parseInt(e.target.value || '0') * 1000,
              }))
            } // Update calendarSettings directly
            className={`p-1.5 sm:p-3 w-full  ${
              editSettings ? 'bg-gray-700' : 'bg-gray-900'
            } shadow-[5px_5px_0px_0px_#030712] border border-gray-950 ml-5 max-w-[200px] rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100`}
            disabled={!editSettings}
          />
        </div>
        <fieldset className='my-8'>
          <h3 className='sm:text-xl text-lg font-semibold text-gray-200 mb-2 sm:mb-3'>
            Security Settings
          </h3>
          <div className='mb-4 flex items-center justify-between'>
            <label
              htmlFor='lock-protection-toggle'
              className='flex-grow text-gray-400 font-semibold cursor-pointer italic text-sm'
            >
              Enable Lock Protection (Require password on app launch)
            </label>
            <input
              type='checkbox'
              id='lock-protection-toggle'
              checked={calendarSettings.lockProtectionEnabled}
              onChange={(e) => {
                setCalendarSettings((prev) => ({
                  ...prev,
                  lockProtectionEnabled: e.target.checked,
                }))
              }}
              className='form-checkbox h-5 w-5 text-blue-500 rounded-md bg-gray-700 border-gray-500  checked:bg-blue-500 ml-4'
              aria-label='Toggle lock protection on app launch'
              disabled={!editSettings}
            />
          </div>
        </fieldset>
        <button
          onClick={saveSettings}
          className={`sm:px-4 sm:py-2 px-2 py-1 text-sm sm:text-base  text-white rounded-md w-full transition-colors shadow-[2px_2px_0px_0px_#030712] border border-gray-950 ${
            editSettings
              ? 'hover:bg-green-700 bg-green-600'
              : 'hover:bg-indigo-700 bg-indigo-600'
          }`}
        >
          {editSettings ? 'Save Settings' : '✏️ Edit Settings'}
        </button>
      </div>
      {/* --- END NEW --- */}

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
          🧹 Clear All My Data
        </button>
        <button
          onClick={() => setShowConfirmDeleteAccountModal(true)} // This button now deletes account + all data
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-red-800 text-white rounded-md hover:bg-red-900 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
          aria-label='Permanently delete your account and all associated data'
        >
          🔥 Delete My Account
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
            and you will **remain logged in**. This cannot be undone.
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
              onClick={handleDeleteAccount} // This will now always trigger reauth flow
              className='px-2 py-1 sm:px-4 sm:py-2 bg-red-800 text-white rounded-md hover:bg-red-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors'
              aria-label='Confirm and delete my account and all data'
            >
              Delete My Account
            </button>
          </div>
        </Modal>
      )}

      {showReauthModal && (
        <Modal onClose={() => setShowReauthModal(false)}>
          <h3 className='text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
            Re-authenticate for Security
          </h3>
          <p className='text-gray-200 mb-2'>
            For your security, please re-enter your password to confirm this
            sensitive action.
            <span className='mt-2 block'>
              Email:{' '}
              <span className='font-mono text-blue-300 mb-2 '>
                {' '}
                {userEmail}
              </span>
            </span>
          </p>
          <input
            type='password'
            placeholder='Your Password'
            value={reauthPassword}
            onChange={(e) => setReauthPassword(e.target.value)}
            className='p-3 w-full bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 mb-4'
          />
          {reauthError && (
            <p className='text-red-400 text-sm mb-4'>{reauthError}</p>
          )}
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowReauthModal(false)}
              className='px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
            >
              Cancel
            </button>
            <button
              onClick={handleReauthenticate}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
            >
              Confirm Re-authenticate
            </button>
          </div>
        </Modal>
      )}
      {deletionSpinner && (
        <div className='fixed inset-0 h-screen  w-screen overflow-hidden  select-none top-0 left-0 backdrop-blur-lg bg-opacity-20 bg-gray-900 z-[50] flex items-center justify-center'>
          <div className='bg-red-800 text-white p-6 rounded-lg text-center relative sm:max-w-sm w-full animate-flash max-w-[85vw] shadow-[5px_5px_0px_0px_#030712] border border-gray-300 bg-opacity-75 flex flex-col items-center'>
            <h2
              id='deletion-account-progress'
              className='text-lg font-bold mb-4'
            >
              Deleting Data & Account
            </h2>
            <span className='flex animate-spin w-10 h-10 border-4 border-t-transparent border-gray-300 rounded-full'></span>
          </div>
        </div>
      )}
      {clearSpinner && (
        <div className='fixed inset-0 h-screen  w-screen overflow-hidden  select-none top-0 left-0 backdrop-blur-lg bg-opacity-20 bg-gray-900 z-[50] flex items-center justify-center'>
          <div className='bg-orange-600 text-white p-6 rounded-lg text-center relative sm:max-w-sm w-full animate-flash max-w-[85vw] shadow-[5px_5px_0px_0px_#030712] border border-gray-300 bg-opacity-75 flex flex-col items-center'>
            <h2 id='clearing-data-progress' className='text-lg font-bold mb-4'>
              Clearing Data
            </h2>
            <span className='flex animate-spin w-10 h-10 border-4 border-t-transparent border-gray-300 rounded-full'></span>
          </div>
        </div>
      )}
    </div>
  )
}
