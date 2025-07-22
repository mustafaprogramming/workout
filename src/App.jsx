import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
} from 'react'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore'

// Firebase Context to provide auth and db instances
const FirebaseContext = createContext(null)

// Utility to format date to YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` // Corrected to YYYY-MM-DD
}

// Firebase Configuration from Environment Variables
// IMPORTANT: For Vite.js applications, environment variables must start with VITE_
// Ensure your .env file variables are prefixed like VITE_FIREBASE_API_KEY
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Optional
}

// Main App Component
const App = () => {
  const [db, setDb] = useState(null)
  const [auth, setAuth] = useState(null)
  const [userId, setUserId] = useState(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [userCreatedAt, setUserCreatedAt] = useState(null) // Date object of user account creation
  const [currentPage, setCurrentPage] = useState('calendar') // 'calendar', 'workoutLog', 'measurements', 'settings', 'statistics', 'workoutPlan'
  const [selectedDate, setSelectedDate] = useState(new Date()) // For daily workout log
  const [selectedMonth, setSelectedMonth] = useState(new Date()) // For monthly measurements

  // State for mini timers
  const [showMiniStopwatch, setShowMiniStopwatch] = useState(false)
  const [showMiniCountdown, setShowMiniCountdown] = useState(false)
  const [stopwatchTime, setStopwatchTime] = useState(0) // Time in milliseconds
  const [stopwatchIsRunning, setStopwatchIsRunning] = useState(false)
  const [countdownTime, setCountdownTime] = useState(0) // Time in seconds
  const [countdownIsRunning, setCountdownIsRunning] = useState(false)
  const [showAlarm, setShowAlarm] = useState(false)

  useEffect(() => {
    // Check if Firebase config is loaded
    if (!firebaseConfig.apiKey) {
      console.error(
        'Firebase configuration is missing. Please check your .env file and ensure variables are prefixed with VITE_.'
      )
      setIsAuthReady(true) // Allow AuthPage to show error
      return
    }

    // Initialize Firebase
    try {
      const app = initializeApp(firebaseConfig)
      const firestoreDb = getFirestore(app)
      const firebaseAuth = getAuth(app)

      setDb(firestoreDb)
      setAuth(firebaseAuth)

      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid)
          // Use a fixed app ID for Firestore path as __app_id is not available locally
          // For Vercel deployment, ensure this matches your Firestore rules or is set via env var.
          const appId = 'workout-tracker-app-local' // Or any unique string for your local app
          const userProfileRef = doc(
            firestoreDb,
            `artifacts/${appId}/users/${user.uid}/userProfile`,
            'profile'
          )
          const userProfileSnap = await getDoc(userProfileRef)

          if (userProfileSnap.exists()) {
            setUserCreatedAt(userProfileSnap.data().createdAt?.toDate()) // Convert Firestore Timestamp to Date object
          } else {
            // If profile doesn't exist, create it with current timestamp
            const now = serverTimestamp()
            await setDoc(userProfileRef, { createdAt: now })
            setUserCreatedAt(new Date()) // Set immediately for UI, Firestore will store precise server time
          }
        } else {
          setUserId(null)
          setUserCreatedAt(null)
        }
        setIsAuthReady(true)
      })

      return () => unsubscribe()
    } catch (error) {
      console.error('Failed to initialize Firebase:', error)
      setIsAuthReady(true) // Allow AuthPage to show error
    }
  }, [])

  if (!isAuthReady) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-900 text-gray-100 p-4'>
        <div className='bg-gray-800 p-8 rounded-lg shadow-lg text-center'>
          <p className='text-lg font-semibold text-gray-200'>
            Loading application...
          </p>
          <p className='text-sm text-gray-400 mt-2'>
            Initializing Firebase connection.
          </p>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    if (!userId) {
      return <AuthPage />
    }
    switch (currentPage) {
      case 'calendar':
        return (
          <CalendarPage
            setCurrentPage={setCurrentPage}
            setSelectedDate={setSelectedDate}
            userCreatedAt={userCreatedAt}
          />
        )
      case 'workoutLog':
        return (
          <WorkoutLogPage
            selectedDate={selectedDate}
            setCurrentPage={setCurrentPage}
          />
        )
      case 'measurements':
        return (
          <MeasurementsPage
            setCurrentPage={setCurrentPage}
            setSelectedMonth={setSelectedMonth}
            selectedMonth={selectedMonth}
          />
        )
      case 'statistics':
        return <StatisticsPage setCurrentPage={setCurrentPage} />
      case 'settings':
        return <SettingsPage setCurrentPage={setCurrentPage} />
      case 'workoutPlan':
        return (
          <WorkoutPlanPage
            setShowMiniStopwatch={setShowMiniStopwatch}
            setShowMiniCountdown={setShowMiniCountdown}
            stopwatchTime={stopwatchTime}
            setStopwatchTime={setStopwatchTime}
            stopwatchIsRunning={stopwatchIsRunning}
            setStopwatchIsRunning={setStopwatchIsRunning}
            countdownTime={countdownTime}
            setCountdownTime={setCountdownTime}
            countdownIsRunning={countdownIsRunning}
            setCountdownIsRunning={setCountdownIsRunning}
            setShowAlarm={setShowAlarm}
          />
        )
      default:
        return (
          <CalendarPage
            setCurrentPage={setCurrentPage}
            setSelectedDate={setSelectedDate}
            userCreatedAt={userCreatedAt}
          />
        )
    }
  }

  return (
    <FirebaseContext.Provider value={{ db, auth, userId, isAuthReady }}>
      <div className='min-h-screen bg-gray-900  text-gray-100 font-inter'>
        <header className='bg-gray-800 p-4 flex justify-start items-center rounded-b-3xl sticky z-[50] top-0  mx-4 sm:shadow-[0_10px_0px_0px_#030712] shadow-[0_5px_0px_0px_#030712] border border-gray-950'>
          <h1 className='text-3xl font-extrabold text-blue-400 justify-around items-center flex gap-3'>
            <svg
              width='32'
              height='32'
              viewBox='0 0 32 32'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <circle cx='16' cy='16' r='14' stroke='#60A5FA' strokeWidth='2' />
              <circle cx='16' cy='16' r='6' fill='#60A5FA' />
              <path
                d='M11 21 L16 16 L21 21'
                stroke='#60A5FA'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
            CoreTrack
          </h1>
        </header>

        {userId && ( // Only show navigation if logged in
          <nav className='bg-gray-800 sticky z-[50] top-[86px] text-white sm:p-3 p-1 rounded-xl mx-6 my-4 grid grid-cols-5 sm:gap-2 gap-1 justify-around items-center sm:shadow-[0_10px_0px_0px_#030712] shadow-[0_5px_0px_0px_#030712] border border-gray-950 sm:text-base text-sm '>
            <NavItem
              onClick={() => setCurrentPage('calendar')}
              isActive={currentPage === 'calendar'}
            >
              📅 <span className='sm:flex hidden'>Calendar</span>
            </NavItem>
            <NavItem
              onClick={() => setCurrentPage('workoutPlan')}
              isActive={currentPage === 'workoutPlan'}
            >
              💪 <span className='sm:flex hidden'>Workout</span>
            </NavItem>
            <NavItem
              onClick={() => setCurrentPage('measurements')}
              isActive={currentPage === 'measurements'}
            >
              📏 <span className='sm:flex hidden'>Measurements</span>
            </NavItem>
            <NavItem
              onClick={() => setCurrentPage('statistics')}
              isActive={currentPage === 'statistics'}
            >
              📊 <span className='sm:flex hidden'>Statistics</span>
            </NavItem>
            <NavItem
              onClick={() => setCurrentPage('settings')}
              isActive={currentPage === 'settings'}
            >
              ⚙️ <span className='sm:flex hidden'>Settings</span>
            </NavItem>
          </nav>
        )}

        <main className='p-2 sm:p-4'>{renderPage()}</main>

        {/* Floating Timers */}
        {showMiniStopwatch && (
          <FloatingTimer
            type='stopwatch'
            time={stopwatchTime}
            isRunning={stopwatchIsRunning}
            setIsRunning={setStopwatchIsRunning}
            reset={setStopwatchTime}
            setShowMini={setShowMiniStopwatch}
          />
        )}
        {showMiniCountdown && (
          <FloatingTimer
            type='countdown'
            time={countdownTime}
            isRunning={countdownIsRunning}
            setIsRunning={setCountdownIsRunning}
            reset={setCountdownTime}
            setShowMini={setShowMiniCountdown}
          />
        )}
        <AlarmModal visible={showAlarm} onClose={() => setShowAlarm(false)} />
      </div>
    </FirebaseContext.Provider>
  )
}

// alarm

