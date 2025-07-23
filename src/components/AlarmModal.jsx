import { useEffect, useRef } from 'react'

// Shared audio object to prevent overlapping alarms
const sharedAlarmAudio = new Audio(
  'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
)
sharedAlarmAudio.loop = true

export default function AlarmModal({ visible, onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (visible) {
      // Play alarm only if it's not already playing
      if (sharedAlarmAudio.paused) {
        sharedAlarmAudio.play().catch(console.error)
      }

      // Focus the Stop Alarm button
      closeButtonRef.current?.focus()

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      window.addEventListener('keydown', handleKeyDown)

      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    } else {
      // Stop alarm when modal is closed
      sharedAlarmAudio.pause()
      sharedAlarmAudio.currentTime = 0
    }

    return () => {
      // Cleanup if component unmounts
      sharedAlarmAudio.pause()
      sharedAlarmAudio.currentTime = 0
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      className='fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] '
      role='dialog'
      aria-modal='true'
      aria-labelledby='alarm-title'
    >
      <div className='bg-red-800 text-white p-6 rounded-lg text-center relative sm:max-w-sm w-full animate-flash max-w-[85vw] shadow-[5px_5px_0px_0px_#030712] border border-gray-950'>
        <h2 id='alarm-title' className='text-3xl font-bold mb-4'>
          ⏰ TIME'S UP!
        </h2>
        <p className='mb-4 text-sm'>Your timer has finished.</p>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className='bg-white text-red-800 px-4 py-2 rounded font-bold hover:bg-gray-100 transition shadow-[3px_3px_0px_0px_#030712] border border-gray-950'
          aria-label='Stop alarm and close modal'
        >
          Stop Alarm
        </button>
      </div>
    </div>
  )
}
