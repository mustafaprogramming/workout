import React, { useState, useEffect, useRef } from 'react'

export default function WorkoutDayCard({
  dayName,
  exercises,
  isEditing,
  onEditToggle,
  onSave,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [editableExercises, setEditableExercises] = useState([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const cardRef = useRef(null)

  useEffect(() => {
    if (isEditing) {
      // Use structuredClone if supported, fallback to JSON method
      const deepCopy = window.structuredClone
        ? structuredClone(exercises)
        : JSON.parse(JSON.stringify(exercises))
      setEditableExercises(deepCopy)
      setMessage('')
    }
  }, [isEditing, exercises])

  useEffect(() => {
    if (isExpanded && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isExpanded])

  const handleAddExercise = () => {
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
    const hasEmptyName = editableExercises.some((ex) => ex.name.trim() === '')
    if (hasEmptyName) {
      setMessage('All exercises must have a name before saving.')
      setMessageType('error')
      return
    }
    const cleanedExercises = editableExercises.map((ex) => ({
      ...ex,
      name: ex.name.trim(),
    }))
    onSave(dayName, cleanedExercises)
    setMessage('')
  }

  return (
    <div
      ref={cardRef}
      className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-2 sm:p-4 rounded-lg mb-3'
    >
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
                  onClick={handleSaveClick}
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
