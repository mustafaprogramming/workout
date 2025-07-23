import MeasurementData from '../components/MeasurementData'
import { useFirebase } from '../context/FirebaseContext'
import { useState, useEffect } from 'react'
import { onSnapshot, collection  } from 'firebase/firestore'

export default function StatisticsPage () {
  const { db, userId, isAuthReady } = useFirebase()
  const [workoutStats, setWorkoutStats] = useState({}) // { year: { workoutDays, restDays } }
  const [measurements, setMeasurements] = useState([]) // Array of all measurements for display
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'

  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId = import.meta.env.VITE_FIREBASE_APP_ID||'workout-tracker-app-local' // Or any unique string for your local app
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
      'bicep',
      'hips',
      'quads',
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
          role="status"
          aria-live="polite"
          className={`p-3 mb-4 rounded-md text-center ${
            messageType === 'success'
              ? 'bg-green-800 text-green-200'
              : 'bg-red-800 text-red-200'
          }`}
        >
          {message}
        </div>
      )}

      <section className='mb-8 bg-gray-900 border border-gray-950 shadow-[5px_5px_0px_0px_#030712] sm:p-4 p-2.5 rounded-lg '>
        <h3 className='sm:text-xl text-lg font-semibold text-gray-200 sm:mb-3 mb-1.5'>
          Yearly Workout Summary
        </h3>
        {sortedYears.length === 0 ? (
          <p className='text-gray-400'>No workout data available yet.</p>
        ) : (
          <div className='sm:space-y-3 space-y-1.5' role="list">
            {sortedYears.map((year) => (
              <div
                key={year}
                className='bg-gray-800 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 p-2 sm:p-3 rounded-md'
                role="listitem"
                aria-label={`Workout summary for year ${year}`}
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
      </section>

      <section className='mb-6'>
        <h3 className='text-xl font-semibold text-gray-200 mb-3 '>
          Measurement History
        </h3>
        {measurements.length === 0 ? (
          <p className='text-gray-400'>No measurements recorded yet.</p>
        ) : (
          <div className='space-y-4' role="list">
            {measurements.map((m) => (
              <MeasurementData key={m.id} m={m} role="listitem" />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
