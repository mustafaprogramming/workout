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
import {
  FaBroom,
  FaCopy,
  FaEdit,
  FaRegCopy,
  FaSave,
  FaSignOutAlt,
  FaTrash,
} from 'react-icons/fa'
import {
  ClearingStorageAnimation,
  DeletingAccountAnimation,
} from '../components/ClearingStorageAnimation'

export default function SettingsPage() {
  const { db, auth, userId, isAuthReady } = useFirebase()
  const { stopTimers } = useTimer()
  const { setMessage, setMessageType } = useMessage()

  const [settings, setSettings] = useState({
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
  const [isSaveSettings, setIsSaveSettings] = useState(false)

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

    // --- UPDATED: Path changed from 'calendarSettings' to 'settings' ---
    const userSettingsDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/userSettings`,
      'settings' // Now points to the general 'settings' document
    )
    // --- END UPDATED ---

    const unsubscribeSettings = onSnapshot(
      userSettingsDocRef,
      (docSnap) => {
        // CRITICAL FIX: Check auth.currentUser here to prevent updates for deleted users
        if (!auth.currentUser || auth.currentUser.uid !== userId) {
          console.log(
            'SettingsPage Snapshot: User changed or deleted. Skipping state update/creation.'
          )
          return
        }

        if (docSnap.exists()) {
          const fetchedSettings = docSnap.data()
          setSettings({
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
          const defaultSettings = {
            // Renamed from defaultCalendarSettings
            workoutDaysOfWeek: [1, 2, 3, 4, 5],
            restDaysOfWeek: [0, 6],
            popUpTime: 5000,
            lockProtectionEnabled: false,
          }
          console.log(
            `SettingsPage: settings document not found for user ${userId}. Creating defaults.`
          )
          setDoc(userSettingsDocRef, defaultSettings, { merge: true }) // Use defaultSettings
            .then(() => {
              setSettings(defaultSettings)
              setMessage('Default settings created.')
              setMessageType('info')
            })
            .catch((e) => {
              console.error('Error creating default settings:', e)
              setMessage('Failed to create default settings.')
              setMessageType('error')
            })
        }
      },
      (error) => {
        console.error('Error fetching settings:', error) // Updated log message
        setMessage('Error loading settings.')
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
  }, [db, userId, isAuthReady, appId, auth?.currentUser])

  const setDeletionSpinnerShow = () => {
    setTimeout(() => {
      document.body.style.overflow = 'hidden'
    }, 10)
    setDeletionSpinner(true)
  }
  const setDeletionSpinnerHide = () => {
    document.body.style.overflow = ''
    setDeletionSpinner(false)
  }
  const setClearSpinnerShow = () => {
    setTimeout(() => {
      document.body.style.overflow = 'hidden'
    }, 10)
    setClearSpinner(true)
  }
  const setClearSpinnerHide = () => {
    document.body.style.overflow = ''
    setClearSpinner(false)
  }

  // --- OPTIMIZATION: Refined saveSettings logic ---
  const saveSettings = async () => {
    // Made async
    if (!editSettings) {
      setEditSettings(true) // If not in edit mode, switch to edit mode
      return
    }

    // If in edit mode, validate and save
    if (settings.popUpTime < 1000 || settings.popUpTime > 30000) {
      setSettings((prev) => ({
        ...prev,
        popUpTime: settings.popUpTime < 1000 ? 1000 : 30000,
      }))
      setMessage(
        `Notification active time cannot be ${
          settings.popUpTime < 1000 ? 'less than 1' : 'more than 30'
        } seconds`
      )
      setMessageType('error')
      return
    }

    if (!db || !userId) return
    setIsSaveSettings(true)
    const userSettingsDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/userSettings`,
      'settings'
    )
    try {
      await setDoc(userSettingsDocRef, settings, { merge: true })
      setMessage('Settings saved successfully!')
      setMessageType('success')
      setEditSettings(false) // Exit edit mode after successful save
    } catch (e) {
      console.error('Error saving settings:', e)
      setMessage('Failed to save settings.')
      setMessageType('error')
    }
    setIsSaveSettings(false)
  }
  // Removed handleSaveSettings as it's merged into saveSettings
  // --- END OPTIMIZATION ---

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
        } catch (e) {
          console.error(`Error deleting Cloudinary image:`, e)
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

      // --- UPDATED: 'calendarSettings' changed to 'settings' ---
      const collectionsToClear = [
        'userSettings',
        'measurements',
        'userGalleryImages',
        'userProfile',
        'workoutPlans',
        'workouts',
      ]
      // --- END UPDATED ---

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

    // CRITICAL: Explicitly unsubscribe the SettingsPage's listener here
    if (typeof window.unsubscribeSettings === 'function') {
      try {
        window.unsubscribeSettings()
        console.log(
          'SettingsPage: Unsubscribed from settings snapshot before deletion.' // Updated log message
        )
      } catch (e) {
        console.error('SettingsPage: Failed to unsubscribe snapshot:', e)
      }
    }

    setMessage('Finalizing data deletion...')
    setMessageType('info')

    try {
      stopTimers()

      await deleteAllUserCloudinaryImages()

      const batch = writeBatch(db)
      // --- UPDATED: 'calendarSettings' changed to 'settings' ---
      const collectionsToDelete = [
        'userSettings',
        'measurements',
        'userGalleryImages',
        'userProfile',
        'workoutPlans',
        'workouts',
      ]
      // --- END UPDATED ---

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
      setShowReauthModal(false)
      setMessage('User re-authenticated successfully.')
      setMessageType('success')
      setReauthPassword('')
      setDeletionSpinnerShow()
      const dataDeleted = await executeAccountAndDataDeletion()
      if (dataDeleted) {
        await auth.currentUser.delete()
        await signOut(auth)
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
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 xs:p-3 p-2 rounded-xl text-gray-100 select-none'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6 mt-2'>
        ⚙️ Settings
      </h2>

      <div className='mb-8 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg '>
        <h3 className='sm:text-xl xs:text-lg text-base font-semibold text-gray-200 mb-2 sm:mb-3'>
          Calendar Preferences
        </h3>
        <fieldset className='mb-4'>
          <label className='flex flex-col text-gray-300 font-semibold mb-2 xs:text-base text-sm '>
            <span>Workout Days:</span>
            <span
              className='text-gray-400 italic text-xs xs:text-sm '
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
                  !editSettings
                    ? '': isSaveSettings ? "":'hover:shadow-[0px_0px_0px_0px_#030712] cursor-pointer'
                } shadow-[5px_5px_0px_0px_#030712] duration-500`}
              >
                <input
                  type='checkbox'
                  checked={settings.workoutDaysOfWeek.includes(index)}
                  onChange={(e) => {
                    const newWorkDays = e.target.checked
                      ? [...settings.workoutDaysOfWeek, index]
                      : settings.workoutDaysOfWeek.filter((d) => d !== index)
                    const newRestDays = e.target.checked
                      ? settings.restDaysOfWeek.filter((d) => d !== index)
                      : [...settings.restDaysOfWeek, index]

                    setSettings((prev) => ({
                      ...prev,
                      restDaysOfWeek: newRestDays,
                      workoutDaysOfWeek: newWorkDays,
                    }))
                  }}
                  className='form-checkbox h-3 w-3 sm:h-5 sm:w-5 text-blue-500 rounded-md bg-gray-700 border-gray-500 checked:bg-blue-500'
                  aria-label={`Toggle ${day} as a workout day`}
                  disabled={!editSettings||isSaveSettings}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className='my-4'>
          <h3 className=' sm:text-xl text-base xs:text-lg font-semibold text-gray-200 mb-t sm:mt-3'>
            Notification Display Time (sec)
          </h3>
          <div className='mb-4 flex items-center justify-between'>
            <label
              htmlFor='notification-time-input' // Changed htmlFor to be unique
              className='flex-grow text-gray-400 font-semibold cursor-pointer italic xs:text-sm text-xs'
            >
              How Long Notifications Stay For On The Screen
            </label>
            <input
              type='number'
              min={1}
              max={30}
              id='notification-time-input' // Added id
              aria-label='pop up time'
              value={settings.popUpTime / 1000} // Derive from settings
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  popUpTime: parseInt(e.target.value || '0') * 1000,
                }))
              } // Update settings directly
              className={`p-1.5 sm:p-3  ${
                !editSettings ?'bg-gray-900': isSaveSettings?'bg-gray-900':'bg-gray-700'
              } shadow-[5px_5px_0px_0px_#030712] border border-gray-950 ml-5 max-w-[200px] rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100`}
              disabled={!editSettings||isSaveSettings}
            />
          </div>
        </fieldset>
        <fieldset className='my-4'>
          <h3 className=' sm:text-xl text-base xs:text-lg font-semibold text-gray-200 mb-2 sm:mb-3'>
            Security Settings
          </h3>
          <div className='mb-4 flex items-center justify-between'>
            <label
              htmlFor='lock-protection-toggle'
              className='flex-grow text-gray-400 font-semibold cursor-pointer italic xs:text-sm text-xs'
            >
              Enable Lock Protection (Require password on app launch)
            </label>
            <input
              type='checkbox'
              id='lock-protection-toggle'
              checked={settings.lockProtectionEnabled}
              onChange={(e) => {
                setSettings((prev) => ({
                  ...prev,
                  lockProtectionEnabled: e.target.checked,
                }))
              }}
              className='form-checkbox h-5 w-5 text-blue-500 rounded-md bg-gray-700 border-gray-500  checked:bg-blue-500 ml-4'
              aria-label='Toggle lock protection on app launch'
              disabled={!editSettings||isSaveSettings}
            />
          </div>
        </fieldset>
        <button
          onClick={saveSettings}
          disabled={isSaveSettings}
          className={`sm:px-4 sm:py-2 px-2 py-1 text-sm sm:text-base  text-white rounded-md w-full transition-colors shadow-[2px_2px_0px_0px_#030712] border border-gray-950 ${
            editSettings
              ? 'hover:bg-green-700 bg-green-600'
              : 'hover:bg-indigo-700 bg-indigo-600'
          } ${isSaveSettings?'cursor-not-allowed':''} `}
        >
          {editSettings ? (
            <span>
              {isSaveSettings ? (
                <span className='items-center flex gap-2 justify-center'>
                  <FaSave /> Saving
                  <span className='flex animate-spin w-4 h-4 border-2 border-t-transparent border-gray-300 rounded-full'></span>
                </span>
              ) : (
                <span className='items-center flex gap-2 justify-center'>
                  <FaSave /> Save
                </span>
              )}
            </span>
          ) : (
            <span className='items-center flex gap-2 justify-center'>
              <FaEdit /> Edit Settings
            </span>
          )}
        </button>
      </div>

      <div className='bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg flex flex-col gap-2 mb-8'>
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
                {copied === userId ? <FaCopy /> : <FaRegCopy />}
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
                {copied === userEmail ? <FaCopy /> : <FaRegCopy />}
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
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 flex gap-2 items-center justify-center'
          aria-label='Sign out of your account'
        >
          Sign Out <FaSignOutAlt />
        </button>
        <button
          onClick={() => setShowConfirmClearDataModal(true)} // This button now clears data only
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 flex gap-2 items-center justify-center'
          aria-label='Clear all your workout data'
        >
          <FaBroom /> Clear All My Data
        </button>
        <button
          onClick={() => setShowConfirmDeleteAccountModal(true)} // This button now deletes account + all data
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-red-800 text-white rounded-md hover:bg-red-900 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 flex gap-2 items-center justify-center'
          aria-label='Permanently delete your account and all associated data'
        >
          <FaTrash /> Delete My Account
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
            className='text-lg sm:text-xl font-bold text-orange-400 mb-4 mr-[34px]'
          >
            Confirm Clear All Data
          </h3>
          <p className='text-gray-200 mb-6 text-sm sm:text-base'>
            <span className='font-bold text-orange-300'>WARNING:</span> This
            action will permanently delete ALL your workout logs, measurements,
            and settings from the database. Your **user account will remain**,
            and you will **remain logged in**. This cannot be undone.
            <br />
            <br />
            Are you absolutely sure you want to proceed?
          </p>
          <div className='flex gap-3'>
            <button
              onClick={() => setShowConfirmClearDataModal(false)}
              className='px-2 py-1 sm:px-4 text-sm sm:text-base sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 w-full text-nowrap'
              aria-label='Cancel data clearing'
            >
              Cancel
            </button>
            <button
              onClick={handleClearData}
              className='px-2 py-1 sm:px-4 text-sm sm:text-base sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors w-full text-nowrap'
              aria-label='Confirm and clear all my data'
            >
              Clear All Data
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
            className='text-lg sm:text-xl font-bold text-red-400 mb-4 mr-[34px]'
          >
            Confirm Account Deletion
          </h3>
          <p className='text-gray-200 mb-6 text-sm sm:text-base'>
            <span className='font-bold text-red-300'>FINAL WARNING:</span> This
            action will permanently delete your **user account AND ALL** your
            workout logs, measurements, and settings. This cannot be undone.
            <br />
            <br />
            Are you absolutely sure you want to proceed?
          </p>
          <div className='flex  gap-3'>
            <button
              onClick={() => setShowConfirmDeleteAccountModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 w-full text-nowrap'
              aria-label='Cancel account deletion '
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount} // This will now always trigger reauth flow
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-red-800 text-white rounded-md hover:bg-red-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors w-full'
              aria-label='Confirm and delete my account and all data text-nowrap'
            >
              Delete Account
            </button>
          </div>
        </Modal>
      )}

      {showReauthModal && (
        <Modal onClose={() => setShowReauthModal(false)}>
          <h3 className='text-lg sm:text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
            Re-authenticate for Security
          </h3>
          <p className='text-gray-200 mb-2 text-sm sm:text-base'>
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
            className='px-3 py-2 text-sm sm:text-base w-full bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 mb-4'
          />
          {reauthError && (
            <p className='text-red-400 text-sm mb-4'>{reauthError}</p>
          )}
          <div className='flex gap-3'>
            <button
              onClick={() => setShowReauthModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 w-full text-nowrap'
            >
              Cancel
            </button>
            <button
              onClick={handleReauthenticate}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 w-full text-nowrap'
            >
              Confirm Re-authenticate
            </button>
          </div>
        </Modal>
      )}
      {deletionSpinner && <DeletingAccountAnimation /> }
      {clearSpinner && <ClearingStorageAnimation />}
    </div>
  )
}
