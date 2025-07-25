import ImagePreviewModal from './ImagePreviewModal'
import Modal from './Modal'
import { useState } from 'react'
import { useFirebase } from '../context/FirebaseContext'
import {
  uploadImageToCloudinary,
  deleteCloudinaryImage,
} from '../util/cloudinaryUtils'
import { doc, setDoc } from 'firebase/firestore' // Import setDoc and doc
import { useMessage } from '../context/MessageContext'

export default function MeasurementModal({
  monthData,
  onClose,
  onSave,
  onClearData,
  Clearable,
}) {
  const { db, userId } = useFirebase()
  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

  const [formData, setFormData] = useState(() => {
    const initialData = monthData || {}
    return {
      ...initialData,
      imageUrls:
        initialData.imageUrls && Array.isArray(initialData.imageUrls)
          ? initialData.imageUrls.map((img) => ({
              ...img,
              file: null,
              uploading: false,
              progress: 0,
            }))
          : [{ url: '', label: '', file: null, uploading: false, progress: 0 }],
    }
  })

  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageLabel, setPreviewImageLabel] = useState('')
  const { setMessage, setMessageType } = useMessage()
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false)
  const [uploadingOverall, setUploadingOverall] = useState(false)

  const handleFieldChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageURLChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedUrls = [...prev.imageUrls]
      updatedUrls[index] = { ...updatedUrls[index], [field]: value }
      return { ...prev, imageUrls: updatedUrls }
    })
  }

  const handleFileChange = (index, e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData((prev) => {
        const updatedUrls = [...prev.imageUrls]
        updatedUrls[index] = {
          ...updatedUrls[index],
          file: file,
          url: URL.createObjectURL(file),
          uploading: false,
          progress: 0,
          public_id: null,
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
    // Create the new array of image URLs *before* any async operations
    const updatedImageUrlsLocally = formData.imageUrls.filter(
      (_, i) => i !== indexToRemove
    )

    let deletionSuccessfulFromCloudinary = false
    setUploadingOverall(true)

    if (imageToRemove.public_id) {
      try {
        await deleteCloudinaryImage(imageToRemove.public_id)
        setMessage('Image deletion requested from Cloudinary.')
        setMessageType('success')
        deletionSuccessfulFromCloudinary = true
      } catch (e) {
        console.error(
          `Error deleting Cloudinary image :`,
          e
        )
        setMessage('Failed to delete image from Cloudinary.')
        setMessageType('error')
        // deletionSuccessfulFromCloudinary remains false
      }
    } else if (imageToRemove.file) {
      // If it's a local file (blob URL) that hasn't been uploaded yet
      URL.revokeObjectURL(imageToRemove.url)
      // No Cloudinary deletion needed, consider it "successful" for local state update
      deletionSuccessfulFromCloudinary = true
    } else {
      // If it's just an empty field or a URL that was never uploaded
      deletionSuccessfulFromCloudinary = true
    }

    // Update local state immediately with the filtered array
    setFormData((prev) => {
      return {
        ...prev,
        imageUrls: updatedImageUrlsLocally,
      }
    })

    // --- NEW: Immediately save updated imageUrls to Firestore if a Cloudinary image was involved ---
    // This ensures consistency even if the user closes without hitting "Save Measurement"
    if (
      db &&
      userId &&
      formData.date &&
      (imageToRemove.public_id || imageToRemove.file)
    ) {
      const dateKey = formData.date
      const docRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/measurements`,
        dateKey
      )
      try {
        // Prepare the array for Firestore: remove 'file', 'uploading', 'progress' properties
        const imageUrlsToSave = updatedImageUrlsLocally.map(
          ({ url, label, public_id }) => ({ url, label, public_id })
        )

        await setDoc(docRef, { imageUrls: imageUrlsToSave }, { merge: true }) // Merge to only update imageUrls
        setMessage('Image list updated.') // More generic message
        setMessageType('success')
      } catch (e) {
        console.error('Error saving updated imageUrls to Firestore:', e)
        setMessage('Image removed, but failed to update database record.')
        setMessageType('error')
      }
    }
    // --- END NEW ---
    setUploadingOverall(false)
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
  const handleCleardata = async () => {
    setUploadingOverall(true)
    setShowConfirmClearModal(false)
    await onClearData(formData.date)
    setUploadingOverall(false)
  }
  const handleSaveClick = async () => {
    const requiredFields = measurementFields.filter((field) => !field.optional)
    for (const field of requiredFields) {
      if (!formData[field.key] || String(formData[field.key]).trim() === '') {
        setMessage(`Please enter a value for ${field.label}.`)
        setMessageType('error')
        return
      }
    }
    const imageUrls = formData.imageUrls
    for (const image of imageUrls) {
      if (
        (!image.label || String(image.label).trim() === '') &&
        (image.url || String(image.url).trim() !== '')
      ) {
        setMessage(`Please enter label for image.`)
        setMessageType('error')
        return
      }
    }

    setUploadingOverall(true)
    setMessage('Saving measurement and uploading images...')
    setMessageType('info')

    const imageOperationPromises = formData.imageUrls.map(async (img, i) => {
      if (img.file && !img.uploading) {
        setFormData((prev) => {
          const newImages = [...prev.imageUrls]
          newImages[i] = { ...newImages[i], uploading: true, progress: 0 }
          return { ...prev, imageUrls: newImages }
        })

        try {
          setFormData((prev) => {
            const newImages = [...prev.imageUrls]
            newImages[i] = { ...newImages[i], progress: 50 }
            return { ...prev, imageUrls: newImages }
          })

          const uploadResult = await uploadImageToCloudinary(img.file, userId)

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
          setFormData((prev) => {
            const newImages = [...prev.imageUrls]
            newImages[i] = { ...newImages[i], uploading: false, progress: 0 }
            return { ...prev, imageUrls: newImages }
          })
          return null
        }
      } else {
        const { file, uploading, progress, ...rest } = img
        return rest
      }
    })

    try {
      const resolvedImages = await Promise.all(imageOperationPromises)

      const finalImageUrlsToSave = resolvedImages.filter(
        (img) => img && img.url && img.url.trim() !== ''
      )

      const dataToSave = {
        ...formData,
        imageUrls: finalImageUrlsToSave,
      }

      onSave(dataToSave)

      setFormData((prev) => ({ ...prev, imageUrls: finalImageUrlsToSave }))
    } catch (error) {
      console.error('Error during save or upload:', error)
      setMessage('Failed to save measurement or upload some images.')
      setMessageType('error')
    } finally {
      setUploadingOverall(false)
    }
  }

  return (
    <Modal onClose={onClose} disableClose={uploadingOverall}>
      <h3 className='text-lg sm:text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
        Measurements for{' '}
        {new Date(formData.date).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        })}
      </h3>

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
                disabled={uploadingOverall}
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
              disabled={uploadingOverall}
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
              className='flex flex-row gap-2 text-sm sm:text-base pb-1 items-center overflow-auto'
            >
              {/* Image Preview / File Input */}
              {img.url && !img.file ? (
                <div
                  className='relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden border border-gray-700 flex-shrink-0'
                  tabIndex={-1}
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
              ) : img.file ? (
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

              <button
                onClick={() => handleRemoveImageField(index)}
                className='sm:p-2 p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors sm:mr-1 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 mr-1 flex-shrink-0'
                disabled={uploadingOverall}
                aria-label={`Remove image ${index + 1}`}
              >
                🗑️
              </button>
            </div>
          ))}
          {formData.imageUrls.length < 10 && (
            <button
              onClick={handleAddImageField}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full '
              disabled={uploadingOverall}
            >
              {formData.imageUrls.length > 0
                ? '➕ Add Another Image'
                : '➕ Add Image'}
            </button>
          )}
        </div>

        {formData.imageUrls.filter((img) => img.url).length > 0 && (
          <div className='mt-4'>
            <h4 className='font-semibold xs:text-base text-sm text-gray-200 mb-2 xs:mb-4'>
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
                    className='w-[120px] sm:w-[140px] md:w-[180px] 
                        flex-shrink-0  select-none  
                    relative bg-[#16202f] sm:p-2 p-1 rounded-lg cursor-pointer border border-gray-700 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[5px_5px_0px_0px_#030712] duration-500 overflow-hidden group'
                    aria-label={`Preview image: ${
                      img.label || `Physique Image ${idx + 1}`
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.label || `Physique Image ${idx + 1}`}
                      className='w-full h-[100px] xs:h-[120px] sm:h-[140px] md:h-[180px] object-cover rounded-md xs:mb-2 transition-transform duration-300 group-hover:scale-105'
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src =
                          'https://placehold.co/300x200/4a5568/a0aec0?text=Image+Load+Error'
                      }}
                    />
                    {img.label && (
                      <p className='text-xs text-gray-400  p-0.5  truncate'>
                        {img.label}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className='flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-gray-700'>
        {Clearable && (
          <button
            onClick={() => setShowConfirmClearModal(true)}
            className={`px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-orange-600 text-white rounded-md  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 ${
              uploadingOverall
                ? 'bg-orange-900'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
            disabled={uploadingOverall}
          >
            🧹 Clear Data
          </button>
        )}
        <button
          onClick={handleSaveClick}
          className={`px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base  text-white rounded-md  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 ${
            uploadingOverall
              ? 'bg-green-900'
              : 'bg-green-600 hover:bg-green-700'
          }`}
          disabled={uploadingOverall}
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
          <h3 className='text-lg sm:text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
            Confirm Clear Data
          </h3>
          <p className='text-gray-200 mb-6 text-sm sm:text-base'>
            Are you sure you want to clear all measurement data for this month?
            This will make it appear as "not logged" again, but the month entry
            itself will remain.
          </p>
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => setShowConfirmClearModal(false)}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleCleardata()
              }}
              className='px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
            >
              Clear Data
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
