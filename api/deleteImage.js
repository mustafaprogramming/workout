    // api/deleteImage.js
    import { v2 as cloudinary } from 'cloudinary';

    // Add these console.logs to verify environment variables are loaded
    console.log('Vercel deleteImage function started (ESM).');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Loaded' : 'NOT LOADED');
    console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Loaded' : 'NOT LOADED');
    console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Loaded' : 'NOT LOADED');
    // For security, do NOT log the actual secrets in production, but for local debug it's okay briefly
    // console.log('CLOUDINARY_API_KEY_VALUE:', process.env.CLOUDINARY_API_KEY);
    // console.log('CLOUDINARY_API_SECRET_VALUE:', process.env.CLOUDINARY_API_SECRET);


    // Configure Cloudinary using Vercel Environment Variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    export default async function handler(req, res) {
      try {
        console.log('Inside try block of deleteImage function.');

        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method Not Allowed' });
        }

        const { public_id } = req.body;

        if (!public_id) {
          return res.status(400).json({ error: 'Missing public_id in request body.' });
        }

        console.log(`Attempting to delete public_id: ${public_id}`);

        const result = await cloudinary.uploader.destroy(public_id);

        if (result.result === 'ok') {
          console.log(`Successfully deleted ${public_id}`);
          return res.status(200).json({ success: true, message: `Image ${public_id} deleted successfully.` });
        } else {
          console.error(`Cloudinary deletion failed for ${public_id}: ${result.result}`);
          return res.status(500).json({ success: false, error: `Cloudinary deletion failed: ${result.result}` });
        }
      } catch (error) {
        console.error('Unhandled error in deleteImage Vercel function:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error.' });
      }
    }
    