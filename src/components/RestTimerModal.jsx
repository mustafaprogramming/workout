// components/RestTimerModal.jsx
import { useEffect, useRef, useState } from 'react'
import { FaHourglassStart } from 'react-icons/fa'
import { FcAlarmClock } from 'react-icons/fc'

export default function RestTimerModal({ seconds, onClose }) {
  const [remaining, setRemaining] = useState(seconds)
  const [pulse, setPulse] = useState(false)
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    if (seconds <= 0) return

    audioRef.current = new Audio(
      'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
    )
    audioRef.current.loop = true

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          audioRef.current?.play().catch(console.error)
          setPulse(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      audioRef.current?.pause()
      setPulse(false)
      audioRef.current = null
    }
  }, [seconds])

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div
      className={`${
        pulse && 'animate-flash'
      } fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[50] `}
      role='dialog'
      aria-modal='true'
      aria-labelledby='rest-timer-title'
    >
      <div
        className={` bg-gray-900 text-white p-6 rounded-lg text-center relative sm:max-w-sm w-full  max-w-[85vw] shadow-[5px_5px_0px_0px_#030712] border border-gray-950`}
      >
        <h2
          id='rest-timer-title'
          className='text-2xl font-bold mb-2 text-white'
        >
          {remaining === 0 ? (
            <span className='flex gap-2 items-center justify-center'>
              <FcAlarmClock /> TIME'S UP!
            </span>
          ) : (
            <span className='flex gap-2 items-center justify-center'>
              <FaHourglassStart /> Rest Timer
            </span>
          )}
        </h2>
        <p className='text-4xl font-mono mb-4'>{formatTime(remaining)}</p>
        <p className='mb-4 text-gray-300'>
          {remaining === 0 ? 'Your timer has finished.' : 'Relax and recover.'}
        </p>

        <button
          onClick={onClose}
          className='bg-white text-gray-900 px-4 py-2 rounded font-bold hover:bg-blue-200 transition shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
          aria-label='Close rest timer'
        >
          Close
        </button>
      </div>
    </div>
  )
}
