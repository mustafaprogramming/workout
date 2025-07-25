import { lazy, Suspense, useState } from 'react'
import { useFirebase } from '../context/FirebaseContext'
import { useNavigation } from '../context/NavigationContext'
import { ROUTES } from '../route'

const CalendarPage = lazy(() => import('../pages/CalendarPage'))
const WorkoutLogPage = lazy(() => import('../pages/WorkoutLogPage'))
const MeasurementsPage = lazy(() => import('../pages/MeasurementsPage'))
const StatisticsPage = lazy(() => import('../pages/StatisticsPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))
const WorkoutPlanPage = lazy(() => import('../pages/WorkoutPlanPage'))
const AuthPage = lazy(() => import('../pages/AuthPage'))
const LockPage = lazy(() => import('../pages/LockPage'))
import PageFallback from '../pages/PageFallback'
import GalleryPage from '../pages/GalleryPage'
import { useLockGuard } from '../hooks/LockGuard'

export default function RenderPage() {
  const { userId, isAuthReady, lockProtectionEnabled } = useFirebase()
  const { currentPage, setCurrentPage } = useNavigation()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  const { isLocked, handleUnlock } = useLockGuard({
    isAuthReady,
    userId,
    lockProtectionEnabled,
  })

  if (isAuthReady && userId && lockProtectionEnabled && isLocked) {
    return (
      <Suspense fallback={<PageFallback />}>
        <LockPage onUnlock={handleUnlock} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<PageFallback />}>
      {!userId ? (
        <AuthPage />
      ) : (
        (() => {
          switch (currentPage) {
            case ROUTES.calendar:
              return <CalendarPage setSelectedDate={setSelectedDate} />
            case ROUTES.workoutLog:
              return (
                <WorkoutLogPage
                  selectedDate={selectedDate}
                  setCurrentPage={setCurrentPage}
                />
              )
            case ROUTES.measurements:
              return (
                <MeasurementsPage
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                />
              )
            case ROUTES.statistics:
              return <StatisticsPage />
            case ROUTES.settings:
              return <SettingsPage />
            case ROUTES.workoutPlan:
              return <WorkoutPlanPage />
            case ROUTES.galleryPage:
              return <GalleryPage />
            default:
              return null
          }
        })()
      )}
    </Suspense>
  )
}
