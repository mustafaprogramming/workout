import { useState } from 'react'
import ImagePreviewModal from './ImagePreviewModal'

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
      } shadow-[5px_5px_0px_0px_#030712] py-3 border border-gray-950 rounded-lg duration-500`}
    >
      <div className='flex justify-between items-center'>
        <p className='font-semibold text-blue-400 text-base sm:text-lg py-1 px-4 rounded-md bg-gray-900'>
          {m.date}
        </p>
        <button
          onClick={() => setShowMeasurement(!showMeasurement)}
          className='bg-gray-950 hover:bg-[#030712ad] px-4 py-1 mr-3 rounded-md text-sm sm:text-base text-gray-400 shadow-[2px_2px_0px_0px_#030712] border border-gray-950'
          aria-expanded={showMeasurement}
          aria-controls={`measurement-data-${m.date}`}
        >
          {showMeasurement ? 'Hide' : 'Show'}
        </button>
      </div>

      <div
        id={`measurement-data-${m.date}`}
        className={`${showMeasurement ? 'block' : 'hidden'} mt-2`}
      >
        {/* Measurement Table */}
        <div className='overflow-x-auto shadow-md'>
          <table className='min-w-full bg-gray-800 overflow-hidden'>
            <thead>
              <tr className='bg-gray-900 text-gray-300 uppercase text-sm leading-normal'>
                <th className='py-3 px-6 text-left'>Measurement</th>
                <th className='py-3 px-6 text-left'>Value</th>
              </tr>
            </thead>
            <tbody className='text-gray-200 text-sm font-light'>
              {m.weight && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Weight</td>
                  <td className='py-2 px-6 text-left'>{m.weight} kg</td>
                </tr>
              )}
              {m.bodyFat && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Body Fat</td>
                  <td className='py-2 px-6 text-left'>{m.bodyFat} %</td>
                </tr>
              )}
              {m.chest && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Chest</td>
                  <td className='py-2 px-6 text-left'>{m.chest} in</td>
                </tr>
              )}
              {m.waist && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Waist</td>
                  <td className='py-2 px-6 text-left'>{m.waist} in</td>
                </tr>
              )}
              {m.neck && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Neck</td>
                  <td className='py-2 px-6 text-left'>{m.neck} in</td>
                </tr>
              )}
              {m.forearms && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Forearms</td>
                  <td className='py-2 px-6 text-left'>{m.forearms} in</td>
                </tr>
              )}
              {m.bicep && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Bicep</td>
                  <td className='py-2 px-6 text-left'>{m.bicep} in</td>
                </tr>
              )}
              {m.hips && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Hips</td>
                  <td className='py-2 px-6 text-left'>{m.hips} in</td>
                </tr>
              )}
              {m.quads && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Quads</td>
                  <td className='py-2 px-6 text-left'>{m.quads} in</td>
                </tr>
              )}
              {m.calves && (
                <tr className='border-b border-gray-500 last:border-b-0'>
                  <td className='py-2 px-6 text-left'>Calves</td>
                  <td className='py-2 px-6 text-left'>{m.calves} in</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {m.notes && (
          <p className='text-sm text-gray-300 italic border-y border-gray-500 bg-gray-800 py-3 px-6'>
            Notes: {m.notes}
          </p>
        )}

        {/* Image Preview Modal */}
        {showImagePreview && (
          <ImagePreviewModal
            imageUrl={previewImageUrl}
            imageLabel={previewImageLabel}
            onClose={() => setShowImagePreview(false)}
          />
        )}

        {/* Image Thumbnails */}
        {m.imageUrls && m.imageUrls.length > 0 && m.imageUrls.find((img) => img.url !== '') && (
          <div className='py-3 px-6'>
            <h4 className='font-semibold text-gray-200 mb-4'>Physique Images:</h4>
            <div className='flex overflow-x-auto sm:gap-4 gap-2 pb-3'>
              {m.imageUrls.map(
                (img, idx) =>
                  img.url && (
                    <div
                      key={idx}
                      className='bg-gray-950 p-2 rounded-lg w-fit cursor-pointer max-w-[110px] sm:max-w-[160px] md:max-w-[210px] border border-gray-800 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[5px_5px_0px_0px_#030712] duration-500'
                      role='button'
                      tabIndex={0}
                      onClick={() => handleImageClick(img.url, img.label)}
                      onKeyDown={(e) => handleKeyPress(e, img.url, img.label)}
                      aria-label={`Open preview for image ${img.label || idx + 1}`}
                    >
                      {img.label && (
                        <p className='text-xs text-gray-400 mb-1 truncate'>{img.label}</p>
                      )}
                      <img
                        src={img.url}
                        alt={img.label || `Physique image ${idx + 1}`}
                        className='w-full object-cover rounded-sm mb-2 max-w-[100px] max-h-[100px] sm:max-w-[150px] sm:max-h-[150px] md:max-w-[200px] md:max-h-[200px] overflow-hidden bg-center mx-auto'
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = 'https://placehold.co/300x200/4a5568/a0aec0?text=Image+Load+Error'
                        }}
                      />
                      <p className='text-xs text-gray-500 truncate'>{img.url}</p>
                    </div>
                  )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
