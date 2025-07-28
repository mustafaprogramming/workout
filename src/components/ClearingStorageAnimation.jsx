import { FaBroom, FaFolderOpen, FaRegFileAlt, FaUser } from 'react-icons/fa'
import { useCallback, useEffect, useState } from 'react'
import { SiOwncloud } from 'react-icons/si'
import {
  BsDatabaseFill,
  BsDatabase,
  BsTrash2Fill,
  BsTrash2,
} from 'react-icons/bs'
import { RiDatabase2Fill } from 'react-icons/ri'
const initialColors = [
  '#4ade80', // soft green
  '#facc15', // soft yellow
  '#60a5fa', // soft blue
  '#f87171', // soft red
  '#c084fc', // soft purple
  '#fef3c7', // pale amber
  '#9ca3af', // gray
  '#86efac', // pastel green
  '#fde68a', // pastel yellow
  '#93c5fd', // pastel blue
  '#fca5a5', // pastel red
  '#ddd6fe', // pastel violet
  '#e0f2fe', // pastel sky blue
  '#9ca3af', // gray
]

const dataArray = [
  {
    delay: '',
    right: '8px',
    bottom: '12px',
  },
  {
    delay: '',
    right: '24px',
    bottom: '-4px',
  },
  {
    delay: '-1.3s',
    left: '8px',
    bottom: '-2px',
  },
  {
    delay: '-1.5s',
    left: '24px',
    bottom: '16px',
  },
  {
    delay: '-1.6s',
    left: '16px',
    bottom: '4px',
  },
]

