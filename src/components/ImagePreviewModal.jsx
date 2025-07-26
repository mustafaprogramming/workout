import { useEffect, useRef, useState } from 'react'
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
      <div className='flex justify-between items-start py-2 min-h-[44px]'>
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
      <div className='flex flex-col gap-2 pt-2 pb-4 min-h-[94px]'>
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
  canDelete = false,
  onDeleteImage,
  deleteTooltip = "This image cannot be deleted from here as it's part of a measurement entry.",
  imageData,
  onEditLabel,
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [copied, setCopied] = useState('')
  // --- NEW STATE FOR EDITING ---
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editableLabel, setEditableLabel] = useState(imageLabel)
  // --- END NEW STATE ---
  const imageLabelRef = useRef(null)
  const imageActionsRef = useRef(null)
  const [imageSize, setImageSize] = useState(0)
  function changeImageHeight() {
    const windowHeight = window.innerHeight
    const label = window.getComputedStyle(imageLabelRef.current)
    const actions = window.getComputedStyle(imageActionsRef.current)
    const labelHeight = parseFloat(label.height)
    const actionsHeight = parseFloat(actions.height)
    const imageHeight = windowHeight - labelHeight - actionsHeight
    setImageSize(imageHeight)
  }

  useEffect(() => {
    changeImageHeight()
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('resize', changeImageHeight)
    return () => {
      window.removeEventListener('resize', changeImageHeight)
      document.body.style.overflow = originalOverflow
    }
  }, [isEditingLabel])

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

  // --- NEW: Handle saving the edited label ---
  const handleSaveLabel = () => {
    if (editableLabel.trim() === '') {
      // Optionally add a message for empty label
      alert('Image label cannot be empty!') // Using alert for simplicity, replace with custom modal if needed
      return
    }
    onEditLabel(imageData, editableLabel.trim()) // Call the passed edit function
    setIsEditingLabel(false) // Exit editing mode
  }
  // --- END NEW ---

  // Reset editableLabel if imageLabel prop changes (e.g., new image selected)
  useEffect(() => {
    setEditableLabel(imageLabel)
    setIsEditingLabel(false) // Ensure not in edit mode if image changes
  }, [imageLabel])

  return (
    <div className='bg-gray-800  px-2 fixed top-0 left-0 w-screen h-screen flex flex-col justify-end z-50'>
      <div
        ref={imageLabelRef}
        className='flex justify-between items-center py-2 '
      >
        {/* --- UPDATED: Conditional rendering for label/input --- */}
        {isEditingLabel ? (
          <input
            type='text'
            value={editableLabel}
            onChange={(e) => setEditableLabel(e.target.value)}
            className='flex-grow p-1 bg-gray-700 border border-gray-600 rounded-md text-gray-100 text-sm'
            aria-label='Edit image label'
          />
        ) : (
          <h3 className='text-sm text-gray-200 break-words line-clamp-2 py-1 capitalize max-w-[calc(100%-60px)]'>
            {imageLabel || 'Image Preview'}
          </h3>
        )}
        {/* --- END UPDATED --- */}
        <p className='text-xs text-gray-300 ml-3'>{imageDate}</p>
      </div>

      <div
        className=' flex justify-center items-center bg-gray-900 border border-gray-950 rounded-sm'
        style={{ height: `${imageSize}px` }}
      >
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
      <div ref={imageActionsRef} className='pt-2 pb-4 '>
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
        <div
          className={`flex flex-col justify-center gap-3 text-sm sm:text-base`}
        >
          <div className='flex gap-3'>
            {/* --- NEW: Edit Label Button / Save/Cancel Buttons --- */}
            {isEditingLabel ? (
              <>
                <button
                  onClick={handleSaveLabel}
                  className=' bg-green-600 sm:px-4 sm:py-1 px-2 py-0.5 text-white rounded-md hover:bg-green-700 transition-colors shadow-[2px_2px_0px_0px_#030712]  border border-gray-950 w-full text-nowrap'
                  aria-label='Save image label'
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingLabel(false)
                    setEditableLabel(imageLabel) // Revert to original label
                  }}
                  className=' bg-gray-600 sm:px-4 sm:py-1 px-2 py-0.5 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[2px_2px_0px_0px_#030712]  border border-gray-950 w-full text-nowrap'
                  aria-label='Cancel label edit'
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingLabel(true)}
                className='sm:px-4 sm:py-1 px-2 py-0.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full text-nowrap'
                aria-label='Edit image label'
              >
                ✏️ Edit Label
              </button>
            )}
          </div>
          {/* --- END NEW --- */}
          <div className='flex gap-3'>
            {canDelete ? (
              <button
                onClick={handleDeleteClick}
                className={`sm:px-4 sm:py-1 px-2 py-0.5 
                  ${
                    isEditingLabel
                      ? 'bg-red-700 text-gray-300'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }   rounded-md  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full text-nowrap'
                aria-label='Delete image`}
                disabled={isEditingLabel}
              >
                🗑️ Delete Image
              </button>
            ) : (
              <button
                disabled
                className='sm:px-4 sm:py-1 px-2 py-0.5 bg-gray-700 text-gray-400 rounded-md cursor-not-allowed relative group shadow-[4px_4px_0px_0px_#030712] border text-nowrap border-gray-950 w-full'
                aria-label='Cannot delete image'
              >
                🗑️ Delete Image
                <span className='absolute bottom-full left-1 mb-2 px-3 py-1 bg-gray-500 text-white text-xs sm:text-sm md:text-base rounded-md opacity-0 group-hover:opacity-100 group-hover:h-fit  transition-opacity duration-300 text-wrap w-[200px] sm:w-[300px] md:w-[500px] select-none pointer-events-none'>
                  {deleteTooltip}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className={`sm:px-4 sm:py-1 px-2 py-0.5  rounded-md ${
                canDelete
                  ? `${
                      isEditingLabel
                        ? 'bg-gray-950 text-gray-300'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`
                  : `${
                      isEditingLabel
                        ? 'bg-red-900 text-gray-300'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    } `
              } transition-colors shadow-[4px_4px_0px_0px_#030712] w-full border border-gray-950`}
              aria-label='Close image preview '
              disabled={isEditingLabel}
            >
              Close
            </button>
          </div>
        </div>

        {showConfirmDelete && (
          <Modal onClose={() => setShowConfirmDelete(false)}>
            <h3 className='text-lg sm:text-xl font-bold text-red-400 mb-4 mr-[34px]'>
              Confirm Deletion
            </h3>
            <p className='text-gray-200 mb-6 text-sm sm:text-base'>
              Are you sure you want to permanently delete this image? This
              cannot be undone.
            </p>
            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
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
