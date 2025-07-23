export default function NavItem({ children, onClick, isActive, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`px-2.5 sm:px-5 py-1 sm:py-2 rounded-lg transition-all duration-300 flex flex-col items-center justify-center ${
        isActive
          ? 'bg-gray-900 text-blue-400 font-semibold shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
          : 'hover:bg-gray-600 text-gray-200 hover:text-white'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}
