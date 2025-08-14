import { GalleryView } from '../components/GalleryView'
import { useFirebase } from '../context/FirebaseContext'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore'
import { ImagePreviewModalGallery } from '../components/ImagePreviewModal'
import { useMessage } from '../context/MessageContext'
import {
  uploadImageToCloudinary,
  deleteCloudinaryImage,
} from '../util/cloudinaryUtils'
import { ROUTES } from '../route'
import { useNavigation } from '../context/NavigationContext'
import { useSignedImages } from '../hooks/useSignedImages'
import { FaTimes, FaUpload } from 'react-icons/fa'

export default function GalleryPage() {
  const { db, userId, isAuthReady } = useFirebase()
  const { setMessage, setMessageType } = useMessage()
  const { setCurrentPage } = useNavigation()

  const [galleryImages, setGalleryImages] = useState([])
  const [imagesWithUrls, setImagesWithUrls] = useState([])
  const [loading, setLoading] = useState(true)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageData, setPreviewImageData] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [fileToUpload, setFileToUpload] = useState(null)
  const [newImageLabel, setNewImageLabel] = useState('')
  const [previewFileUrl, setPreviewFileUrl] = useState(null)
  const [imagesLoaded, setImagesLoaded] = useState(false)

  const [searchType, setSearchType] = useState('label')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')

  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'

  useEffect(() => {
    if (!db || !userId || !isAuthReady) {
      setLoading(false)
      return
    }

    setLoading(true)
    setMessage('Loading your physique gallery...')
    setMessageType('info')

    const measurementsCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/measurements`
    )
    const galleryCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/userGalleryImages`
    )

    let currentMeasurementImages = []
    let currentGalleryImages = []

    const updateCombinedGallery = (measurements, gallery) => {
      currentMeasurementImages = measurements
      currentGalleryImages = gallery
      const combined = [...measurements, ...gallery]
      setGalleryImages(combined)
    }

    const unsubscribeMeasurements = onSnapshot(
      query(measurementsCollectionRef),
      (measurementsSnapshot) => {
        const fetchedMeasurementImages = []

        for (const docSnap of measurementsSnapshot.docs) {
          const data = docSnap.data()
          if (data.imageUrls && Array.isArray(data.imageUrls)) {
            const measurementDate = data.date
            data.imageUrls.forEach((img, i) => {
              if (img.public_id) {
                fetchedMeasurementImages.push({
                  id: img.public_id || `${docSnap.id}-${i}`,
                  public_id: img.public_id,
                  url: null,
                  label: img.label || `Image from ${measurementDate}`,
                  date: measurementDate,
                  source: 'measurement',
                  docId: docSnap.id,
                  arrayIndex: i,
                })
              }
            })
          }
        }
        updateCombinedGallery(fetchedMeasurementImages, currentGalleryImages)
      },
      (error) => {
        console.error('Error fetching measurement images for gallery:', error)
        setMessage('Failed to load some gallery images from measurements.')
        setMessageType('error')
      }
    )

    const unsubscribeGallery = onSnapshot(
      query(galleryCollectionRef),
      (gallerySnapshot) => {
        const fetchedUserGalleryImages = gallerySnapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            public_id: data.public_id || null,
            url: null,
            label: data.label || 'User Uploaded Image',
            date:
              data.uploadedAt?.toDate()?.toISOString().split('T')[0] ||
              new Date().toISOString().split('T')[0],
            source: 'gallery',
            docId: docSnap.id,
          }
        })
        updateCombinedGallery(
          currentMeasurementImages,
          fetchedUserGalleryImages
        )
      },
      (error) => {
        console.error('Error fetching user gallery images:', error)
        setMessage('Failed to load some gallery images from your uploads.')
        setMessageType('error')
      }
    )

    return () => {
      unsubscribeMeasurements()
      unsubscribeGallery()
    }
  }, [db, userId, isAuthReady, appId, setMessage, setMessageType])

  const filteredAndSortedImages = useMemo(() => {
    let filtered = galleryImages
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter((img) => {
        if (searchType === 'label') {
          return img.label.toLowerCase().includes(lowerCaseSearchTerm)
        } else if (searchType === 'date') {
          return img.date.includes(lowerCaseSearchTerm)
        }
        return true
      })
    }
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })
  }, [galleryImages, searchType, searchTerm, sortOrder])

  const allPublicIds = useMemo(() => {
    return filteredAndSortedImages.map((img) => img.public_id).filter(Boolean)
  }, [filteredAndSortedImages])

  const allDocIds = useMemo(() => {
    return filteredAndSortedImages.map((img) => img.docId).filter(Boolean)
  }, [filteredAndSortedImages])

  const signedUrls = useSignedImages(allPublicIds, allDocIds)

  useEffect(() => {
    setLoading(true)
    if (signedUrls && signedUrls.length === allPublicIds.length) {
      const byPid = new Map()
      allPublicIds.forEach((pid, i) => byPid.set(pid, signedUrls[i]))
      const combined = filteredAndSortedImages.map((img) => ({
        ...img,
        url: img.public_id ? byPid.get(img.public_id) ?? null : null,
      }))
      setImagesWithUrls(combined)
      if (combined.length == 0) {
        setLoading(false)
      }
    }
  }, [
    filteredAndSortedImages,
    signedUrls,
    allPublicIds.length,
    setMessage,
    setMessageType,
  ])

  // New useEffect to handle image loading state
  useEffect(() => {
    if (imagesLoaded) {
      setLoading(false)
      const failedUrls = signedUrls.filter((url) => url === null).length
      const totalUrls = signedUrls.length

      if (totalUrls === 0) {
        setMessage('Gallery loaded successfully!')
        setMessageType('success')
      } else if (failedUrls === totalUrls) {
        setMessage(
          'Gallery loaded with original URLs (signed URLs unavailable).'
        )
        setMessageType('warning')
      } else if (failedUrls > 0) {
        setMessage(
          `Gallery loaded! ${
            totalUrls - failedUrls
          }/${totalUrls} images using secure URLs.`
        )
        setMessageType('success')
      } else {
        setMessage('Gallery loaded with secure URLs!')
        setMessageType('success')
      }
    }
  }, [imagesLoaded, signedUrls])

  const handleImageClick = (img) => {
    setPreviewImageData(img)
    setShowImagePreview(true)
  }

  const handleKeyPress = (e, img) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleImageClick(img)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0]
      setFileToUpload(file)
      setPreviewFileUrl(URL.createObjectURL(file))
    } else {
      setFileToUpload(null)
      if (previewFileUrl) {
        URL.revokeObjectURL(previewFileUrl)
        setPreviewFileUrl(null)
      }
    }
  }

  const handleUploadImage = async () => {
    if (!fileToUpload) {
      setMessage('Please select an image to upload.')
      setMessageType('error')
      return
    }
    if (!newImageLabel.trim()) {
      setMessage('Please add a label for your image.')
      setMessageType('error')
      return
    }

    setUploading(true)
    setMessage('Uploading image...')
    setMessageType('info')

    try {
      const uploadResult = await uploadImageToCloudinary(fileToUpload)
      const newGalleryImage = {
        label: newImageLabel.trim(),
        public_id: uploadResult.public_id,
        format: uploadResult.format, // <-- NEW
        uploadedAt: new Date(),
      }
      await addDoc(
        collection(db, `artifacts/${appId}/users/${userId}/userGalleryImages`),
        newGalleryImage
      )
      setMessage('Image uploaded to gallery successfully!')
      setMessageType('success')
      setFileToUpload(null)
      setNewImageLabel('')
      if (previewFileUrl) {
        URL.revokeObjectURL(previewFileUrl)
        setPreviewFileUrl(null)
      }
    } catch (error) {
      console.error('Error uploading image to gallery:', error)
      setMessage(`Failed to upload image: ${error.message}`)
      setMessageType('error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteGalleryImage = async () => {
    if (!previewImageData) {
      setMessage('No image selected for deletion.')
      setMessageType('error')
      return
    }
    setMessage('Deleting image from gallery...')
    setMessageType('info')
    try {
      if (previewImageData.public_id && previewImageData.source === 'gallery') {
        await deleteCloudinaryImage(
          previewImageData.public_id,
          previewImageData.docId
        )
      }

      if (previewImageData.source === 'gallery') {
        await deleteDoc(
          doc(
            db,
            `artifacts/${appId}/users/${userId}/userGalleryImages`,
            previewImageData.id
          )
        )
      } else if (previewImageData.source === 'measurement') {
        // Handle deletion of measurement images
      }

      setMessage('Image deleted from gallery successfully!')
      setMessageType('success')
      setShowImagePreview(false)
      setPreviewImageData(null)
    } catch (error) {
      console.error('Error deleting gallery image:', error)
      setMessage(`Failed to delete image: ${error.message}`)
      setMessageType('error')
    }
  }

  const handleEditImageLabel = async (imageToUpdate, newLabel) => {
    if (!db || !userId || !imageToUpdate || !newLabel.trim()) {
      setMessage('Invalid data for updating image label.')
      setMessageType('error')
      return
    }
    setMessage('Updating image label...')
    setMessageType('info')
    try {
      if (imageToUpdate.source === 'gallery') {
        const imageDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/userGalleryImages`,
          imageToUpdate.id
        )
        await updateDoc(imageDocRef, { label: newLabel })
        setMessage('Gallery image label updated successfully!')
        setMessageType('success')
      } else if (imageToUpdate.source === 'measurement') {
        const measurementDocRef = doc(
          db,
          `artifacts/${appId}/users/${userId}/measurements`,
          imageToUpdate.docId
        )
        const measurementSnap = await getDoc(measurementDocRef)
        if (measurementSnap.exists()) {
          const measurementData = measurementSnap.data()
          const updatedImageUrls = measurementData.imageUrls.map((img, idx) =>
            idx === imageToUpdate.arrayIndex ? { ...img, label: newLabel } : img
          )
          await updateDoc(measurementDocRef, { imageUrls: updatedImageUrls })
          setMessage('Measurement image label updated successfully!')
          setMessageType('success')
        } else {
          setMessage('Measurement document not found for image.')
          setMessageType('error')
        }
      }
      setPreviewImageData((prev) => ({ ...prev, label: newLabel }))
    } catch (error) {
      console.error('Error updating image label:', error)
      setMessage(`Failed to update image label: ${error.message}`)
      setMessageType('error')
    }
  }

  return (
    <div className='bg-gray-800 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 sm:p-6 xs:p-3 p-2 rounded-xl text-gray-100 min-h-[calc(100vh-120px)]'>
      <h2 className='sm:text-2xl text-xl font-bold text-blue-400 mb-6 mt-2'>
        📸 Physique Gallery
      </h2>

      {/* Add New Image Section */}
      <section className='mb-8 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-lg '>
        <h3 className='text-lg sm:text-xl font-semibold text-gray-200 mb-3'>
          Add New Gallery Image
        </h3>
        <div className='flex flex-col sm:flex-row gap-3 sm:items-end'>
          <div className='flex-grow '>
            <label
              htmlFor='image-upload'
              className='block text-gray-300 text-sm font-semibold mb-2 '
            >
              Select Image:
            </label>
            {previewFileUrl ? (
              <div className='relative max-h-[250px] max-w-[250px] rounded-md overflow-hidden border border-blue-500 flex-shrink-0 group'>
                <img
                  src={previewFileUrl}
                  alt='Preview'
                  className='w-full h-full pointer-events-none select-none object-cover'
                />
                <button
                  onClick={() => handleFileChange({ target: { files: [] } })}
                  className={`absolute top-0 right-0 bg-red-600 text-white w-6 h-6 lg:w-full lg:h-full flex items-center justify-center rounded-bl-lg lg:rounded-none lg:text-3xl lg:group-hover:opacity-70 lg:opacity-0 ${
                    uploading && 'cursor-not-allowed'
                  }`}
                  aria-label='Remove selected image preview'
                  disabled={uploading}
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <input
                type='file'
                id='image-upload'
                accept='image/*'
                onChange={handleFileChange}
                className='block w-full text-sm text-gray-400
                  file:mr-2 file:py-1 file:px-2 sm:file:mr-4 sm:file:py-2 sm:file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-500 file:text-white
                  hover:file:bg-blue-600 cursor-pointer
                  shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md'
                disabled={uploading}
              />
            )}
          </div>
          <div className='flex-grow'>
            <label
              htmlFor='image-label'
              className='block text-gray-300 text-sm font-semibold mb-1'
            >
              Image Label (e.g., "Side Chest Profile"):
            </label>
            <input
              type='text'
              id='image-label'
              value={newImageLabel}
              onChange={(e) => setNewImageLabel(e.target.value)}
              placeholder='Enter image label'
              className='w-full p-1 sm:p-2 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 text-sm'
              disabled={uploading}
            />
          </div>
          <button
            onClick={handleUploadImage}
            className={`px-4 py-1 sm:py-2  text-white rounded-md  transition-colors shadow-[4px_4px_0px_0px_#030712] border border-gray-950 flex-shrink-0 text-sm ${
              uploading
                ? ' cursor-not-allowed bg-green-900'
                : 'hover:bg-green-700 bg-green-600'
            }`}
            disabled={uploading}
          >
            {uploading ? (
              <span className='items-center flex gap-2 justify-center'>
                Uploading
                <span className='flex animate-spin w-4 h-4 border-2 border-t-transparent border-gray-300 rounded-full'></span>
              </span>
            ) : (
              <span className='items-center flex gap-2 justify-center'>
                <FaUpload />
                Upload Image
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className='mb-8 bg-gray-900 shadow-[5px_5px_0px_0px_#030712] border border-gray-950 p-4 rounded-lg '>
        <h3 className='text-lg sm:text-xl font-semibold text-gray-200 mb-3'>
          Search & Filter Images
        </h3>
        <div className='flex flex-col sm:flex-row gap-1.5 sm:gap-3 mb-2 sm:mb-4'>
          {/* Search Input (conditional type) */}
          <input
            type={searchType === 'date' ? 'date' : 'text'}
            placeholder={
              searchType === 'date' ? 'Select a date' : 'Enter label to Search'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='flex-grow p-1 px-2 sm:p-2 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 w-full text-sm  '
            aria-label={`Enter search term for ${searchType}`}
          />
          {/* Search Type Dropdown */}
          <select
            value={searchType}
            onChange={(e) => {
              setSearchType(e.target.value)
              setSearchTerm('')
            }}
            className='p-1 sm:p-2 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 text-sm sm:w-auto'
            aria-label='Select search type'
          >
            <option value='label'>Search by Label</option>
            <option value='date'>Search by Date</option>
          </select>
          {/* Sort Order Dropdown */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className='p-1 sm:p-2 bg-gray-800 shadow-[3px_3px_0px_0px_#030712] border border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-100 text-sm sm:w-auto'
            aria-label='Sort images by date'
          >
            <option value='newest'>Sort by Newest</option>
            <option value='oldest'>Sort by Oldest</option>
          </select>
        </div>
      </section>
      {loading && (
        <p className="text-lg font-semibold text-center text-gray-400 my-[20px] after:content-['.'] after:animate-dots ">
          Loading Images
          <span className='sr-only'>loading</span>
        </p>
      )}
      {!loading && imagesWithUrls.length === 0 && searchTerm === '' && (
        <p className='text-center text-gray-400 mb-[150px]'>
          No images found yet. Add some from the{' '}
          <button
            onClick={() => setCurrentPage(ROUTES.measurements)}
            className='font-semibold text-blue-300'
          >
            Measurements
          </button>{' '}
          tab or upload directly here!
        </p>
      )}

      {!loading && imagesWithUrls.length === 0 && searchTerm !== '' && (
        <p className='text-center text-gray-400 mb-[150px]'>
          No images match your search term "{searchTerm}".
        </p>
      )}

      {imagesWithUrls.length > 0 && (
        <GalleryView
          filteredAndSortedImages={imagesWithUrls}
          handleImageClick={handleImageClick}
          handleKeyPress={handleKeyPress}
          onImagesLoaded={() => setImagesLoaded(true)}
        />
      )}

      {showImagePreview && previewImageData && (
        <ImagePreviewModalGallery
          imageDate={new Date(previewImageData.date).toLocaleDateString()}
          imageUrl={previewImageData.url}
          imageLabel={previewImageData.label}
          canDelete={previewImageData.source === 'gallery'}
          onDeleteImage={handleDeleteGalleryImage}
          onClose={() => {
            setShowImagePreview(false)
            setPreviewImageData(null)
          }}
          imageData={previewImageData}
          onEditLabel={handleEditImageLabel}
        />
      )}
    </div>
  )
}
