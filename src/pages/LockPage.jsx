import React, { useState, useEffect } from 'react'
import { useFirebase } from '../context/FirebaseContext'
import { useMessage } from '../context/MessageContext'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from 'firebase/auth'
import Modal from '../components/Modal' // Assuming you have a Modal component

export default function LockPage({ onUnlock }) {
  const {
    auth,
    userId,
    userEmail: firebaseUserEmail,
  } = useFirebase()
  const { setMessage, setMessageType } = useMessage()

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showConfirmSignOutModal, setShowConfirmSignOutModal] = useState(false)

  // Use the email from FirebaseContext, which should be the authenticated user's email
  const userEmail = firebaseUserEmail

  const handleUnlock = async () => {
    setError('')
    if (!auth || !auth.currentUser || !userEmail || !password) {
      setError('Please enter your email and password.')
      return
    }

    try {
      // Re-authenticate the user with their email and password
      const credential = EmailAuthProvider.credential(userEmail, password)
      await reauthenticateWithCredential(auth.currentUser, credential)

      // If re-authentication is successful, unlock the app
      onUnlock()
      setMessage('App unlocked successfully!')
      setMessageType('success')
    } catch (err) {
      console.error('Failed to unlock app:', err)
      let errorMessage = 'Incorrect password. Please try again.'
      if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        errorMessage = 'Incorrect password. Please try again.'
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'Your account has been disabled.'
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please log in again.'
      }
      setError(errorMessage)
    }
  }

  const handleSignOut = async () => {
    if (auth) {
      try {
        await signOut(auth)
        setMessage('Signed out successfully!')
        setMessageType('success')
        setShowConfirmSignOutModal(false)
        // No need to call onUnlock here, as signOut will naturally lead to AuthPage
      } catch (error) {
        console.error('Error signing out:', error)
        setMessage('Error signing out.')
        setMessageType('error')
      }
    }
  }

  // Effect to clear password/error if user ID changes (e.g., after sign out/in)
  useEffect(() => {
    setPassword('')
    setError('')
  }, [userId])

  return (
    <div className='fixed top-0 left-0 flex flex-col items-center justify-center h-screen w-screen z-[1000] text-gray-100 bg-gray-900 '>
      <div className='bg-gray-900 p-2 text-gray-100 flex flex-col items-center justify-center w-full xs:w-[500px] text-center'>
        <h2 className='text-2xl font-bold text-blue-400 mb-6 '>
          🔐 App Locked
        </h2>
        <p className='text-gray-300 mb-4 w-full max-w-[80vw] '>
          Please enter your password to unlock the app.
        </p>

        {userEmail && (
          <p className='text-gray-400 text-sm mb-4 text-center w-full'>
            Logged in as:{' '}
            <span className='font-mono text-blue-300'>{userEmail}</span>
          </p>
        )}

        <input
          type='password'
          placeholder='Your Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className='p-3 w-full bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 mb-4 '
          aria-label='Enter your password'
        />

        {error && (
          <p className='text-red-400 text-sm mb-4 text-center' role='alert'>
            {error}
          </p>
        )}

        <button
          onClick={handleUnlock}
          className='w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 mb-3'
          aria-label='Unlock app'
        >
          Unlock
        </button>

        <button
          onClick={() => setShowConfirmSignOutModal(true)}
          className='w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
          aria-label='Sign out'
        >
          Sign Out
        </button>
      </div>

      {showConfirmSignOutModal && (
        <Modal
          onClose={() => setShowConfirmSignOutModal(false)}
          aria-labelledby='sign-out-modal-title'
        >
          <h3
            id='sign-out-modal-title'
            className='text-lg sm:text-xl font-bold text-blue-400 mb-4 mr-[34px]'
          >
            Confirm Sign Out
          </h3>
          <p className='text-gray-200 mb-6 text-sm sm:text-base'>
            Are you sure you want to sign out?
          </p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowConfirmSignOutModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
              aria-label='Cancel sign out'
            >
              Cancel
            </button>
            <button
              onClick={handleSignOut}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-red-600 text-white rounded-md hover:bg-red-700 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors'
              aria-label='Confirm sign out'
            >
              Sign Out
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
