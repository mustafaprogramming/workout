import { useEffect, useState } from 'react'
import { copyToClipboard } from '../util/utils'
import Modal from './Modal' // Assuming you have a generic Modal component

// Image Preview Modal
export default function ImagePreviewModal({ imageUrl, onClose, imageLabel }) {
  const [copied, setCopied] = useState('')
  // Prevent body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])
  return (
    <div className='bg-gray-800 px-2 fixed top-0 left-0 w-screen h-screen flex flex-col z-50'>
      {/* Header */}
      <div className='flex justify-between items-start py-2'>
        {imageLabel && (
          <p
            id='preview-image-title'
            className='text-sm text-gray-200  break-words line-clamp-2 py-1 capitalize'
          >
            {imageLabel}
          </p>
        )}
      </div>

      {/* Image Container */}
      <div className='flex-grow flex justify-center items-center bg-gray-900 border border-gray-950 rounded-sm max-h-[calc(100vh-138px)]  '>
        <img
          src={imageUrl}
          alt={imageLabel || 'Full size preview'}
          className='max-w-full max-h-full object-contain'
          onError={(e) => {
            e.target.onerror = null
            e.target.src =
              'https://placehold.co/800x600/4a5568/a0aec0?text=Image+Load+Error'
          }}
        />
      </div>

      {/* Actions */}
      <div className='flex flex-col gap-2 pt-2 pb-4'>
        {imageUrl && (
          <div className='flex gap-3 items-center border border-gray-950 bg-gray-700 text-nowrap rounded shadow-[3px_3px_0px_0px_#030712] justify-between'>
            <span className='text-xs overflow-hidden line-clamp-1 text-wrap text-gray-300 break-all  pl-2'>
              {imageUrl}
            </span>
            <button
              onClick={() => copyToClipboard(imageUrl, setCopied)}
              className='text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 border border-gray-950 text-nowrap shadow-[3px_3px_0px_0px_#030712] transition'
              aria-label={
                copied == imageUrl
                  ? 'Image URL copied to clipboard'
                  : 'Copy image URL to clipboard'
              }
            >
              {copied == imageUrl ? '✨ copied!' : '📋 copy link'}
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          className='text-gray-200 hover:text-gray-50 text-base px-6 py-1 border border-gray-950 rounded-lg shadow-[3px_3px_0px_0px_#030712] bg-red-600 hover:bg-red-500 transition'
          aria-label='Close image preview'
        >
          close
        </button>
      </div>
    </div>
  )
}

export function ImagePreviewModalGallery({
  imageDate,
  imageUrl,
  imageLabel,
  onClose,
  canDelete = false, // New prop: boolean to enable/disable delete
  onDeleteImage, // New prop: function to call on delete
  deleteTooltip = "This image cannot be deleted from here as it's part of a measurement entry.", // New prop: tooltip for disabled delete
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [copied, setCopied] = useState('')

  const handleDeleteClick = () => {
    setShowConfirmDelete(true)
  }

  const confirmDelete = () => {
    onDeleteImage() // Call the passed delete function
    setShowConfirmDelete(false)
    setTimeout(() => {
      onClose()
    }, 50)
  }
  // Prevent body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])
  return (
    <div className='bg-gray-800  px-2 fixed top-0 left-0 w-screen h-screen flex flex-col z-50'>
      <div className='flex justify-between items-center py-2'>
        <h3 className='text-sm text-gray-200  break-words line-clamp-2 py-1 capitalize max-w-[calc(100%-60px)] '>
          {imageLabel || 'Image Preview'}
        </h3>
        <p className='text-xs text-gray-300'>{imageDate}</p>
      </div>

      <div className='flex-grow flex justify-center items-center bg-gray-900 border border-gray-950 rounded-sm max-h-[calc(100vh-138px)] '>
        <img
          src={imageUrl}
          alt={imageLabel || 'Preview'}
          className='max-w-full max-h-full  object-contain '
          onError={(e) => {
            e.target.onerror = null
            e.target.src =
              'https://placehold.co/600x400/4a5568/a0aec0?text=Image+Load+Error'
          }}
        />
      </div>
      <div className='pt-2 pb-4'>
        {imageUrl && (
          <div className='flex gap-3 items-center border border-gray-950 bg-gray-700 text-nowrap rounded shadow-[3px_3px_0px_0px_#030712] justify-between mb-2'>
            <span className='text-xs overflow-hidden line-clamp-1 text-wrap text-gray-300 break-all  pl-2'>
              {imageUrl}
            </span>
            <button
              onClick={() => copyToClipboard(imageUrl, setCopied)}
              className='text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 border border-gray-950 text-nowrap shadow-[3px_3px_0px_0px_#030712] transition'
              aria-label={
                copied == imageUrl
                  ? 'Image URL copied to clipboard'
                  : 'Copy image URL to clipboard'
              }
            >
              {copied == imageUrl ? '✨ copied!' : '📋 copy link'}
            </button>
          </div>
        )}
        <div className='flex items-center space-x-3 '>
          {canDelete ? (
            <button
              onClick={handleDeleteClick}
              className='px-4 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full text-nowrap'
              aria-label='Delete image'
            >
              🗑️ Delete Image
            </button>
          ) : (
            <button
              disabled
              className='px-4 py-1 bg-gray-700 text-gray-400 rounded-md cursor-not-allowed relative group shadow-[4px_4px_0px_0px_#030712] border text-nowrap border-gray-950 w-full'
              aria-label='Cannot delete image'
            >
              🗑️ Delete Image
              <span className='absolute bottom-full left-1 mb-2 px-3 py-1 bg-gray-500 text-white text-xs sm:text-sm md:text-base rounded-md opacity-0 group-hover:opacity-100  transition-opacity duration-300 text-wrap w-[200px] sm:w-[300px] md:w-[500px]'>
                {deleteTooltip}
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            className={`px-4 py-1 text-white rounded-md ${canDelete?'bg-gray-900 hover:bg-gray-700':'bg-red-600 hover:bg-red-500'} transition-colors shadow-[4px_4px_0px_0px_#030712] w-full border border-gray-950`}
            aria-label='Close image preview '
          >
            Close
          </button>
        </div>

        {showConfirmDelete && (
          <Modal onClose={() => setShowConfirmDelete(false)}>
            <h3 className='text-xl font-bold text-red-400 mb-4 mr-[34px]'>
              Confirm Deletion
            </h3>
            <p className='text-gray-200 mb-6'>
              Are you sure you want to permanently delete this image? This
              cannot be undone.
            </p>
            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className='px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
              >
                Delete
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}
