// /api/deleteImage.js
import { v2 as cloudinary } from 'cloudinary'
import { auth, db } from './lib/initFirebaseAdmin.js'

export default async function handler(req, res) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' })
    }

    const idToken = req.headers.authorization?.split(' ')[1]
    if (!idToken) {
      return res
        .status(401)
        .json({ message: 'No authorization token provided.' })
    }

    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { publicId, docId } = req.body
    if (!publicId || !docId) {
      return res.status(400).json({ message: 'Missing publicId or docId' })
    }

    // CRITICAL SECURITY STEP: Check if the user owns the document before attempting to delete.
    const appId = process.env.VITE_FIREBASE_APP_ID || 'workout-tracker-app-local'
    const docRef = db.collection(`artifacts/${appId}/users/${userId}/measurements`).doc(docId)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      // It's possible the user is trying to delete an image from the `userGalleryImages` collection.
      // We should check that collection as well.
      const galleryDocRef = db.collection(`artifacts/${appId}/users/${userId}/userGalleryImages`).doc(docId)
      const galleryDocSnap = await galleryDocRef.get()

      if (!galleryDocSnap.exists || galleryDocSnap.data().public_id !== publicId) {
        return res
          .status(403)
          .json({ message: 'Forbidden: You do not have permission to delete this image.' })
      }
    } else {
      // Check if the image with the given publicId exists in the measurement document.
      const data = docSnap.data()
      if (!data.imageUrls.some(img => img.public_id === publicId)) {
        return res
          .status(403)
          .json({ message: 'Forbidden: Image not found in your document.' })
      }
    }

    const deleteResponse = await cloudinary.uploader.destroy(publicId, {
      type: 'authenticated',
      invalidate: true,
    })

    if (deleteResponse.result === 'not found') {
      // If Cloudinary doesn't find it but our DB does, we can consider this a partial success
      // and still let the front end remove it from the DB.
      console.warn(`Cloudinary image ${publicId} not found, but DB entry exists.`)
    } else if (deleteResponse.result !== 'ok') {
      return res.status(500).json({
        message: 'Failed to delete image from Cloudinary.',
        details: deleteResponse,
      })
    }

    // Now, respond with success, and let the client-side code handle the Firestore update.
    return res.status(200).json({
      message: 'Image deletion successful.',
      result: deleteResponse.result,
    })
  } catch (error) {
    console.error('Error in /api/deleteImage:', error)
    if (error.code === 'auth/argument-error' || error.message.includes('token')) {
      return res.status(401).json({ message: 'Invalid or expired authentication token.' })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}