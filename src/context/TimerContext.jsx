import { createContext, useContext, useState, useEffect } from 'react'
import { useMessage } from './MessageContext'

const TimerContext = createContext()

export const TimerProvider = ({ children }) => {
  const [showMiniStopwatch, setShowMiniStopwatch] = useState(false)
  const [showMiniCountdown, setShowMiniCountdown] = useState(false)
  const [stopwatchTime, setStopwatchTime] = useState(0)
  const [stopwatchIsRunning, setStopwatchIsRunning] = useState(false)
  const [countdownTime, setCountdownTime] = useState(0)
  const [countdownIsRunning, setCountdownIsRunning] = useState(false)
  const [showAlarm, setShowAlarm] = useState(false)
  const { setMessageType, setMessage } = useMessage()

  // Stopwatch timer logic
  useEffect(() => {
    let interval
    if (stopwatchIsRunning) {
      interval = setInterval(() => {
        setStopwatchTime((prev) => prev + 1000)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [stopwatchIsRunning])

  // Countdown timer logic
  useEffect(() => {
    let interval
    if (countdownIsRunning && countdownTime > 0) {
      interval = setInterval(() => {
        setCountdownTime((prev) => prev - 1)
      }, 1000)
    } else if (countdownTime === 0 && countdownIsRunning) {
      resetCountdown()
      setShowAlarm(true)
    }
    return () => clearInterval(interval)
  }, [countdownTime, countdownIsRunning])

  const stopTimers = () => {
    setShowMiniStopwatch(false)
    setShowMiniCountdown(false)
    setStopwatchTime(0)
    setStopwatchIsRunning(false)
    setCountdownTime(0)
    setCountdownIsRunning(false)
  }
  const formatCountdownTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const startStopwatch = () => setStopwatchIsRunning(true)
  const pauseStopwatch = () => setStopwatchIsRunning(false)
  const resetStopwatch = () => {
    setStopwatchTime(0)
    setStopwatchIsRunning(false)
  }

  const startCountdown = () => {
    if (countdownTime === '' || countdownTime === null || countdownTime === 0) {
      setMessage('Countdown can not be started without a value.')
      setMessageType('error')
      return
    }
    setCountdownIsRunning(true)
  }
  const pauseCountdown = () => setCountdownIsRunning(false)
  const resetCountdown = () => {
    document.getElementById('countdown-hours').value = 0
    document.getElementById('countdown-minutes').value = 0
    document.getElementById('countdown-seconds').value = 0
    setCountdownTime(0) // Reset to 0, user can set new time
    setCountdownIsRunning(false)
    setShowMiniCountdown(false)
  }

  const setCustomCountdown = (hours, minutes, seconds) => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds
    setCountdownTime(totalSeconds)
    setCountdownIsRunning(false) // Pause when setting new time
  }
  return (
    <TimerContext.Provider
      value={{
        showMiniStopwatch,
        setShowMiniStopwatch,
        stopwatchIsRunning,
        setStopwatchIsRunning,
        startStopwatch,
        pauseStopwatch,
        stopwatchTime,
        resetStopwatch,
        showMiniCountdown,
        setShowMiniCountdown,
        countdownIsRunning,
        setCountdownIsRunning,
        pauseCountdown,
        startCountdown,
        countdownTime,
        resetCountdown,
        setCustomCountdown,
        formatCountdownTime,
        showAlarm,
        setShowAlarm,
        stopTimers,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}

export const useTimer = () => useContext(TimerContext)