export function ClearingStorageAnimation() {
  const [showData, setShowData] = useState(dataArray)
  const [randomDust, setRandomDust] = useState(0)
  const [colors, setColors] = useState(initialColors)
  const [colorIndexes, setColorIndexes] = useState(
    dataArray.map(() => Math.floor(Math.random() * colors.length))
  )

  const shuffleArray = (array) => {
    return array
      .map((val) => ({ val, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ val }) => val)
  }

  const changeColors = () => {
    setColors((prev) => shuffleArray(prev))
    setColorIndexes(
      dataArray.map(() => Math.floor(Math.random() * colors.length))
    )
    let num = Math.floor(Math.random() * dataArray.length)
    let newArr = dataArray.slice(num, dataArray.length)
    setRandomDust(Math.floor(Math.random() * 7))
    setShowData(newArr)
  }

  useEffect(() => {
    const broom = document.getElementById('animation-broom')
    if (broom) {
      broom.addEventListener('animationiteration', changeColors)
    }
    return () => {
      if (broom) {
        broom.removeEventListener('animationiteration', changeColors)
      }
    }
  }, [])

  return (
    <div className='fixed inset-0 h-screen  w-screen overflow-hidden  select-none top-0 left-0 backdrop-blur-lg bg-opacity-20 bg-gray-900 z-[50] flex items-center justify-center'>
      <div className='backdrop-blur-md bg-orange-600/70 border border-g rounded-lg text-center relative sm:max-w-sm w-full max-w-[85vw] shadow-[5px_5px_0px_0px_#030712] flex flex-col items-center'>
        <h1
          id='clearing-data-progress'
          className="text-2xl font-bold my-10 text-white  after:content-['.'] after:animate-dots "
        >
          Clearing Data
          <span className='sr-only'>Clearing Data</span>
        </h1>

        <div className='relative mb-16 mt-4 w-[80px] h-[80px] flex items-center justify-center'>
          {/* Broom Icon */}
          <div className='relative  z-10 animate-clean' id='animation-broom'>
            <FaBroom className='text-6xl z-[2] text-amber-500 bottom-0' />
            <span className='bg-orange-900 w-[7.5px] h-[29px] absolute z-[1] rotate-[52deg] translate-y-[2px] translate-x-[1px] top-0 right-[10px]'></span>
          </div>
          {/* database icon */}
          <RiDatabase2Fill className='text-[65px] z-[1] absolute bottom-[-1px] translate-y-5 text-slate-700  ' />
          <BsDatabaseFill className='text-[65px] z-[1] absolute bottom-0 translate-y-5 text-slate-800  ' />
          <BsDatabase className='text-[65px] z-[1] absolute bottom-0 translate-y-5 text-slate-900  ' />

          {/* //file */}
          {showData.map((data, id) => {
            const colorIndex = colorIndexes[id] || 0
            const folder = id === Math.floor(Math.random() * showData.length)
            let styles
            let animation
            if (data.left && data.left !== '') {
              styles = {
                animationDelay: data.delay,
                bottom: data.bottom,
                left: data.left,
                color: colors[colorIndex],
              }
              animation = 'animate-dustLeft'
            } else {
              styles = {
                animationDelay: data.delay,
                bottom: data.bottom,
                right: data.right,
                color: colors[colorIndex],
              }
              animation = 'animate-dustRight'
            }
            if (folder) {
              return (
                <FaFolderOpen
                  key={id}
                  className={`text-2xl z-[4] absolute ${animation}`}
                  style={styles}
                />
              )
            } else {
              return (
                <FaRegFileAlt
                  key={id}
                  className={`text-2xl z-[3] absolute  ${animation}`}
                  style={styles}
                />
              )
            }
          })}

          {[...Array(randomDust)].map((_, i) => (
            <SiOwncloud
              key={i}
              className={`absolute z-[2] text-4xl text-yellow-950 blur-[2px] ${
                i % 2 === 0 ? 'animate-dustLeft' : 'animate-dustRight'
              }`}
              style={{
                bottom: `${0}px`, // Starts a bit lower and spreads more evenly
                left: `${i % 2 === 0 ? (0 + i) * 6 : 24 + i * 6}px`, // Slight left offset to avoid overlap
                animationDelay: `${i % 2 === 0 ? '-1.5' : '0'}s`, // Staggered animation
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const deletingData = [
  {
    delay: '0s',
    left: '20px',
    bottom: '25px',
  },
  {
    delay: '0.5s',
    left: '24px',
    bottom: '32px',
  },
  {
    delay: '1s',
    left: '18px',
    bottom: '30px',
  },
  {
    delay: '1.5s',
    left: '25px',
    bottom: '20px',
  },
  {
    delay: '1.3s',
    left: '35px',
    bottom: '25px',
  },
  {
    delay: '0.7s',
    left: '30px',
    bottom: '30px',
  },
]

export function DeletingAccountAnimation() {
  // We'll add a unique ID to each data item to solve the key issue
  const [animatedItems, setAnimatedItems] = useState(
    deletingData.map((item, index) => ({ ...item, id: index }))
  )
  const [colors, setColors] = useState(initialColors)

  // Use useCallback to memoize shuffleArray and prevent unnecessary re-renders
  const shuffleArray = useCallback((array) => {
    return array
      .map((val) => ({ val, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ val }) => val)
  }, [])

  const changeAnimationState = useCallback(() => {
    // Shuffle the colors array directly
    setColors((prevColors) => shuffleArray(prevColors))

    // Create new animated items with random colors and a unique ID for each
    const newAnimatedItems = deletingData.map((item, index) => ({
      ...item,
      id: `${Date.now()}-${index}-${Math.random()}`, // More robust unique ID
    }))

    // Randomly select a slice of the new animated items to display
    const num = Math.floor(Math.random() * newAnimatedItems.length)
    setAnimatedItems(newAnimatedItems.slice(num))
  }, [shuffleArray]) // Dependency on shuffleArray

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      changeAnimationState()
    }, 4000)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [animatedItems, colors, changeAnimationState]) // Dependencies for re-running effect

  return (
    <div className='fixed inset-0 h-screen w-screen overflow-hidden select-none top-0 left-0 backdrop-blur-lg bg-opacity-20 bg-gray-900 z-[50] flex items-center justify-center'>
      <div className='bg-red-600/70 backdrop-blur-md text-white rounded-lg text-center relative sm:max-w-sm max-w-[85vw] w-full shadow-[5px_5px_0px_0px_#030712] border border-gray-300 bg-opacity-75 flex flex-col items-center'>
        <h1
          id='deletion-account-progress'
          className="text-lg xs:text-xl sm:text-2xl font-bold sm:my-10 my-5 text-white after:content-['.'] after:animate-dots "
        >
          Deleting Data & Account
          <span className='sr-only'>Deleting Data & Account</span>
        </h1>
        <div className='relative mb-10 sm:mb-16 sm:mt-4 w-[200px] h-[100px] flex items-center justify-center '>
          {/* database icon */}
          <RiDatabase2Fill className='text-[65px] z-[1] absolute left-0 bottom-[-1px] translate-y-5 text-slate-700 ' />
          <BsDatabaseFill className='text-[65px] z-[1] absolute left-0 bottom-0 translate-y-5 text-slate-800 ' />
          <BsDatabase className='text-[65px] z-[1] absolute left-0 bottom-0 translate-y-5 text-slate-900 ' />
          {/* trash can  body */}
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 448 512'
            width={'50px'}
            height={'65px'}
            className='z-[5] absolute right-0 bottom-[-1px] translate-y-5 overflow-visible'
          >
            {/* Can body */}
            <path
              d='M416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z'
              fill={'#334155'}
            />
            {/* Inner lines (handles) */}

            <path
              d='M416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z'
              fill='none'
              stroke={'#0f172a'}
              strokeWidth='40'
              opacity='1'
            />
          </svg>
          {/* trash can  lid */}
          <svg
            key={animatedItems[0]?.id}
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 448 512'
            width={'50px'}
            height={'65px'}
            className='z-[5] absolute right-0 bottom-[-21px] overflow-visible animate-lid'
          >
            {/* Lid / Cap */}
            <path
              d='M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7z'
              fill={'#334155'}
            />
            <path
              d='M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7z'
              fill='none'
              stroke={'#0f172a'}
              strokeWidth='40'
              opacity='1'
            />
          </svg>
          {/* files */}
          {animatedItems.map((item, index) => {
            const color = colors[index % colors.length] // Use modulo for color cycling
            let styles = {
              animationDelay: item.delay,
              bottom: item.bottom,
              left: item.left,
              color: color,
            }

            // Determine which icon to render based on index
            if ((index + 1) % 5 === 0) {
              return (
                <FaUser
                  key={item.id} // Use the unique ID here
                  className={`z-[4] absolute animate-trash`}
                  style={styles}
                />
              )
            } else if ((index + 1) % 3 === 0) {
              return (
                <FaFolderOpen
                  key={item.id} // Use the unique ID here
                  className={`z-[3] absolute animate-trash`}
                  style={styles}
                />
              )
            } else {
              return (
                <FaRegFileAlt
                  key={item.id} // Use the unique ID here
                  className={`z-[2] absolute animate-trash`}
                  style={styles}
                />
              )
            }
          })}
        </div>
      </div>
    </div>
  )
}
