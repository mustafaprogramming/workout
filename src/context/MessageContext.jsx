import { createContext, useContext, useState } from 'react'

const MessageContext = createContext()

export const MessageContextProvider = ({ children }) => {
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  return (
    <MessageContext.Provider
      value={{ message, setMessage, messageType, setMessageType }}
    >
      {children}
    </MessageContext.Provider>
  )
}

export const useMessage = () => useContext(MessageContext)
