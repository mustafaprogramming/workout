import { createContext, useContext, useState } from 'react'
import { ROUTES } from '../route'

const NavigationContext = createContext()

export const NavigationProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState(ROUTES.calendar)

  return (
    <NavigationContext.Provider value={{ currentPage, setCurrentPage }}>
      {children}
    </NavigationContext.Provider>
  )
}

export const useNavigation = () => useContext(NavigationContext)
