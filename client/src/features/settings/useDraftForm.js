import { useState } from 'react'

export function useDraftForm(initial, report) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  function change(next) {
    setDraft(next)
    setErrors({})
    setError('')
    setMessage('')
    report({ dirty: JSON.stringify(next) !== JSON.stringify(saved), busy: false })
  }

  function validate(result, form) {
    setErrors(result.errors)
    setError('')
    setMessage('')
    const first = Object.keys(result.errors)[0]
    if (first) {
      form.elements.namedItem(first)?.focus()
      return false
    }
    return true
  }

  function start() {
    setBusy(true)
    setError('')
    setMessage('')
    report({ dirty, busy: true })
  }

  function finish(value, text = 'Changes saved.') {
    setSaved(value)
    setDraft(value)
    setBusy(false)
    setErrors({})
    setError('')
    setMessage(text)
    report({ dirty: false, busy: false })
  }

  function fail(failure) {
    setBusy(false)
    setError(failure.message)
    report({ dirty, busy: false })
  }

  function discard() { finish(saved, 'Unsaved changes discarded.') }
  return { saved, draft, busy, dirty, errors, message, error, change, validate, start, finish, fail, discard }
}
