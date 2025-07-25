// src/util/cloudinaryUtils.js

// IMPORTANT: Replace with your actual Cloudinary Cloud Name and Upload Preset
const CLOUDINARY_CLOUD_NAME = 'dgxyblafe' // e.g., 'dwz0s2j2x'
const CLOUDINARY_UPLOAD_PRESET = 'workout_tracker_unsigned' // e.g., 'workout_tracker_unsigned'

// Function to upload an image to Cloudinary (remains the same)
export const uploadImageToCloudinary = async (file, userId) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error.message || 'Cloudinary upload failed')
    }

    const data = await response.json();
    return {
      url: data.secure_url, // The secure URL of the uploaded image
      public_id: data.public_id, // Cloudinary's public ID, needed for deletion
    }
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    throw error
  }
}

// Function to delete an image from Cloudinary via Vercel Serverless Function
export const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) {
    console.warn('No public_id provided for Cloudinary deletion. Skipping.')
    return
  }

  try {
    // Call your Vercel Serverless Function
    const response = await fetch('/api/deleteImage', {
      // Path to your Vercel function
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Optional: Add a simple auth token if you implemented it in the Vercel function
        // 'X-Auth-Token': 'YOUR_VERCEL_AUTH_TOKEN_HERE',
      },
      body: JSON.stringify({ public_id: publicId }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error || 'Failed to delete image via Vercel function.'
      )
    }

    console.log(`Vercel Function response for deletion of ${publicId}:`, data)
    return data // Return the data from the function (e.g., { success: true })
  } catch (error) {
    console.error(
      `Error calling Vercel Function to delete Cloudinary image ${publicId}:`,
      error
    )
    throw error // Re-throw to be handled by the calling component
  }
}
