// /api/getSignedImageUrl.js
import { auth, db } from './lib/initFirebaseAdmin.js'
import { v2 as cloudinary } from 'cloudinary'

// Cloudinary config (server-side)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' })
    }

    const { publicId, docId } = req.query
    if (!publicId || !docId) {
      return res
        .status(400)
        .json({ message: 'publicId and docId are required' })
    }

    // Auth check
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return res.status(401).json({ message: 'Missing Authorization token' })
    }

    let decoded
    try {
      decoded = await auth.verifyIdToken(token)
    } catch (err) {
      console.error('Auth verification failed:', err)
      return res.status(401).json({ message: 'Invalid or expired token.' })
    }
    const userId = decoded.uid

    // App ID
    const appId =
      process.env.FIREBASE_APP_ID ||
      process.env.VITE_FIREBASE_APP_ID ||
      'workout-tracker-app-local'

    const decodedPublicId = decodeURIComponent(publicId)

    let imageFound = false

    // Check measurements
    const measurementsRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('users')
      .doc(userId)
      .collection('measurements')
      .doc(docId)

    const measurementsSnap = await measurementsRef.get()
    if (measurementsSnap.exists) {
      const data = measurementsSnap.data() || {}
      if (
        Array.isArray(data.imageUrls) &&
        data.imageUrls.some((img) => img?.public_id === decodedPublicId)
      ) {
        imageFound = true
      }
    }

    // Check gallery if not found in measurements
    if (!imageFound) {
      const galleryRef = db
        .collection('artifacts')
        .doc(appId)
        .collection('users')
        .doc(userId)
        .collection('userGalleryImages')
        .doc(docId)

      const gallerySnap = await galleryRef.get()
      if (gallerySnap.exists) {
        const g = gallerySnap.data() || {}
        if (g.public_id === decodedPublicId) {
          imageFound = true
        }
      }
    }

    if (!imageFound) {
      console.warn(
        `[getSignedImageUrl] Ownership check failed appId=${appId}, userId=${userId}, docId=${docId}, publicId=${decodedPublicId}`
      )
      return res.status(403).json({
        message: 'Forbidden: You do not have permission to view this image.',
      })
    }

    // --- Get actual format from Cloudinary ---
    const resource = await cloudinary.api.resource(decodedPublicId, {
      type: 'authenticated',
    })
    const fileFormat = resource.format // jpg, png, webp, etc.

    const expiresAt = Math.floor(Date.now() / 1000) + 3600

    // Real expiring URL
    const signedUrl = cloudinary.utils.private_download_url(
      decodedPublicId,
      fileFormat,
      {
        type: 'authenticated',
        expires_at: expiresAt,
      }
    )

    return res.status(200).json({ url: signedUrl, expiresAt })
  } catch (error) {
    console.error('Error in /api/getSignedImageUrl:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}
