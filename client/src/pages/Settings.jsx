import { useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { api } from '../features/auth/api'
import SettingsEditor from '../features/settings/SettingsEditor'

export default function Settings() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    api('/profile/me', { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setResult({ attempt, data }) })
      .catch((error) => { if (!controller.signal.aborted) setResult({ attempt, error: error.message }) })
    return () => controller.abort()
  }, [attempt])

  const current = result?.attempt === attempt ? result : null
  if (!current || current.error) return (
    <Card>
      <h1 className="text-2xl font-semibold">{current?.error ? 'Settings could not be loaded' : 'Opening your settings'}</h1>
      <p role={current?.error ? 'alert' : 'status'} className="mt-3 text-sm leading-7 text-muted">{current?.error || 'Getting your saved profile details…'}</p>
      {current?.error && <Button className="mt-5" onClick={() => setAttempt((value) => value + 1)}>Try again</Button>}
    </Card>
  )
  return <SettingsEditor initial={current.data} />
}
