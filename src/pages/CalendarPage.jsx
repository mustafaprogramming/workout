import { useFirebase } from '../context/FirebaseContext'
import { useState, useEffect } from 'react'
import { formatDate } from '../util/utils'
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore'
import DayActionsModal from '../components/DayActionsModal'
import { useNavigation } from '../context/NavigationContext'
import { ROUTES } from '../route'
import { useMessage } from '../context/MessageContext'
import { FaBackward, FaBan, FaBed, FaCheck, FaForward, FaHourglassHalf, FaSearch, FaTimes } from 'react-icons/fa'

export default function CalendarPage({ setSelectedDate }) {
  const { db, userId, isAuthReady, userCreatedAt } = useFirebase()
  const { setCurrentPage } = useNavigation()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState({}) // { 'YYYY-MM-DD': { type: 'workout' | 'rest', exercises: [] } }
  const [settings, setSettings] = useState({
    workoutDaysOfWeek: [1, 2, 3, 4, 5], // Monday=1, Sunday=0
    restDaysOfWeek: [0, 6], // Sunday=0, Saturday=6
  })
  const { setMessage, setMessageType } = useMessage()
  const [showDayActionsModal, setShowDayActionsModal] = useState(false)
  const [selectedDayData, setSelectedDayData] = useState(null) // Data for the day clicked to open modal
  const [searchDate, setSearchDate] = useState('')
  const [highlightedDate, setHighlightedDate] = useState(null) // YYYY-MM-DD string for highlighting

  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

  useEffect(() => {
    if (!db || !userId || !isAuthReady) return

    // Fetch general settings (including calendar preferences)
    const userSettingsDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/userSettings`,
      'settings' // Path to the general settings document
    )
    const unsubscribeSettings = onSnapshot(
      userSettingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const fetchedSettings = docSnap.data();
          setSettings({
            workoutDaysOfWeek: fetchedSettings.workoutDaysOfWeek || [1, 2, 3, 4, 5],
            restDaysOfWeek: fetchedSettings.restDaysOfWeek || [0, 6],
            // Other settings like popUpTime, lockProtectionEnabled are handled by FirebaseContext/SettingsPage
          });
        } else {
          // --- OPTIMIZATION: Do NOT set default settings here. ---
          // SettingsPage is responsible for creating the default 'settings' document.
          // If it doesn't exist, CalendarPage will simply use its initial useState defaults.
          console.log('CalendarPage: Settings document not found for user. Using local defaults.');
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
  }, [db, userId, isAuthReady, appId]) // Removed 'settings' from dependencies as it's set by Firestore

  const daysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay() // 0 for Sunday, 1 for Monday

  const getDayTypeFromSettings = (date) => {
    const dayOfWeek = date.getDay() // 0 for Sunday, 1 for Monday
    if (settings.workoutDaysOfWeek.includes(dayOfWeek)) {
      return 'workout'
    }
    if (settings.restDaysOfWeek.includes(dayOfWeek)) {
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
        <div
          key={`empty-${i}`}
          className='sm:p-2 p-1 text-center'
          aria-hidden='true'
        ></div>
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
      let ariaDescription = `${date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}.`

      const isFutureDate = date > today
      const isBeforeAccountCreation =
        userCreatedDateNormalized && date < userCreatedDateNormalized
      const isToday = date.toDateString() === today.toDateString()
      const isHighlighted = highlightedDate === dateKey

      let isDisabled = false

      if (isFutureDate || isBeforeAccountCreation) {
        bgColor = 'bg-gray-900'
        borderColor = 'border-gray-950'
        textColor = 'text-gray-600'
        isDisabled = true
        if (isFutureDate) {
          statusEmoji = <FaHourglassHalf className='text-yellow-300'	/>
          ariaDescription += ' This is a future date, no actions available.'
        } else {
          statusEmoji = <FaBan	className='text-red-300' />
          ariaDescription +=
            ' This date is before your account creation, no actions available.'
        }
      } else {
        if (effectiveType === 'workout') {
          if (hasWorkoutLogged) {
            bgColor = 'bg-green-700'
            borderColor = 'border-green-600'
            statusEmoji = <FaCheck className='text-green-300' />
            ariaDescription += ' Workout day, workout logged.'
          } else {
            bgColor = 'bg-red-700'
            borderColor = 'border-red-600'
            statusEmoji = <FaTimes className='text-red-300' />
            ariaDescription += ' Workout day, no workout logged.'
          }
        } else if (effectiveType === 'rest') {
          bgColor = 'bg-yellow-700'
          borderColor = 'border-yellow-600'
          statusEmoji = <FaBed className='text-white' />

          ariaDescription += ' Rest day.'
        }
      }

      days.push(
        <button
          key={day}
          className={`relative sm:p-3 p-1.5 border rounded-lg sm:shadow-[5px_5px_0px_0px_#030712] shadow-[2px_2px_0px_0px_#030712] hover:shadow-[0px_0px_0px_0px_#030712] flex flex-col items-center justify-center transition-all duration-200
            ${bgColor} ${borderColor} ${
            isDisabled
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
          }
            ${isToday ? 'ring-2 ring-blue-400' : ''}
            ${isHighlighted ? 'ring-4 ring-blue-500' : ''}
          `}
          onClick={() => handleDayClick(day)}
          aria-label={ariaDescription}
          aria-disabled={isDisabled}
          aria-current={isToday ? 'date' : undefined}
          tabIndex={isDisabled ? -1 : 0}
        >
          <span className={`sm:text-lg font-bold ${textColor}`}>{day}</span>
          <span className='text-sm sm:mt-1' aria-hidden='true'>
            {statusEmoji}
          </span>
        </button>
      )
    }
    return days
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 xs:p-3 p-2  rounded-xl  text-gray-100'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6 mt-2'>
        📅 Workout Calendar
      </h2>

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
          className='px-2 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[3px_3px_0px_0px_#030712] flex items-center justify-center gap-1 font-semibold border border-gray-950'
          aria-label={`Go to previous month, ${new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() - 1,
            1
          ).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
        >
          <FaBackward/> Prev
        </button>
        <h3
          className='md:text-xl sm:text-lg font-semibold text-gray-200'
          aria-live='polite'
          aria-atomic='true'
        >
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
          className='px-2 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[3px_3px_0px_0px_#030712] flex items-center justify-center gap-1 font-semibold border border-gray-950'
          aria-label={`Go to next month, ${new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            1
          ).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
        >
          Next <FaForward/>
        </button>
      </div>

      <div className='mb-6 flex gap-3'>
        <label htmlFor='search-date-input' className='sr-only'>
          Search for a specific date
        </label>
        <input
          id='search-date-input'
          type='date'
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className='flex-grow flex-1 p-1.5 sm:p-3 bg-gray-900 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
          aria-label='Select a date to search'
        />
        <button
          onClick={handleSearchDate}
          className='sm:px-4 px-2 py-1.5 sm:py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 text-xs sm:text-sm md:text-base flex items-center justify-center gap-1 font-semibold'
          aria-label='Go to selected date'
        >
          <FaSearch /> Go to Date
        </button>
      </div>

      <div
        className='grid grid-cols-7 sm:gap-3 gap-1 sm:mb-4 mb-2'
        role='rowgroup'
      >
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className='sm:text-base text-sm font-semibold text-center text-gray-400'
            role='columnheader'
            aria-label={`Day of week: ${day}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className='grid grid-cols-7 sm:gap-3 gap-1' role='grid'>
        {renderDays()}
      </div>

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
            setCurrentPage(ROUTES.workoutLog)
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
