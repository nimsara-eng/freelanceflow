import { useEffect, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Avatar from '../components/ui/Avatar'
import { api } from '../features/auth/api'

export default function FindFreelancer() {
  const { freelancerId } = useParams()
  const navigate = useNavigate()
  const { key: lookup } = useLocation()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!freelancerId) return
    const controller = new AbortController()
    api(`/freelancers/${encodeURIComponent(freelancerId)}`, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setResult({ lookup, profile: data.profile }) })
      .catch((failure) => { if (!controller.signal.aborted) setResult({ lookup, error: failure.message }) })
    return () => controller.abort()
  }, [freelancerId, lookup])

  function search(event) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('freelancerId').trim()
    let id = value.toUpperCase()
    if (/^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value)
        if (url.origin !== window.location.origin) throw new Error()
        id = url.pathname.match(/^\/freelancers\/(FF-[A-F0-9]{12})\/?$/i)?.[1]?.toUpperCase() ?? ''
      } catch { id = '' }
    }
    if (!/^FF-[A-F0-9]{12}$/.test(id)) {
      setError('Enter a valid ID such as FF-123456ABCDEF, or a profile link from this FreelanceFlow site.')
      return
    }
    setError('')
    navigate(`/freelancers/${id}`)
  }

  const current = result?.lookup === lookup ? result : null
  const profile = current?.profile
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Make a connection</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Find a freelancer</h1><p className="mt-3 text-sm leading-7 text-muted">Only published profiles are visible. Knowing an ID does not grant access to someone’s projects.</p></header>
      <Card>
        <form onSubmit={search} className="space-y-4">
          <Input key={freelancerId || 'search'} name="freelancerId" label="Freelancer ID or profile link" defaultValue={freelancerId || ''} placeholder="FF-123456ABCDEF" maxLength={2048} required error={error} />
          <Button type="submit"><Search size={17} aria-hidden="true" />Find profile</Button>
        </form>
      </Card>
      {freelancerId && !current && <p role="status" className="text-sm text-muted">Looking for this freelancer…</p>}
      {current?.error && <Card><p role="alert" className="text-sm">{current.error}</p><p className="mt-3 text-xs leading-6 text-muted">The profile may be private or not published yet. New profiles require email verification before publishing.</p></Card>}
      {profile && (
        <Card>
          <div className="mb-5"><Avatar src={profile.avatarUrl} name={profile.displayName} className="size-20 text-xl" /></div>
          <Badge tone="brand">{profile.freelancerId}</Badge>
          <h2 className="mt-4 text-2xl font-semibold">{profile.displayName}</h2>
          <p className="mt-2 text-sm text-brand">{profile.headline}</p>
          <p className="mt-2 text-xs text-muted">{[profile.publicLocation?.city, profile.publicLocation?.country].filter(Boolean).join(', ')}</p>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted">{profile.bio}</p>
          <div className="mt-5 flex flex-wrap gap-2">{profile.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
          {profile.services.length > 0 && <div className="mt-6"><h3 className="text-sm font-semibold">Services</h3><ul className="mt-2 list-inside list-disc space-y-2 text-sm text-muted">{profile.services.map((service) => <li key={service}>{service}</li>)}</ul></div>}
          <div className="mt-6 flex flex-wrap gap-5">{[['GitHub', profile.githubUrl], ['LinkedIn', profile.linkedinUrl], ['Portfolio', profile.portfolioUrl]].filter(([, url]) => { try { return new URL(url).protocol === 'https:' } catch { return false } }).map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">{label}<ExternalLink size={15} aria-hidden="true" /></a>)}</div>
          {profile.hasResume && profile.resumeUrl === `/api/freelancers/${profile.freelancerId}/resume` && <a href={profile.resumeUrl} download="resume.pdf" className="mt-6 inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold text-brand hover:bg-surface-2">Download resume (PDF)</a>}
        </Card>
      )}
    </section>
  )
}
