import ImagePreviewModal from './ImagePreviewModal'
import Modal from './Modal'
import { useState } from 'react' // Removed useEffect as it's not used in this component
import { useFirebase } from '../context/FirebaseContext' // Import useFirebase
import {
  uploadImageToCloudinary,
  deleteCloudinaryImage,
} from '../util/cloudinaryUtils' 
export default function MeasurementModal({
  monthData,
  onClose,
  onSave,
  onClearData,
}) {
  const { db, userId } = useFirebase() // Get db and userId from context (storage is not needed here)

  // Use a fixed app ID for Firestore path as __app_id is not available locally
  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

  const [formData, setFormData] = useState(() => {
    const initialData = monthData || {}
    // Ensure imageUrls is an array and each image object has necessary properties
    return {
      ...initialData,
      imageUrls:
        initialData.imageUrls && Array.isArray(initialData.imageUrls)
          ? initialData.imageUrls.map((img) => ({
              ...img,
              file: null, // No file object for existing images
              uploading: false,
              progress: 0,
              // public_id will exist for uploaded images
            }))
          : [{ url: '', label: '', file: null, uploading: false, progress: 0 }], // Default empty entry
    }
  })

  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageLabel, setPreviewImageLabel] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false)
  const [uploadingOverall, setUploadingOverall] = useState(false) // Overall upload status

  const handleFieldChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageURLChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedUrls = [...prev.imageUrls] // Use prev.imageUrls for reliable update
      updatedUrls[index] = { ...updatedUrls[index], [field]: value }
      return { ...prev, imageUrls: updatedUrls }
    })
  }

  const handleFileChange = (index, e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData((prev) => {
        const updatedUrls = [...prev.imageUrls] // Use prev.imageUrls for reliable update
        updatedUrls[index] = {
          ...updatedUrls[index],
          file: file, // Store the actual file object
          url: URL.createObjectURL(file), // Local preview URL
          uploading: false, // Not yet uploading
          progress: 0,
          public_id: null, // Will be set after upload
        }
        return { ...prev, imageUrls: updatedUrls }
      })
    }
  }

  const handleAddImageField = () => {
    if (formData.imageUrls.length < 10) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: [
          ...prev.imageUrls,
          { url: '', label: '', file: null, uploading: false, progress: 0 },
        ],
      }))
    } else {
      setMessage('Maximum of 10 images allowed.')
      setMessageType('error')
    }
  }

  const handleRemoveImageField = async (indexToRemove) => {
    const imageToRemove = formData.imageUrls[indexToRemove]

    // If the image was already uploaded (has a public_id), delete it from Cloudinary
    if (imageToRemove.public_id) {
      try {
        await deleteCloudinaryImage(imageToRemove.public_id) // Call Cloudinary deletion utility
        console.log(
          `Requested deletion for Cloudinary image: ${imageToRemove.public_id}`
        )
        setMessage('Image deletion requested from Cloudinary.')
        setMessageType('success')
      } catch (e) {
        console.error(
          `Error deleting Cloudinary image ${imageToRemove.public_id}:`,
          e
        )
        setMessage('Failed to delete image from Cloudinary.')
        setMessageType('error')
      }
    } else if (imageToRemove.file) {
      // If it was a locally selected file not yet uploaded, revoke the object URL
      URL.revokeObjectURL(imageToRemove.url)
    }

    // Remove the image entry from formData
    setFormData((prev) => {
      const updatedUrls = prev.imageUrls.filter(
        // Use prev.imageUrls for reliable update
        (_, i) => i !== indexToRemove
      )
      return {
        ...prev,
        imageUrls:
          updatedUrls.length > 0 ? updatedUrls : [{ url: '', label: '' }], // Ensure at least one empty field
      }
    })
  }

  const handleImageClick = (url, label) => {
    setPreviewImageUrl(url)
    setPreviewImageLabel(label)
    setShowImagePreview(true)
  }

  const handleImageKeyPress = (e, url, label) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleImageClick(url, label)
    }
  }

  const measurementFields = [
    { label: 'Weight (kg)', key: 'weight', type: 'number', optional: true },
    { label: 'Body Fat (%)', key: 'bodyFat', type: 'number', optional: true },
    { label: 'Chest (in)', key: 'chest', type: 'number', optional: false },
    { label: 'Waist (in)', key: 'waist', type: 'number', optional: false },
    { label: 'Neck (in)', key: 'neck', type: 'number', optional: false },
    {
      label: 'Forearms (in)',
      key: 'forearms',
      type: 'number',
      optional: false,
    },
    { label: 'Bicep (in)', key: 'bicep', type: 'number', optional: false },
    { label: 'Hips (in)', key: 'hips', type: 'number', optional: false },
    { label: 'Quads (in)', key: 'quads', type: 'number', optional: false },
    { label: 'Calves (in)', key: 'calves', type: 'number', optional: false },
  ]

  const handleSaveClick = async () => {
    // Validate required numerical fields
    const requiredFields = measurementFields.filter((field) => !field.optional)
    for (const field of requiredFields) {
      if (!formData[field.key] || String(formData[field.key]).trim() === '') {
        setMessage(`Please enter a value for ${field.label}.`)
        setMessageType('error')
        return
      }
    }

    setUploadingOverall(true) // Start overall loading indicator
    setMessage('Saving measurement and uploading images...')
    setMessageType('info')

    // Create promises for all image operations (uploads or just keeping existing data)
    const imageOperationPromises = formData.imageUrls.map(async (img, i) => {
      if (img.file && !img.uploading) {
        // This is a new file to upload
        // Update state for individual image progress/uploading status (for UI feedback)
        setFormData((prev) => {
          const newImages = [...prev.imageUrls]
          newImages[i] = { ...newImages[i], uploading: true, progress: 0 }
          return { ...prev, imageUrls: newImages }
        })

        try {
          // Simulate progress (Cloudinary direct upload doesn't offer granular progress easily)
          setFormData((prev) => {
            const newImages = [...prev.imageUrls]
            newImages[i] = { ...newImages[i], progress: 50 }
            return { ...prev, imageUrls: newImages }
          })

          const uploadResult = await uploadImageToCloudinary(img.file, userId)

          // Update state for this specific image's completion (for UI feedback)
          setFormData((prev) => {
            const newImages = [...prev.imageUrls]
            newImages[i] = {
              ...newImages[i],
              url: uploadResult.url,
              public_id: uploadResult.public_id,
              file: null,
              uploading: false,
              progress: 100,
            }
            return { ...prev, imageUrls: newImages }
          })

          // Return the successfully uploaded image object
          return {
            url: uploadResult.url,
            label: img.label,
            public_id: uploadResult.public_id,
          }
        } catch (error) {
          console.error('Cloudinary upload failed:', error)
          setMessage(
            `Image upload failed for ${img.file.name}: ${error.message}`
          )
          setMessageType('error')
          // Reset status on error for this specific image in UI
          setFormData((prev) => {
            const newImages = [...prev.imageUrls]
            newImages[i] = { ...newImages[i], uploading: false, progress: 0 }
            return { ...prev, imageUrls: newImages }
          })
          return null // Indicate failure for this image
        }
      } else {
        // This is an existing image or an empty field, just return its current data
        // Filter out temporary properties like 'file', 'uploading', 'progress'
        const { file, uploading, progress, ...rest } = img
        return rest
      }
    })

    try {
      // Wait for all image operations to complete
      const resolvedImages = await Promise.all(imageOperationPromises)

      // Filter out any nulls (failed uploads) and empty URLs
      const finalImageUrlsToSave = resolvedImages.filter(
        (img) => img && img.url && img.url.trim() !== ''
      )

      // Prepare final data to save to Firestore
      const dataToSave = {
        ...formData, // Keep other form data
        imageUrls: finalImageUrlsToSave, // Save only valid and uploaded images
      }

      // Call the onSave prop with the updated data
      onSave(dataToSave)
      setMessage('Measurement and images saved successfully!')
      setMessageType('success')

      // Finally, update the component's internal state with the cleaned and uploaded image URLs
      setFormData((prev) => ({ ...prev, imageUrls: finalImageUrlsToSave }))
    } catch (error) {
      console.error('Error during save or upload:', error)
      setMessage('Failed to save measurement or upload some images.')
      setMessageType('error')
    } finally {
      setUploadingOverall(false) // End overall loading indicator
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className='text-lg sm:text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
        Measurements for{' '}
        {new Date(formData.date).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        })}
      </h3>

      {message && (
        <div
          className={`sm:p-3 sm:mb-4 p-1.5 mb-2 rounded-md text-center ${
            messageType === 'success'
              ? 'bg-green-800 text-green-200'
              : 'bg-red-800 text-red-200'
          }`}
        >
          {message}
        </div>
      )}

      <div className='overflow-y-scroll overflow-x-hidden max-h-[60vh] pr-2'>
        <div className='grid grid-cols-1 md:grid-cols-2 sm:gap-4 gap-2 mb-4 text-sm sm:text-base'>
          {measurementFields.map((field) => (
            <label key={field.key} className='block'>
              <span className='text-gray-300 sm:text-base text-sm'>
                {field.label} {field.optional ? '(Optional)' : '(Required)'}:
              </span>
              <input
                type={field.type}
                step='0.1'
                name={field.key}
                value={formData[field.key] || ''}
                onChange={handleFieldChange}
                placeholder={field.label}
                required={!field.optional}
                className='sm:p-3 p-1.5 mt-1 w-full bg-gray-800 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 text-sm sm:text-base'
                disabled={uploadingOverall} // Disable inputs during upload
              />
            </label>
          ))}
          <label className='block col-span-full'>
            <span className='text-gray-300 text-sm sm:text-base'>
              Notes (optional):
            </span>
            <textarea
              name='notes'
              value={formData.notes || ''}
              onChange={handleFieldChange}
              rows='3'
              placeholder="Any additional notes for this month's measurements..."
              className='sm:p-3 p-1.5 mt-1 w-full bg-gray-800 shadow-[4px_4px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 text-sm sm:text-base'
              disabled={uploadingOverall} // Disable inputs during upload
            />
          </label>
        </div>

        <h4 className='text-lg font-semibold text-gray-200 mb-2'>
          Physique Pictures (Optional)
        </h4>
        <div className='space-y-3 mb-4 flex flex-col'>
          {formData.imageUrls.map((img, index) => (
            <div
              key={index}
              className='flex flex-col sm:flex-row gap-2 text-sm sm:text-base pb-1 items-center overflow-auto'
            >
              {/* Image Preview / File Input */}
              {img.url && !img.file ? ( // Already uploaded or external URL
                <div
                  className='relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden border border-gray-700 flex-shrink-0'
                  tabIndex={-1} // Make it not focusable by tab
                  aria-label={`Image: ${img.label || `Image ${index + 1}`}`}
                >
                  <img
                    src={img.url}
                    alt={img.label || `Physique Image ${index + 1}`}
                    className='w-full h-full object-cover'
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src =
                        'https://placehold.co/96x96/4a5568/a0aec0?text=Error'
                    }}
                  />
                  {img.label && (
                    <span className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate'>
                      {img.label}
                    </span>
                  )}
                </div>
              ) : img.file ? ( // Local file selected, showing preview
                <div className='relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden border border-blue-500 flex-shrink-0'>
                  <img
                    src={img.url}
                    alt='Local preview'
                    className='w-full h-full object-cover'
                  />
                  {img.uploading && (
                    <div className='absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white text-xs'>
                      Uploading: {Math.round(img.progress)}%
                    </div>
                  )}
                </div>
              ) : (
                // No image selected, show file input
                <label className='w-20 h-20 sm:w-24 sm:h-24 border border-dashed border-gray-600 rounded-md flex items-center justify-center cursor-pointer flex-shrink-0 bg-gray-900 hover:bg-gray-800 transition-colors'>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={(e) => handleFileChange(index, e)}
                    className='hidden'
                    disabled={uploadingOverall}
                    aria-label={`Upload image ${index + 1}`}
                  />
                  <span className='text-gray-400 text-3xl'>+</span>
                </label>
              )}

              {/* URL Input (if no file selected or for external images) */}
              {!img.file && (
                <input
                  type='url'
                  placeholder={`Image ${index + 1} URL`}
                  value={img.url}
                  onChange={(e) =>
                    handleImageURLChange(index, 'url', e.target.value)
                  }
                  className='flex-grow sm:p-3 p-1.5 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
                  disabled={uploadingOverall}
                />
              )}

              {/* Label Input */}
              <input
                type='text'
                placeholder='Label (e.g., Front Pose)'
                value={img.label}
                onChange={(e) =>
                  handleImageURLChange(index, 'label', e.target.value)
                }
                className='flex-grow sm:p-3 p-1.5 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
                disabled={uploadingOverall}
              />

              {/* Remove Button */}
              {formData.imageUrls.length > 1 && (
                <button
                  onClick={() => handleRemoveImageField(index)}
                  className='sm:p-2 p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors sm:mr-1 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 mr-1 flex-shrink-0'
                  disabled={uploadingOverall}
                  aria-label={`Remove image ${index + 1}`}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
          {formData.imageUrls.length < 10 && (
            <button
              onClick={handleAddImageField}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full text-sm sm:text-base'
              disabled={uploadingOverall}
            >
              ➕ Add Another Image
            </button>
          )}
          {formData.imageUrls.filter((img) => img.url).length > 0 && (
            <div className='mt-4'>
              <h4 className='font-semibold text-gray-200 mb-2'>
                Current Images:
              </h4>
              <div className='flex overflow-x-auto sm:gap-4 gap-2 pb-3'>
                {formData.imageUrls
                  .filter((img) => img.url)
                  .map((img, idx) => (
                    <div
                      key={idx}
                      role='button'
                      tabIndex={0}
                      onClick={() => handleImageClick(img.url, img.label)}
                      onKeyDown={(e) =>
                        handleImageKeyPress(e, img.url, img.label)
                      }
                      className='bg-gray-950 p-2 rounded-lg cursor-pointer w-fit max-w-[110px] sm:max-w-[160px] md:max-w-[210px] border border-gray-800 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[5px_5px_0px_0px_#030712] duration-500'
                      aria-label={`Preview image: ${
                        img.label || `Physique Image ${idx + 1}`
                      }`}
                    >
                      {img.label && (
                        <p className='text-xs text-gray-400 mb-1 truncate'>
                          {img.label}
                        </p>
                      )}
                      <img
                        src={img.url}
                        alt={img.label || `Physique Image ${idx + 1}`}
                        className='w-full object-cover rounded-sm mb-2 max-w-[100px] max-h-[100px] sm:max-w-[150px] sm:max-h-[150px] md:max-w-[200px] md:max-h-[200px] overflow-hidden bg-center mx-auto'
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src =
                            'https://placehold.co/300x200/4a5568/a0aec0?text=Image+Load+Error'
                        }}
                      />
                      <p className='text-xs text-gray-500 truncate'>
                        {img.url}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-gray-700'>
        {Object.keys(monthData).length > 1 && (
          <button
            onClick={() => setShowConfirmClearModal(true)}
            className='px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            disabled={uploadingOverall} // Disable during upload
          >
            🧹 Clear Data
          </button>
        )}
        <button
          onClick={handleSaveClick}
          className='px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
          disabled={uploadingOverall} // Disable during upload
        >
          {uploadingOverall ? 'Uploading...' : 'Save Measurement'}
        </button>
      </div>

      {showImagePreview && (
        <ImagePreviewModal
          imageUrl={previewImageUrl}
          imageLabel={previewImageLabel}
          onClose={() => setShowImagePreview(false)}
        />
      )}

      {showConfirmClearModal && (
        <Modal onClose={() => setShowConfirmClearModal(false)}>
          <h3 className='text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
            Confirm Clear Data
          </h3>
          <p className='text-gray-200 mb-6'>
            Are you sure you want to clear all measurement data for this month?
            This will make it appear as "not logged" again, but the month entry
            itself will remain.
          </p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowConfirmClearModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClearData(formData.date)
                setShowConfirmClearModal(false)
              }}
              className='px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            >
              Clear Data
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
