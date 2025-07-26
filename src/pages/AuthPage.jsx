import { useState } from 'react'
import { useFirebase } from '../context/FirebaseContext'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { useMessage } from '../context/MessageContext'

export default function AuthPage() {
  const { auth } = useFirebase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(true)
  const [loading, setLoading] = useState(false)
  const {  setMessage, setMessageType  } = useMessage()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleAuthAction = async () => {
    setMessage('')
    setMessageType('')
    setLoading(true)

    try {
      if (!auth) {
        throw new Error(
          'Firebase Auth is not initialized. Check your .env config.'
        )
      }

      const trimmedEmail = email.trim()
      const trimmedPassword = password.trim()
      const trimmedConfirmPassword = confirmPassword.trim()

      if (isRegistering) {
        if (trimmedPassword !== trimmedConfirmPassword) {
          throw new Error('Passwords do not match.')
        }

        await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          trimmedPassword
        )
        setMessage('Registration successful! You are now logged in.')
        setMessageType('success')
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
        setMessage('Login successful!')
        setMessageType('success')
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setMessageType('error')

      switch (error?.code) {
        case 'auth/email-already-in-use':
          setMessage(
            'Email already in use. Try logging in or use a different email.'
          )
          break
        case 'auth/invalid-email':
          setMessage('Invalid email address format.')
          break
        case 'auth/weak-password':
          setMessage('Password is too weak. Must be at least 6 characters.')
          break
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setMessage('Invalid email or password.')
          break
        case 'auth/network-request-failed':
          setMessage('Network error. Please check your internet connection.')
          break
        default:
          setMessage(
            error?.message || 'An unexpected authentication error occurred.'
          )
          break
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex items-center justify-center min-h-[calc(100vh-10rem)] p-2 xs-p-4 sm:p-8'>
      <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-3  xs:p-4 sm:p-8 rounded-xl  w-full max-w-md text-gray-100'>
        <h2
          className='text-2xl mt-4 font-bold text-blue-400 mb-6 text-center'
          style={{ textShadow: '3px 3px 0px rgba(0, 0, 0, 0.5)' }}
        >
          {isRegistering ? 'Register' : 'Login'}
        </h2>

        

        <div className='space-y-2 sm:space-y-4 mb-6'>
          <input
            type='email'
            placeholder='Email'
            autoComplete='email'
            aria-required='true'
            aria-label='Email address'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='px-1.5 py-1 sm:p-3 w-full  bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950  rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 text-sm sm:text-base'
            disabled={loading}
          />
          <div className='relative'>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder='Password'
              aria-required='true'
              aria-label='Password'
              autoComplete='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='px-1.5 py-1 sm:p-3 w-full  bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950  rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 pr-10 text-sm sm:text-base'
              disabled={loading}
            />
            <button
              type='button'
              aria-label='Toggle password visibility'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-400 hover:text-gray-200'
            >
              {showPassword ? '🙈' : '👁️'} 
            </button>
          </div>
          {isRegistering && (
            <div className='relative'>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder='Confirm Password'
                aria-required='true'
                value={confirmPassword}
                aria-label='Confirm password'
                autoComplete='password'
                onChange={(e) => setConfirmPassword(e.target.value)}
                className='px-1.5 py-1 sm:p-3 w-full bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 pr-10 text-sm sm:text-base'
                disabled={loading}
              />
              <button
                type='button'
                aria-label='Toggle confirm password visibility'
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className='absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-400 hover:text-gray-200'
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleAuthAction}
          aria-label={isRegistering ? 'Register account' : 'Login to account'}
          className='w-full px-4 py-1 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[5px_5px_0px_0px_#030712] border border-gray-950 font-semibold text-sm sm:text-base'
          disabled={loading}
        >
          {loading ? 'Processing...' : isRegistering ? 'Register' : 'Login'}
        </button>

        <p className='text-center text-gray-400 text-sm sm:text-base my-4'>
          {isRegistering
            ? 'Already have an account? '
            : "Don't have an account? "}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            aria-label={
              isRegistering ? 'Switch to login' : 'Switch to register'
            }
            className='text-blue-400 hover:underline font-medium'
            disabled={loading}
          >
            {isRegistering ? 'Login' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  )
}
