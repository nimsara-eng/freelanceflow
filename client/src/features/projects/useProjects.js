import { useCallback, useEffect, useState } from 'react'
import { api } from '../auth/api'
import { useAuth } from '../auth/useAuth'

export function useProjects(query = '', endpoint = '/projects') {
  const { user } = useAuth()
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState(null)
  const key = `${user.id}:${endpoint}:${query}:${revision}`
  useEffect(() => {
    const controller = new AbortController()
    api(`${endpoint}${query ? `?${query}` : ''}`, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ key, data })
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ key, error: error.message })
    })
    return () => controller.abort()
  }, [key, query, endpoint])
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  return { loading: result?.key !== key, data: result?.key === key ? result.data : null, error: result?.key === key ? result.error : '', refresh }
}
