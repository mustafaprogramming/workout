import MeasurementModal from '../components/MeasurementModal'
import { useFirebase } from '../context/FirebaseContext'
import { useState, useEffect } from 'react'
import { formatDate } from '../util/utils'
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore'
import { deleteCloudinaryImage } from '../util/cloudinaryUtils' // Import deleteCloudinaryImage
import { useMessage } from '../context/MessageContext'

export default function MeasurementsPage({ selectedMonth, setSelectedMonth }) {
  const { db, userId, isAuthReady } = useFirebase()
  const [measurements, setMeasurements] = useState({})
  const [showMeasurementModal, setShowMeasurementModal] = useState(false)
  const [currentMonthData, setCurrentMonthData] = useState(null)
  const { setMessage, setMessageType } = useMessage()
  const [searchYear, setSearchYear] = useState(new Date().getFullYear())
  const [searchMonth, setSearchMonth] = useState(new Date().getMonth() + 1)
  const [highlightedMonth, setHighlightedMonth] = useState(null)

  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

  const isEmptyMeasurementData = (data) => {
    if (!data) return true

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
      return (
        value !== '' &&
        value !== null &&
        value !== undefined &&
        (typeof value === 'number' ? value !== 0 : true)
      )
    })

    const hasNotes = data.notes && data.notes.trim() !== ''

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
    const date = new Date(selectedMonth.getFullYear(), monthIndex, 1)
    const today = new Date()
    today.setDate(1)
    today.setHours(0, 0, 0, 0)

    if (date > today) {
      return
    }

    const dateKey = formatDate(date)

    setCurrentMonthData(
      measurements[dateKey] || {
        date: dateKey,
        weight: '',
        bodyFat: '',
        chest: '',
        waist: '',
        neck: '',
        forearms: '',
        bicep: '',
        hips: '',
        quads: '',
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
    setHighlightedMonth(formatDate(newDate))
    setTimeout(() => {
      setHighlightedMonth(null)
    }, 10000)
  }

  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(0, i).toLocaleString('default', { month: 'long' })
  )

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 xs:p-3 p-2 rounded-xl  text-gray-100'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6 mt-2'>
        📏 Monthly Measurements
      </h2>

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
          aria-label={`Go to previous year, ${selectedMonth.getFullYear() - 1}`}
        >
          Prev
        </button>
        <h3
          className='text-xl font-semibold text-gray-200 '
          aria-live='polite'
          aria-atomic='true'
        >
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
          aria-label={`Go to next year, ${selectedMonth.getFullYear() + 1}`}
        >
          Next
        </button>
      </div>

      <div className='mb-6 flex flex-col sm:flex-row gap-3'>
        <label htmlFor='search-year-input' className='sr-only'>
          Search Year
        </label>
        <input
          id='search-year-input'
          type='number'
          placeholder='Year'
          value={searchYear}
          onChange={(e) => setSearchYear(parseInt(e.target.value) || '')}
          className='p-1.5 sm:p-3 bg-gray-900 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-grow'
          aria-label='Enter year to search'
        />
        <label htmlFor='search-month-select' className='sr-only'>
          Search Month
        </label>
        <select
          id='search-month-select'
          value={searchMonth}
          onChange={(e) => setSearchMonth(parseInt(e.target.value))}
          className='p-1.5 sm:p-3 bg-gray-900 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-grow'
          aria-label='Select month to search'
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
          aria-label='Go to selected month and year'
        >
          🔍 Go to Month
        </button>
      </div>

      <div
        className='grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4'
        role='grid'
      >
        {months.map((monthName, index) => {
          const monthDate = new Date(selectedMonth.getFullYear(), index, 1)
          const monthKey = formatDate(monthDate)
          const hasMeaningfulMeasurements = !isEmptyMeasurementData(
            measurements[monthKey]
          )
          const today = new Date()
          today.setDate(1)
          today.setHours(0, 0, 0, 0)
          const isFutureMonth = monthDate > today
          const isHighlighted = highlightedMonth === monthKey
          const isCurrentMonthInView =
            monthDate.getFullYear() === selectedMonth.getFullYear() &&
            monthDate.getMonth() === selectedMonth.getMonth()

          let ariaDescription = `${monthName} ${selectedMonth.getFullYear()}.`
          let isDisabled = false

          if (isFutureMonth) {
            ariaDescription += ` This is a future month, no measurements can be added.`
            isDisabled = true
          } else if (hasMeaningfulMeasurements) {
            ariaDescription += ` Measurements logged.`
          } else {
            ariaDescription += ` No measurements logged.`
          }

          return (
            <button
              key={monthName}
              className={`p-1 sm:p-2 md:p-4 rounded-lg flex flex-col items-center justify-center transition-all duration-200 shadow-[3px_3px_0px_0px_#030712] xs:shadow-[5px_5px_0px_0px_#030712] border border-gray-950 hover:shadow-[0px_0px_0px_0px_#030712] hover:scale-105
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
              aria-label={ariaDescription}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              aria-current={isCurrentMonthInView ? 'date' : undefined}
            >
              <span className='text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-100'>
                {monthName}
              </span>
              <span className='text-sm mt-1' aria-hidden='true'>
                {hasMeaningfulMeasurements ? '✅ Logged' : '➕ Add'}
              </span>
            </button>
          )
        })}
      </div>

      {showMeasurementModal && (
        <MeasurementModal
          monthData={currentMonthData}
          onClose={() => setShowMeasurementModal(false)}
          onSave={(data) => {
            const dateKey = formatDate(new Date(data.date))
            let savedLocally = false

            const fallbackTimeout = setTimeout(() => {
              if (!savedLocally) {
                setShowMeasurementModal(false)
                setMessage('Saved offline! Will sync later.')
                setMessageType('success')
              }
            }, 5000)

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
                savedLocally = true
                clearTimeout(fallbackTimeout)
                setShowMeasurementModal(false)
                setMessage('Measurement saved successfully!')
                setMessageType('success')
              })
              .catch((e) => {
                clearTimeout(fallbackTimeout)
                console.error('Error saving measurement:', e)
                setMessage('Failed to save measurement.')
                setMessageType('error')
              })
          }}
          Clearable={!isEmptyMeasurementData(currentMonthData)}
          onClearData={async (dateKey) => {
            let savedLocally = false

            const fallbackTimeout = setTimeout(() => {
              if (!savedLocally) {
                setShowMeasurementModal(false)
                setMessage('Saved offline! Will sync later.')
                setMessageType('success')
              }
            }, 5000)

            // --- NEW: Delete associated Cloudinary images for this month ---
            const dataToClear = measurements[dateKey]
            if (
              dataToClear &&
              dataToClear.imageUrls &&
              dataToClear.imageUrls.length > 0
            ) {
              const deletePromises = dataToClear.imageUrls.map(async (img) => {
                if (img.public_id) {
                  try {
                    await deleteCloudinaryImage(img.public_id)
                  } catch (e) {
                    console.error(
                      `Error deleting Cloudinary image:`,
                      e
                    )
                    // Continue even if one image fails to delete
                  }
                }
              })
              await Promise.all(deletePromises) // Wait for all deletions to attempt
            }
            // --- END NEW ---

            setDoc(
              doc(
                db,
                `artifacts/${appId}/users/${userId}/measurements`,
                dateKey
              ),
              {
                date: dateKey,
                weight: '',
                bodyFat: '',
                chest: '',
                waist: '',
                neck: '',
                forearms: '',
                bicep: '',
                hips: '',
                quads: '',
                calves: '',
                notes: '',
                imageUrls: [],
              },
              { merge: false }
            )
              .then(() => {
                savedLocally = true
                clearTimeout(fallbackTimeout)
                setMessage('Measurement data cleared successfully!')
                setMessageType('success')
                setShowMeasurementModal(false)
              })
              .catch((e) => {
                clearTimeout(fallbackTimeout)
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
