import Modal from '../components/Modal'
import { useFirebase } from '../context/FirebaseContext'
import React, { useState, useEffect } from 'react'
import { formatDate } from '../util/utils'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { useNavigation } from '../context/NavigationContext'
import { ROUTES } from '../route'
import { useMessage } from '../context/MessageContext'

export default function WorkoutLogPage({ selectedDate }) {
  const { setCurrentPage } = useNavigation()
  const { db, userId, isAuthReady } = useFirebase()
  const [exercises, setExercises] = useState([])
  const [currentExerciseName, setCurrentExerciseName] = useState('')
  const [currentSets, setCurrentSets] = useState([]) // Array of { reps, weight, restTime, rpe } for the current exercise being added
  const [workoutDuration, setWorkoutDuration] = useState('') // New state for workout duration
  const {  setMessage, setMessageType } = useMessage()
  const [showConfirmDeleteExerciseModal, setShowConfirmDeleteExerciseModal] =
    useState(false)
  const [exerciseToDeleteId, setExerciseToDeleteId] = useState(null)
  const [exerciseToDeleteName, setExerciseToDeleteName] = useState('')

  const formattedDate = formatDate(selectedDate) // YYYY-MM-DD
  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local' // Or any unique string for your local app

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

      <section className='mb-6 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-4 p-2 rounded-lg '>
        <h3 className='sm:text-xl text-base font-semibold text-gray-200 mb-3'>
          Workout Details
        </h3>
        <div className='flex flex-col sm:flex-row gap-3 mb-4'>
          <label htmlFor='workout-duration' className='sr-only'>
            Workout Duration
          </label>
          <input
            id='workout-duration'
            type='text'
            placeholder='Workout Duration (e.g., 1h 30m)'
            value={workoutDuration}
            onChange={(e) => setWorkoutDuration(e.target.value)}
            className='flex-grow p-1.5 sm:p-3 bg-gray-800  rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            aria-label='Enter workout duration, for example 1 hour 30 minutes'
          />
          <button
            onClick={handleSaveDuration}
            className='px-2 py-1 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            aria-label='Save workout duration'
          >
            Save Duration
          </button>
        </div>

        <h3 className='sm:text-xl text-base font-semibold text-gray-200 mb-3'>
          Add New Exercise
        </h3>
        <label htmlFor='exercise-name' className='sr-only'>
          Exercise Name
        </label>
        <input
          id='exercise-name'
          type='text'
          placeholder='Exercise Name (e.g., Bench Press)'
          value={currentExerciseName}
          onChange={(e) => setCurrentExerciseName(e.target.value)}
          className='sm:p-3 p-1.5 mb-1.5 sm:mb-3 w-full bg-gray-800 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 '
          aria-label='Enter exercise name, for example Bench Press'
        />

        <div
          className='space-y-1 sm:space-y-2 mb-3'
          role='group'
          aria-label='Current sets for new exercise'
        >
          {currentSets.map((set, index) => (
            <div
              key={index}
              className='grid sm:gap-2 gap-1 items-center bg-gray-800 sm:p-3 p-1 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md'
              role='group'
              aria-label={`Set ${index + 1} details`}
            >
              <span className='text-gray-300 font-medium '>
                Set {index + 1}:
              </span>
              <div className='flex w-full sm:gap-2 gap-1 overflow-x-auto pb-1'>
                <label htmlFor={`reps-input-${index}`} className='sr-only'>
                  Reps for Set {index + 1}
                </label>
                <input
                  id={`reps-input-${index}`}
                  type='number'
                  placeholder='Reps'
                  value={set.reps}
                  onChange={(e) =>
                    handleUpdateSet(index, 'reps', e.target.value)
                  }
                  className='p-1 sm:p-2 bg-gray-900 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-1'
                  aria-label={`Enter reps for set ${index + 1}`}
                />
                <label htmlFor={`weight-input-${index}`} className='sr-only'>
                  Weight in kilograms for Set {index + 1}
                </label>
                <input
                  id={`weight-input-${index}`}
                  type='number'
                  step='0.1'
                  placeholder='Weight (kg)'
                  value={set.weight}
                  onChange={(e) =>
                    handleUpdateSet(index, 'weight', e.target.value)
                  }
                  className='p-1 sm:p-2 bg-gray-900 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-1'
                  aria-label={`Enter weight in kilograms for set ${index + 1}`}
                />
                <label htmlFor={`rest-time-input-${index}`} className='sr-only'>
                  Rest Time for Set {index + 1}
                </label>
                <input
                  id={`rest-time-input-${index}`}
                  type='text'
                  placeholder='Rest (e.g., 60s)'
                  value={set.restTime}
                  onChange={(e) =>
                    handleUpdateSet(index, 'restTime', e.target.value)
                  }
                  className='p-1 sm:p-2 bg-gray-900 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-1'
                  aria-label={`Enter rest time for set ${
                    index + 1
                  }, for example 60 seconds`}
                />
                <label htmlFor={`rpe-input-${index}`} className='sr-only'>
                  RPE for Set {index + 1}
                </label>
                <input
                  id={`rpe-input-${index}`}
                  type='number'
                  min='1'
                  max='10'
                  placeholder='RPE'
                  value={set.rpe}
                  onChange={(e) =>
                    handleUpdateSet(index, 'rpe', e.target.value)
                  }
                  className='p-1 sm:p-2 bg-gray-900 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 flex-1 '
                  aria-label={`Enter RPE (Rate of Perceived Exertion) for set ${
                    index + 1
                  }, from 1 to 10`}
                />
                <button
                  onClick={() => handleDeleteSet(index)}
                  className='p-1 sm:p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors  shadow-[2px_2px_0px_0px_#030712] border border-gray-950 mr-1'
                  aria-label={`Delete set ${index + 1}`}
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
          aria-label='Add a new set to the current exercise'
        >
          ➕ Add Set
        </button>

        <button
          onClick={handleAddExercise}
          className='px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full'
          aria-label='Add current exercise and its sets to the workout log'
        >
          Add Exercise to Log
        </button>
      </section>

      <section className='mb-6 overflow-hidden rounded-lg  shadow-[5px_5px_0px_0px_#030712] border border-gray-950'>
        <h3 className='sr-only'>Logged Exercises</h3>{' '}
        {/* Visually hidden heading for table context */}
        {exercises.length === 0 ? (
          <p className='text-gray-400 p-2'>
            No exercises logged for this day yet.
          </p>
        ) : (
          <div className='overflow-x-auto pb-1 '>
            <table
              className='min-w-full bg-gray-900 rounded-lg overflow-hidden  text-nowrap'
              role='table'
              aria-label={`Workout log for ${selectedDate.toDateString()}`}
            >
              <thead role='rowgroup'>
                <tr
                  className='bg-gray-950 text-gray-300 uppercase sm:text-sm text-xs leading-normal'
                  role='row'
                >
                  <th
                    className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'
                    role='columnheader'
                    scope='col'
                  >
                    Logged Exercise
                  </th>
                  <th
                    className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'
                    role='columnheader'
                    scope='col'
                  >
                    Sets
                  </th>
                  <th
                    className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'
                    role='columnheader'
                    scope='col'
                  >
                    Reps
                  </th>
                  <th
                    className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'
                    role='columnheader'
                    scope='col'
                  >
                    Weight (kg)
                  </th>
                  <th
                    className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'
                    role='columnheader'
                    scope='col'
                  >
                    Rest Time
                  </th>
                  <th
                    className='sm:py-3 py-1.5 sm:px-6 px-2 text-left'
                    role='columnheader'
                    scope='col'
                  >
                    RPE
                  </th>
                  <th
                    className='sm:py-3 py-1.5 sm:px-6 px-2 text-center'
                    role='columnheader'
                    scope='col'
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className='text-gray-200 sm:text-sm text-xs font-light'
                role='rowgroup'
              >
                {exercises.map((exercise) => (
                  <React.Fragment key={exercise.id}>
                    {/* Exercise Header Row */}
                    <tr
                      className='bg-gray-900 border-b border-gray-600'
                      role='row'
                    >
                      <td
                        className='sm:py-3 py-1.5 sm:px-6 px-2 text-left font-semibold text-blue-300 sm:text-base md:text-lg text-sm'
                        role='cell'
                        colSpan='6'
                      >
                        {exercise.name}
                      </td>
                      <td
                        className='sm:py-3 py-1.5 sm:px-6 px-2 text-center'
                        role='cell'
                      >
                        <button
                          onClick={() =>
                            handleDeleteExerciseClick(
                              exercise.id,
                              exercise.name
                            )
                          }
                          className='px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[2px_2px_0px_0px_#030712] border border-gray-950 text-xs'
                          aria-label={`Delete exercise ${exercise.name}`}
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
                        role='row'
                      >
                        <td
                          className='sm:py-2 py-1 sm:px-6 px-2 text-left pl-10 italic'
                          role='cell'
                        >
                          Set {index + 1}:
                        </td>
                        <td
                          className='sm:py-2 py-1 sm:px-6 px-2 text-left'
                          role='cell'
                        >
                          {/* Empty for sets */}
                        </td>
                        <td
                          className='sm:py-2 py-1 sm:px-6 px-2 text-left'
                          role='cell'
                        >
                          {set.reps}
                        </td>
                        <td
                          className='sm:py-2 py-1 sm:px-6 px-2 text-left'
                          role='cell'
                        >
                          {set.weight} kg
                        </td>
                        <td
                          className='sm:py-2 py-1 sm:px-6 px-2 text-left'
                          role='cell'
                        >
                          {set.restTime}
                        </td>
                        <td
                          className='sm:py-2 py-1 sm:px-6 px-2 text-left'
                          role='cell'
                        >
                          {set.rpe !== undefined ? set.rpe : '-'}
                        </td>
                        <td
                          className='sm:py-2 py-1 sm:px-6 px-2 text-center'
                          role='cell'
                        >
                          {/* No action for individual sets here */}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className='mt-8 text-center'>
        <button
          onClick={() => setCurrentPage(ROUTES.calendar)}
          className='px-6 py-3 bg-gray-900 text-gray-100 rounded-lg hover:bg-gray-700  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
          aria-label='Back to calendar page'
        >
          ⬅️ Back to Calendar
        </button>
      </div>

      {showConfirmDeleteExerciseModal && (
        <Modal
          onClose={() => setShowConfirmDeleteExerciseModal(false)}
          aria-labelledby='delete-exercise-modal-title'
        >
          <h3
            id='delete-exercise-modal-title'
            className='text-xl font-bold text-red-400 mb-4 mr-[34px]'
          >
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
              aria-label='Cancel exercise deletion'
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteExercise}
              className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
              aria-label={`Confirm deletion of exercise ${exerciseToDeleteName}`}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
