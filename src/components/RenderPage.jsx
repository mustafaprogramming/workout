import { lazy, Suspense, useState } from 'react'
import { useFirebase } from '../context/FirebaseContext'
import { useNavigation } from '../context/NavigationContext'
import { ROUTES } from '../route'

// Lazy loaded pages
const CalendarPage = lazy(() => import('../pages/CalendarPage'))
const WorkoutLogPage = lazy(() => import('../pages/WorkoutLogPage'))
const MeasurementsPage = lazy(() => import('../pages/MeasurementsPage'))
const StatisticsPage = lazy(() => import('../pages/StatisticsPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))
const WorkoutPlanPage = lazy(() => import('../pages/WorkoutPlanPage'))
const AuthPage = lazy(() => import('../pages/AuthPage'))

import PageFallback from '../pages/PageFallback'

export default function RenderPage() {
  const { userId } = useFirebase()
  const { currentPage, setCurrentPage } = useNavigation()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedMonth, setSelectedMonth] = useState(new Date())

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
            default:
              return null
          }
        })()
      )}
    </Suspense>
  )
}
