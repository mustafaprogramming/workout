import MeasurementData from '../components/MeasurementData'
import { useFirebase } from '../context/FirebaseContext'
import { useState, useEffect } from 'react'
import { onSnapshot, collection } from 'firebase/firestore'
import { useMessage } from '../context/MessageContext'
import { useNavigation } from '../context/NavigationContext'
import { ROUTES } from '../route'
import { GrGallery } from 'react-icons/gr'
import { useMemo } from 'react'

export default function StatisticsPage() {
  const { db, userId, isAuthReady } = useFirebase()
  const { setCurrentPage } = useNavigation()
  // --- UPDATED: workoutStats will now only track workoutDays ---
  const [workoutStats, setWorkoutStats] = useState({}) // { year: { workoutDays } }
  // --- END UPDATED ---
  const [measurements, setMeasurements] = useState([]) // Array of all measurements for display
  const { setMessage, setMessageType } = useMessage()
  const [searchTerm, setSearchTerm] = useState('')

  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local' // Or any unique string for your local app
  // Helper to check if measurement data is effectively empty
  const isEmptyMeasurementData = (data) => {
    if (!data) return true // No data at all means empty

    // Check numerical fields
    const numericFields = [
      'weight',
      'bodyFat',
      'chest',
      'waist',
      'shoulders',
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
            // --- UPDATED: Initialize only workoutDays ---
            yearlyStats[year] = { workoutDays: 0 }
          }

          if (dayType === 'workout' && hasWorkoutLogged) {
            yearlyStats[year].workoutDays++
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
  const searchedMeasurements = useMemo(() => {
    let filtered = measurements
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter((measurement) =>
        measurement.date.includes(lowerCaseSearchTerm)
      )
    }
    return filtered
  }, [measurements, searchTerm])
  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 xs:p-3 p-2 rounded-xl  text-gray-100'>
      <h2 className=' sm:text-2xl text-xl font-bold text-blue-400 mb-6 mt-2'>
        📊 Statistics & Progress
      </h2>
      {/* gallery button */}
      <button
        onClick={() => setCurrentPage(ROUTES.galleryPage)}
        className='px-6 py-3 w-full bg-gray-900 text-gray-100 rounded-lg hover:bg-gray-700  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 mb-6 text-center flex gap-2 items-center justify-center'
        aria-label='Back to calendar page'
      >
        <GrGallery /> Visit Gallery
      </button>
      <section className='mb-8 bg-gray-900 border border-gray-950 shadow-[5px_5px_0px_0px_#030712] sm:p-4 p-2.5 rounded-lg '>
        <h3 className='sm:text-xl text-lg font-semibold text-gray-200 sm:mb-3 mb-1.5'>
          Yearly Workout Summary
        </h3>
        {sortedYears.length === 0 ? (
          <p className='text-gray-400'>No workout data available yet.</p>
        ) : (
          <div className='sm:space-y-3 space-y-1.5' role='list'>
            <div className='sm:text-sm text-xs px-2 sm:px-3 rounded-md flex gap-2 justify-between items-center italic text-gray-400'>
              <p className=''>Year</p>
              <span className=''>No of days worked out</span>
            </div>
            {sortedYears.map((year) => (
              <div
                key={year}
                className='bg-gray-800 shadow-[4px_4px_0px_0px_rgb(3, 7, 18)] border border-gray-950 p-2 sm:p-3 rounded-md flex gap-2 justify-between items-center'
                role='listitem'
                aria-label={`Workout summary for year ${year}`}
              >
                <p className='text-lg font-bold text-blue-300 flex gap-2'>
                  {year}
                </p>
                <span className='font-bold text-green-400'>
                  {workoutStats[year].workoutDays}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className='flex flex-col gap-0.5 sm:gap-1 p-2 my-2 sm:p-4 sm:my-4 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 rounded-md'>
        <h3 className='text-base sm:text-lg font-semibold text-gray-200 mb-3'>
          Search Measurement using Date
        </h3>
        <input
          type={'date'}
          placeholder={'Select a date'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='flex-grow p-1 px-2 sm:p-2 bg-gray-700 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 w-full text-sm  '
          aria-label={`Enter Date to Search Measuremnet`}
        />
      </div>
      <section className='mb-6 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-[2px] pt-2 sm:pt-4 rounded-lg '>
        <h3 className='sm:text-xl md:text-2xl text-lg font-semibold text-gray-200 mb-3 px-2 sm:px-4'>
          Measurement History
        </h3>

        {searchedMeasurements.length === 0 && searchTerm === '' && (
          <p className='text-gray-300 bg-gray-700 shadow-[5px_5px_0px_0px_#030712] h-[40vh] xs:h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] items-center border border-gray-950 p-1.5 xs:p-2 sm:p-4 flex justify-center  rounded-md m-1 text-sm sm:text-base'>
            No measurements recorded yet.
          </p>
        )}
        {searchedMeasurements.length === 0 && searchTerm !== '' && (
          <p className='text-gray-300 bg-gray-700 shadow-[5px_5px_0px_0px_#030712] h-[40vh] xs:h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] items-center border border-gray-950 p-1.5 xs:p-2 sm:p-4 flex justify-center  rounded-md m-1 text-sm sm:text-base'>
            No images match your search term "{searchTerm}".
          </p>
        )}
        {searchedMeasurements.length > 0 && (
          <div
            className='space-y-2 sm:space-y-4 h-[40vh] xs:h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-y-auto bg-gray-700 border border-gray-950 p-1 xs:p-2 sm:p-4  rounded-md  '
            role='list'
          >
            {searchedMeasurements.map((m) => (
              <MeasurementData key={m.id} m={m} role='listitem' />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
