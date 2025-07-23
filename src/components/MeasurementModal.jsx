import ImagePreviewModal from './ImagePreviewModal'
import Modal from './Modal'
import { useState } from 'react'

export default function MeasurementModal({
  monthData,
  onClose,
  onSave,
  onClearData,
}) {
  const [formData, setFormData] = useState(() => {
    const initialData = monthData || {}
    return {
      ...initialData,
      imageUrls:
        initialData.imageUrls && Array.isArray(initialData.imageUrls)
          ? initialData.imageUrls.length > 0
            ? initialData.imageUrls
            : [{ url: '', label: '' }]
          : [{ url: '', label: '' }],
    }
  })

  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageLabel, setPreviewImageLabel] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false)

  const handleFieldChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageURLChange = (index, field, value) => {
    const updatedUrls = [...formData.imageUrls]
    updatedUrls[index] = { ...updatedUrls[index], [field]: value }
    setFormData((prev) => ({ ...prev, imageUrls: updatedUrls }))
  }

  const handleAddImageField = () => {
    if (formData.imageUrls.length < 10) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, { url: '', label: '' }],
      }))
    } else {
      setMessage('Maximum of 10 images allowed.')
      setMessageType('error')
    }
  }

  const handleRemoveImageField = (index) => {
    const updatedUrls = formData.imageUrls.filter((_, i) => i !== index)
    setFormData((prev) => ({
      ...prev,
      imageUrls:
        updatedUrls.length > 0 ? updatedUrls : [{ url: '', label: '' }],
    }))
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

  const handleSaveClick = () => {
    const requiredFields = measurementFields.filter((field) => !field.optional)
    for (const field of requiredFields) {
      if (!formData[field.key] || String(formData[field.key]).trim() === '') {
        setMessage(`Please enter a value for ${field.label}.`)
        setMessageType('error')
        return
      }
    }
    onSave(formData)
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
              className='flex gap-2 overflow-x-auto text-sm sm:text-base pb-1'
            >
              <input
                type='url'
                placeholder={`Image ${index + 1} URL`}
                value={img.url}
                onChange={(e) =>
                  handleImageURLChange(index, 'url', e.target.value)
                }
                className='flex-grow sm:p-3 p-1.5 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
              />
              <input
                type='text'
                placeholder='Label (e.g., Front Pose)'
                value={img.label}
                onChange={(e) =>
                  handleImageURLChange(index, 'label', e.target.value)
                }
                className='flex-grow sm:p-3 p-1.5 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100'
              />
              {formData.imageUrls.length > 1 && (
                <button
                  onClick={() => handleRemoveImageField(index)}
                  className='sm:p-2 p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors sm:mr-1 shadow-[2px_2px_0px_0px_#030712] border border-gray-950 mr-1'
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
            >
              ➕ Add Another Image
            </button>
          )}
        </div>

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
                    <p className='text-xs text-gray-500 truncate'>{img.url}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className='flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-gray-700'>
        {Object.keys(monthData).length > 1 && (
          <button
            onClick={() => setShowConfirmClearModal(true)}
            className='px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
          >
            🧹 Clear Data
          </button>
        )}
        <button
          onClick={handleSaveClick}
          className='px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950'
        >
          Save Measurement
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
