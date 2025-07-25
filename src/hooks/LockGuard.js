import { useEffect, useState } from 'react'

let sessionStarted = false

export function useLockGuard({ isAuthReady, userId, lockProtectionEnabled }) {
  const [isLocked, setIsLocked] = useState(true)

  // Check unlock state on mount
  useEffect(() => {
    if (!userId || !isAuthReady) return

    if (!lockProtectionEnabled) {
      setIsLocked(false)
      return
    }

    if (!sessionStarted) {
      sessionStarted = true
      const navEntry = performance.getEntriesByType('navigation')[0]
      const wasReload = navEntry?.type === 'reload'

      const lastOpened = localStorage.getItem('appLastOpened') || false

      const shouldLock = !wasReload || !lastOpened

      // if tab open and had not opened before then run if block
      // if reload and had opened before then run else block
      if (shouldLock) {
        setIsLocked(true)
        //removes applastopened from local storage
        localStorage.removeItem('appLastOpened')
      } else {
        setIsLocked(false)
        localStorage.setItem('appLastOpened', true)
      }
    }
  }, [userId, isAuthReady, lockProtectionEnabled])

  // Lock after 10+ seconds in background
  useEffect(() => {
    if (!userId || !lockProtectionEnabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem('appLastHidden', Date.now().toString())
      } else if (document.visibilityState === 'visible') {
        const lastHidden = Number(localStorage.getItem('appLastHidden')) || 0
        const now = Date.now()
        const elapsed = now - lastHidden
        if (elapsed > 10000) {
          setIsLocked(true)
          localStorage.removeItem('appLastOpened')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, lockProtectionEnabled])

  const handleUnlock = () => {
    localStorage.setItem('appLastOpened', true)
    setIsLocked(false)
  }

  return { isLocked, handleUnlock }
}
