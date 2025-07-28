import { useState, useEffect, useRef } from 'react'
import { FaHourglassStart, FaStopwatch, FaTimes } from 'react-icons/fa'
export default function FloatingTimer({
  type,
  time,
  isRunning,
  setIsRunning,
  setShowMini,
}) {
  const formatTimeDisplay = (msOrSeconds) => {
    let totalSeconds
    if (type === 'stopwatch') {
      totalSeconds = Math.floor(msOrSeconds / 1000)
    } else {
      totalSeconds = msOrSeconds
    }
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const [position, setPosition] = useState(
    type === 'stopwatch'
      ? { bottom: '30px', right: '20px' }
      : { bottom: '100px', right: '20px' }
  )
  const [dragging, setDragging] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    function getEventCoords(e) {
      return e.touches
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY }
    }

    const MousePosition = (e) => {
      e.preventDefault()
      const Width = window.innerWidth
      const Height = window.innerHeight
      const { height, width } = timerRef.current.getBoundingClientRect()
      const { x, y } = getEventCoords(e)

      let Top = y
      let Left = x

      if (y <= 25) Top = 25
      if (y > Height - height / 2) Top = Height - height / 2
      if (x <= 25) Left = 25
      if (x > Width - (width - 18 + 10)) Left = Width - (width - 18 + 10)

      setPosition({ top: `${Top}px`, left: `${Left}px` })
    }

    if (dragging) {
      document.addEventListener('mousemove', MousePosition)
      document.addEventListener('touchmove', MousePosition, { passive: false })
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('mousemove', MousePosition)
      document.removeEventListener('touchmove', MousePosition)
    }
  }, [dragging])

  useEffect(() => {
    const stopDragging = () => setDragging(false)
    document.addEventListener('mouseup', stopDragging)
    document.addEventListener('touchend', stopDragging)
    return () => {
      document.removeEventListener('mouseup', stopDragging)
      document.removeEventListener('touchend', stopDragging)
    }
  }, [])

  return (
    <div
      ref={timerRef}
      className='fixed bg-gray-900 border border-blue-500 rounded-lg p-3 shadow-xl cursor-pointer z-[50] flex items-center space-x-2 -translate-x-[18px] -translate-y-[25px] w-fit h-fit select-none'
      style={position}
      role='region'
      aria-label={`${type === 'stopwatch' ? 'Stopwatch' : 'Countdown Timer'} panel`}
    >
      <button
        className='cursor-move scale-125'
        onMouseDown={() => setDragging(true)}
        onTouchStart={() => setDragging(true)}
        aria-label='Move timer'
      >
        ⁝⁝⁝
      </button>

      <span className='text-white text-sm font-bold' aria-hidden='true'>
        {type === 'stopwatch' ? <FaStopwatch/> : <FaHourglassStart/>}
      </span>

      <span className='text-gray-100 text-sm font-mono' aria-live='polite'>
        {formatTimeDisplay(time)}
      </span>

      <button
        onClick={() => setIsRunning(!isRunning)}
        className={`text-xs ${isRunning ? 'text-green-400' : 'text-red-400'}`}
        aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
      >
        {isRunning ? 'RUNNING' : 'PAUSED'}
      </button>

      <button
        className='text-sm'
        onClick={() => setShowMini(false)}
        aria-label='Close floating timer'
      >
        <FaTimes/>
      </button>
    </div>
  )
}
