// ImageContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react'
import { getAuth } from 'firebase/auth'
import { useFirebase } from './FirebaseContext'

const ImageContext = createContext()

export function ImageProvider({ children }) {
  const { user } = useFirebase()
  const [imageCache, setImageCache] = useState({})

  const fetchSignedImage = useCallback(
    async (publicId, docId) => {
      if (!publicId || !docId) {
        throw new Error('publicId and docId are required')
      }

      const key = `${publicId}|${docId}`
      const now = Math.floor(Date.now() / 1000)
      const cached = imageCache[key]

      // Return cached if still valid
      if (cached && cached.expiresAt > now) {
        return cached.url
      }

      const auth = getAuth()
      const currentUser = auth.currentUser
      if (!currentUser) {
        console.error(`No authenticated user for ${key}`)
        return null
      }
      
      try {
        const token = await currentUser.getIdToken()
        const query = `publicId=${encodeURIComponent(publicId)}&docId=${encodeURIComponent(docId)}`
        const res = await fetch(`/api/getSignedImageUrl?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.message || `Failed to get signed URL: ${res.status}`)
        }

        const data = await res.json()
        const signedUrl = data.url || null

        let expiresAt
        if (data.expiresAt) {
          // 🔹 Always store expiry with 10% buffer for safety
          expiresAt = Math.floor(data.expiresAt - (data.expiresAt - now) * 0.10)
        } else {
          // Fallback: 1 minute if server didn't send expiresAt
          expiresAt = now + 60
        }

        if (signedUrl) {
          setImageCache((prev) => ({
            ...prev,
            [key]: { url: signedUrl, expiresAt },
          }))
        }
        return signedUrl
      } catch (e) {
        console.error(`ImageContext fetch error for ${key}:`, e)
        return null
      }
    },
    [imageCache, user]
  )

  return (
    <ImageContext.Provider value={{ fetchSignedImage, imageCache }}>
      {children}
    </ImageContext.Provider>
  )
}

export function useImageContext() {
  return useContext(ImageContext)
}
