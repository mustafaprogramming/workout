import { useEffect, useState, useRef, useCallback } from 'react'
import { useImageContext } from '../context/ImageContext'

export function useSignedImages(publicIds = [], docIds) {
  const { fetchSignedImage, imageCache } = useImageContext()
  const [urls, setUrls] = useState([])
  const isMountedRef = useRef(true)
  const refreshTimersRef = useRef({})
  const cacheRef = useRef(imageCache)

  // Keep ref updated with latest cache
  useEffect(() => {
    cacheRef.current = imageCache
  }, [imageCache])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      Object.values(refreshTimersRef.current).forEach(clearTimeout)
    }
  }, [])

  const fetchWithTimeout = useCallback(
    (publicId, docId, timeout = 40000, opts = {}) =>
      Promise.race([
        fetchSignedImage(publicId, docId, opts),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout after ${timeout}ms`)),
            timeout
          )
        ),
      ]),
    [fetchSignedImage]
  )

  const fetchWithRetry = useCallback(
    async (publicId, docId, retries = 2, opts = {}) => {
      try {
        return await fetchWithTimeout(publicId, docId, 40000, opts)
      } catch (e) {
        if (retries > 0) {
          await new Promise((res) => setTimeout(res, 1000))
          return fetchWithRetry(publicId, docId, retries - 1, opts)
        }
        console.error(`Failed after retries: ${publicId}`, e.message)
        return null
      }
    },
    [fetchWithTimeout]
  )

  const fetchSingle = useCallback(
    async (publicId, docId, index, opts = {}) => {
      const key = `${publicId}|${docId}`
      const cached = cacheRef.current[key]

      if (cached?.deleted) {
        setUrls((prev) => {
          const copy = [...prev]
          copy[index] = null
          return copy
        })
        return
      }

      const url = await fetchWithRetry(publicId, docId, 2, opts)
      if (!isMountedRef.current) return

      setUrls((prev) => {
        const copy = [...prev]
        copy[index] = url
        return copy
      })

      // Schedule refresh if cache exists and this was not already a refresh call
      const expiresAt = cacheRef.current[key]?.expiresAt
      const dateThen = cacheRef.current[key]?.dateThen

      if (expiresAt && dateThen && !opts.forceRefresh) {
        const expire = expiresAt - dateThen // total lifetime in seconds
        const now = Math.floor(Date.now() / 1000)
        const refreshEarly = Math.floor(expire * 0.05) || 5 // refresh 5% early, min 5s
        let msUntilRefresh = (expiresAt - now - refreshEarly) * 1000

        // If already expired or too close to expiry, refresh immediately
        if (msUntilRefresh <= 0) {
          fetchSingle(publicId, docId, index, { forceRefresh: true })
          return
        }

        // Clear any existing timer for this key
        if (refreshTimersRef.current[key]) {
          clearTimeout(refreshTimersRef.current[key])
        }
        // Schedule refresh
        refreshTimersRef.current[key] = setTimeout(() => {
          fetchSingle(publicId, docId, index, { forceRefresh: true })
          refreshTimersRef.current[key] = null
        }, msUntilRefresh)
      }
    },
    [fetchWithRetry]
  )

  const fetchAll = useCallback(() => {
    publicIds.forEach((publicId, index) => {
      const docId = Array.isArray(docIds) ? docIds[index] : docIds
      if (!publicId || !docId) return

      const cached = cacheRef.current[`${publicId}|${docId}`]
      if (cached?.deleted) return

      fetchSingle(publicId, docId, index)
    })
  }, [publicIds, docIds, fetchSingle])

  useEffect(() => {
    setUrls(publicIds.map(() => null))
    fetchAll()
  }, [publicIds, docIds, fetchAll])

  return urls
}
