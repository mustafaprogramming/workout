// src/util/cloudinaryUtils.js

import { getAuth } from 'firebase/auth'

/**
 * Uploads an image to Cloudinary using a signed upload request.
 * Automatically fetches the current user's ID token.
 */
export const uploadImageToCloudinary = async (file) => {
  try {
    const auth = getAuth()
    const idToken = await auth.currentUser.getIdToken()

    const signResponse = await fetch('/api/signUpload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    })

    if (!signResponse.ok) {
      const errorData = await signResponse.json()
      throw new Error(
        errorData.message || 'Failed to get signed upload signature.'
      )
    }

    const { signature, timestamp, public_id, cloudname, api_key } =
      await signResponse.json()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', api_key)
    formData.append('timestamp', timestamp)
    formData.append('signature', signature)
    formData.append('public_id', public_id)
    formData.append('type', 'authenticated') // must match server signing params
    formData.append('overwrite', 'true') // must match server signing params
    formData.append('invalidate', 'true') // must match server signing params

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json()
      throw new Error(errorData.error?.message || 'Cloudinary upload failed.')
    }

    return uploadResponse.json()
  } catch (error) {
    console.error('Error in uploadImageToCloudinary:', error)
    throw error
  }
}

/**
 * Deletes an image from Cloudinary using a signed deletion request.
 * Automatically fetches the current user's ID token.
 * This function also sends the docId for server-side ownership verification.
 */
export const deleteCloudinaryImage = async (publicId, docId) => {
  try {
    const auth = getAuth()
    const idToken = await auth.currentUser.getIdToken()

    const response = await fetch('/api/deleteImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ publicId, docId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to delete image.')
    }

    return response.json()
  } catch (error) {
    console.error('Error in deleteCloudinaryImage:', error)
    throw error
  }
}