// src/util/cloudinaryUtils.js

// IMPORTANT: Replace with your actual Cloudinary Cloud Name and Upload Preset
const CLOUDINARY_CLOUD_NAME = 'dgxyblafe'; // e.g., 'dwz0s2j2x'
const CLOUDINARY_UPLOAD_PRESET = 'workout_tracker_unsigned'; // e.g., 'workout_tracker_unsigned'

// Function to upload an image to Cloudinary
export const uploadImageToCloudinary = async (file, userId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  // Optional: You can add a folder structure based on userId or date
  // formData.append('folder', `workout_tracker/${userId}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || 'Cloudinary upload failed');
    }

    const data = await response.json();
    console.log('Cloudinary upload success:', data);
    return {
      url: data.secure_url, // The secure URL of the uploaded image
      public_id: data.public_id, // Cloudinary's public ID, needed for deletion
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

// Function to delete an image from Cloudinary
// NOTE: Client-side deletion requires a signed request. For simplicity and security,
// this example assumes you might have a backend function (e.g., Firebase Function)
// that handles the signed deletion. If you only use client-side, you'd need to
// expose your API Key (NOT recommended) or use a third-party library that handles signing.
// For now, we'll log a warning if public_id is present but no backend is assumed.
//
// For a production app, you would typically call a backend endpoint here:
// const response = await fetch('/api/delete-cloudinary-image', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ public_id: publicId, userId: userId }) // Pass userId for security checks on backend
// });
//
// For this client-side only example, direct deletion without a backend is not secure
// as it would require exposing your Cloudinary API Secret.
// We will only remove the reference from Firestore.
export const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) {
    console.warn("No public_id provided for Cloudinary deletion. Skipping.");
    return;
  }
  console.warn(
    `Attempted to delete Cloudinary image with public_id: ${publicId}. ` +
    `Client-side deletion of Cloudinary images requires a signed request, ` +
    `which typically means you need a backend function to handle it securely. ` +
    `This image will be removed from Firestore but remains in Cloudinary storage.`
  );
  // In a real application, if you need to delete from Cloudinary,
  // you would call your backend function here.
  // Example:
  /*
  try {
    const response = await fetch('/api/delete-cloudinary-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id: publicId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || 'Cloudinary deletion failed');
    }
    console.log(`Successfully requested deletion for public_id: ${publicId}`);
  } catch (error) {
    console.error(`Error requesting deletion for public_id ${publicId}:`, error);
    throw error; // Re-throw to be handled by the calling component
  }
  */
};
