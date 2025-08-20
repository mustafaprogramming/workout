import React, { useState, useEffect, useRef } from 'react'
import { useMessage } from '../context/MessageContext'
import { FaEdit, FaMinus, FaPlus, FaSave, FaTrash } from 'react-icons/fa'
export default function WorkoutPlanCard({
  planId, // New prop: unique ID for the plan
  planName, // New prop: name of the plan
  exercises,
  isEditing,
  onEditToggle, // Toggles editing for this specific plan
  onSaveExercises, // Renamed from onSave, specifically for exercises
  onDeletePlan, // New prop: to delete the entire plan
  workoutPlanCard,
  setWorkoutPlanCard,
}) {
  const [editableExercises, setEditableExercises] = useState([])
  const [editablePlanName, setEditablePlanName] = useState(planName) // Local state for editing name
  const { setMessage, setMessageType } = useMessage()
  const cardRef = useRef(null)

  useEffect(() => {
    if (isEditing) {
      // Use structuredClone if supported, fallback to JSON method
      const deepCopy = window.structuredClone
        ? structuredClone(exercises)
        : JSON.parse(JSON.stringify(exercises))
      setEditableExercises(deepCopy)
      setMessage('')
    } else {
      // When exiting edit mode, ensure local state matches prop if not saved
      setEditablePlanName(planName)
    }
  }, [isEditing, exercises, planName]) // Added planName to dependencies

  const handleAddExercise = () => {
    setEditableExercises((prev) => [
      ...prev,
      {
        id: Date.now(), // Unique ID for new exercise
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
      // Ensure at least one empty set if all are deleted
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
    if (editablePlanName.trim() === '') {
      setMessage('Workout plan name cannot be empty.')
      setMessageType('error')
      return
    }

    const hasEmptyExerciseName = editableExercises.some(
      (ex) => ex.name.trim() === ''
    )
    if (hasEmptyExerciseName) {
      setMessage('All exercises must have a name before saving.')
      setMessageType('error')
      return
    }

    const cleanedExercises = editableExercises.map((ex) => ({
      ...ex,
      name: ex.name.trim(),
      // Ensure sets are also cleaned, removing empty sets if needed
      sets: ex.sets
        .filter((set) => set.reps || set.weight || set.restTime || set.rpe)
        .map((set) => ({
          reps: set.reps.trim(),
          weight: set.weight.trim(),
          restTime: set.restTime.trim(),
          rpe: set.rpe.trim(),
        })),
    }))

    // Filter out exercises that have no name and no sets after cleaning
    const finalExercisesToSave = cleanedExercises.filter(
      (ex) => ex.name.trim() !== '' || ex.sets.length > 0
    )

    // Call the onSaveExercises prop with the planId and updated exercises
    onSaveExercises(planId, editablePlanName, finalExercisesToSave)
    setMessage('')
  }

  return (
    <div className='bg-gray-900 shadow-[2px_2px_0px_0px_#030712] xs:shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:py-4 rounded-lg mb-3'>
      <div
        className='px-2 
sm:px-4 mt-2  flex items-center'
      >
        <h4 className='md:text-xl sm:text-lg xs:text-base text-sm font-semibold text-blue-300 capitalize flex-grow '>
          {isEditing ? (
            <input
              type='text'
              id={`${planId}-name-input`}
              value={editablePlanName}
              onChange={(e) => setEditablePlanName(e.target.value)}
              className='w-full bg-gray-700 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 rounded-md sm:p-2 p-1 text-gray-100'
              placeholder='Plan Name'
              onClick={(e) => e.stopPropagation()} // Prevent card expansion when clicking input
            />
          ) : (
            editablePlanName
          )}
        </h4>
        <button
          className={`px-2 sm:py-1 py-0.5 sm:px-4 bg-red-600 hover:bg-red-700 text-white rounded-md  transition-colors shadow-[3px_3px_0px_0px_#030712] border border-gray-950 text-xs xs:text-sm sm:text-base`}
          onClick={() => setWorkoutPlanCard(null)}
        >
          close
        </button>
      </div>

      <div className='mt-4'>
        {/* "No exercises added" message */}
        {(isEditing ? editableExercises : exercises).length === 0 && (
          <p className='text-gray-400 text-center py-4'>
            No exercises added in this plan.
          </p>
        )}

        {(isEditing ? editableExercises : exercises).length > 0 && (
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
                              className='bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-3 rounded-md text-xs shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
                            >
                              <FaTrash />
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
                                placeholder='Weight'
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
                                placeholder='RPE'
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
                                className='bg-red-500 hover:bg-red-600 text-white px-2 sm:py-2 py-1.5 rounded-md text-xs shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
                              >
                                <FaMinus />
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
                              className='bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-xs shadow-[2px_2px_0px_0px_#030712] border border-gray-950 flex gap-1 items-center justify-center mx-auto'
                            >
                              <FaPlus /> Add Set
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
        )}

        <div className='mt-4 flex flex-wrap justify-end gap-2'>
          {isEditing ? (
            <>
              <button
                onClick={handleAddExercise}
                className='sm:px-4 sm:py-2 px-2 py-1 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[2px_2px_0px_0px_#030712] border border-gray-950 flex gap-1 items-center justify-center'
              >
                <FaPlus /> Add Exercise
              </button>
              <button
                onClick={handleSaveClick}
                className='sm:px-4 sm:py-2 px-2 py-1 text-sm sm:text-base bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-[2px_2px_0px_0px_#030712] flex gap-1 items-center justify-center border border-gray-950'
              >
                <FaSave /> Save Plan
              </button>
            </>
          ) : (
            <button
              onClick={onEditToggle}
              className='sm:px-8 sm:py-2 px-2 xs:px-4 py-1 text-sm sm:text-base bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-[2px_2px_0px_0px_#030712] flex gap-2 items-center justify-center border border-gray-950'
            >
              <FaEdit /> Edit Plan
            </button>
          )}
          {/* Delete Plan Button - only shown when not editing */}
          {!isEditing && (
            <button
              onClick={() => onDeletePlan(planId)} // Pass planId to delete handler
              className='sm:px-8 sm:py-2 px-2 xs:px-4 py-1 text-sm sm:text-base bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[2px_2px_0px_0px_#030712] flex gap-2 items-center justify-center border border-gray-950'
            >
              <FaTrash /> Delete Plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
