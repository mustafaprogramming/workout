// /api/signUpload.js
import { v2 as cloudinary } from 'cloudinary'
import { auth } from './lib/initFirebaseAdmin.js'

export default async function handler(req, res) {
  try {
    // Ensure Cloudinary environment variables are set before proceeding.
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error(
        'Missing Cloudinary environment variables. Please check your configuration.'
      )
      return res.status(500).json({
        message:
          'Server configuration error: Cloudinary credentials are not set.',
      })
    }

    // Configure Cloudinary with environment variables.
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' })
    }

    // Authenticate the user with the ID token.
    const idToken = req.headers.authorization?.split(' ')[1]
    if (!idToken) {
      return res.status(401).json({ message: 'No authorization token provided.' })
    }

    // Verify the token and get the user ID.
    try {
      await auth.verifyIdToken(idToken)
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token.' })
    }

    // The user is authenticated, so we can now sign the upload.
    const timestamp = Math.round(new Date().getTime() / 1000)
    // The public_id can be a random string or derived from user data.
    // Here we use a random string to avoid collisions.
    const public_id = `user-uploads/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id,
        type: 'authenticated', // must match client-side upload parameters
        overwrite: true,
        invalidate: true,
      },
      process.env.CLOUDINARY_API_SECRET
    )

    return res.status(200).json({
      signature,
      timestamp,
      public_id,
      cloudname: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    })
  } catch (error) {
    console.error('Error in /api/signUpload:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}