function AlarmModal({ visible, onClose }) {
  const audioRef = useRef(null)

  useEffect(() => {
    if (visible) {
      audioRef.current = new Audio(
        'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
      ) // Place the mp3 in your public folder
      audioRef.current.loop = true
      audioRef.current.play().catch(console.error)
    } else if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-flash '>
      <div className='bg-red-800 text-white p-6 rounded-lg shadow-lg text-center  relative sm:max-w-sm w-full animate-shake max-w-[85vw]'>
        <h2 className='text-3xl font-bold mb-4 '>⏰ TIME'S UP!</h2>
        <p className='mb-4 text-sm'>Your timer has finished.</p>
        <button
          onClick={onClose}
          className='bg-white text-red-800 px-4 py-2 rounded font-bold hover:bg-gray-100 transition'
        >
          Stop Alarm
        </button>
      </div>
    </div>
  )
}

const NavItem = ({ children, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`px-2.5 sm:px-5 py-1 sm:py-2 rounded-lg transition-all duration-300 flex flex-col items-center justify-center ${
      isActive
        ? 'bg-gray-900 text-blue-400 font-semibold shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
        : 'hover:bg-gray-600 text-gray-200 hover:text-white'
    }`}
  >
    {children}
  </button>
)

// Auth Page Component
const AuthPage = () => {
  const { auth, db } = useContext(FirebaseContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(true) // Start with register view
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId = 'workout-tracker-app-local' // Or any unique string for your local app

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
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }
        await createUserWithEmailAndPassword(auth, email, password)
        setMessage('Registration successful! You are now logged in.')
        setMessageType('success')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        setMessage('Login successful!')
        setMessageType('success')
      }
      // User profile creation date is handled by onAuthStateChanged in App.js
    } catch (error) {
      console.error('Authentication error:', error)
      setMessageType('error')
      switch (error.code) {
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
            error.message || 'An unexpected authentication error occurred.'
          )
          break
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex items-center justify-center min-h-[calc(100vh-10rem)] p-2 sm:p-4'>
      <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 sm:p-8 rounded-xl  w-full max-w-md text-gray-100'>
        <h2
          className='text-2xl  font-bold text-blue-400 mb-6 text-center'
          style={{ textShadow: '3px 3px 0px rgba(0, 0, 0, 0.5)' }}
        >
          {isRegistering ? 'Register' : 'Login'}
        </h2>

        {message && (
          <div
            className={`p-3 mb-4 rounded-md text-center ${
              messageType === 'success'
                ? 'bg-green-800 text-green-200'
                : 'bg-red-800 text-red-200'
            }`}
          >
            {message}
          </div>
        )}

        <div className='space-y-4 mb-6'>
          <input
            type='email'
            placeholder='Email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='p-1.5 sm:p-3 w-full  bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950  rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
            disabled={loading}
          />
          <div className='relative'>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder='Password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='p-1.5 sm:p-3 w-full  bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950  rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 pr-10'
              disabled={loading}
            />
            <button
              type='button'
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className='p-1.5 sm:p-3 w-full bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 pr-10'
                disabled={loading}
              />
              <button
                type='button'
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
          className='w-full px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[5px_5px_0px_0px_#030712] border border-gray-950 font-semibold'
          disabled={loading}
        >
          {loading ? 'Processing...' : isRegistering ? 'Register' : 'Login'}
        </button>

        <p className='text-center text-gray-400 mt-4'>
          {isRegistering
            ? 'Already have an account? '
            : "Don't have an account? "}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
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

// Calendar Page Component
const CalendarPage = ({ setCurrentPage, setSelectedDate, userCreatedAt }) => {
  const { db, userId, isAuthReady } = useContext(FirebaseContext)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState({}) // { 'YYYY-MM-DD': { type: 'workout' | 'rest', exercises: [] } }
  const [calendarSettings, setCalendarSettings] = useState({
    workoutDaysOfWeek: [1, 2, 3, 4, 5], // Monday=1, Sunday=0
    restDaysOfWeek: [0, 6], // Sunday=0, Saturday=6
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  const [showDayActionsModal, setShowDayActionsModal] = useState(false)
  const [selectedDayData, setSelectedDayData] = useState(null) // Data for the day clicked to open modal
  const [searchDate, setSearchDate] = useState('')
  const [highlightedDate, setHighlightedDate] = useState(null) // YYYY-MM-DD string for highlighting

  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId = 'workout-tracker-app-local' // Or any unique string for your local app

  useEffect(() => {
    if (!db || !userId || !isAuthReady) return

    // Fetch calendar settings
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

    // Fetch all workout data
    const workoutsCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/workouts`
    )
    const unsubscribeWorkouts = onSnapshot(
      workoutsCollectionRef,
      (snapshot) => {
        const fetchedData = {}
        snapshot.forEach((doc) => {
          const data = doc.data()
          fetchedData[doc.id] = {
            type: data.type || 'rest', // Default to rest if not explicitly set
            exercises: data.exercises || [],
            duration: data.duration || '', // Include duration
          }
        })
        setCalendarData(fetchedData)
      },
      (error) => {
        console.error('Error fetching workout data:', error)
        setMessage('Error loading workout data.')
        setMessageType('error')
      }
    )

    return () => {
      unsubscribeSettings()
      unsubscribeWorkouts()
    }
  }, [db, userId, isAuthReady, appId])

  const daysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay() // 0 for Sunday, 1 for Monday

  const getDayTypeFromSettings = (date) => {
    const dayOfWeek = date.getDay() // 0 for Sunday, 1 for Monday
    if (calendarSettings.workoutDaysOfWeek.includes(dayOfWeek)) {
      return 'workout'
    }
    if (calendarSettings.restDaysOfWeek.includes(dayOfWeek)) {
      return 'rest'
    }
    return 'none' // Neither planned workout nor rest, should ideally not happen if all days are covered
  }

  const handleDayClick = (day) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    )
    const dateKey = formatDate(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize today's date

    // Normalize userCreatedAt to start of day for accurate comparison
    const userCreatedDateNormalized = userCreatedAt
      ? new Date(
          userCreatedAt.getFullYear(),
          userCreatedAt.getMonth(),
          userCreatedAt.getDate()
        )
      : null

    // Disable interaction for future dates or dates before account creation
    if (
      date > today ||
      (userCreatedDateNormalized && date < userCreatedDateNormalized)
    ) {
      return
    }

    const storedData = calendarData[dateKey]
    const plannedType = getDayTypeFromSettings(date)
    const effectiveType = storedData?.type || plannedType
    const hasWorkoutLogged = (storedData?.exercises?.length || 0) > 0

    setSelectedDate(date)
    // Pass the full workout details (exercises array) to the modal
    setSelectedDayData({
      date,
      dateKey,
      effectiveType,
      hasWorkoutLogged,
      exercises: storedData?.exercises || [],
      duration: storedData?.duration || '', // Pass duration
    })
    setShowDayActionsModal(true)
  }

  const handleChangeDayType = async (dateKey, newType) => {
    if (!db || !userId) return
    const workoutDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/workouts`,
      dateKey
    )
    try {
      await setDoc(workoutDocRef, { type: newType }, { merge: true }) // Just update type, exercises remain
      setMessage(`Day converted to ${newType} day!`)
      setMessageType('success')
      setShowDayActionsModal(false)
    } catch (e) {
      console.error('Error changing day type:', e)
      setMessage('Failed to change day type.')
      setMessageType('error')
    }
  }

  const handleSearchDate = () => {
    if (!searchDate) {
      setMessage('Please enter a date to search.')
      setMessageType('error')
      return
    }
    const [year, month, day] = searchDate.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day) // Month is 0-indexed
    if (isNaN(targetDate.getTime())) {
      setMessage('Invalid date format. Please use YYYY-MM-DD.')
      setMessageType('error')
      return
    }

    setCurrentMonth(targetDate)
    setHighlightedDate(formatDate(targetDate)) // Set highlight
    setTimeout(() => {
      setHighlightedDate(null) // Remove highlight after 10 seconds
    }, 10000)
  }

  const renderDays = () => {
    const totalDays = daysInMonth(currentMonth)
    const firstDay = firstDayOfMonth(currentMonth)
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize today's date

    const userCreatedDateNormalized = userCreatedAt
      ? new Date(
          userCreatedAt.getFullYear(),
          userCreatedAt.getMonth(),
          userCreatedAt.getDate()
        )
      : null

    // Fill leading empty days
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className='sm:p-2 p-1 text-center'></div>
      )
    }

    // Fill actual days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      )
      const dateKey = formatDate(date)

      const storedData = calendarData[dateKey]
      const plannedType = getDayTypeFromSettings(date)

      let effectiveType = storedData?.type || plannedType
      const hasWorkoutLogged = (storedData?.exercises?.length || 0) > 0

      let bgColor = 'bg-gray-700'
      let borderColor = 'border-gray-600'
      let textColor = 'text-gray-100'
      let statusEmoji = ''

      const isFutureDate = date > today
      const isBeforeAccountCreation =
        userCreatedDateNormalized && date < userCreatedDateNormalized
      const isToday = date.toDateString() === today.toDateString()
      const isHighlighted = highlightedDate === dateKey

      if (isFutureDate || isBeforeAccountCreation) {
        bgColor = 'bg-gray-900'
        borderColor = 'border-gray-950'
        textColor = 'text-gray-600'
        statusEmoji = isFutureDate ? '⏳' : '🚫'
      } else {
        if (effectiveType === 'workout') {
          if (hasWorkoutLogged) {
            bgColor = 'bg-green-700'
            borderColor = 'border-green-600'
            statusEmoji = '✅'
          } else {
            bgColor = 'bg-red-700'
            borderColor = 'border-red-600'
            statusEmoji = '❌'
          }
        } else if (effectiveType === 'rest') {
          bgColor = 'bg-yellow-700'
          borderColor = 'border-yellow-600'
          statusEmoji = '🛌'
        }
      }

      days.push(
        <div
          key={day}
          className={`relative sm:p-3 p-1.5 border rounded-lg sm:shadow-[5px_5px_0px_0px_#030712] shadow-[2px_2px_0px_0px_#030712] flex flex-col items-center justify-center transition-all duration-200
            ${bgColor} ${borderColor} ${
            isFutureDate || isBeforeAccountCreation
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
          }
            ${isToday ? 'ring-2 ring-blue-400' : ''}
            ${isHighlighted ? 'ring-4 ring-blue-500' : ''}
          `}
          onClick={() => handleDayClick(day)}
        >
          <span className={`sm:text-lg font-bold ${textColor}`}>{day}</span>
          <span className='text-sm sm:mt-1'>{statusEmoji}</span>
        </div>
      )
    }
    return days
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 p-3  rounded-xl  text-gray-100'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6'>
        📅 Workout Calendar
      </h2>

      {message && (
        <div
          className={`p-3 mb-4 rounded-md text-center ${
            messageType === 'success'
              ? 'bg-green-800 text-green-200'
              : 'bg-red-800 text-red-200'
          }`}
        >
          {message}
        </div>
      )}

      <div className='flex justify-between items-center mb-6'>
        <button
          onClick={() =>
            setCurrentMonth(
              new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() - 1,
                1
              )
            )
          }
          className='px-2 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
        >
          Prev
        </button>
        <h3 className='md:text-xl sm:text-lg font-semibold text-gray-200'>
          {currentMonth.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}
        </h3>
        <button
          onClick={() =>
            setCurrentMonth(
              new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() + 1,
                1
              )
            )
          }
          className='px-2 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
        >
          Next
        </button>
      </div>

      <div className='mb-6 flex gap-3'>
        <input
          type='date'
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className='flex-grow flex-1 p-1.5 sm:p-3 bg-gray-900 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
        />
        <button
          onClick={handleSearchDate}
          className='sm:px-4 px-2 py-1.5 sm:py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 text-sm sm:text-base'
        >
          🔍 Go to Date
        </button>
      </div>

      <div className='grid grid-cols-7 sm:gap-3 gap-1 sm:mb-4 mb-2'>
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className='sm:text-base text-sm font-semibold text-center text-gray-400'
          >
            {day}
          </div>
        ))}
      </div>

      <div className='grid grid-cols-7 sm:gap-3 gap-1'>{renderDays()}</div>

      {showDayActionsModal && selectedDayData && (
        <DayActionsModal
          date={selectedDayData.date}
          effectiveType={selectedDayData.effectiveType}
          hasWorkoutLogged={selectedDayData.hasWorkoutLogged}
          workoutDetails={selectedDayData.exercises} // Pass workout details here
          workoutDuration={selectedDayData.duration} // Pass duration here
          onClose={() => setShowDayActionsModal(false)}
          onLogWorkout={() => {
            setSelectedDate(selectedDayData.date)
            setCurrentPage('workoutLog')
            setShowDayActionsModal(false)
          }}
          onConvertDayType={(newType) =>
            handleChangeDayType(selectedDayData.dateKey, newType)
          }
        />
      )}
    </div>
  )
}

