export default function Header() {
  return (
    <header
      className='bg-gray-800 p-4 flex justify-start items-center rounded-b-3xl sticky z-[50] top-0 mx-4 sm:shadow-[0_10px_0px_0px_#030712] shadow-[0_5px_0px_0px_#030712] border border-gray-950'
      role='banner'
    >
      <h1
        id='app-title'
        className='text-2xl sm:text-3xl font-extrabold text-blue-400 justify-around items-center flex gap-3'
      >
        <svg
          width='32'
          height='32'
          viewBox='0 0 32 32'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
          aria-hidden='true'
          focusable='false'
        >
          <circle cx='16' cy='16' r='14' stroke='#60A5FA' strokeWidth='2' />
          <circle cx='16' cy='16' r='6' fill='#60A5FA' />
          <path
            d='M11 21 L16 16 L21 21'
            stroke='#60A5FA'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
        FitTrack
      </h1>

      <span
        className='text-xs sm:text-sm text-gray-300 ml-auto'
        aria-label='App version 1.1.0'
      >
        <span className='text-xs sm:text-sm text-blue-300 font-bold'>v</span>
        1.1.0
      </span>
    </header>
  )
}
