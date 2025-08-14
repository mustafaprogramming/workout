// ImageContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react'
import { getAuth } from 'firebase/auth'
import { useFirebase } from './FirebaseContext'

const ImageContext = createContext()

export function ImageProvider({ children }) {
  const { user } = useFirebase()
  const [imageCache, setImageCache] = useState({})

  // ✅ Mark image as deleted so it won't refetch
  const removeCachedImage = useCallback((publicId, docId) => {
    const key = `${publicId}|${docId}`
    setImageCache((prev) => ({
      ...prev,
      [key]: { deleted: true },
    }))
  }, [])
  
  const fetchSignedImage = useCallback(
    async (publicId, docId) => {
      if (!publicId || !docId)
        throw new Error('publicId and docId are required')
      
      const key = `${publicId}|${docId}`
      const now = Math.floor(Date.now() / 1000)

      // ✅ Use the latest cache state
      let currentCache
      setImageCache((prev) => {
        currentCache = prev
        return prev
      })
      
      
      // Skip if marked deleted
      if (currentCache[key]?.deleted) return null

      // Use cached if valid
      if (currentCache[key]?.url && currentCache[key].expiresAt > now) {
        return currentCache[key].url
      }

      const auth = getAuth()
      const currentUser = auth.currentUser
      if (!currentUser) {
        console.error(`No authenticated user for ${key}`)
        return null
      }

      try {
        const token = await currentUser.getIdToken()
        const query = `publicId=${encodeURIComponent(
          publicId
        )}&docId=${encodeURIComponent(docId)}`
        const res = await fetch(`/api/getSignedImageUrl?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          if (res.status === 403 || res.status === 404)
            removeCachedImage(publicId, docId)
          const err = await res.json().catch(() => null)
          throw new Error(
            err?.message || `Failed to get signed URL: ${res.status}`
          )
        }

        const data = await res.json()
        const signedUrl = data.url || null
        const expiresAt = data.expiresAt
          ? Math.floor(data.expiresAt - (data.expiresAt - now) * 0.1)
          : now + 60

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
    [removeCachedImage, user]
  )

  return (
    <ImageContext.Provider
      value={{ fetchSignedImage, imageCache, setImageCache, removeCachedImage }}
    >
      {children}
    </ImageContext.Provider>
  )
}

export function useImageContext() {
  return useContext(ImageContext)
}