// Day Actions Modal Component
const DayActionsModal = ({
  date,
  effectiveType,
  hasWorkoutLogged,
  workoutDetails, // New prop
  workoutDuration, // New prop
  onClose,
  onLogWorkout,
  onConvertDayType,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmMessage, setConfirmMessage] = useState('')

  const handleConfirmAction = (action, message) => {
    setConfirmAction(() => action)
    setConfirmMessage(message)
    setShowConfirmModal(true)
  }

  const executeConfirmAction = () => {
    if (confirmAction) {
      confirmAction()
    }
    setShowConfirmModal(false)
    setConfirmAction(null)
    setConfirmMessage('')
  }

  return (
    <Modal onClose={onClose}>
      <h3 className='text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
        Actions for {date.toDateString()}
      </h3>
      <div className='mb-6'>
        <p className='text-gray-200'>
          Current Status:
          <span
            className={`font-semibold ml-2 ${
              effectiveType === 'workout' && hasWorkoutLogged
                ? 'text-green-400'
                : effectiveType === 'workout' && !hasWorkoutLogged
                ? 'text-red-400'
                : effectiveType === 'rest'
                ? 'text-yellow-400'
                : 'text-gray-400'
            }`}
          >
            {effectiveType === 'workout' && hasWorkoutLogged
              ? 'Workout Done ✅'
              : effectiveType === 'workout' && !hasWorkoutLogged
              ? 'Workout Undone ❌'
              : effectiveType === 'rest'
              ? 'Rest Day 🛌'
              : 'Unassigned ❓'}
          </span>
        </p>
      </div>

      {/* Display Workout Details if available and logged */}
      {effectiveType === 'workout' && hasWorkoutLogged && (
        <div className='overflow-hidden rounded-lg mb-6 shadow-[5px_5px_0px_0px_#030712] border border-gray-950'>
          <div className=' bg-gray-800 rounded-lg shadow-inner max-h-[45vh] overflow-y-auto  '>
            {workoutDuration && (
              <p className='bg-gray-950 font-semibold flex gap-2 text-gray-300 text-md pb-3 pt-4 px-3 '>
                Duration:
                <span className='text-blue-300'>{workoutDuration}</span>
              </p>
            )}
            <div className='overflow-x-auto pb-2'>
              <table className='min-w-full bg-gray-900 overflow-hidden  sm:text-sm text-xs text-nowrap'>
                <thead>
                  <tr className='bg-gray-950 text-gray-300 uppercase leading-normal  sm:text-sm text-xs'>
                    <th className=' py-1.5 px-2 text-left'>Exercise</th>
                    <th className=' py-1.5 px-2 text-left'>Sets</th>
                    <th className=' py-1.5 px-2 text-left'>Reps</th>
                    <th className=' py-1.5 px-2 text-left'>Weight (kg)</th>
                    <th className=' py-1.5 px-2 text-left'>Rest Time</th>
                    <th className=' py-1.5 px-2 text-left'>RPE</th>
                  </tr>
                </thead>
                <tbody className='text-gray-200  font-light  sm:text-sm text-xs'>
                  {workoutDetails && workoutDetails.length > 0 ? (
                    workoutDetails.map((exercise, exIndex) => (
                      <React.Fragment key={exercise.id || exIndex}>
                        <tr className='border-b border-gray-700 last:border-b-0'>
                          <td className=' py-1.5 px-2 text-left font-semibold'>
                            {exercise.name}
                          </td>
                          <td className=' py-1.5 px-2 text-left'>
                            {exercise.sets.length}
                          </td>
                          <td className=' py-1.5 px-2 text-left'>-</td>
                          {/* Reps for exercise row is N/A */}
                          <td className=' py-1.5 px-2 text-left'>-</td>
                          {/* Weight for exercise row is N/A */}
                          <td className=' py-1.5 px-2 text-left'>-</td>
                          {/* Rest Time for exercise row is N/A */}
                          <td className=' py-1.5 px-2 text-left'>-</td>
                        </tr>
                        {exercise.sets.map((set, setIndex) => (
                          <tr
                            key={setIndex}
                            className='bg-gray-800 border-b border-gray-700 last:border-b-0'
                          >
                            <td className=' py-1 px-4 ml-auto text-left  italic'>
                              Set {exIndex + 1}:
                            </td>
                            <td className=' py-1 px-3 text-left'>-</td>
                            <td className=' py-1 px-3 text-left'>{set.reps}</td>
                            <td className=' py-1 px-3 text-left'>
                              {set.weight} kg
                            </td>
                            <td className=' py-1 px-3 text-left'>
                              {set.restTime}
                            </td>
                            <td className=' py-1 px-3 text-left'>{set.rpe}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    <p className='text-gray-400'>
                      No exercise details logged for this day.
                    </p>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className='flex flex-col space-y-3'>
        {effectiveType === 'workout' && (
          <button
            onClick={onLogWorkout}
            className='px-2 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full'
          >
            📝 Log Workout
          </button>
        )}

        {effectiveType === 'workout' ? (
          <button
            onClick={() =>
              handleConfirmAction(
                () => onConvertDayType('rest'),
                'Are you sure you want to convert this to a REST day? Any logged workouts will remain but the day will be marked as rest.'
              )
            }
            className='px-2 py-1 sm:px-4 sm:py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full'
          >
            🔄 Convert to Rest Day
          </button>
        ) : (
          <button
            onClick={() =>
              handleConfirmAction(
                () => onConvertDayType('workout'),
                'Are you sure you want to convert this to a WORKOUT day?'
              )
            }
            className='px-2 py-1 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full'
          >
            🔄 Convert to Workout Day
          </button>
        )}
      </div>

      {showConfirmModal && (
        <Modal onClose={() => setShowConfirmModal(false)}>
          <h3 className='text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
            Confirm Action
          </h3>
          <p className='text-gray-200 mb-6'>{confirmMessage}</p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowConfirmModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            >
              Cancel
            </button>
            <button
              onClick={executeConfirmAction}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 transition-colors'
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

// Workout Log Page Component
const WorkoutLogPage = ({ selectedDate, setCurrentPage }) => {
  const { db, userId, isAuthReady } = useContext(FirebaseContext)
  const [exercises, setExercises] = useState([])
  const [currentExerciseName, setCurrentExerciseName] = useState('')
  const [currentSets, setCurrentSets] = useState([]) // Array of { reps, weight, restTime, rpe } for the current exercise being added
  const [workoutDuration, setWorkoutDuration] = useState('') // New state for workout duration
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  const [showConfirmDeleteExerciseModal, setShowConfirmDeleteExerciseModal] =
    useState(false)
  const [exerciseToDeleteId, setExerciseToDeleteId] = useState(null)
  const [exerciseToDeleteName, setExerciseToDeleteName] = useState('')

  const formattedDate = formatDate(selectedDate) // YYYY-MM-DD
  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId = 'workout-tracker-app-local' // Or any unique string for your local app

  useEffect(() => {
    if (!db || !userId || !isAuthReady) return

    const workoutDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/workouts`,
      formattedDate
    )
    const unsubscribe = onSnapshot(
      workoutDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          setExercises(data.exercises || [])
          setWorkoutDuration(data.duration || '') // Load duration
        } else {
          setExercises([])
          setWorkoutDuration('') // Reset duration
        }
      },
      (error) => {
        console.error('Error fetching workout log:', error)
        setMessage('Error loading workout log.')
        setMessageType('error')
      }
    )

    return () => unsubscribe()
  }, [db, userId, isAuthReady, formattedDate, appId])

  const handleAddSet = () => {
    setCurrentSets([
      ...currentSets,
      { reps: '', weight: '', restTime: '', rpe: '' },
    ]) // Added RPE
  }

  const handleUpdateSet = (index, field, value) => {
    const updatedSets = [...currentSets]
    updatedSets[index][field] = value
    setCurrentSets(updatedSets)
  }

  const handleDeleteSet = (index) => {
    const updatedSets = currentSets.filter((_, i) => i !== index)
    setCurrentSets(updatedSets)
  }

  const handleAddExercise = async () => {
    if (!currentExerciseName.trim()) {
      setMessage('Exercise name cannot be empty.')
      setMessageType('error')
      return
    }
    if (currentSets.length === 0) {
      setMessage('Please add at least one set for the exercise.')
      setMessageType('error')
      return
    }

    const newExercise = {
      id: Date.now(), // Unique ID for the exercise
      name: currentExerciseName.trim(),
      sets: currentSets.map((s) => ({
        reps: parseInt(s.reps) || 0,
        weight: parseFloat(s.weight) || 0,
        restTime: s.restTime.trim(),
        rpe: parseInt(s.rpe) || null, // Parse RPE, allow null if empty
      })),
    }

    const updatedExercises = [...exercises, newExercise]
    setExercises(updatedExercises) // Optimistic update

    const workoutDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/workouts`,
      formattedDate
    )
    try {
      // Ensure the day is marked as 'workout' type and save duration
      await setDoc(
        workoutDocRef,
        {
          exercises: updatedExercises,
          type: 'workout',
          duration: workoutDuration,
        },
        { merge: true }
      )
      setMessage('Exercise added successfully!')
      setMessageType('success')
      // Clear form
      setCurrentExerciseName('')
      setCurrentSets([])
    } catch (e) {
      console.error('Error adding exercise:', e)
      setMessage('Failed to add exercise.')
      setMessageType('error')
      setExercises(exercises) // Revert if error
    }
  }

  const handleDeleteExerciseClick = (idToDelete, name) => {
    setExerciseToDeleteId(idToDelete)
    setExerciseToDeleteName(name)
    setShowConfirmDeleteExerciseModal(true)
  }

  const confirmDeleteExercise = async () => {
    if (!db || !userId || exerciseToDeleteId === null) return

    const updatedExercises = exercises.filter(
      (ex) => ex.id !== exerciseToDeleteId
    )
    setExercises(updatedExercises) // Optimistic update

    const workoutDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/workouts`,
      formattedDate
    )
    try {
      // If no exercises left, the calendar will automatically show it as 'undone'
      await setDoc(
        workoutDocRef,
        { exercises: updatedExercises, duration: workoutDuration }, // Save duration along with exercises
        { merge: true }
      )
      setMessage('Exercise deleted successfully!')
      setMessageType('success')
      setShowConfirmDeleteExerciseModal(false)
      setExerciseToDeleteId(null)
      setExerciseToDeleteName('')
    } catch (e) {
      console.error('Error deleting exercise:', e)
      setMessage('Failed to delete exercise.')
      setMessageType('error')
      setExercises(exercises) // Revert if error
    }
  }

  const handleSaveDuration = async () => {
    if (!db || !userId) return
    const workoutDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/workouts`,
      formattedDate
    )
    try {
      await setDoc(
        workoutDocRef,
        { duration: workoutDuration },
        { merge: true }
      )
      setMessage('Workout duration saved!')
      setMessageType('success')
    } catch (e) {
      console.error('Error saving duration:', e)
      setMessage('Failed to save duration.')
      setMessageType('error')
    }
  }

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 p-3 rounded-xl  text-gray-100 sm:text-base text-sm'>
      <h2 className='sm:text-2xl text-lg font-bold text-blue-400 mb-4'>
        🏋️ Workout Log for {selectedDate.toDateString()}
      </h2>

      {message && (
        <div
          className={`sm:p-3 p-1 mb-4 rounded-md text-center ${
            messageType === 'success'
              ? 'bg-green-800 text-green-200'
              : 'bg-red-800 text-red-200'
          }`}
        >
          {message}
        </div>
      )}

      <div className='mb-6 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-4 p-2 rounded-lg '>
        <h3 className='sm:text-xl text-base font-semibold text-gray-200 mb-3'>
          Workout Details
        </h3>
        <div className='flex flex-col sm:flex-row gap-3 mb-4'>
          <input
            type='text'
            placeholder='Workout Duration (e.g., 1h 30m)'
            value={workoutDuration}
            onChange={(e) => setWorkoutDuration(e.target.value)}
            className='flex-grow p-1.5 sm:p-3 bg-gray-800  rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
          />
          <button
            onClick={handleSaveDuration}
            className='px-2 py-1 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
          >
            Save Duration
          </button>
        </div>

        <h3 className='sm:text-xl text-base font-semibold text-gray-200 mb-3'>
          Add New Exercise
        </h3>
        <input
          type='text'
          placeholder='Exercise Name (e.g., Bench Press)'
          value={currentExerciseName}
          onChange={(e) => setCurrentExerciseName(e.target.value)}
          className='sm:p-3 p-1.5 mb-1.5 sm:mb-3 w-full bg-gray-800 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 '
        />

        <div className='space-y-1 sm:space-y-2 mb-3'>
          {currentSets.map((set, index) => (
            <div
              key={index}
              className='grid sm:gap-2 gap-1 items-center bg-gray-800 sm:p-3 p-1 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md'
            >
              <span className='text-gray-300 font-medium '>
                Set {index + 1}:
              </span>
              <div className='flex w-full sm:gap-2 gap-1 overflow-x-auto pb-1'>
                <input
                  type='number'
                  placeholder='Reps'
                  value={set.reps}
                  onChange={(e) =>
                    handleUpdateSet(index, 'reps', e.target.value)
                  }
                  className='p-1 sm:p-2 bg-gray-900 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-1'
                />
                <input
                  type='number'
                  step='0.1'
                  placeholder='Weight (kg)'
                  value={set.weight}
                  onChange={(e) =>
                    handleUpdateSet(index, 'weight', e.target.value)
                  }
                  className='p-1 sm:p-2 bg-gray-900 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-1'
                />
                <input
                  type='text'
                  placeholder='Rest (e.g., 60s)'
                  value={set.restTime}
                  onChange={(e) =>
                    handleUpdateSet(index, 'restTime', e.target.value)
                  }
                  className='p-1 sm:p-2 bg-gray-900 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-1'
                />
                <input
                  type='number'
                  min='1'
                  max='10'
                  placeholder='RPE'
                  value={set.rpe}
                  onChange={(e) =>
                    handleUpdateSet(index, 'rpe', e.target.value)
                  }
                  className='p-1 sm:p-2 bg-gray-900 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-1 '
                />
                <button
                  onClick={() => handleDeleteSet(index)}
                  className='p-1 sm:p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors  shadow-[2px_2px_0px_0px_#030712] border border-gray-950 mr-1'
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddSet}
          className='px-2 py-1 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 mb-2 sm:mb-4 w-full'
        >
          ➕ Add Set
        </button>

        <button
          onClick={handleAddExercise}
          className='px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full'
        >
          Add Exercise to Log
        </button>
      </div>

      <div className='mb-6 overflow-hidden rounded-lg  shadow-[5px_5px_0px_0px_#030712] border border-gray-950'>
        {exercises.length === 0 ? (
          <p className='text-gray-400 p-2'>
            No exercises logged for this day yet.
          </p>
        ) : (
          <div className='overflow-x-auto pb-1 '>
            <table className='min-w-full bg-gray-900 rounded-lg overflow-hidden  text-nowrap'>
              <thead>
                <tr className='bg-gray-950 text-gray-300 uppercase sm:text-sm text-xs leading-normal'>
                  <th className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                    Logged Exercise
                  </th>
                  <th className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                    Sets
                  </th>
                  <th className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                    Reps
                  </th>
                  <th className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                    Weight (kg)
                  </th>
                  <th className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                    Rest Time
                  </th>
                  <th className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>RPE</th>
                  <th className='sm:py-3 py-1.5 sm:px-6 px-2 text-center'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='text-gray-200 sm:text-sm text-xs font-light'>
                {exercises.map((exercise) => (
                  <React.Fragment key={exercise.id}>
                    {/* Exercise Header Row */}
                    <tr className='bg-gray-900 border-b border-gray-600'>
                      <td className='sm:py-3 py-1.5 sm:px-6 px-2 text-left font-semibold text-blue-300 sm:text-base md:text-lg text-sm'>
                        {exercise.name}
                      </td>
                      <td className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                        {exercise.sets.length}
                      </td>
                      <td className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                        -
                      </td>
                      {/* Reps for exercise row is N/A */}
                      <td className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                        -
                      </td>
                      {/* Weight for exercise row is N/A */}
                      <td className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                        -
                      </td>
                      {/* Rest Time for exercise row is N/A */}
                      <td className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'>
                        -
                      </td>
                      {/* RPE for exercise row is N/A */}
                      <td className='sm:py-3 py-1.5 sm:px-6 px-2 text-center'>
                        <button
                          onClick={() =>
                            handleDeleteExerciseClick(
                              exercise.id,
                              exercise.name
                            )
                          }
                          className='px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[2px_2px_0px_0px_#030712] border border-gray-950 text-xs'
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {/* Individual Set Rows */}
                    {exercise.sets.map((set, index) => (
                      <tr
                        key={index}
                        className='bg-gray-800 border-b border-gray-700 last:border-b-0'
                      >
                        <td className='sm:py-2 py-1 sm:px-6 px-2 text-left pl-10 italic'>
                          Set {index + 1}:
                        </td>
                        <td className='sm:py-2 py-1 sm:px-6 px-2 text-left'>
                          -
                        </td>
                        {/* Empty for sets */}
                        <td className='sm:py-2 py-1 sm:px-6 px-2 text-left'>
                          {set.reps}
                        </td>
                        <td className='sm:py-2 py-1 sm:px-6 px-2 text-left'>
                          {set.weight} kg
                        </td>
                        <td className='sm:py-2 py-1 sm:px-6 px-2 text-left'>
                          {set.restTime}
                        </td>
                        <td className='sm:py-2 py-1 sm:px-6 px-2 text-left'>
                          {set.rpe !== undefined ? set.rpe : '-'}
                        </td>
                        <td className='sm:py-2 py-1 sm:px-6 px-2 text-center'>
                          -
                        </td>
                        {/* No action for individual sets here */}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className='mt-8 text-center'>
        <button
          onClick={() => setCurrentPage('calendar')}
          className='px-6 py-3 bg-gray-900 text-gray-100 rounded-lg hover:bg-gray-700  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
        >
          ⬅️ Back to Calendar
        </button>
      </div>

      {showConfirmDeleteExerciseModal && (
        <Modal onClose={() => setShowConfirmDeleteExerciseModal(false)}>
          <h3 className='text-xl font-bold text-red-400 mb-4 mr-[34px]'>
            Confirm Deletion
          </h3>
          <p className='text-gray-200 mb-6'>
            Are you sure you want to delete the exercise "
            <span className='font-semibold text-blue-300'>
              {exerciseToDeleteName}
            </span>
            " from this workout log? This action cannot be undone.
          </p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowConfirmDeleteExerciseModal(false)}
              className='px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteExercise}
              className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Measurements Page Component
const MeasurementsPage = ({ selectedMonth, setSelectedMonth }) => {
  const { db, userId, isAuthReady } = useContext(FirebaseContext)
  const [measurements, setMeasurements] = useState({}) // { 'YYYY-MM-01': { data } }
  const [showMeasurementModal, setShowMeasurementModal] = useState(false)
  const [currentMonthData, setCurrentMonthData] = useState(null) // Data for the month being viewed/edited
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  const [searchYear, setSearchYear] = useState(new Date().getFullYear())
  const [searchMonth, setSearchMonth] = useState(new Date().getMonth() + 1) // 1-indexed month
  const [highlightedMonth, setHighlightedMonth] = useState(null) // YYYY-MM-01 string for highlighting

  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId = 'workout-tracker-app-local' // Or any unique string for your local app

  // Helper to check if measurement data is effectively empty
  const isEmptyMeasurementData = (data) => {
    if (!data) return true // No data at all means empty

    // Check numerical fields
    const numericFields = [
      'weight',
      'bodyFat',
      'chest',
      'waist',
      'neck',
      'forearms',
      'arms',
      'hips',
      'legs',
      'calves',
    ]
    const hasNumericData = numericFields.some((field) => {
      const value = data[field]
      // Consider 0 as data if it's explicitly set, but empty string/null/undefined as empty
      return (
        value !== '' &&
        value !== null &&
        value !== undefined &&
        (typeof value === 'number' ? value !== 0 : true)
      )
    })

    // Check notes
    const hasNotes = data.notes && data.notes.trim() !== ''

    // Check image URLs
    const hasImageUrls =
      data.imageUrls &&
      data.imageUrls.some((img) => img.url && img.url.trim() !== '')

    return !(hasNumericData || hasNotes || hasImageUrls)
  }

  useEffect(() => {
    if (!db || !userId || !isAuthReady) return

    const measurementsCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/measurements`
    )
    const unsubscribe = onSnapshot(
      measurementsCollectionRef,
      (snapshot) => {
        const fetchedMeasurements = {}
        snapshot.forEach((doc) => {
          fetchedMeasurements[doc.id] = doc.data()
        })
        setMeasurements(fetchedMeasurements)
      },
      (error) => {
        console.error('Error fetching measurements:', error)
        setMessage('Error loading measurements.')
        setMessageType('error')
      }
    )

    return () => unsubscribe()
  }, [db, userId, isAuthReady, appId])

  const handleMonthClick = (monthIndex) => {
    // monthIndex is 0-indexed
    const date = new Date(selectedMonth.getFullYear(), monthIndex, 1)
    const today = new Date()
    today.setDate(1) // Normalize to 1st of current month for comparison
    today.setHours(0, 0, 0, 0)

    // Disable interaction for future months
    if (date > today) {
      return
    }

    const dateKey = formatDate(date) // YYYY-MM-01

    setCurrentMonthData(
      measurements[dateKey] || {
        date: dateKey,
        weight: '',
        bodyFat: '',
        chest: '',
        waist: '',
        neck: '',
        forearms: '',
        arms: '',
        hips: '',
        legs: '',
        calves: '',
        notes: '',
        imageUrls: [],
      }
    )
    setShowMeasurementModal(true)
  }

  const handleSearchMonth = () => {
    const newDate = new Date(searchYear, searchMonth - 1, 1)
    if (isNaN(newDate.getTime())) {
      setMessage('Invalid year or month.')
      setMessageType('error')
      return
    }
    setSelectedMonth(newDate)
    setHighlightedMonth(formatDate(newDate)) // Set highlight
    setTimeout(() => {
      setHighlightedMonth(null) // Remove highlight after 10 seconds
    }, 10000)
  }

  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(0, i).toLocaleString('default', { month: 'long' })
  )

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 p-3 rounded-xl  text-gray-100'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6'>
        📏 Monthly Measurements
      </h2>

      {message && (
        <div
          className={`p-3 mb-4 rounded-md text-center ${
            messageType === 'success'
              ? 'bg-green-800 text-green-200'
              : 'bg-red-800 text-red-200'
          }`}
        >
          {message}
        </div>
      )}

      <div className='flex justify-between items-center mb-6'>
        <button
          onClick={() =>
            setSelectedMonth(
              new Date(
                selectedMonth.getFullYear() - 1,
                selectedMonth.getMonth(),
                1
              )
            )
          }
          className='sm:px-4 px-2 py-1 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
        >
          Prev
        </button>
        <h3 className='text-xl font-semibold text-gray-200 '>
          {selectedMonth.getFullYear()}
        </h3>
        <button
          onClick={() =>
            setSelectedMonth(
              new Date(
                selectedMonth.getFullYear() + 1,
                selectedMonth.getMonth(),
                1
              )
            )
          }
          className='sm:px-4 px-2 py-1 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
        >
          Next
        </button>
      </div>

      <div className='mb-6 flex flex-col sm:flex-row gap-3'>
        <input
          type='number'
          placeholder='Year'
          value={searchYear}
          onChange={(e) => setSearchYear(parseInt(e.target.value) || '')}
          className='p-1.5 sm:p-3 bg-gray-900 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-grow'
        />
        <select
          value={searchMonth}
          onChange={(e) => setSearchMonth(parseInt(e.target.value))}
          className='p-1.5 sm:p-3 bg-gray-900 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-grow'
        >
          {months.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </select>
        <button
          onClick={handleSearchMonth}
          className='sm:px-4 px-2 py-1.5 sm:py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
        >
          🔍 Go to Month
        </button>
      </div>

      <div className='grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4'>
        {months.map((monthName, index) => {
          const monthDate = new Date(selectedMonth.getFullYear(), index, 1)
          const monthKey = formatDate(monthDate)
          // Check if data exists AND is not empty
          const hasMeaningfulMeasurements = !isEmptyMeasurementData(
            measurements[monthKey]
          )
          const today = new Date()
          today.setDate(1) // Normalize to 1st of current month for comparison
          today.setHours(0, 0, 0, 0)
          const isFutureMonth = monthDate > today
          const isHighlighted = highlightedMonth === monthKey

          return (
            <div
              key={monthName}
              className={`p-1 sm:p-2 md:p-4 rounded-lg flex flex-col items-center justify-center transition-all duration-200 shadow-[5px_5px_0px_0px_#030712] border border-gray-950
                ${
                  hasMeaningfulMeasurements
                    ? 'bg-green-700 hover:bg-green-600 '
                    : 'bg-gray-900 hover:bg-gray-800 '
                }
                ${
                  isFutureMonth
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                }
                ${isHighlighted ? 'ring-4 ring-blue-500' : ''}
              `}
              onClick={() => handleMonthClick(index)}
            >
              <span className='text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-100'>
                {monthName}
              </span>
              <span className='text-sm mt-1'>
                {hasMeaningfulMeasurements ? '✅ Logged' : '➕ Add'}
              </span>
            </div>
          )
        })}
      </div>

      {showMeasurementModal && (
        <MeasurementModal
          monthData={currentMonthData}
          onClose={() => setShowMeasurementModal(false)}
          onSave={(data) => {
            const dateKey = formatDate(new Date(data.date))
            setDoc(
              doc(
                db,
                `artifacts/${appId}/users/${userId}/measurements`,
                dateKey
              ),
              data,
              { merge: true }
            )
              .then(() => {
                setMessage('Measurement saved successfully!')
                setMessageType('success')
                setShowMeasurementModal(false)
              })
              .catch((e) => {
                console.error('Error saving measurement:', e)
                setMessage('Failed to save measurement.')
                setMessageType('error')
              })
          }}
          onClearData={(dateKey) => {
            // Overwrite with empty object, ensuring imageUrls is an empty array
            setDoc(
              doc(
                db,
                `artifacts/${appId}/users/${userId}/measurements`,
                dateKey
              ),
              {
                date: dateKey, // Keep the date key
                weight: '',
                bodyFat: '',
                chest: '',
                waist: '',
                neck: '',
                forearms: '',
                arms: '',
                hips: '',
                legs: '',
                calves: '',
                notes: '',
                imageUrls: [], // Explicitly set to empty array
              },
              { merge: false }
            ) // Use merge: false to completely overwrite
              .then(() => {
                setMessage('Measurement data cleared successfully!')
                setMessageType('success')
                setShowMeasurementModal(false)
              })
              .catch((e) => {
                console.error('Error clearing measurement data:', e)
                setMessage('Failed to clear measurement data.')
                setMessageType('error')
              })
          }}
        />
      )}
    </div>
  )
}

// Measurement Modal Component
const MeasurementModal = ({ monthData, onClose, onSave, onClearData }) => {
  // Initialize formData ensuring imageUrls is an array
  const [formData, setFormData] = useState(() => {
    const initialData = monthData || {}
    return {
      ...initialData,
      imageUrls:
        initialData.imageUrls && Array.isArray(initialData.imageUrls)
          ? initialData.imageUrls.length > 0
            ? initialData.imageUrls
            : [{ url: '', label: '' }]
          : [{ url: '', label: '' }],
    }
  })
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageLabel, setPreviewImageLabel] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false)

  // No need for useEffect to initialize imageUrls if useState init is robust

  const handleFieldChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageURLChange = (index, field, value) => {
    const updatedUrls = [...formData.imageUrls]
    updatedUrls[index] = { ...updatedUrls[index], [field]: value }
    setFormData((prev) => ({ ...prev, imageUrls: updatedUrls }))
  }

  const handleAddImageField = () => {
    if (formData.imageUrls.length < 10) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, { url: '', label: '' }],
      }))
    } else {
      setMessage('Maximum of 10 images allowed.')
      setMessageType('error')
    }
  }

  const handleRemoveImageField = (index) => {
    const updatedUrls = formData.imageUrls.filter((_, i) => i !== index)
    // Ensure there's always at least one empty image field if all are removed
    setFormData((prev) => ({
      ...prev,
      imageUrls:
        updatedUrls.length > 0 ? updatedUrls : [{ url: '', label: '' }],
    }))
  }

  const handleImageClick = (url, label) => {
    setPreviewImageUrl(url)
    setPreviewImageLabel(label)
    setShowImagePreview(true)
  }

  const measurementFields = [
    { label: 'Weight (kg)', key: 'weight', type: 'number', optional: true },
    { label: 'Body Fat (%)', key: 'bodyFat', type: 'number', optional: true },
    { label: 'Chest (in)', key: 'chest', type: 'number', optional: false },
    { label: 'Waist (in)', key: 'waist', type: 'number', optional: false },
    { label: 'Neck (in)', key: 'neck', type: 'number', optional: false },
    {
      label: 'Forearms (in)',
      key: 'forearms',
      type: 'number',
      optional: false,
    },
    { label: 'Arms (in)', key: 'arms', type: 'number', optional: false },
    { label: 'Hips (in)', key: 'hips', type: 'number', optional: false },
    { label: 'Legs (in)', key: 'legs', type: 'number', optional: false },
    { label: 'Calves (in)', key: 'calves', type: 'number', optional: false },
  ]

  const handleSaveClick = () => {
    // Validate required fields
    const requiredFields = measurementFields.filter((field) => !field.optional)
    for (const field of requiredFields) {
      if (!formData[field.key] || String(formData[field.key]).trim() === '') {
        setMessage(`Please enter a value for ${field.label}.`)
        setMessageType('error')
        return
      }
    }
    // If all validations pass, call the onSave prop
    onSave(formData)
  }

  return (
    <Modal onClose={onClose}>
      <h3 className='text-lg sm:text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
        Measurements for
        {new Date(formData.date).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        })}
      </h3>
      {message && (
        <div
          className={`sm:p-3 sm:mb-4 p-1.5 mb-2 rounded-md text-center ${
            messageType === 'success'
              ? 'bg-green-800 text-green-200'
              : 'bg-red-800 text-red-200'
          }`}
        >
          {message}
        </div>
      )}
      {/* Scrollable Content Area */}
      <div className='overflow-y-scroll overflow-x-hidden max-h-[60vh] pr-2'>
        <div className='grid grid-cols-1 md:grid-cols-2 sm:gap-4 gap-2 mb-4 text-sm sm:text-base'>
          {measurementFields.map((field) => (
            <label key={field.key} className='block'>
              <span className='text-gray-300 sm:text-base text-sm'>
                {field.label} {field.optional ? '(Optional)' : '(Required)'}:
              </span>
              <input
                type={field.type}
                step='0.1'
                name={field.key}
                placeholder={field.label}
                value={formData[field.key] || ''}
                onChange={handleFieldChange}
                className='sm:p-3 p-1.5 mt-1 w-full bg-gray-800 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 text-sm sm:text-base'
                required={!field.optional} // HTML5 required attribute
              />
            </label>
          ))}
          <label className='block col-span-full'>
            <span className='text-gray-300 text-sm sm:text-base'>
              Notes (optional):
            </span>
            <textarea
              name='notes'
              placeholder="Any additional notes for this month's measurements..."
              value={formData.notes || ''}
              onChange={handleFieldChange}
              rows='3'
              className='sm:p-3 p-1.5 mt-1 w-full bg-gray-800 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 text-sm sm:text-base'
            ></textarea>
          </label>
        </div>
        <h4 className='text-lg font-semibold text-gray-200 mb-2'>
          Physique Pictures (Optional)
        </h4>
        <div className='space-y-3 mb-4 flex flex-col '>
          {/* Ensure formData.imageUrls is an array before mapping */}
          {(formData.imageUrls || []).map((img, index) => (
            <div
              key={index}
              className='flex gap-2 overflow-x-auto text-sm sm:text-base pb-1'
            >
              <input
                type='url'
                placeholder={`Image ${index + 1} URL`}
                value={img.url}
                onChange={(e) =>
                  handleImageURLChange(index, 'url', e.target.value)
                }
                className='flex-grow sm:p-3 p-1.5 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
              />
              <input
                type='text'
                placeholder='Label (e.g., Front Pose)'
                value={img.label}
                onChange={(e) =>
                  handleImageURLChange(index, 'label', e.target.value)
                }
                className='flex-grow sm:p-3 p-1.5 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
              />
              {(formData.imageUrls || []).length > 1 && ( // Allow removing if more than one field
                <button
                  onClick={() => handleRemoveImageField(index)}
                  className='sm:p-2 p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors  sm:mr-1 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 mr-1'
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
          {(formData.imageUrls || []).length < 10 && (
            <button
              onClick={handleAddImageField}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full text-sm sm:text-base'
            >
              ➕ Add Another Image
            </button>
          )}
        </div>
        {/* Display images for viewing */}
        {formData.imageUrls &&
          formData.imageUrls.filter((img) => img.url).length > 0 && (
            <div className='mt-4'>
              <h4 className='font-semibold text-gray-200 mb-2'>
                Current Images:
              </h4>
              <div className='flex overflow-x-auto sm:gap-4 gap-2 pb-3'>
                {formData.imageUrls
                  .filter((img) => img.url)
                  .map((img, idx) => (
                    <div
                      key={idx}
                      className='bg-gray-900 p-2 rounded-lg  cursor-pointer w-fit max-w-[110px] sm:max-w-[160px] md:max-w-[210px] border border-gray-950 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[5px_5px_0px_0px_#030712] duration-500'
                      onClick={() => handleImageClick(img.url, img.label)}
                    >
                      {img.label && (
                        <p className='text-xs text-gray-400 mb-1 truncate'>
                          {img.label}
                        </p>
                      )}
                      <img
                        src={img.url}
                        alt={img.label || `Physique Image ${idx + 1}`}
                        className='w-full object-cover rounded-md mb-2 max-w-[100px] max-h-[100px] sm:max-w-[150px] sm:max-h-[150px] md:max-w-[200px] md:max-h-[200px] overflow-hidden bg-center mx-auto '
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src =
                            'https://placehold.co/300x200/4a5568/a0aec0?text=Image+Load+Error'
                        }}
                      />
                      <p className='text-xs text-gray-500 truncate'>
                        {img.url}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
      </div>
      {/* End of scrollable content */}
      <div className='flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-gray-700'>
        {/* Only show clear if there's any data for this month (even if it's just an empty object from a previous save) */}
        {Object.keys(monthData).length > 1 && ( // Check if monthData has more than just 'date'
          <button
            onClick={() => setShowConfirmClearModal(true)}
            className='px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
          >
            🧹 Clear Data
          </button>
        )}
        <button
          onClick={handleSaveClick} // Use the new handler for validation
          className='px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
        >
          Save Measurement
        </button>
      </div>
      {showImagePreview && (
        <ImagePreviewModal
          imageUrl={previewImageUrl}
          imageLabel={previewImageLabel}
          onClose={() => setShowImagePreview(false)}
        />
      )}
      {showConfirmClearModal && (
        <Modal onClose={() => setShowConfirmClearModal(false)}>
          <h3 className='text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
            Confirm Clear Data
          </h3>
          <p className='text-gray-200 mb-6'>
            Are you sure you want to clear all measurement data for this month?
            This will make it appear as "not logged" again, but the month entry
            itself will remain.
          </p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowConfirmClearModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClearData(formData.date)
                setShowConfirmClearModal(false)
              }}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            >
              Clear Data
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

// Image Preview Modal
const ImagePreviewModal = ({ imageUrl, onClose, imageLabel }) => {
  return (
    <div className='fixed inset-0 bg-gray-900 bg-opacity-40 backdrop-blur-lg flex justify-center items-center sm:p-4 p-2 z-50 '>
      <div className=' bg-gray-900 sm:p-4 p-2 rounded-xl relative max-w-[500px] max-h-[90vh] flex flex-col shadow-[5px_5px_0px_0px_#030712] border-2 border-gray-950 '>
        <div className='flex gap-1 justify-between'>
          {imageLabel && (
            <p className='text-xs text-gray-400 mb-1 mr-[50px] text-wrap break-all'>
              {imageLabel}
            </p>
          )}
          <button
            onClick={onClose}
            className=' absolute top-0 right-0 text-gray-400 hover:text-gray-100 text-3xl z-10 w-[50px] h-[35px] bg-[#030712] flex items-center justify-center rounded-bl-xl rounded-tr-xl'
          >
            &times;
          </button>
        </div>
        <div className='flex justify-center items-center overflow-hidden rounded-lg'>
          <img
            src={imageUrl}
            alt='Full size preview'
            className='w-auto h-auto max-w-full max-h-full object-contain rounded-lg mx-auto'
            onError={(e) => {
              e.target.onerror = null
              e.target.src =
                'https://placehold.co/800x600/4a5568/a0aec0?text=Image+Load+Error'
            }}
          />
        </div>
        {imageUrl && (
          <p className='text-xs text-gray-400 mb-1 mt-3 break-all text-wrap'>
            {imageUrl}
          </p>
        )}
      </div>
    </div>
  )
}

// Statistics Page Component
const StatisticsPage = () => {
  const { db, userId, isAuthReady } = useContext(FirebaseContext)
  const [workoutStats, setWorkoutStats] = useState({}) // { year: { workoutDays, restDays } }
  const [measurements, setMeasurements] = useState([]) // Array of all measurements for display
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'

  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId = 'workout-tracker-app-local' // Or any unique string for your local app
  // Helper to check if measurement data is effectively empty
  const isEmptyMeasurementData = (data) => {
    if (!data) return true // No data at all means empty

    // Check numerical fields
    const numericFields = [
      'weight',
      'bodyFat',
      'chest',
      'waist',
      'neck',
      'forearms',
      'arms',
      'hips',
      'legs',
      'calves',
    ]
    const hasNumericData = numericFields.some((field) => {
      const value = data[field]
      // Consider 0 as data if it's explicitly set, but empty string/null/undefined as empty
      return (
        value !== '' &&
        value !== null &&
        value !== undefined &&
        (typeof value === 'number' ? value !== 0 : true)
      )
    })

    // Check notes
    const hasNotes = data.notes && data.notes.trim() !== ''

    // Check image URLs
    const hasImageUrls =
      data.imageUrls &&
      data.imageUrls.some((img) => img.url && img.url.trim() !== '')

    return !(hasNumericData || hasNotes || hasImageUrls)
  }

  useEffect(() => {
    if (!db || !userId || !isAuthReady) return

    // Fetch workout data for statistics
    const workoutsCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/workouts`
    )
    const unsubscribeWorkouts = onSnapshot(
      workoutsCollectionRef,
      (snapshot) => {
        const yearlyStats = {}
        snapshot.forEach((doc) => {
          const data = doc.data()
          const docDate = new Date(doc.id) // doc.id is 'YYYY-MM-DD'
          const year = docDate.getFullYear()
          const hasWorkoutLogged = (data.exercises?.length || 0) > 0
          const dayType = data.type || 'rest' // Default to rest if not explicitly set

          if (!yearlyStats[year]) {
            yearlyStats[year] = { workoutDays: 0, restDays: 0 }
          }

          if (dayType === 'workout' && hasWorkoutLogged) {
            yearlyStats[year].workoutDays++
          } else {
            yearlyStats[year].restDays++
          }
        })
        setWorkoutStats(yearlyStats)
      },
      (error) => {
        console.error('Error fetching workout stats:', error)
        setMessage('Error loading workout statistics.')
        setMessageType('error')
      }
    )

    // Fetch all measurements for display
    const measurementsCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/measurements`
    )
    const unsubscribeMeasurements = onSnapshot(
      measurementsCollectionRef,
      (snapshot) => {
        const fetchedMeasurements = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          // Only include months with meaningful data
          if (!isEmptyMeasurementData(data)) {
            fetchedMeasurements.push({ id: doc.id, ...data })
          }
        })
        fetchedMeasurements.sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date descending
        setMeasurements(fetchedMeasurements)
      },
      (error) => {
        console.error('Error fetching measurements:', error)
        setMessage('Error loading measurements history.')
        setMessageType('error')
      }
    )

    return () => {
      unsubscribeWorkouts()
      unsubscribeMeasurements()
    }
  }, [db, userId, isAuthReady, appId])

  // Sort years for display
  const sortedYears = Object.keys(workoutStats).sort(
    (a, b) => parseInt(b) - parseInt(a)
  )

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 p-3 rounded-xl  text-gray-100'>
      <h2 className=' sm:text-2xl text-xl font-bold text-blue-400 mb-6'>
        📊 Statistics & Progress
      </h2>

      {message && (
        <div
          className={`p-3 mb-4 rounded-md text-center ${
            messageType === 'success'
              ? 'bg-green-800 text-green-200'
              : 'bg-red-800 text-red-200'
          }`}
        >
          {message}
        </div>
      )}

      <div className='mb-8 bg-gray-900 border border-gray-950 shadow-[5px_5px_0px_0px_#030712] sm:p-4 p-2.5 rounded-lg '>
        <h3 className='sm:text-xl text-lg font-semibold text-gray-200 sm:mb-3 mb-1.5'>
          Yearly Workout Summary
        </h3>
        {sortedYears.length === 0 ? (
          <p className='text-gray-400'>No workout data available yet.</p>
        ) : (
          <div className='sm:space-y-3 space-y-1.5'>
            {sortedYears.map((year) => (
              <div
                key={year}
                className='bg-gray-800 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 p-2 sm:p-3 rounded-md'
              >
                <p className='text-lg font-bold text-blue-300'>Year: {year}</p>
                <p className='text-gray-300'>
                  Workout Days:
                  <span className='font-bold text-green-400'>
                    {workoutStats[year].workoutDays}
                  </span>
                </p>
                <p className='text-gray-300'>
                  Rest Days:
                  <span className='font-bold text-yellow-400'>
                    {workoutStats[year].restDays}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='mb-6'>
        <h3 className='text-xl font-semibold text-gray-200 mb-3 '>
          Measurement History
        </h3>
        {measurements.length === 0 ? (
          <p className='text-gray-400'>No measurements recorded yet.</p>
        ) : (
          <div className='space-y-4'>
            {measurements.map((m) => (
              <MeasurementData key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
const MeasurementData = ({ m }) => {
  const [showMeasurement, setShowMeasurement] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageLabel, setPreviewImageLabel] = useState('')
  const handleImageClick = (url, label) => {
    setPreviewImageUrl(url)
    setPreviewImageLabel(label)
    setShowImagePreview(true)
  }
  return (
    <div
      className={`bg-gray-900 ${
        showMeasurement ? '' : 'hover:shadow-[0px_0px_0px_0px_#030712]'
      } shadow-[5px_5px_0px_0px_#030712] py-3 border border-gray-950 rounded-lg duration-500`}
    >
      <div className='flex justify-between items-center'>
        <p className='font-semibold text-blue-400 text-base sm:text-lg py-1 px-4 rounded-md bg-gray-900'>
          {m.date}
        </p>
        <button
          onClick={() => setShowMeasurement(!showMeasurement)}
          className='bg-gray-950 hover:bg-[#030712ad] px-4 py-1 mr-3 rounded-md text-sm sm:text-base text-gray-400 shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
        >
          {showMeasurement ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className={`${showMeasurement ? 'block' : 'hidden'} mt-2`}>
        <div className='overflow-x-auto  shadow-md '>
          <table className='min-w-full bg-gray-800  overflow-hidden'>
            <thead>
              <tr className='bg-gray-900 text-gray-300 uppercase text-sm leading-normal'>
                <th className='py-3 px-6 text-left'>Measurement</th>
                <th className='py-3 px-6 text-left'>Value</th>
              </tr>
            </thead>
            <tbody className='text-gray-200 text-sm font-light'>
              {m.weight && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Weight</td>
                  <td className='py-2 px-6 text-left'>{m.weight} kg</td>
                </tr>
              )}
              {m.bodyFat && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Body Fat</td>
                  <td className='py-2 px-6 text-left'>{m.bodyFat} %</td>
                </tr>
              )}
              {m.chest && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Chest</td>
                  <td className='py-2 px-6 text-left'>{m.chest} in</td>
                </tr>
              )}
              {m.waist && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Waist</td>
                  <td className='py-2 px-6 text-left'>{m.waist} in</td>
                </tr>
              )}
              {m.neck && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Neck</td>
                  <td className='py-2 px-6 text-left'>{m.neck} in</td>
                </tr>
              )}
              {m.forearms && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Forearms</td>
                  <td className='py-2 px-6 text-left'>{m.forearms} in</td>
                </tr>
              )}
              {m.arms && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Arms</td>
                  <td className='py-2 px-6 text-left'>{m.arms} in</td>
                </tr>
              )}
              {m.hips && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Hips</td>
                  <td className='py-2 px-6 text-left'>{m.hips} in</td>
                </tr>
              )}
              {m.legs && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Legs</td>
                  <td className='py-2 px-6 text-left'>{m.legs} in</td>
                </tr>
              )}
              {m.calves && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Calves</td>
                  <td className='py-2 px-6 text-left'>{m.calves} in</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {m.notes && (
          <p className='text-sm text-gray-300 italic border-y border-gray-500 bg-gray-800 py-3 px-6'>
            Notes: {m.notes}
          </p>
        )}
        {showImagePreview && (
          <ImagePreviewModal
            imageUrl={previewImageUrl}
            imageLabel={previewImageLabel}
            onClose={() => setShowImagePreview(false)}
          />
        )}
        {m.imageUrls && m.imageUrls.length > 0 && (
          <div className='py-3 px-6 '>
            <h4 className='font-semibold text-gray-200 mb-4'>
              Physique Images:
            </h4>
            <div className='flex overflow-x-auto sm:gap-4 gap-2 pb-3'>
              {m.imageUrls.map(
                (img, idx) =>
                  img.url && (
                    <div
                      key={idx}
                      className=' bg-gray-900 p-2 rounded-lg  cursor-pointer w-fit max-w-[110px] sm:max-w-[160px] md:max-w-[210px] border border-gray-950 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[5px_5px_0px_0px_#030712] duration-500'
                      onClick={() => {
                        handleImageClick(img.url, img.label)
                      }}
                    >
                      {img.label && (
                        <p className='text-xs text-gray-400 mb-1 truncate'>
                          {img.label}
                        </p>
                      )}
                      <img
                        src={img.url}
                        alt={img.label || `Physique Image ${idx + 1}`}
                        className='w-full object-cover rounded-md mb-2 max-w-[100px] max-h-[100px] sm:max-w-[150px] sm:max-h-[150px] md:max-w-[200px] md:max-h-[200px] overflow-hidden bg-center mx-auto '
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src =
                            'https://placehold.co/300x200/4a5568/a0aec0?text=Image+Load+Error'
                        }}
                      />
                      <p className='text-xs text-gray-500 truncate'>
                        {img.url}
                      </p>
                    </div>
                  )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
// Settings Page Component
const SettingsPage = () => {
  const { db, auth, userId, isAuthReady } = useContext(FirebaseContext)
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
  const appId = 'workout-tracker-app-local' // Or any unique string for your local app

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

      <div className='mb-8 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg '>
        <h3 className='sm:text-xl text-lg font-semibold text-gray-200 mb-2 sm:mb-3'>
          Calendar Preferences
        </h3>
        <div className='mb-4'>
          <label className='flex flex-col text-gray-300 font-semibold mb-2 '>
            <span>Workout Days:</span>
            <span className='text-gray-400 italic text-xs sm:text-sm '>
              Unmarked Days are Recorded as Rest Days
            </span>
          </label>
          <div className='flex flex-wrap gap-1 sm:gap-2'>
            {daysOfWeek.map((day, index) => (
              <label
                key={`workout-${index}`}
                className='flex items-center sm:space-x-2 space-x-1  py-1 px-2 sm:p-2 rounded-md cursor-pointer border border-gray-950 bg-gray-900 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[5px_5px_0px_0px_#030712] duration-500'
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
                    console.log(
                      'restDays : ' + newRestDays,
                      'workdays : ' + newWorkDays
                    )
                    setCalendarSettings((prev) => ({
                      ...prev,
                      restDaysOfWeek: newRestDays,
                      workoutDaysOfWeek: newWorkDays,
                    }))
                  }}
                  className='form-checkbox h-3 w-3 sm:h-5 sm:w-5 text-blue-500 rounded-md bg-gray-700 border-gray-500 checked:bg-blue-500'
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={handleSaveSettings}
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
        >
          Save Calendar Settings
        </button>
      </div>
      <div className='bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-lg space-x-4 mb-8'>
        {userId && (
          <div className='text-sm flex flex-wrap items-center gap-2 text-gray-400'>
            <span>User ID:</span>
            <span className='font-mono text-blue-300 break-all'>{userId}</span>
            <button
              onClick={copyToClipboard}
              className='text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 ml-auto border border-gray-950 shadow-[3px_3px_0px_0px_#030712] transition'
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
      <div className='bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg  space-y-4'>
        <h3 className='text-xl font-semibold text-gray-200 mb-3'>
          Account Actions
        </h3>
        <button
          onClick={() => setShowConfirmSignOutModal(true)}
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
        >
          Sign Out
        </button>
        <button
          onClick={() => setShowConfirmDeleteAccountModal(true)}
          className='w-full px-2 py-1 sm:px-4 sm:py-2 bg-red-800 text-white rounded-md hover:bg-red-900 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
        >
          ⚠️ Clear All Account Data
        </button>
      </div>

      {showConfirmSignOutModal && (
        <Modal onClose={() => setShowConfirmSignOutModal(false)}>
          <h3 className='text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
            Confirm Sign Out
          </h3>
          <p className='text-gray-200 mb-6'>
            Are you sure you want to sign out?
          </p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowConfirmSignOutModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
            >
              Cancel
            </button>
            <button
              onClick={handleSignOut}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors'
            >
              Sign Out
            </button>
          </div>
        </Modal>
      )}

      {showConfirmDeleteAccountModal && (
        <Modal onClose={() => setShowConfirmDeleteAccountModal(false)}>
          <h3 className='text-xl font-bold text-red-400 mb-4 mr-[34px]'>
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
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAllAccountData}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-red-800 text-white rounded-md hover:bg-red-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors'
            >
              Delete All My Data
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Generic Modal Component
const Modal = ({ children, onClose }) => {
  return (
    <div className='fixed inset-0 bg-gray-900 bg-opacity-20 backdrop-blur-lg flex  justify-center px-4 py-10 z-50  '>
      <div className='bg-gray-900 p-3 sm:p-6 rounded-xl  max-w-lg w-full h-fit relative text-gray-100 shadow-[5px_5px_0px_0px_#030712] border border-gray-950  '>
        <button
          onClick={onClose}
          className='absolute top-3 right-3 text-gray-400 hover:text-gray-100 text-2xl font-bold'
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  )
}

// New WorkoutPlanPage Component
const WorkoutPlanPage = ({
  setShowMiniStopwatch,
  setShowMiniCountdown,
  stopwatchTime,
  setStopwatchTime,
  stopwatchIsRunning,
  setStopwatchIsRunning,
  countdownTime,
  setCountdownTime,
  countdownIsRunning,
  setCountdownIsRunning,
  setShowAlarm,
}) => {
  const { db, userId, isAuthReady } = useContext(FirebaseContext)
  const [workoutPlans, setWorkoutPlans] = useState({}) // { 'monday': { exercises: [] }, ... }
  const [editingDay, setEditingDay] = useState(null) // 'monday', 'tuesday', etc. or null
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const appId = 'workout-tracker-app-local' // Consistent app ID

  // Timer functions
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const formatCountdownTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Stopwatch logic
  useEffect(() => {
    let interval
    if (stopwatchIsRunning) {
      interval = setInterval(() => {
        setStopwatchTime((prevTime) => prevTime + 1000) // Update every second
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [stopwatchIsRunning])

  const startStopwatch = () => setStopwatchIsRunning(true)
  const pauseStopwatch = () => setStopwatchIsRunning(false)
  const resetStopwatch = () => {
    setStopwatchTime(0)
    setStopwatchIsRunning(false)
  }

  // Countdown timer logic
  useEffect(() => {
    let interval
    if (countdownIsRunning && countdownTime > 0) {
      interval = setInterval(() => {
        setCountdownTime((prevTime) => prevTime - 1)
      }, 1000)
    } else if (countdownTime === 0 && countdownIsRunning) {
      setCountdownIsRunning(false)
      setMessage('Countdown finished!')
      setMessageType('success')
      setShowAlarm(true)
    }
    return () => clearInterval(interval)
  }, [countdownIsRunning, countdownTime])

  const startCountdown = () => {
    if (countdownTime === '' || countdownTime === null || countdownTime === 0)
      return
    setCountdownIsRunning(true)
    setShowMiniCountdown(true)
  }
  const pauseCountdown = () => setCountdownIsRunning(false)
  const resetCountdown = () => {
    setCountdownTime(0) // Reset to 0, user can set new time
    setCountdownIsRunning(false)
  }

  const setCustomCountdown = (hours, minutes, seconds) => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds
    setCountdownTime(totalSeconds)
    setCountdownIsRunning(false) // Pause when setting new time
  }

  // Fetch workout plans
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return

    const workoutPlansCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/workoutPlans`
    )
    const unsubscribe = onSnapshot(
      workoutPlansCollectionRef,
      (snapshot) => {
        const fetchedPlans = {}
        snapshot.forEach((doc) => {
          fetchedPlans[doc.id] = doc.data()
        })
        setWorkoutPlans(fetchedPlans)
      },
      (error) => {
        console.error('Error fetching workout plans:', error)
        setMessage('Error loading workout plans.')
        setMessageType('error')
      }
    )

    return () => unsubscribe()
  }, [db, userId, isAuthReady, appId])

  const handleSaveWorkoutPlan = async (day, updatedExercises) => {
    if (!db || !userId) return
    const dayDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/workoutPlans`,
      day
    )
    try {
      await setDoc(dayDocRef, { exercises: updatedExercises }, { merge: true })
      setMessage(`Workout plan for ${day} saved successfully!`)
      setMessageType('success')
      setEditingDay(null) // Exit edit mode
    } catch (e) {
      console.error(`Error saving workout plan for ${day}:`, e)
      setMessage(`Failed to save workout plan for ${day}.`)
      setMessageType('error')
    }
  }

  const daysOfWeek = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 p-3 rounded-xl  text-gray-100'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6'>
        💪 Workout Plans & Timers
      </h2>

      {message && (
        <div
          className={`p-3 mb-4 rounded-md text-center ${
            messageType === 'success'
              ? 'bg-green-800 text-green-200'
              : 'bg-red-800 text-red-200'
          }`}
        >
          {message}
        </div>
      )}

      {/* Timers Section */}
      <div className='mb-8 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-lg '>
        <h3 className='sm:text-xl md:text-2xl text-lg font-semibold text-gray-200 mb-3'>
          Timers
        </h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Stopwatch */}
          <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-md  cursor-pointer hover:bg-gray-700 transition-colors'>
            <h4 className='text-lg font-semibold text-blue-300 mb-2'>
              Stopwatch
            </h4>
            <div className='text-3xl font-bold mb-3'>
              {formatTime(stopwatchTime)}
            </div>
            <div className='flex space-x-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMiniStopwatch(true)
                  stopwatchIsRunning ? pauseStopwatch() : startStopwatch()
                }}
                className={`px-3 py-1 rounded-md shadow-[3px_3px_0px_0px_#030712] border border-gray-950 ${
                  stopwatchIsRunning
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white transition-colors`}
              >
                {stopwatchIsRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMiniStopwatch(false)
                  resetStopwatch()
                }}
                className='px-3 py-1 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors'
              >
                Reset
              </button>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-md  cursor-pointer hover:bg-gray-700 transition-colors'>
            <h4 className='text-lg font-semibold text-blue-300 mb-2'>
              Countdown Timer
            </h4>
            <div className='text-3xl font-bold mb-3'>
              {formatCountdownTime(countdownTime)}
            </div>
            <div className='flex flex-wrap gap-2 mb-3'>
              <input
                type='number'
                placeholder='H'
                min='0'
                className='w-16 p-1 bg-gray-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md text-gray-100'
                onChange={(e) =>
                  setCustomCountdown(
                    parseInt(e.target.value) || 0,
                    Math.floor((countdownTime % 3600) / 60),
                    countdownTime % 60
                  )
                }
              />
              <input
                type='number'
                placeholder='M'
                min='0'
                max='59'
                className='w-16 p-1 bg-gray-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md text-gray-100'
                onChange={(e) =>
                  setCustomCountdown(
                    Math.floor(countdownTime / 3600),
                    parseInt(e.target.value) || 0,
                    countdownTime % 60
                  )
                }
              />
              <input
                type='number'
                placeholder='S'
                min='0'
                max='59'
                className='w-16 p-1 bg-gray-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md text-gray-100'
                onChange={(e) =>
                  setCustomCountdown(
                    Math.floor(countdownTime / 3600),
                    Math.floor((countdownTime % 3600) / 60),
                    parseInt(e.target.value) || 0
                  )
                }
              />
            </div>
            <div className='flex space-x-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  countdownIsRunning ? pauseCountdown() : startCountdown()
                }}
                className={`px-3 py-1 rounded-md shadow-[3px_3px_0px_0px_#030712] border border-gray-950 ${
                  countdownIsRunning
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white transition-colors`}
              >
                {countdownIsRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  resetCountdown()
                  setShowMiniCountdown(false)
                }}
                className='px-3 py-1 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors'
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workout Plans Section */}
      <div className='mb-6 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-lg '>
        <h3 className='sm:text-xl md:text-2xl text-lg font-semibold text-gray-200 mb-3'>
          Workout Plan
        </h3>
        {daysOfWeek.map((day) => (
          <WorkoutDayCard
            key={day}
            dayName={day}
            exercises={workoutPlans[day]?.exercises || []}
            isEditing={editingDay === day}
            onEditToggle={() => setEditingDay(editingDay === day ? null : day)}
            onSave={handleSaveWorkoutPlan}
          />
        ))}
      </div>
    </div>
  )
}

// Floating Timer Component
const FloatingTimer = ({
  type,
  time,
  reset,
  isRunning,
  setIsRunning,
  setShowMini,
}) => {
  const formatTimeDisplay = (msOrSeconds) => {
    let totalSeconds
    if (type === 'stopwatch') {
      totalSeconds = Math.floor(msOrSeconds / 1000)
    } else {
      // countdown
      totalSeconds = msOrSeconds
    }
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  const [position, setPosition] = useState(
    type === 'stopwatch'
      ? { bottom: '30px', right: '20px' }
      : { bottom: '100px', right: '20px' }
  )

  const [dragging, setDragging] = useState(false)
  const timerRef = useRef(null)
  useEffect(() => {
    function MousePosition(e) {
      const Width = window.innerWidth
      const Height = window.innerHeight
      const { height, width } = timerRef.current.getBoundingClientRect()
      let Top = `${e.y}px`
      let Left = `${e.x}px`

      if (e.y <= 25) {
        Top = '25px'
      }
      if (e.y > Height - height / 2) {
        Top = `${Height - height / 2}px`
      }
      if (e.x <= 25) {
        Left = '25px'
      }
      if (e.x > Width - (width - 10)) {
        Left = `${Width - (width - 10)}px`
      }
      setPosition({ top: Top, left: Left })
    }
    if (dragging) {
      window.addEventListener('mousemove', MousePosition)
    }

    return () => {
      window.removeEventListener('mousemove', MousePosition)
    }
  }, [dragging])
  return (
    <div
      ref={timerRef}
      className='fixed bg-gray-900 border border-blue-500 rounded-lg p-3 shadow-xl cursor-pointer z-50 flex items-center space-x-2 -translate-x-[21px] -translate-y-[25px] w-fit h-fit '
      style={position}
    >
      <button
        className='flex items-center justify-center cursor-move scale-125'
        onMouseDown={() => {
          setDragging(true)
        }}
        onMouseUp={() => {
          setDragging(false)
        }}
        onTouchStart={() => {
          setDragging(true)
        }}
        onTouchEnd={() => {
          setDragging(false)
        }}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='16'
          height='24'
          viewBox='0 0 16 24'
          className='fill-gray-300 pointer-events-auto'
        >
          {[0, 6, 12].map((y) => (
            <g key={y}>
              <rect x='3' y={y + 4} width='3' height='3' rx='0.5' />
              <rect x='9' y={y + 4} width='3' height='3' rx='0.5' />
            </g>
          ))}
        </svg>
      </button>
      <span className='text-blue-400 text-sm font-bold'>
        {type === 'stopwatch' ? '⏱️' : '⏳'}
      </span>
      <span className='text-gray-100 text-sm font-mono'>
        {formatTimeDisplay(time)}
      </span>
      <button
        onClick={() => setIsRunning(!isRunning)}
        className={`text-xs ${isRunning ? 'text-green-400' : 'text-red-400'}`}
      >
        {isRunning ? 'RUNNING' : 'PAUSED'}
      </button>
      <button
        className='text-sm text-gray-100 flex items-center justify-center w-[15px] h-[15px] bg-red-800 rounded-full p-1 lg:pt-0.5'
        onClick={() => {
          reset(0)
          setIsRunning(false)
          setShowMini(false)
        }}
      >
        &times;
      </button>
    </div>
  )
}

// WorkoutDayCard Component
const WorkoutDayCard = ({
  dayName,
  exercises,
  isEditing,
  onEditToggle,
  onSave,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [editableExercises, setEditableExercises] = useState([])
  const [message, setMessage] = useState('') // Local message for this component
  const [messageType, setMessageType] = useState('')

  useEffect(() => {
    // When entering edit mode, copy current exercises to editable state
    if (isEditing) {
      setEditableExercises(JSON.parse(JSON.stringify(exercises))) // Deep copy
      setMessage('') // Clear messages on entering edit mode
    }
  }, [isEditing, exercises])

  const handleAddExercise = () => {
    // Ensure new exercise has a unique ID and a default empty set
    setEditableExercises((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: '',
        sets: [{ reps: '', weight: '', restTime: '', rpe: '' }],
      },
    ])
  }

  const handleUpdateExercise = (exIndex, field, value) => {
    const updated = [...editableExercises]
    updated[exIndex][field] = value
    setEditableExercises(updated)
  }

  const handleDeleteExercise = (exIndex) => {
    setEditableExercises((prev) => prev.filter((_, i) => i !== exIndex))
  }

  const handleAddSet = (exIndex) => {
    const updated = [...editableExercises]
    updated[exIndex].sets.push({ reps: '', weight: '', restTime: '', rpe: '' })
    setEditableExercises(updated)
  }

  const handleUpdateSet = (exIndex, setIndex, field, value) => {
    const updated = [...editableExercises]
    updated[exIndex].sets[setIndex][field] = value
    setEditableExercises(updated)
  }

  const handleDeleteSet = (exIndex, setIndex) => {
    const updated = [...editableExercises]
    updated[exIndex].sets = updated[exIndex].sets.filter(
      (_, i) => i !== setIndex
    )
    if (updated[exIndex].sets.length === 0) {
      // If no sets left, ensure at least one empty set is present
      updated[exIndex].sets.push({
        reps: '',
        weight: '',
        restTime: '',
        rpe: '',
      })
    }
    setEditableExercises(updated)
  }

  const handleSaveClick = () => {
    // Validate exercise names before saving
    const hasEmptyName = editableExercises.some((ex) => ex.name.trim() === '')
    if (hasEmptyName) {
      setMessage('All exercises must have a name before saving.')
      setMessageType('error')
      return
    }
    // If validation passes, proceed with saving
    onSave(dayName, editableExercises)
    setMessage('') // Clear message on successful save
  }

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg s mb-3'>
      <div
        className='flex justify-between items-center cursor-pointer'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h4 className='sm:text-base md:text-xl text-sm font-semibold text-blue-300 capitalize'>
          {dayName} Workout
        </h4>
        <span className='text-gray-400 text-xl sm:text-2xl'>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {isExpanded && (
        <div className='mt-4'>
          {message && (
            <div
              className={`p-3 mb-4 rounded-md text-center ${
                messageType === 'success'
                  ? 'bg-green-800 text-green-200'
                  : 'bg-red-800 text-red-200'
              }`}
            >
              {message}
            </div>
          )}
          <div className='overflow-x-auto rounded-md shadow-[5px_5px_0px_0px_#030712] border border-gray-950 text-nowrap'>
            <table className='min-w-full bg-gray-900  md:text-base sm:text-sm text-xs'>
              <thead>
                <tr className='bg-gray-950 text-gray-300 uppercase leading-normal md:text-base sm:text-sm text-xs '>
                  <th className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                    Exercise Name
                  </th>
                  <th className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                    Sets
                  </th>
                  <th className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                    Reps
                  </th>
                  <th className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                    Weight (kg)
                  </th>
                  <th className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                    Rest Time
                  </th>
                  <th className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>RPE</th>
                  {isEditing && (
                    <th className='sm:py-3 sm:px-6 py-1.5 px-2 text-center'>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className='text-gray-200  font-light md:text-base sm:text-sm text-xs'>
                {(isEditing ? editableExercises : exercises).map(
                  (exercise, exIndex) => (
                    <React.Fragment key={exercise.id || exIndex}>
                      <tr className='border-b border-gray-700 last:border-b-0'>
                        <td className='sm:py-3 sm:px-6 py-1.5 px-2 text-left font-semibold'>
                          {isEditing ? (
                            <input
                              type='text'
                              value={exercise.name}
                              onChange={(e) =>
                                handleUpdateExercise(
                                  exIndex,
                                  'name',
                                  e.target.value
                                )
                              }
                              className='w-full bg-gray-800 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md sm:p-2 p-1 text-gray-100'
                              placeholder='Exercise Name'
                            />
                          ) : (
                            exercise.name
                          )}
                        </td>
                        <td className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                          {exercise.sets.length}
                        </td>
                        <td className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                          -
                        </td>
                        {/* Reps for exercise row is N/A */}
                        <td className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                          -
                        </td>
                        {/* Weight for exercise row is N/A */}
                        <td className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                          -
                        </td>
                        {/* Rest Time for exercise row is N/A */}
                        <td className='sm:py-3 sm:px-6 py-1.5 px-2 text-left'>
                          -
                        </td>
                        {/* RPE for exercise row is N/A */}
                        {isEditing && (
                          <td className='sm:py-3 sm:px-6 py-1.5 px-2 text-center'>
                            <button
                              onClick={() => handleDeleteExercise(exIndex)}
                              className='bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1 rounded-md text-xs shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                      {exercise.sets.map((set, setIndex) => (
                        <tr
                          key={setIndex}
                          className='bg-gray-800 border-b border-gray-700 last:border-b-0'
                        >
                          <td className='sm:py-2 sm:px-6 py-1 px-3 text-left italic'>
                            Set {setIndex + 1}
                          </td>
                          <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                            -
                          </td>
                          <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                            {isEditing ? (
                              <input
                                type='number'
                                placeholder='Reps'
                                value={set.reps}
                                onChange={(e) =>
                                  handleUpdateSet(
                                    exIndex,
                                    setIndex,
                                    'reps',
                                    e.target.value
                                  )
                                }
                                className='w-20 bg-gray-800 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md p-1 text-gray-100'
                              />
                            ) : (
                              set.reps
                            )}
                          </td>
                          <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                            {isEditing ? (
                              <input
                                type='number'
                                placeholder='Weight (kg)'
                                step='0.1'
                                value={set.weight}
                                onChange={(e) =>
                                  handleUpdateSet(
                                    exIndex,
                                    setIndex,
                                    'weight',
                                    e.target.value
                                  )
                                }
                                className='w-20 bg-gray-800 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md p-1 text-gray-100'
                              />
                            ) : (
                              set.weight
                            )}
                          </td>
                          <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                            {isEditing ? (
                              <input
                                type='text'
                                placeholder='Rest Time'
                                value={set.restTime}
                                onChange={(e) =>
                                  handleUpdateSet(
                                    exIndex,
                                    setIndex,
                                    'restTime',
                                    e.target.value
                                  )
                                }
                                className='w-20 bg-gray-800 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md p-1 text-gray-100'
                              />
                            ) : (
                              set.restTime
                            )}
                          </td>
                          <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                            {isEditing ? (
                              <input
                                type='number'
                                placeholder='RPE (1-10)'
                                min='1'
                                max='10'
                                value={set.rpe}
                                onChange={(e) =>
                                  handleUpdateSet(
                                    exIndex,
                                    setIndex,
                                    'rpe',
                                    e.target.value
                                  )
                                }
                                className='w-20 bg-gray-800 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md p-1 text-gray-100'
                              />
                            ) : (
                              set.rpe
                            )}
                          </td>
                          {isEditing && (
                            <td className='sm:py-2 sm:px-6 py-1 px-3 text-center'>
                              <button
                                onClick={() =>
                                  handleDeleteSet(exIndex, setIndex)
                                }
                                className='bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded-md text-xs shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {isEditing && (
                        <tr className='bg-gray-800'>
                          <td
                            colSpan='7'
                            className='sm:py-2 sm:px-6 py-1 px-3 text-center'
                          >
                            <button
                              onClick={() => handleAddSet(exIndex)}
                              className='bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-xs shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
                            >
                              + Add Set
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className='mt-4 flex justify-end space-x-3'>
            {isEditing ? (
              <>
                <button
                  onClick={handleAddExercise}
                  className='sm:px-4 sm:py-2 px-2 py-1 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
                >
                  ➕ Add Exercise
                </button>
                <button
                  onClick={handleSaveClick} // Use the new handler for validation
                  className='sm:px-4 sm:py-2 px-2 py-1 text-sm sm:text-base bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
                >
                  Save Plan
                </button>
              </>
            ) : (
              <button
                onClick={onEditToggle}
                className='sm:px-4 sm:py-2 px-2 py-1 text-sm sm:text-base bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
              >
                ✏️ Edit Plan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
