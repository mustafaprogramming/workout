import WorkoutPlanCard from '../components/WorkoutPlanCard' // Renamed import
import { useFirebase } from '../context/FirebaseContext'
import { useState, useEffect } from 'react'
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc, // Import addDoc for adding new plans
  deleteDoc, // Import deleteDoc for deleting plans
} from 'firebase/firestore'
import { useTimer } from '../context/TimerContext'
import { formatTime, runWithTimeout } from '../util/utils'
import RestTimerModal from '../components/RestTimerModal'
import { useMessage } from '../context/MessageContext'
import Modal from '../components/Modal' // Import the Modal component
import { FcAlarmClock } from 'react-icons/fc'
import { FaHourglassStart, FaPlus, FaStopwatch } from 'react-icons/fa'
import { useMemo } from 'react'

export default function WorkoutPlanPage() {
  const { db, userId, isAuthReady } = useFirebase()
  const {
    showMiniStopwatch,
    setShowMiniStopwatch,
    stopwatchIsRunning,
    startStopwatch,
    pauseStopwatch,
    stopwatchTime,
    resetStopwatch,
    showMiniCountdown,
    setShowMiniCountdown,
    countdownIsRunning,
    pauseCountdown,
    startCountdown,
    countdownTime,
    resetCountdown,
    setCustomCountdown,
    formatCountdownTime,
  } = useTimer()
  // workoutPlans will now be an array of plan objects
  const [workoutPlans, setWorkoutPlans] = useState([])
  const [editingPlanId, setEditingPlanId] = useState(null) // Tracks which plan is being edited by its ID
  const { setMessage, setMessageType } = useMessage()

  // --- NEW STATE FOR DELETE CONFIRMATION ---
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false)
  const [planToDeleteId, setPlanToDeleteId] = useState(null)
  const [planToDeleteName, setPlanToDeleteName] = useState('')
  // --- END NEW STATE ---
  const [searchTerm, setSearchTerm] = useState('')
  const [workoutPlanCard, setWorkoutPlanCard] = useState(null)
  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

  // Fetch workout plans from Firestore
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return

    const workoutPlansCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/workoutPlans`
    )
    const unsubscribe = onSnapshot(
      workoutPlansCollectionRef,
      (snapshot) => {
        const fetchedPlans = []
        snapshot.forEach((doc) => {
          // Store the document ID along with the data
          fetchedPlans.push({ id: doc.id, ...doc.data() })
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

  const handleAddPlan = async () => {
    if (!db || !userId) return

    setMessage('Adding new workout plan...')
    setMessageType('info')

    const newPlan = {
      name: 'New Workout Plan', // Default name
      exercises: [], // Start with no exercises
      createdAt: new Date(), // Timestamp for ordering
    }

    try {
      // Add a new document to the 'workoutPlans' collection
      const docRef = await addDoc(
        collection(db, `artifacts/${appId}/users/${userId}/workoutPlans`),
        newPlan
      )
      setWorkoutPlanCard(docRef)
      setEditingPlanId(docRef.id) // Immediately go into edit mode for the new plan
      setTimeout(() => {
        document.getElementById(`${docRef.id}-name-input`).focus()
        setMessage(`New plan "${newPlan.name}" added successfully!`)
        setMessageType('success')
      }, 100)
    } catch (e) {
      console.error('Error adding new workout plan:', e)
      setMessage('Failed to add new workout plan.')
      setMessageType('error')
    }
  }

  const handleSaveWorkoutPlan = async (planId, newName, updatedExercises) => {
    if (!db || !userId) return

    setMessage('Saving workout plan...')
    setMessageType('info')

    const planDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/workoutPlans`,
      planId
    )
    try {
      await runWithTimeout(
        setDoc(
          planDocRef,
          { name: newName, exercises: updatedExercises }, // Update both name and exercises
          { merge: true }
        ),
        5000
      )
      setMessage(`Workout plan "${newName}" saved successfully!`)
      setMessageType('success')
      setEditingPlanId(null) // Exit editing mode
    } catch (e) {
      if (e.message === 'timeout') {
        setMessage('Saved offline! Will sync later.')
        setMessageType('success')
        setEditingPlanId(null) // still exit editing even if offline
      } else {
        setMessage(`Failed to save workout plan "${newName}".`)
        setMessageType('error')
      }
    }
  }
  useEffect(() => {
    if (workoutPlanCard) {
      const plan = workoutPlans.find((plan) => plan.id === workoutPlanCard.id)
      setWorkoutPlanCard(plan)
    }
  }, [workoutPlanCard, workoutPlans])
  // --- UPDATED: handleDeletePlan to show confirmation modal ---
  const handleDeletePlan = (planId, planName) => {
    setPlanToDeleteId(planId)
    setPlanToDeleteName(planName)
    setShowConfirmDeleteModal(true)
  }

  // --- NEW: confirmDeletePlan function to perform actual deletion ---
  const confirmDeletePlan = async () => {
    if (!db || !userId || !planToDeleteId) return

    setMessage('Deleting workout plan...')
    setMessageType('info')

    const planDocRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/workoutPlans`,
      planToDeleteId
    )

    try {
      await deleteDoc(planDocRef)
      setMessage('Workout plan deleted successfully!')
      setMessageType('success')
      if (editingPlanId === planToDeleteId) {
        setEditingPlanId(null) // Exit editing mode if the deleted plan was being edited
      }
      setShowConfirmDeleteModal(false) // Close the modal
      setPlanToDeleteId(null) // Clear ID
      setPlanToDeleteName('') // Clear name
      
    } catch (e) {
      console.error('Error deleting workout plan:', e)
      setMessage('Failed to delete workout plan.')
      setMessageType('error')
      setShowConfirmDeleteModal(false) // Close the modal even on error
    }
  }
  // --- END NEW ---

  // Inside the component
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [showTimer, setShowTimer] = useState(false)

  const startRestTimer = (duration) => {
    if (showTimer) return // prevent multiple
    setTimerSeconds(duration)
    setShowTimer(true)
  }
  const searchedPlan = useMemo(() => {
    let filtered = workoutPlans
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter((plan) =>
        plan.name.toLowerCase().includes(lowerCaseSearchTerm)
      )
    }
    return filtered
  }, [workoutPlans, searchTerm])
  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 xs:p-3 p-2 rounded-xl  text-gray-100'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6 mt-2'>
        💪 Workout Plans & Timers
      </h2>

      {/* Timers Section */}
      <section
        className='mb-8 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg '
        aria-labelledby='timers-heading'
      >
        <h3
          id='timers-heading'
          className='sm:text-xl md:text-2xl text-lg font-semibold text-gray-200 mb-3'
        >
          Timers
        </h3>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4'>
          {/* Stopwatch */}
          <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-md  cursor-pointer hover:bg-gray-700 transition-colors w-full text-xs xs:text-sm md:text-base'>
            <h4 className='text-lg font-semibold text-blue-300 mb-2'>
              Stopwatch
            </h4>
            <div
              className='text-3xl font-bold mb-3'
              aria-live='polite'
              aria-atomic='true'
            >
              {formatTime(stopwatchTime)}
            </div>
            <div className='flex flex-wrap gap-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  stopwatchIsRunning ? pauseStopwatch() : startStopwatch()
                }}
                className={`px-3 py-1 sm:px-1.5 sm:py-0.5 md:px-3 md:py-1 rounded-md shadow-[3px_3px_0px_0px_#030712] border border-gray-950 ${
                  stopwatchIsRunning
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white transition-colors`}
                aria-label={
                  stopwatchIsRunning ? 'Pause stopwatch' : 'Start stopwatch'
                }
              >
                {stopwatchIsRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  resetStopwatch()
                }}
                className='px-3 py-1 sm:px-1.5 sm:py-0.5 md:px-3 md:py-1 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors'
                aria-label='Reset stopwatch'
              >
                Reset
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMiniStopwatch(showMiniStopwatch ? false : true)
                }}
                className={` px-3 py-1 sm:px-1.5 sm:py-0.5 md:px-3 md:py-1 shadow-[3px_3px_0px_0px_#030712] border border-gray-950  text-white rounded-md  ml-auto transition-colors flex items-center gap-1 ${
                  showMiniStopwatch
                    ? 'hover:bg-yellow-400 bg-yellow-500 '
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
                aria-label={
                  showMiniStopwatch
                    ? 'Hide floating stopwatch'
                    : 'Show floating stopwatch'
                }
              >
                Mini
                <FaStopwatch />
              </button>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-md  cursor-pointer hover:bg-gray-700 transition-colors w-full text-xs xs:text-sm md:text-base'>
            <h4 className='text-lg font-semibold text-blue-300 mb-2'>
              Countdown Timer
            </h4>
            <div
              className='text-3xl font-bold mb-3'
              aria-live='polite'
              aria-atomic='true'
            >
              {formatCountdownTime(countdownTime)}
            </div>
            <div className='flex flex-wrap gap-2 mb-3'>
              <label htmlFor='countdown-hours' className='sr-only'>
                Set countdown hours
              </label>
              <input
                id='countdown-hours'
                type='number'
                placeholder='H'
                min='0'
                className='w-12 md:w-16 md:p-1 p-1 sm:py-0.5 px-1 bg-gray-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md text-gray-100'
                onChange={(e) =>
                  setCustomCountdown(
                    parseInt(e.target.value) || 0,
                    Math.floor((countdownTime % 3600) / 60),
                    countdownTime % 60
                  )
                }
                aria-label='Set hours for countdown timer'
              />
              <label htmlFor='countdown-minutes' className='sr-only'>
                Set countdown minutes
              </label>
              <input
                id='countdown-minutes'
                type='number'
                placeholder='M'
                min='0'
                max='59'
                className='w-12 md:w-16 md:p-1 p-1 sm:py-0.5 px-1 bg-gray-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md text-gray-100'
                onChange={(e) =>
                  setCustomCountdown(
                    Math.floor(countdownTime / 3600),
                    parseInt(e.target.value) || 0,
                    countdownTime % 60
                  )
                }
                aria-label='Set minutes for countdown timer'
              />
              <label htmlFor='countdown-seconds' className='sr-only'>
                Set countdown seconds
              </label>
              <input
                id='countdown-seconds'
                type='number'
                placeholder='S'
                min='0'
                max='59'
                className='w-12 md:w-16 md:p-1 p-1 sm:py-0.5 bg-gray-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md text-gray-100'
                onChange={(e) =>
                  setCustomCountdown(
                    Math.floor(countdownTime / 3600),
                    Math.floor((countdownTime % 3600) / 60),
                    parseInt(e.target.value) || 0
                  )
                }
                aria-label='Set seconds for countdown timer'
              />
            </div>
            <div className='flex flex-wrap gap-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  countdownIsRunning ? pauseCountdown() : startCountdown()
                }}
                className={`px-3 py-1 sm:px-1.5 sm:py-0.5 md:px-3 md:py-1  rounded-md shadow-[3px_3px_0px_0px_#030712] border border-gray-950 ${
                  countdownIsRunning
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white transition-colors`}
                aria-label={
                  countdownIsRunning
                    ? 'Pause countdown timer'
                    : 'Start countdown timer'
                }
              >
                {countdownIsRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  resetCountdown()
                }}
                className='px-3 py-1 sm:px-1.5 sm:py-0.5 md:px-3 md:py-1  shadow-[3px_3px_0px_0px_#030712] border border-gray-950 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors'
                aria-label='Reset countdown timer'
              >
                Reset
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMiniCountdown(showMiniCountdown ? false : true)
                }}
                className={`${
                  countdownTime == 0 && 'hidden'
                } px-3 py-1 sm:px-1.5 sm:py-0.5 md:px-3 md:py-1 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 bg-gray-900 text-white rounded-md hover:bg-gray-800 ml-auto transition-colors flex items-center gap-1 ${
                  showMiniCountdown
                    ? 'hover:bg-yellow-400 bg-yellow-500 '
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
                aria-label={
                  showMiniCountdown
                    ? 'Hide floating countdown timer'
                    : 'Show floating countdown timer'
                }
              >
                Mini <FaHourglassStart />
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* rest timers */}
      <section
        className='mb-8 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg '
        aria-labelledby='timers-heading'
      >
        <h3
          id='timers-heading'
          className='sm:text-xl md:text-2xl text-lg font-semibold text-gray-200 mb-3'
        >
          Rest Timers
        </h3>
        <div className='grid md:grid-cols-5 sm:grid-cols-4 xs:grid-cols-3 grid-cols-2 gap-2 my-4  text-nowrap'>
          <button
            onClick={() => startRestTimer(60)}
            className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm shadow-[2px_2px_0px_0px_#030712] border border-gray-950 flex gap-1 justify-center items-center'
          >
            <FcAlarmClock /> 1min
          </button>
          <button
            onClick={() => startRestTimer(90)}
            className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm shadow-[2px_2px_0px_0px_#030712] border border-gray-950 flex gap-1 justify-center items-center'
          >
            <FcAlarmClock /> 1min 30sec
          </button>
          <button
            onClick={() => startRestTimer(120)}
            className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm shadow-[2px_2px_0px_0px_#030712] border border-gray-950 flex gap-1 justify-center items-center'
          >
            <FcAlarmClock /> 2min
          </button>
          <button
            onClick={() => startRestTimer(150)}
            className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm shadow-[2px_2px_0px_0px_#030712] border border-gray-950 flex gap-1 justify-center items-center'
          >
            <FcAlarmClock /> 2min 30sec
          </button>
          <button
            onClick={() => startRestTimer(180)}
            className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm shadow-[2px_2px_0px_0px_#030712] border border-gray-950 col-span-full xs:col-span-2 sm:col-span-full md:col-span-1 flex gap-1 justify-center items-center'
          >
            <FcAlarmClock /> 3min
          </button>
        </div>
      </section>
      {showTimer && (
        <RestTimerModal
          seconds={timerSeconds}
          onClose={() => setShowTimer(false)}
        />
      )}
      {workoutPlanCard && (
        <WorkoutPlanCard
          planId={workoutPlanCard.id}
          planName={workoutPlanCard.name}
          exercises={workoutPlanCard.exercises || []}
          isEditing={editingPlanId === workoutPlanCard.id}
          onEditToggle={() =>
            setEditingPlanId(
              editingPlanId === workoutPlanCard.id ? null : workoutPlanCard.id
            )
          }
          onSaveExercises={handleSaveWorkoutPlan} // Pass the updated save handler
          onDeletePlan={(id) => handleDeletePlan(id, workoutPlanCard.name)} // Pass planId and planName to handler
          aria-label={`Workout plan for ${workoutPlanCard.name}`}
        />
      )}

      {/* Workout Plans Section */}

      <section
        className='mb-6 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 px-1 xs:px-2 pt-2 sm:pt-4 rounded-lg '
        aria-labelledby='workout-plan-section'
      >
        <div className='flex items-center justify-between px-2 sm:px-4 mb-3'>
          <h3
            id='workout-plan-heading'
            className='text-base sm:text-xl md:text-2xl xs:text-lg font-semibold text-gray-200   text-nowrap '
          >
            My Workout Plans
          </h3>
          <button
            onClick={handleAddPlan}
            className='px-2 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950  text-center w-fit flex xs:gap-2 gap-1 items-center justify-center text-xs xs:text-sm sm:text-base'
          >
            <FaPlus /> Add Plan
          </button>
        </div>
        {searchedPlan.length === 0 && searchTerm !== '' && (
          <p className='h-[30vh] text-sm sm:text-base text-gray-300 flex items-center justify-center  py-4 bg-gray-700 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 px-8 rounded-md '>
            No images match your search term "{searchTerm}".
          </p>
        )}
        {searchedPlan.length === 0 && searchTerm === '' && (
          <p className='h-[30vh] text-sm sm:text-base text-gray-300 flex items-center justify-center  py-4 bg-gray-700 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 px-8 rounded-md '>
            No workout plans added yet.
            <br /> Click{' '}
            <span className='text-blue-400 text-nowrap'>"Add New Plan"</span> to
            get started!
          </p>
        )}
        {searchedPlan.length > 0 && (
          <div className='h-[30vh] overflow-y-auto bg-gray-700 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-1 xs:p-2 sm:py-4 rounded-md '>
            {searchedPlan.map((plan) => {
              return (
                <div
                  key={plan.id}
                  className='bg-gray-900 shadow-[2px_2px_0px_0px_#030712] xs:shadow-[5px_5px_0px_0px_#030712] border border-gray-950 px-4 py-2 sm:py-4 rounded-lg mb-3 flex justify-between items-center'
                >
                  <h4 className='sm:text-base md:text-xl text-sm font-semibold text-blue-300 capitalize flex-grow'>
                    {plan.name}
                  </h4>
                  <button
                    className={`px-2 sm:py-1 py-0.5 sm:px-4 ${
                      workoutPlanCard?.id === plan.id
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }  text-white rounded-md  transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 text-xs xs:text-sm sm:text-base`}
                    onClick={() => {
                      if (workoutPlanCard?.id === plan.id) {
                        setWorkoutPlanCard(null)
                      } else {
                        setWorkoutPlanCard(plan)
                      }
                    }}
                  >
                    {workoutPlanCard?.id === plan.id ? 'close' : 'open'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className='flex xs:my-3 my-2 bg-gray-700 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md '>
          <input
            type={'text'}
            placeholder={'Enter Name to Search Plan'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='flex-grow p-1 px-2 sm:p-2 bg-gray-800 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 w-full text-sm  xs:m-3  m-1.5'
            aria-label={`Enter search name for Workout Plan`}
          />
        </div>
      </section>

      {/* Confirmation Modal for deleting a plan */}
      {showConfirmDeleteModal && (
        <Modal onClose={() => setShowConfirmDeleteModal(false)}>
          <h3 className='text-lg sm:text-xl font-bold text-red-400 mb-4 mr-[34px]'>
            Confirm Delete Workout Plan
          </h3>
          <p className='text-gray-200 mb-6 text-sm sm:text-base'>
            Are you sure you want to permanently delete the workout plan "
            <span className='font-bold text-red-300'>{planToDeleteName}</span>
            "? This action cannot be undone.
          </p>
          <div className='flex gap-3'>
            <button
              onClick={() => setShowConfirmDeleteModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 w-full text-nowrap'
            >
              Cancel
            </button>
            <button
              onClick={confirmDeletePlan}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-red-800 text-white rounded-md hover:bg-red-900 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 transition-colors w-full'
              aria-label='Confirm and delete my account and all data text-nowrap'
            >
              Delete Plan
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
