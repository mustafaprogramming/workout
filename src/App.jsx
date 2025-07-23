import { FirebaseProvider, useFirebase } from './context/FirebaseContext'
import { TimerProvider, useTimer } from './context/TimerContext'
import { NavigationProvider } from './context/NavigationContext'

//components
import FloatingTimer from './components/FloatingTimer'
import AlarmModal from './components/AlarmModal'
import Header from './components/Header'
import Nav from './components/Nav'
import RenderPage from './components/RenderPage'
import AppOfflineBanner from './components/AppOfflineBanner'

// Main App Component
const AppContent = () => {
  const { userId, isAuthReady } = useFirebase()

  const {
    showMiniStopwatch,
    setShowMiniStopwatch,
    showMiniCountdown,
    setShowMiniCountdown,
    stopwatchTime,
    stopwatchIsRunning,
    setStopwatchIsRunning,
    countdownTime,
    countdownIsRunning,
    setCountdownIsRunning,
    showAlarm,
    setShowAlarm,
  } = useTimer()

  if (!isAuthReady) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-900 text-gray-100 p-4'>
        <div
          className='bg-gray-800 p-8 rounded-lg shadow-[5px_5px_0px_0px_#030712] border border-gray-950 text-center'
          role='status'
          aria-live='polite'
        >
          <p className='text-lg font-semibold text-gray-200'>
            Loading application...
          </p>
          <p className='text-sm text-gray-400 mt-2'>
            Initializing Firebase connection.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-900 text-gray-100 font-inter'>
      <AppOfflineBanner />
      <Header />
      {userId && <Nav />}

      <main className='p-2 sm:p-4'>{<RenderPage />}</main>

      {showMiniStopwatch && (
        <FloatingTimer
          type='stopwatch'
          time={stopwatchTime}
          isRunning={stopwatchIsRunning}
          setIsRunning={setStopwatchIsRunning}
          setShowMini={setShowMiniStopwatch}
        />
      )}
      {showMiniCountdown && (
        <FloatingTimer
          type='countdown'
          time={countdownTime}
          isRunning={countdownIsRunning}
          setIsRunning={setCountdownIsRunning}
          setShowMini={setShowMiniCountdown}
        />
      )}
      <AlarmModal visible={showAlarm} onClose={() => setShowAlarm(false)} />
    </div>
  )
}

export default function App() {
  return (
    <FirebaseProvider>
      <TimerProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </TimerProvider>
    </FirebaseProvider>
  )
}
