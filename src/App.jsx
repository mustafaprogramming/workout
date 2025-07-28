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
import { MessageContextProvider, useMessage } from './context/MessageContext'
import { useEffect, useState } from 'react'
import { FaTimes } from 'react-icons/fa'



// Main App Component
const AppContent = () => {
  const { userId, isAuthReady, messagePopUpTime } = useFirebase()
  const { message, messageType, setMessage, setMessageType } = useMessage()
  const [closingMessage, setClosingMessage] = useState(true)
  useEffect(() => {
    if (closingMessage) {
      const messageClose = setTimeout(() => {
        setMessage('')
        setMessageType('')
      }, 300)
      return () => {
        clearTimeout(messageClose)
      }
    }
  }, [closingMessage])
  useEffect(() => {
    if (!message || !messageType) {
      setClosingMessage(true)
      return
    }

    setClosingMessage(false)
    const messageClose = setTimeout(() => {
      setMessage('')
    }, messagePopUpTime)
    
    return () => {
      clearTimeout(messageClose)
    }
  }, [message, messageType, messagePopUpTime])

  const {
    showMiniStopwatch,
    setShowMiniStopwatch,
    stopwatchIsRunning,
    setStopwatchIsRunning,
    stopwatchTime,
    showMiniCountdown,
    setShowMiniCountdown,
    countdownIsRunning,
    setCountdownIsRunning,
    countdownTime,
    showAlarm,
    setShowAlarm,
  } = useTimer()
  
  if (!isAuthReady) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-900 text-gray-100 p-4'>
        <div className=' p-8  text-center' role='status' aria-live='polite'>
          <p className="text-lg font-semibold text-gray-200  after:content-['.'] after:animate-dots ">
            Loading application
            <span className='sr-only'>loading</span>
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
      <div
        role='status'
        aria-live='polite'
        className={`pr-2 ps-3 py-1.5 mb-4 rounded-md flex justify-between items-start fixed left-2/4 -translate-x-2/4  top-[50px] z-[1100] border border-gray-300 bg-opacity-65 backdrop-blur-md max-w-[90vw] lg:min-w-[40vw] md:min-w-[60vw] min-w-[80vw] text-wrap gap-3  text-sm sm:text-base duration-300 mr-5 ${
          messageType === 'success'
            ? 'bg-green-800 text-green-200'
            : messageType === 'info'
            ? 'bg-blue-800 text-blue-200'
            : messageType === 'error'
            ? 'bg-red-800 text-red-200'
            : 'bg-red-800 text-red-200'
        } ${!closingMessage ? 'scale-100' : 'scale-0'}`}
      >
        {message}

        <button
          className='text-gray-300 text-lg ml-auto w-fit h-fit'
          onClick={() => {
            setClosingMessage(true)
          }}
        >
          <FaTimes />
        </button>
      </div>
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
      <MessageContextProvider>
        <TimerProvider>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </TimerProvider>
      </MessageContextProvider>
    </FirebaseProvider>
  )
}
