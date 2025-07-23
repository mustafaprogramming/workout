import { useNavigation } from '../context/NavigationContext'
import { ROUTES } from '../route'
import NavItem from './NavItem'

const navLinks = [
  { route: ROUTES.calendar, label: 'Calendar', icon: '📅' },
  { route: ROUTES.workoutPlan, label: 'Workout', icon: '💪' },
  { route: ROUTES.measurements, label: 'Measurements', icon: '📏' },
  { route: ROUTES.statistics, label: 'Statistics', icon: '📊' },
  { route: ROUTES.settings, label: 'Settings', icon: '⚙️' },
]

export default function Nav() {
  const { currentPage, setCurrentPage } = useNavigation()

  return (
    <nav
      role='navigation'
      aria-label='Main Navigation'
      className='bg-gray-800 sticky z-[50] top-[86px] text-white sm:p-3 p-1 rounded-xl mx-6 my-4 grid grid-cols-5 sm:gap-2 gap-1 justify-around items-center sm:shadow-[0_10px_0px_0px_#030712] shadow-[0_5px_0px_0px_#030712] border border-gray-950 text-xs md:text-base sm:text-sm'
    >
      {navLinks.map(({ route, label, icon }) => (
        <NavItem
          key={route}
          onClick={() => setCurrentPage(route)}
          isActive={currentPage === route}
          aria-current={currentPage === route ? 'page' : undefined}
        >
          {icon} <span className='xs:flex hidden'>{label}</span>
        </NavItem>
      ))}
    </nav>
  )
}
