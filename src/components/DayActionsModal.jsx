import React, { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import {
  FaBed,
  FaCheck,
  FaFileSignature,
  FaQuestion,
  FaSync,
  FaTimes,
} from 'react-icons/fa'

export default function DayActionsModal({
  date,
  effectiveType,
  hasWorkoutLogged,
  workoutDetails,
  workoutDuration,
  onClose,
  onLogWorkout,
  onConvertDayType,
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmMessage, setConfirmMessage] = useState('')
  const confirmTitleRef = useRef(null)

  const handleConfirmAction = (action, message) => {
    setConfirmAction(() => action)
    setConfirmMessage(message)
    setShowConfirmModal(true)
  }

  const executeConfirmAction = () => {
    if (confirmAction) confirmAction()
    setShowConfirmModal(false)
    setConfirmAction(null)
    setConfirmMessage('')
  }

  // Escape key support for confirm modal
  useEffect(() => {
    if (!showConfirmModal) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowConfirmModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showConfirmModal])

  return (
    <Modal
      onClose={onClose}
      role='dialog'
      aria-modal='true'
      aria-labelledby='day-actions-title'
    >
      <h2
        id='day-actions-title'
        className='text-xl font-bold text-blue-400 mb-4 mr-[34px]'
      >
        Actions for {date.toDateString()}
      </h2>

      <div className='mb-6'>
        <p className='text-gray-200 flex items-center'>
          Current Status:
          <span
            className={`font-semibold ml-2  ${
              effectiveType === 'workout' && hasWorkoutLogged
                ? 'text-green-400'
                : effectiveType === 'workout' && !hasWorkoutLogged
                ? 'text-red-400'
                : effectiveType === 'rest'
                ? 'text-yellow-400'
                : 'text-gray-400'
            }`}
          >
            {effectiveType === 'workout' && hasWorkoutLogged ? (
              <span className='flex items-center gap-2'>
                Workout Done <FaCheck />
              </span>
            ) : effectiveType === 'workout' && !hasWorkoutLogged ? (
              <span className='flex items-center gap-2'>
                Workout Undone <FaTimes />
              </span>
            ) : effectiveType === 'rest' ? (
              <span className='flex items-center gap-2'>
                Rest Day <FaBed />
              </span>
            ) : (
              <span className='flex items-center gap-2'>
                Unassigned <FaQuestion />
              </span>
            )}
          </span>
        </p>
      </div>

      {effectiveType === 'workout' && hasWorkoutLogged && (
        <div className='overflow-hidden rounded-md mb-6 shadow-[5px_5px_0px_0px_#030712] border border-gray-950'>
          <div className='bg-gray-800 rounded-md shadow-inner max-h-[45vh] overflow-y-auto'>
            {workoutDuration && (
              <p className='bg-gray-950 font-semibold flex gap-2 text-gray-300 text-md pb-3 pt-4 px-3'>
                Duration:
                <span className='text-blue-300'>{workoutDuration}</span>
              </p>
            )}
            <div className='overflow-x-auto pb-2'>
              <table className='min-w-full bg-gray-900 sm:text-sm text-xs text-nowrap'>
                <thead>
                  <tr className='bg-gray-950 text-gray-300 uppercase leading-normal'>
                    <th className='py-1.5 px-2 text-left'>Exercise</th>
                    <th className='py-1.5 px-2 text-left'>Sets</th>
                    <th className='py-1.5 px-2 text-left'>Reps</th>
                    <th className='py-1.5 px-2 text-left'>Weight (kg)</th>
                    <th className='py-1.5 px-2 text-left'>Rest Time</th>
                    <th className='py-1.5 px-2 text-left'>RPE</th>
                  </tr>
                </thead>
                <tbody className='text-gray-200 font-light'>
                  {workoutDetails && workoutDetails.length > 0 ? (
                    workoutDetails.map((exercise, exIndex) => (
                      <React.Fragment key={exercise.id || exIndex}>
                        <tr className='border-b border-gray-700 last:border-b-0'>
                          <td className='py-1.5 px-2 text-left font-semibold'>
                            {exercise.name}
                          </td>
                          <td className='py-1.5 px-2 text-left'>
                            {exercise.sets.length}
                          </td>
                          <td className='py-1.5 px-2 text-left'>-</td>
                          <td className='py-1.5 px-2 text-left'>-</td>
                          <td className='py-1.5 px-2 text-left'>-</td>
                          <td className='py-1.5 px-2 text-left'>-</td>
                        </tr>
                        {exercise.sets.map((set, setIndex) => (
                          <tr
                            key={setIndex}
                            className='bg-gray-800 border-b border-gray-700 last:border-b-0'
                          >
                            <td className='py-1 px-4 text-left italic'>
                              Set {setIndex + 1}:
                            </td>
                            <td className='py-1 px-3 text-left'>-</td>
                            <td className='py-1 px-3 text-left'>{set.reps}</td>
                            <td className='py-1 px-3 text-left'>
                              {set.weight} kg
                            </td>
                            <td className='py-1 px-3 text-left'>
                              {set.restTime}
                            </td>
                            <td className='py-1 px-3 text-left'>{set.rpe}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan='6'
                        className='text-center text-gray-400 py-2'
                      >
                        No exercise details logged for this day.
                      </td>
                    </tr>
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
            aria-label='Log workout for this day'
            className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full flex items-center justify-center gap-2'
          >
            <FaFileSignature /> Log Workout
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
            aria-label='Convert workout day to rest day'
            className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full flex items-center justify-center gap-2'
          >
            <FaSync /> Convert to Rest Day
          </button>
        ) : (
          <button
            onClick={() =>
              handleConfirmAction(
                () => onConvertDayType('workout'),
                'Are you sure you want to convert this to a WORKOUT day?'
              )
            }
            aria-label='Convert rest day to workout day'
            className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full flex items-center justify-center gap-2'
          >
            <FaSync /> Convert to Workout Day
          </button>
        )}
      </div>

      {showConfirmModal && (
        <Modal
          onClose={() => setShowConfirmModal(false)}
          role='dialog'
          aria-modal='true'
          aria-labelledby='confirm-title'
        >
          <h2
            id='confirm-title'
            ref={confirmTitleRef}
            className='text-lg sm:text-xl font-bold text-blue-400 mb-4 mr-[34px]'
          >
            Confirm Action
          </h2>
          <p className='text-gray-200 mb-6 text-sm sm:text-base'>
            {confirmMessage}
          </p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowConfirmModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 '
            >
              Cancel
            </button>
            <button
              onClick={executeConfirmAction}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 transition-colors '
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
