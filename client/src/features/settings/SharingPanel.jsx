import { useState } from 'react'
import { Check, Copy, Download, Link2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function SharingPanel({ profile }) {
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')
  const [qrState, setQrState] = useState('loading')
  const [qrAttempt, setQrAttempt] = useState(0)
  const profilePath = `/freelancers/${profile.freelancerId}`
  const profileLink = new URL(profilePath, window.location.origin).href
  const localOnly = ['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname)
  const qrUrl = `/api/profile/qr?origin=${encodeURIComponent(window.location.origin)}&retry=${qrAttempt}`

  async function copy(value, label) {
    setCopied('')
    setError('')
    try {
      if (!navigator.clipboard?.writeText) throw new Error()
      await navigator.clipboard.writeText(value)
      setCopied(label)
    } catch { setError('Copy is unavailable in this browser. Select the text below and copy it manually.') }
  }

  return (
    <Card>
      <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Link2 size={22} aria-hidden="true" /></span><div><h2 className="text-xl font-semibold tracking-tight">Share your profile</h2><p className="mt-1 text-xs text-muted">Share your freelancer ID, profile link or QR code.</p></div></div>
      <div className="mt-6 flex flex-wrap items-center gap-3"><Badge tone={profile.visibility === 'published' ? 'success' : 'neutral'}>{profile.visibility === 'published' ? 'Published profile' : 'Unpublished profile'}</Badge><p className="text-xs leading-6 text-muted">{profile.visibility === 'published' ? 'Signed-in clients can open this profile.' : 'Clients cannot view this profile until you publish it.'}</p></div>
      <Link to="/settings?section=freelancer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">Manage profile visibility</Link>
      <div className="mt-7 space-y-6">
        <div className="rounded-2xl border border-border bg-surface-2 p-5 text-center"><h3 className="text-sm font-semibold">Your profile QR code</h3><p className="mt-2 text-xs leading-6 text-muted">Scan to open your profile.</p><img src={qrUrl} width="240" height="240" loading="lazy" alt="QR code for your FreelanceFlow profile" className={`mx-auto mt-4 max-w-full rounded-2xl border border-border bg-white ${qrState === 'error' ? 'hidden' : ''}`} onLoad={() => setQrState('ready')} onError={() => setQrState('error')} />{qrState === 'loading' && <p role="status" className="mt-3 text-xs text-muted">Generating your QR code…</p>}{qrState === 'error' && <div className="mt-4"><p role="alert" className="text-sm text-muted">Unable to load the QR code. Please try again.</p><Button variant="secondary" size="sm" className="mt-3" onClick={() => { setQrState('loading'); setQrAttempt((value) => value + 1) }}><RefreshCw size={15} aria-hidden="true" />Retry QR code</Button></div>}{qrState === 'ready' && <a href={`${qrUrl}&download=1`} download={`${profile.freelancerId}-QR.png`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-brand hover:bg-bg"><Download size={16} aria-hidden="true" />Download QR code</a>}</div>
        <div><Input label="Your freelancer ID" value={profile.freelancerId} readOnly onFocus={(event) => event.target.select()} /><Button variant="secondary" size="sm" className="mt-3" onClick={() => copy(profile.freelancerId, 'Freelancer ID')}>{copied === 'Freelancer ID' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}Copy ID</Button></div>
        <div><Input label="Your profile link" value={profileLink} readOnly onFocus={(event) => event.target.select()} /><div className="mt-3 flex flex-wrap items-center gap-4"><Button variant="secondary" size="sm" onClick={() => copy(profileLink, 'Profile link')}>{copied === 'Profile link' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}Copy link</Button>{profile.visibility === 'published' && <Link to={profilePath} className="text-sm font-medium text-brand hover:underline">View published profile</Link>}</div></div>
        {localOnly && <p className="rounded-xl border border-border bg-surface-2 p-4 text-xs leading-6 text-muted">Local profile link. Available on this device.</p>}

        {copied && <p role="status" className="text-sm text-brand">{copied} copied.</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </Card>
  )
}
