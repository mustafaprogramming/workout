import { useState } from 'react'
import ImagePreviewModal from './ImagePreviewModal'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'

export default function MeasurementData({ m }) {
  const [showMeasurement, setShowMeasurement] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageLabel, setPreviewImageLabel] = useState('')

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
              {m.weight && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    Weight
                  </td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.weight} kg
                  </td>
                </tr>
              )}
              {m.bodyFat && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    Body Fat
                  </td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.bodyFat} %
                  </td>
                </tr>
              )}
              {m.chest && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>Chest</td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.chest} in
                  </td>
                </tr>
              )}
              {m.shoulders && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>Shoulders</td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.shoulders} in
                  </td>
                </tr>
              )}
              {m.waist && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>Waist</td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.waist} in
                  </td>
                </tr>
              )}
              {m.neck && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>Neck</td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.neck} in
                  </td>
                </tr>
              )}
              {m.forearms && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    Forearms
                  </td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.forearms} in
                  </td>
                </tr>
              )}
              {m.bicep && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>Bicep</td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.bicep} in
                  </td>
                </tr>
              )}
              {m.hips && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>Hips</td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.hips} in
                  </td>
                </tr>
              )}
              {m.quads && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>Quads</td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.quads} in
                  </td>
                </tr>
              )}
              {m.calves && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    Calves
                  </td>
                  <td className='sm:py-2 sm:px-6 py-1 px-3 text-left'>
                    {m.calves} in
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {m.notes && (
          <p
            className={`text-xs sm:text-sm text-gray-300 italic border-t border-gray-500 bg-gray-800 sm:py-3 sm:px-6 py-1.5 px-3`}
          >
            Notes: {m.notes}
          </p>
        )}

        {/* Image Thumbnails */}
        {m.imageUrls &&
          m.imageUrls.length > 0 &&
          m.imageUrls.find((img) => img.url !== '') && (
            <div className='sm:py-3 sm:px-6 py-1.5 px-3 border-t border-gray-500'>
              <h4 className='font-semibold xs:text-base text-sm text-gray-200 mb-2 xs:mb-4'>
                Physique Images:
              </h4>
              <div className='flex overflow-x-auto sm:gap-4 gap-2 pb-3'>
                {m.imageUrls.map(
                  (img, idx) =>
                    img.url && (
                      <div
                        key={img.public_id || idx}
                        className='w-[120px] sm:w-[140px] md:w-[180px] 
                        flex-shrink-0  select-none  
                    relative bg-[#16202f] sm:p-2 p-1 rounded-lg cursor-pointer border border-gray-700 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[5px_5px_0px_0px_#030712] duration-500 overflow-hidden group'
                        role='button'
                        tabIndex={0}
                        onClick={() => handleImageClick(img.url, img.label)}
                        onKeyDown={(e) => handleKeyPress(e, img.url, img.label)}
                        aria-label={`Open preview for image ${
                          img.label || idx + 1
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.label || `Physique image ${idx + 1}`}
                          className='w-full h-[100px] xs:h-[120px] sm:h-[140px] md:h-[180px] object-cover rounded-md xs:mb-2 transition-transform duration-300 group-hover:scale-105'
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src =
                              'https://placehold.co/300x200/4a5568/a0aec0?text=Image+Load+Error'
                          }}
                        />
                        {img.label && (
                          <p className='text-xs  text-gray-400  p-0.5  truncate'>
                            {img.label}
                          </p>
                        )}
                      </div>
                    )
                )}
              </div>
            </div>
          )}
        {/* Image Preview Modal */}
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
