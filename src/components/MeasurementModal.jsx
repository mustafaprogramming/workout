import React, { useState, useMemo } from 'react'
import ImagePreviewModal from './ImagePreviewModal'
import Modal from './Modal'
import { useFirebase } from '../context/FirebaseContext'
import { useImageContext } from '../context/ImageContext'
import {
  uploadImageToCloudinary,
  deleteCloudinaryImage,
} from '../util/cloudinaryUtils'
import { doc, setDoc } from 'firebase/firestore'
import { useMessage } from '../context/MessageContext'
import { FaBroom, FaMinus, FaPlus, FaSave, FaTrash } from 'react-icons/fa'
import { useSignedImages } from '../hooks/useSignedImages'
import { formatDate } from '../util/utils'

export default function MeasurementModal({
  monthData,
  onClose,
  onSave,
  onClearData,
  Clearable,
}) {
  const { db, userId } = useFirebase()
  const { removeCachedImage } = useImageContext()

  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

  const [formData, setFormData] = useState(() => {
    const initialData = monthData || {}
    // Preserve existing format for saved images, reset for new ones
    const initialImageUrls = (initialData.imageUrls || []).map((img) => ({
      ...img,
      file: null,
      format: img.format ?? null, // ✅ keep existing format if present
      url: null,
      uploading: false,
      progress: 0,
    }))

    return {
      ...initialData,
      imageUrls: initialImageUrls,
      notes: initialData.notes || '',
    }
  })

  // keep your existing publicIds + signedUrls:
  const publicIds = useMemo(
    () => formData.imageUrls.map((i) => i.public_id).filter(Boolean),
    [formData.imageUrls]
  )
  const signedUrls = formData?.date
    ? useSignedImages(publicIds, formData.date)
    : []
  // NEW: build an id→url map so gaps don’t break alignment
  const pidToUrl = useMemo(() => {
    const m = new Map()
    publicIds.forEach((pid, i) => m.set(pid, signedUrls?.[i] ?? null))
    return m
  }, [publicIds, signedUrls])
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageLabel, setPreviewImageLabel] = useState('')
  const { setMessage, setMessageType } = useMessage()
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false)
  const [showConfirmDeleteImage, setShowConfirmDeleteImage] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState(null)
  const [deleteName, setDeleteName] = useState('')
  const [uploadingOverall, setUploadingOverall] = useState(false)
  const [clearingOverall, setClearingOverall] = useState(false)
  const [tipModal, setTipModal] = useState(false)

  // ---------- handlers ----------
  const handleFieldChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageLabelChange = (index, value) => {
    setFormData((prev) => {
      const updatedUrls = [...prev.imageUrls]
      updatedUrls[index] = { ...updatedUrls[index], label: value }
      return { ...prev, imageUrls: updatedUrls }
    })
  }

  const handleFileChange = (index, e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData((prev) => {
        const updatedUrls = [...prev.imageUrls]
        if (updatedUrls[index].url) {
          URL.revokeObjectURL(updatedUrls[index].url)
        }
        updatedUrls[index] = {
          ...updatedUrls[index],
          file,
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
    if (formData.imageUrls.length < 15) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: [
          ...prev.imageUrls,
          {
            label: '',
            public_id: null,
            file: null,
            url: null,
            uploading: false,
            progress: 0,
          },
        ],
      }))
    } else {
      setMessage('Maximum of 15 images allowed.')
      setMessageType('error')
    }
  }

  const handleRemoveImageField = async (indexToRemove) => {
    const imageToRemove = formData.imageUrls[indexToRemove]
    const updatedImageUrlsLocally = formData.imageUrls.filter(
      (_, i) => i !== indexToRemove
    )
    // 1. Update local state immediately
    setFormData((prev) => ({
      ...prev,
      imageUrls: updatedImageUrlsLocally,
    }))

    // 2. Remove from cache immediately
    if (imageToRemove.public_id && formData.date) {
      removeCachedImage(imageToRemove.public_id, formData.date)
    }

    setUploadingOverall(true)

    // 3. Await Cloudinary deletion
    if (imageToRemove.public_id && formData.date) {
      try {
        await deleteCloudinaryImage(imageToRemove.public_id, formData.date)
        setMessage('Image deleted from Cloudinary.')
        setMessageType('success')
      } catch (e) {
        console.error('Error deleting Cloudinary image:', e)
        setMessage('Failed to delete image from Cloudinary.')
        setMessageType('error')
      }
    } else if (imageToRemove.url) {
      URL.revokeObjectURL(imageToRemove.url)
    }

    // 4. Await Firestore save
    if (db && userId && formData.date) {
      const dateKey = formatDate(new Date(formData.date))
      const docRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/measurements`,
        dateKey
      )

      const imageUrlsToSave = updatedImageUrlsLocally
        .filter((img) => img.public_id && img.label)
        .map(({ label, public_id, format }) => ({ label, public_id, format }))

      try {
        await setDoc(docRef, { imageUrls: imageUrlsToSave }, { merge: true })
      } catch (e) {
        console.error('Error saving updated imageUrls to Firestore:', e)
      }
    }
    setShowConfirmDeleteImage(false)
    setUploadingOverall(false)
    setDeleteIndex(null)
    setDeleteName('')
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
    {
      label: 'Shoulders (in)',
      key: 'shoulders',
      type: 'number',
      optional: false,
    },
    { label: 'Bicep (in)', key: 'bicep', type: 'number', optional: false },
    { label: 'Hips (in)', key: 'hips', type: 'number', optional: false },
    { label: 'Quads (in)', key: 'quads', type: 'number', optional: false },
    { label: 'Calves (in)', key: 'calves', type: 'number', optional: false },
  ]

  const handleCleardata = async () => {
    setClearingOverall(true)
    setShowConfirmClearModal(false)
    await onClearData(formData.date)
    setClearingOverall(false)
  }

  const handleSaveClick = async () => {
    const requiredFields = measurementFields.filter((f) => !f.optional)
    for (const field of requiredFields) {
      if (!formData[field.key] || String(formData[field.key]).trim() === '') {
        setMessage(`Please enter a value for ${field.label}.`)
        setMessageType('error')
        return
      }
    }

    for (const image of formData.imageUrls) {
      if (!image.label || String(image.label).trim() === '') {
        setMessage(`Please enter a label for all images.`)
        setMessageType('error')
        return
      }
    }

    setUploadingOverall(true)
    setMessage('Saving measurement and uploading images...')
    setMessageType('info')

    const imageUploadPromises = formData.imageUrls.map(async (img, i) => {
      if (img.file && !img.public_id) {
        try {
          const uploadResult = await uploadImageToCloudinary(
            img.file,
            (progress) => {
              setFormData((prev) => {
                const newImages = [...prev.imageUrls]
                newImages[i] = { ...newImages[i], uploading: true, progress }
                return { ...prev, imageUrls: newImages }
              })
            }
          )
          return {
            label: img.label,
            public_id: uploadResult.public_id,
            format: uploadResult.format, // <-- NEW
          }
        } catch (error) {
          console.error('Cloudinary upload failed:', error)
          return null
        }
      } else if (img.public_id) {
        const { public_id, label, format } = img
        return { public_id, label, format }
      }
      return null
    })

    try {
      const resolvedImages = await Promise.all(imageUploadPromises)
      const finalImageUrlsToSave = resolvedImages
        .filter((img) => img && img.public_id && img.label)
        .map(({ label, public_id, format }) => ({ label, public_id, format }))

      const dataToSave = {
        ...formData,
        imageUrls: finalImageUrlsToSave,
      }

      onSave(dataToSave)

      const cleanedImageUrls = finalImageUrlsToSave.map((img) => ({
        ...img,
        file: null,
        uploading: false,
        progress: 0,
      }))
      setFormData((prev) => ({ ...prev, imageUrls: cleanedImageUrls }))
    } catch (error) {
      console.error('Error during save or upload:', error)
      setMessage('An error occurred while saving. Please try again.')
      setMessageType('error')
    } finally {
      setUploadingOverall(false)
    }
  }

  return (
    <Modal onClose={onClose} disableClose={uploadingOverall || clearingOverall}>
      <h3 className='text-lg sm:text-xl font-bold text-blue-400 mb-2 mr-[34px]'>
        Measurements for{' '}
        {new Date(formData.date).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        })}
      </h3>
      <button
        className='mb-2 rounded-md px-2 py-0.5 ml-auto flex transition shadow-[3px_3px_0px_0px_#030712] hover:shadow-[0px_0px_0px_0px_#030712] border border-gray-950 text-xs xs:text-sm bg-blue-600 hover:bg-blue-700 text-white '
        onClick={() => {
          setTipModal(true)
        }}
      >
        View Measurement Tips
      </button>

      {tipModal && (
        <Modal onClose={() => setTipModal(false)}>
          <div className='px-2 max-h-[60vh] overflow-auto'>
            <div className='font-semibold mt-2 text-gray-200  text-sm xs:text-base sm:text-lg'>
              General Tips:
            </div>
            <ul className='list-disc pl-6 text-xs xs:text-sm text-gray-300 my-1 mb-3'>
              <li>
                Measure at the same time of day (morning is best, before eating)
              </li>
              <li>Wear minimal, tight-fitting clothes or measure bare skin</li>
              <li>
                Take measurements on the same side of your body every time
                (usually right side)
              </li>
              <li>
                Keep the tape snug but not tight, it shouldn’t squeeze your skin
              </li>
              <li>
                Stand relaxed and avoid flexing muscles during measurement
                (unless tracking flexed size)
              </li>
            </ul>
            <div className='font-semibold text-gray-200  text-xs xs:text-base sm:text-lg'>
              How to Measure Key Body Parts :
            </div>
            <div className='overflow-auto max-h-[50vh] my-3  min-w-full'>
              <table className=' text-gray-200 text-xs xs:text-sm border-separate border-spacing-x-2 border-spacing-y-1 min-w-max'>
                <thead>
                  <tr className='text-nowrap'>
                    <th className=' py-1 text-left '>Body Part</th>
                    <th className=' py-1 text-left '>Measurement Location</th>
                    <th className=' py-1 text-left '>Instructions</th>
                  </tr>
                </thead>
                <tbody className='text-gray-300'>
                  <tr>
                    <td className='font-medium text-gray-200  py-1'>Chest</td>
                    <td className=' py-1'>
                      Around the fullest part of your chest, under armpits and
                      across shoulder blades
                    </td>
                    <td className=' py-1'>
                      Tape straight around chest, normal breathing
                    </td>
                  </tr>
                  <tr>
                    <td className='font-medium text-gray-200  py-1'>Waist</td>
                    <td className=' py-1'>
                      Narrowest part of your torso, usually above belly button
                    </td>
                    <td className=' py-1'>Stand normally, don't suck in</td>
                  </tr>
                  <tr>
                    <td className='font-medium text-gray-200  py-1'>Biceps</td>
                    <td className=' py-1'>
                      Midpoint between shoulder and elbow on relaxed arm
                    </td>
                    <td className=' py-1'>Arm relaxed, hanging down</td>
                  </tr>
                  <tr>
                    <td className='font-medium text-gray-200  py-1'>
                      Forearms
                    </td>
                    <td className=' py-1'>
                      Around the largest part of your forearm
                    </td>
                    <td className=' py-1'>Arm relaxed</td>
                  </tr>
                  <tr>
                    <td className='font-medium text-gray-200  py-1'>
                      Shoulders
                    </td>
                    <td className=' py-1'>
                      Around the largest part of your shoulders
                    </td>
                    <td className=' py-1'>Stand naturally, arm relaxed</td>
                  </tr>
                  <tr>
                    <td className='font-medium text-gray-200  py-1'>Hips</td>
                    <td className=' py-1'>
                      Around the widest part of your hips or buttocks
                    </td>
                    <td className=' py-1'>Feet together, tape level</td>
                  </tr>
                  <tr>
                    <td className='font-medium text-gray-200  py-1'>Thighs</td>
                    <td className=' py-1'>
                      Around the largest part of your upper thigh
                    </td>
                    <td className=' py-1'>
                      Stand straight, legs slightly apart
                    </td>
                  </tr>
                  <tr>
                    <td className='font-medium text-gray-200  py-1'>Calves</td>
                    <td className=' py-1'>Largest part of your calf</td>
                    <td className=' py-1'>
                      Standing, weight evenly distributed
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
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
                disabled={uploadingOverall || clearingOverall}
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
              disabled={uploadingOverall || clearingOverall}
            />
          </label>
        </div>

        <h4 className='text-lg font-semibold text-gray-200 mb-2'>
          Physique Pictures (Optional)
        </h4>

        {/* Image input rows */}
        <div className='space-y-3 mb-4 flex flex-col'>
          {formData.imageUrls.map((img, index) => {
            const displayUrl = img.public_id
              ? pidToUrl.get(img.public_id) ?? img.url
              : img.url

            return (
              <div
                key={index}
                className='flex flex-row gap-2 text-sm sm:text-base pb-1 items-center overflow-auto'
              >
                {/* Image Preview / File Input */}
                {img.public_id && pidToUrl.get(img.public_id) ? (
                  <div
                    className='relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden border border-gray-700 flex-shrink-0'
                    tabIndex={-1}
                    aria-label={`Image: ${img.label || `Image ${index + 1}`}`}
                  >
                    <img
                      src={displayUrl}
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
                  <label className='w-20 h-20 sm:w-24 sm:h-24 border border-dashed border-gray-600 rounded-md flex items-center justify-center cursor-pointer flex-shrink-0 bg-gray-900 hover:bg-gray-800 transition-colors text-gray-400'>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={(e) => handleFileChange(index, e)}
                      className='hidden'
                      disabled={uploadingOverall || clearingOverall}
                      aria-label={`Upload image ${index + 1}`}
                    />
                    <FaPlus />
                  </label>
                )}

                {/* Image Label Input */}
                <input
                  type='text'
                  placeholder='Label (e.g., Front Pose)'
                  value={img.label || ''}
                  onChange={(e) =>
                    handleImageLabelChange(index, e.target.value)
                  }
                  className='flex-grow sm:p-3 p-1.5 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
                  disabled={uploadingOverall || clearingOverall}
                />

                {/* Remove button */}
                <button
                  onClick={() => {
                    setShowConfirmDeleteImage(true)
                    setDeleteIndex(index)
                    setDeleteName(formData.imageUrls[index].label)
                  }}
                  className={` sm:p-4 p-[9px]  text-white rounded-md  transition-colors sm:mr-1 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 mr-1 flex-shrink-0 ${
                    uploadingOverall || clearingOverall
                      ? 'bg-red-900'
                      : 'hover:bg-red-700 bg-red-600'
                  }`}
                  disabled={uploadingOverall || clearingOverall}
                  aria-label={`Remove image ${index + 1}`}
                >
                  <FaMinus />
                </button>
              </div>
            )
          })}

          {formData.imageUrls.length < 15 && (
            <button
              onClick={handleAddImageField}
              className={`px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base  text-white rounded-md  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 w-full ${
                uploadingOverall || clearingOverall
                  ? 'bg-purple-900'
                  : 'hover:bg-purple-700 bg-purple-600'
              }`}
              disabled={uploadingOverall || clearingOverall}
            >
              {formData.imageUrls.length > 0 ? (
                <span className='flex gap-2 items-center justify-center'>
                  <FaPlus />
                  Add Another Image
                </span>
              ) : (
                <span className='flex gap-2 items-center justify-center'>
                  <FaPlus />
                  Add Image
                </span>
              )}
            </button>
          )}
        </div>

        {formData.imageUrls.length > 0 && (
          <div className='mt-4'>
            <h4 className='font-semibold xs:text-base text-sm text-gray-200 mb-2 xs:mb-4'>
              Current Images:
            </h4>
            <div className='flex overflow-x-auto sm:gap-4 gap-2 pb-3'>
              {formData.imageUrls.map((img, idx) => {
                const displayUrl = img.public_id
                  ? pidToUrl.get(img.public_id) ?? img.url
                  : img.url
                if (!displayUrl) return null

                return (
                  <button
                    key={idx}
                    role='button'
                    tabIndex={0}
                    disabled={uploadingOverall || clearingOverall}
                    onClick={() => handleImageClick(displayUrl, img.label)}
                    onKeyDown={(e) =>
                      handleImageKeyPress(e, displayUrl, img.label)
                    }
                    className={`w-[120px] sm:w-[140px] md:w-[180px] flex-shrink-0 select-none relative bg-[#16202f] sm:p-2 p-1 rounded-lg  border border-gray-700 shadow-[5px_5px_0px_0px_#030712] duration-500 overflow-hidden group ${
                      uploadingOverall || clearingOverall
                        ? 'cursor-not-allowed'
                        : 'cursor-pointer hover:shadow-[0px_0px_0px_0px_#030712]'
                    }`}
                    aria-label={`Preview image: ${
                      img.label || `Physique Image ${idx + 1}`
                    }`}
                  >
                    <img
                      src={displayUrl}
                      alt={img.label || `Physique Image ${idx + 1}`}
                      className={`w-full h-[100px] xs:h-[120px] sm:h-[140px] md:h-[180px] object-cover rounded-md xs:mb-2 transition-transform duration-300  ${
                        uploadingOverall || clearingOverall
                          ? ''
                          : 'group-hover:scale-105 '
                      }`}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src =
                          'https://placehold.co/300x200/4a5568/a0aec0?text=Image+Load+Error'
                      }}
                    />
                    {img.label && (
                      <p className='text-xs text-gray-400 p-0.5 truncate'>
                        {img.label}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className='flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-gray-700'>
        {Clearable && (
          <button
            onClick={() => setShowConfirmClearModal(true)}
            className={`px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base bg-orange-600 text-white rounded-md  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 ${
              uploadingOverall || clearingOverall
                ? 'bg-orange-900'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
            disabled={uploadingOverall || clearingOverall}
          >
            {clearingOverall ? (
              <span className='items-center flex gap-2 justify-center'>
                Clearing
                <span className='flex animate-spin w-4 h-4 border-2 border-t-transparent border-gray-300 rounded-full'></span>
              </span>
            ) : (
              <span className='items-center flex gap-2 justify-center'>
                <FaBroom /> Clear Data
              </span>
            )}
          </button>
        )}
        <button
          onClick={handleSaveClick}
          className={`px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base  text-white rounded-md  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 ${
            uploadingOverall || clearingOverall
              ? 'bg-green-900'
              : 'bg-green-600 hover:bg-green-700'
          }`}
          disabled={uploadingOverall || clearingOverall}
        >
          {uploadingOverall ? (
            <span className='items-center flex gap-2 justify-center'>
              Saving
              <span className='flex animate-spin w-4 h-4 border-2 border-t-transparent border-gray-300 rounded-full'></span>
            </span>
          ) : (
            <span className='items-center flex gap-2 justify-center'>
              <FaSave />
              Save Measurement
            </span>
          )}
        </button>
      </div>

      {showImagePreview && (!uploadingOverall || !clearingOverall) && (
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
      {showConfirmDeleteImage && (
        <Modal
          onClose={() => setShowConfirmDeleteImage(false)}
          disableClose={uploadingOverall || clearingOverall}
        >
          <h3 className='text-lg sm:text-xl font-bold text-blue-400 mb-4 mr-[34px]'>
            Confirm Delete Image
          </h3>
          <p className='text-gray-200 mb-6 text-sm sm:text-base'>
            Are you sure you want to delete image "{deleteName}"?
          </p>
          <div className='flex justify-end space-x-3'>
            <button
              disabled={uploadingOverall || clearingOverall}
              onClick={() => setShowConfirmDeleteImage(false)}
              className={`px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base  text-white rounded-md  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 ${
                uploadingOverall || clearingOverall
                  ? 'bg-gray-800'
                  : 'bg-gray-900 hover:bg-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              disabled={uploadingOverall || clearingOverall}
              onClick={() => handleRemoveImageField(deleteIndex)}
              className={`px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base  text-white rounded-md  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 ${
                uploadingOverall || clearingOverall
                  ? 'bg-red-900'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {uploadingOverall || clearingOverall ? (
                <span className='items-center flex gap-2 justify-center'>
                  Deleting
                  <span className='flex animate-spin w-4 h-4 border-2 border-t-transparent border-gray-300 rounded-full'></span>
                </span>
              ) : (
                <span className='items-center flex gap-2 justify-center'>
                  <FaTrash />
                  Delete Image
                </span>
              )}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
