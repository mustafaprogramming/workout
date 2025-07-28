import { useEffect, useRef } from 'react'
import { FaTimes } from 'react-icons/fa'

export default function Modal({ children, onClose , disableClose }) {
  const modalRef = useRef(null)

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  return (
    <div
      role='dialog'
      aria-modal='true'
      className='fixed inset-0 bg-gray-900 bg-opacity-20 backdrop-blur-lg flex justify-center px-2  sm:px-4 py-10 z-[60] items-center'
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className='bg-gray-900 p-2 xs:p-3 sm:p-6 rounded-md max-w-lg w-full h-fit relative text-gray-100 shadow-[5px_5px_0px_0px_#030712] border border-gray-950'
      >
        <button
          onClick={onClose}
          disabled={disableClose}
          className={`absolute sm:top-3 right-3 text-gray-400 ${!disableClose&&'hover:text-gray-100'} text-xl font-bold`}
          aria-label='Close modal'
        >
          <FaTimes />
        </button>
        {children}
      </div>
    </div>
  )
}
