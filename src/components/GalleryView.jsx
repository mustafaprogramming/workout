import { useEffect, useRef, useState } from 'react'

export function GalleryView({
  filteredAndSortedImages,
  handleImageClick,
  handleKeyPress,
}) {
  const [imageSize, setImageSize] = useState()
  const galleryContainer = useRef(null)
  const getGalleryContainerWidth = () => {
    const galleryCon = window.getComputedStyle(galleryContainer.current)
    const NoOfColumns = galleryCon.gridTemplateColumns.split(' ').length
    const NoOfGaps = NoOfColumns - 1
    const columnGap = parseFloat(galleryCon.columnGap)
    const NoOfGapPixel = NoOfGaps * columnGap
    const paddingLeft=parseFloat(galleryCon.paddingLeft)
    const paddingRight=parseFloat(galleryCon.paddingRight)
    const widthWithoutGap = parseFloat(galleryCon.width) - NoOfGapPixel - paddingLeft - paddingRight
    const size = widthWithoutGap / NoOfColumns
    setImageSize(size);
  }
  useEffect(() => {
    getGalleryContainerWidth()
    window.addEventListener('resize', getGalleryContainerWidth)
    return () => {
      window.removeEventListener('resize', getGalleryContainerWidth)
    }
  }, [])

  return (
    <div
      ref={galleryContainer}
      className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8  gap-x-1 gap-y-4 md:gap-x-2  mb-3 '
    >
      {filteredAndSortedImages.map((img, index) => (
        <div
          key={img.id || index}
          role='button'
          tabIndex={0}
          onClick={() => handleImageClick(img)}
          onKeyDown={(e) => handleKeyPress(e, img)}
          className='relative bg-gray-900 p-1 rounded-lg cursor-pointer border border-gray-700 hover:shadow-[0px_0px_0px_0px_#030712] shadow-[2px_2px_0px_0px_#030712] md:shadow-[4px_4px_0px_0px_#030712] transition-shadow duration-500 overflow-hidden group'
          aria-label={`Open preview for ${img.label}`}
          style={{ width: `${imageSize}px` }}
        >
          <img
            src={img.url}
            alt={img.label}
            className='w-full object-cover rounded-md mb-1 transition-transform duration-300 group-hover:scale-105'
            onError={(e) => {
              e.target.onerror = null
              e.target.src =
                'https://placehold.co/300x200/4a5568/a0aec0?text=Image+Load+Error'
            }}
            style={{ height: `${imageSize - 10}px` }}
          />
          <p className=' xs:text-xs text-[9px] text-gray-300 font-semibold truncate'>
            {img.label}
          </p>
          <p className=' xs:text-[10px] text-[7px] text-gray-500'>
            {new Date(img.date).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  )
}
