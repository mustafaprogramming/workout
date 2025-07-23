import { useState } from "react"

// Image Preview Modal
export default function ImagePreviewModal({ imageUrl, onClose, imageLabel }) {
  const [closing,setClosing]=useState(false)
  return (
    <div
      className='fixed inset-0 bg-gray-900 bg-opacity-20 backdrop-blur-lg flex justify-center items-center px-4 py-10 z-[60]'
      role='dialog'
      aria-modal='true'
      aria-labelledby='preview-image-title'
      aria-describedby='preview-image-description'
    >
      <div className={`bg-gray-950 sm:p-4 py-2 rounded-xl relative max-w-[500px] max-h-[90vh] flex flex-col shadow-[5px_5px_0px_0px_#030712] border ${closing?'border-red-800':'border-gray-800'}`}>
        <div className='flex gap-1 justify-between'>
          {imageLabel && (
            <p
              id='preview-image-title'
              className='text-xs text-gray-400 mb-3 mr-[50px] text-wrap break-all py-1 px-3 '
            >
              {imageLabel}
            </p>
          )}
          <button
            onClick={onClose}
            onMouseEnter={()=>setClosing(true)}
            onMouseLeave={()=>setClosing(false)}
            className='absolute top-0 right-0 text-gray-400 hover:text-gray-100 text-sm z-10 px-3 py-1 bg-gray-800  hover:bg-red-800 flex items-center justify-center rounded-bl-xl rounded-tr-md'
            aria-label='Close image preview'
          >
            close
          </button>
        </div>
        <div className='flex justify-center items-center overflow-hidden bg-gray-900'>
          <img
            src={imageUrl}
            alt={imageLabel || 'Full size preview'}
            className='w-auto h-auto max-w-full max-h-full object-contain  mx-auto'
            onError={(e) => {
              e.target.onerror = null
              e.target.src =
                'https://placehold.co/800x600/4a5568/a0aec0?text=Image+Load+Error'
            }}
          />
        </div>
        {imageUrl && (
          <p
            id='preview-image-description'
            className='text-xs text-gray-400  py-1 px-3  mb-1 mt-3 break-all text-wrap'
          >
            {imageUrl}
          </p>
        )}
      </div>
    </div>
  )
}
