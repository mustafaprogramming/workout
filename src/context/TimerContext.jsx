import { createContext, useContext, useState, useEffect } from 'react'

const TimerContext = createContext()

export const TimerProvider = ({ children }) => {
  const [showMiniStopwatch, setShowMiniStopwatch] = useState(false)
  const [showMiniCountdown, setShowMiniCountdown] = useState(false)
  const [stopwatchTime, setStopwatchTime] = useState(0)
  const [stopwatchIsRunning, setStopwatchIsRunning] = useState(false)
  const [countdownTime, setCountdownTime] = useState(0)
  const [countdownIsRunning, setCountdownIsRunning] = useState(false)
  const [showAlarm, setShowAlarm] = useState(false)

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
      setCountdownIsRunning(false)
      setShowMiniCountdown(false)
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

  return (
    <TimerContext.Provider
      value={{
        showMiniStopwatch,
        setShowMiniStopwatch,
        showMiniCountdown,
        setShowMiniCountdown,
        stopwatchTime,
        setStopwatchTime,
        stopwatchIsRunning,
        setStopwatchIsRunning,
        countdownTime,
        setCountdownTime,
        countdownIsRunning,
        setCountdownIsRunning,
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
