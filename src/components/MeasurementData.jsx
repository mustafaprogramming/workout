// MeasurementData.jsx
import React, { useMemo, useState } from 'react'
import { useSignedImages } from '../hooks/useSignedImages'
import ImagePreviewModal from './ImagePreviewModal'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'

export default function MeasurementData({ m }) {
  const [showMeasurement, setShowMeasurement] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageLabel, setPreviewImageLabel] = useState('')

  const publicIds = useMemo(
    () => (m.imageUrls || []).map((img) => img?.public_id || null),
    [m.imageUrls]
  )
  // m.id is the Firestore doc id used to save this measurement month
  const signedUrls = useSignedImages(publicIds, m.id)

  const handleImageClick = (url, label) => {
    setPreviewImageUrl(url)
    setPreviewImageLabel(label)
    setShowImagePreview(true)
  }

  const handleKeyPress = (e, url, label) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleImageClick(url, label)
    }
  }

  return (
    <div
      className={`bg-gray-900 ${
        showMeasurement ? '' : 'hover:shadow-[0px_0px_0px_0px_#030712]'
      } sm:shadow-[5px_5px_0px_0px_#030712] shadow-[2px_2px_0px_0px_#030712] overflow-hidden border border-gray-950 rounded-lg duration-500`}
    >
      <button
        className='flex justify-between items-center w-full py-1.5 xs:py-3'
        onClick={() => setShowMeasurement(!showMeasurement)}
      >
        <span className='font-semibold text-blue-400  text-sm xs:text-base sm:text-lg py-1 px-4'>
          {m.date}
        </span>
        <span
          className=' px-4 py-1 mr-3 rounded-md text-xs xs:text-sm sm:text-base text-gray-400'
          aria-expanded={showMeasurement}
          aria-controls={`measurement-data-${m.date}`}
        >
          {showMeasurement ? <FaChevronUp /> : <FaChevronDown />}
        </span>
      </button>

      <div
        id={`measurement-data-${m.date}`}
        className={`${showMeasurement ? 'block' : 'hidden'} mt-2`}
      >
        {/* Table omitted for brevity – keep your existing rows */}
        {/* Measurement Table */}
        <div className='overflow-x-auto shadow-md'>
          <table className='min-w-full bg-gray-800 overflow-hidden text-xs sm:text-sm'>
            <thead>
              <tr className='bg-gray-900 text-gray-300 uppercase  leading-normal'>
                <th className='sm:py-3 sm:px-6 py-1.5 px-3 text-left'>
                  Measurement
                </th>
                <th className='sm:py-3 sm:px-6 py-1.5 px-3 text-left'>Value</th>
              </tr>
            </thead>
            <tbody className='text-gray-200 font-light'>
              {m.weight && <TableRow label='Weight' value={`${m.weight} kg`} />}
              {m.bodyFat && (
                <TableRow label='Body Fat' value={`${m.bodyFat} %`} />
              )}
              {m.chest && <TableRow label='Chest' value={`${m.chest} in`} />}
              {m.shoulders && (
                <TableRow label='Shoulders' value={`${m.shoulders} in`} />
              )}
              {m.waist && <TableRow label='Waist' value={`${m.waist} in`} />}
              {m.neck && <TableRow label='Neck' value={`${m.neck} in`} />}
              {m.forearms && (
                <TableRow label='Forearms' value={`${m.forearms} in`} />
              )}
              {m.bicep && <TableRow label='Bicep' value={`${m.bicep} in`} />}
              {m.hips && <TableRow label='Hips' value={`${m.hips} in`} />}
              {m.quads && <TableRow label='Quads' value={`${m.quads} in`} />}
              {m.calves && <TableRow label='Calves' value={`${m.calves} in`} />}
            </tbody>
          </table>
        </div>
        {/* Notes */}
        {m.notes && (
          <p className='text-xs sm:text-sm text-gray-300 italic border-t border-gray-500 bg-gray-800 sm:py-3 sm:px-6 py-1.5 px-3'>
            Notes: {m.notes}
          </p>
        )}

        {/* Images */}
        {m.imageUrls &&
          m.imageUrls.length > 0 &&
          m.imageUrls.find((img) => img.url !== '') && (
            <div className='sm:py-3 sm:px-6 py-1.5 px-3 border-t border-gray-500'>
              <h4 className='font-semibold xs:text-base text-sm text-gray-200 mb-2 xs:mb-4'>
                Physique Images:
              </h4>
              <div className='flex overflow-x-auto sm:gap-4 gap-2 pb-3'>
                {m.imageUrls.map((img, idx) => {
                  if (!img?.url && !img?.public_id) return null
                  // Prefer signed URL when present; fallback to stored URL during migration
                  const displayUrl =
                    (Array.isArray(signedUrls) && signedUrls[idx]) || img.url

                  return (
                    <div
                      key={img.public_id || idx}
                      className='w-[120px] sm:w-[140px] md:w-[180px] flex-shrink-0 select-none relative bg-[#16202f] sm:p-2 p-1 rounded-lg cursor-pointer border border-gray-700 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[5px_5px_0px_0px_#030712] duration-500 overflow-hidden group'
                      role='button'
                      tabIndex={0}
                      onClick={() => handleImageClick(displayUrl, img.label)}
                      onKeyDown={(e) =>
                        handleKeyPress(e, displayUrl, img.label)
                      }
                      aria-label={`Open preview for image ${
                        img.label || idx + 1
                      }`}
                    >
                      <img
                        src={displayUrl}
                        alt={img.label || `Physique image ${idx + 1}`}
                        className='w-full h-[100px] xs:h-[120px] sm:h-[140px] md:h-[180px] object-cover rounded-md xs:mb-2 transition-transform duration-300 group-hover:scale-105'
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src =
                            'https://placehold.co/300x200/4a5568/a0aec0?text=Image+Load+Error'
                        }}
                      />
                      {img.label && (
                        <p className='text-xs text-gray-400 p-0.5 truncate'>
                          {img.label}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        {showImagePreview && (
          <ImagePreviewModal
            imageUrl={previewImageUrl}
            imageLabel={previewImageLabel}
            onClose={() => setShowImagePreview(false)}
          />
        )}
      </div>
    </div>
  )
}

function TableRow({ label, value }) {
  return (
    <tr className='border-b border-gray-500 last:border-b-0'>
      <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>{label}</td>
      <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>{value}</td>
    </tr>
  )
}
