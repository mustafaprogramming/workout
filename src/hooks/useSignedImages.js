import { useEffect, useState, useRef, useCallback } from 'react'
import { useImageContext } from '../context/ImageContext'

export function useSignedImages(publicIds = [], docIds) {
  const { fetchSignedImage, imageCache } = useImageContext()
  const [urls, setUrls] = useState([])
  const isMountedRef = useRef(true)
  const refreshTimersRef = useRef({})

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Clear all timers
      Object.values(refreshTimersRef.current).forEach(clearTimeout)
    }
  }, [])

  const fetchWithTimeout = useCallback(
    (publicId, docId, timeout = 40000) =>
      Promise.race([
        fetchSignedImage(publicId, docId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        ),
      ]),
    [fetchSignedImage]
  )

  const fetchWithRetry = useCallback(
    async (publicId, docId, retries = 2) => {
      try {
        return await fetchWithTimeout(publicId, docId)
      } catch (e) {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, 1000))
          return fetchWithRetry(publicId, docId, retries - 1)
        }
        console.error(`Failed after retries: ${publicId}`, e.message)
        return null
      }
    },
    [fetchWithTimeout]
  )

  const fetchSingle = useCallback(
    async (publicId, docId, index) => {
      const url = await fetchWithRetry(publicId, docId)
      if (!isMountedRef.current) return
      setUrls(prev => {
        const copy = [...prev]
        copy[index] = url
        return copy
      })

      // Schedule next refresh
      const key = `${publicId}|${docId}`
      const expiresAt = imageCache[key]?.expiresAt
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000)
        const refreshEarly = Math.floor((expiresAt - now) * 0.1) || 5
        const msUntilRefresh = Math.max((expiresAt - now - refreshEarly) * 1000, 2000)
        if (refreshTimersRef.current[key]) clearTimeout(refreshTimersRef.current[key])
        refreshTimersRef.current[key] = setTimeout(() => {
          fetchSingle(publicId, docId, index)
        }, msUntilRefresh)
      }
    },
    [fetchWithRetry, imageCache]
  )

  const fetchAll = useCallback(() => {
    publicIds.forEach((publicId, index) => {
      const docId = Array.isArray(docIds) ? docIds[index] : docIds
      if (!publicId || !docId) return
      fetchSingle(publicId, docId, index)
    })
  }, [publicIds, docIds, fetchSingle])

  useEffect(() => {
    setUrls(publicIds.map(() => null))
    fetchAll()
  }, [publicIds, docIds, fetchAll])

  return urls
}
