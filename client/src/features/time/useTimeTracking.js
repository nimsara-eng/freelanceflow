import { useState } from 'react'
import { useAuth } from '../auth/useAuth'

function emptyState() {
  return {
    active: null,
    entries: [],
  }
}

function isValidTimer(value) {
  return (
    value &&
    typeof value.projectId === 'string' &&
    typeof value.description === 'string' &&
    Number.isFinite(value.startedAt)
  )
}

function readStoredState(storageKey) {
  try {
    const stored = sessionStorage.getItem(storageKey)

    if (!stored) {
      return emptyState()
    }

    const parsed = JSON.parse(stored)

    if (!parsed || !Array.isArray(parsed.entries)) {
      return emptyState()
    }

    return {
      active: isValidTimer(parsed.active) ? parsed.active : null,
      entries: parsed.entries.filter(
        (entry) =>
          isValidTimer(entry) &&
          typeof entry.id === 'string' &&
          Number.isFinite(entry.durationMs) &&
          entry.durationMs >= 0,
      ),
    }
  } catch {
    return emptyState()
  }
}

export default function useTimeTracking() {
  const { user } = useAuth()
  const storageKey = `freelanceflow:time-preview:v1:${user.id}`
  const [state, setState] = useState(() => readStoredState(storageKey))
  const [error, setError] = useState('')

  function saveState(nextState) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(nextState))
    } catch {
      setError(
        'Browser storage is unavailable. The change could not be saved.',
      )
      return false
    }

    setState(nextState)
    setError('')
    return true
  }

  function startTimer(projectId, description) {
    if (state.active) {
      return false
    }

    return saveState({
      ...state,
      active: {
        projectId,
        description,
        startedAt: Date.now(),
      },
    })
  }

  function stopTimer() {
    if (!state.active) {
      return false
    }

    const endedAt = Date.now()

    const entry = {
      ...state.active,
      id: crypto.randomUUID(),
      endedAt,
      durationMs: Math.max(0, endedAt - state.active.startedAt),
    }

    return saveState({
      active: null,
      entries: [entry, ...state.entries],
    })
  }

  function deleteEntry(entryId) {
    return saveState({
      ...state,
      entries: state.entries.filter((entry) => entry.id !== entryId),
    })
  }

  return {
    active: state.active,
    entries: state.entries,
    error,
    startTimer,
    stopTimer,
    deleteEntry,
  }
}
