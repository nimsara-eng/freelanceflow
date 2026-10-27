import { useEffect, useRef, useState } from 'react'
import { FileText, ImagePlus, Upload } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import { api, uploadFile } from '../auth/api'
import { useAuth } from '../auth/useAuth'

const fileInputClass = 'block w-full min-w-0 rounded-xl border border-border bg-surface p-2 text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-brand disabled:opacity-60'
const sizeLabel = (bytes) => `${(bytes / 1024).toFixed(0)} KB`

export default function MediaPanel({ report }) {
  const { user, freelancerProfile, updateProfile } = useAuth()
  const [assets, setAssets] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [files, setFiles] = useState({ avatar: null, resume: null })
  const filesRef = useRef(files)
  const avatarInput = useRef(null)
  const resumeInput = useRef(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [removing, setRemoving] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api('/profile/files', { signal: controller.signal }).then((data) => { if (!controller.signal.aborted) setAssets(data) }).catch((error) => { if (!controller.signal.aborted) setLoadError(error.message) })
    return () => controller.abort()
  }, [attempt])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function status(isBusy) { report({ dirty: Boolean(filesRef.current.avatar || filesRef.current.resume), busy: isBusy }) }
  function clearFile(kind) {
    const next = { ...filesRef.current, [kind]: null }
    filesRef.current = next
    setFiles(next)
    const input = kind === 'avatar' ? avatarInput.current : resumeInput.current
    if (input) input.value = ''
    if (kind === 'avatar') setPreview(null)
  }
  function choose(kind, event) {
    const file = event.target.files?.[0]
    if (!file) return
    setFeedback(null)
    const validType = kind === 'avatar' ? ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name)) : file.type === 'application/pdf' || (!file.type && /\.pdf$/i.test(file.name))
    if (!validType || !file.size || file.size > 5 * 1024 * 1024) {
      clearFile(kind)
      status(false)
      setFeedback({ kind, error: true, text: kind === 'avatar' ? 'Choose a JPEG, PNG or WebP photo smaller than 5 MB.' : 'Choose a PDF resume smaller than 5 MB.' })
      return
    }
    const next = { ...filesRef.current, [kind]: file }
    filesRef.current = next
    setFiles(next)
    if (kind === 'avatar') setPreview(URL.createObjectURL(file))
    status(false)
  }
  function begin(kind) { setBusy(kind); setFeedback(null); status(true) }
  function end() { setBusy(''); status(false) }
  async function upload(kind) {
    if (busy || !filesRef.current[kind]) return
    begin(kind)
    try {
      const data = await uploadFile(`/profile/${kind}`, filesRef.current[kind])
      setAssets((current) => ({ ...current, [kind]: data.asset }))
      updateProfile(user.id, data)
      clearFile(kind)
      setFeedback({ kind, text: kind === 'avatar' ? 'Profile photo updated.' : 'Resume uploaded. Download sharing is off until you enable it.' })
    } catch (error) { setFeedback({ kind, error: true, text: error.message }) }
    finally { end() }
  }
  async function remove() {
    if (busy || !removing) return
    const kind = removing
    begin(kind)
    try {
      const data = await api(`/profile/${kind}`, { method: 'DELETE', body: {} })
      updateProfile(user.id, data)
      setAssets((current) => ({ ...current, [kind]: null }))
      setRemoving('')
      setFeedback({ kind, text: kind === 'avatar' ? 'Profile photo removed.' : 'Resume removed and download sharing switched off.' })
    } catch (error) { setFeedback({ kind, error: true, text: error.message }); setRemoving('') }
    finally { end() }
  }
  async function changeSharing(checked) {
    if (busy) return
    begin('resume')
    try {
      const data = await api('/profile/freelancer', { method: 'PATCH', body: { showResumeOnProfile: checked } })
      updateProfile(user.id, data)
      setFeedback({ kind: 'resume', text: checked ? 'Resume downloads enabled for your published profile.' : 'Resume downloads are private again.' })
    } catch (error) { setFeedback({ kind: 'resume', error: true, text: error.message }) }
    finally { end() }
  }
  function feedbackFor(kind) { return feedback?.kind === kind ? <p role={feedback.error ? 'alert' : 'status'} className={`mt-4 rounded-xl border p-3 text-sm leading-6 ${feedback.error ? 'border-danger/20 bg-danger/5 text-text' : 'border-brand/20 bg-brand/5 text-brand'}`}>{feedback.text}</p> : null }

  return (
    <div className="space-y-5">
      {!assets && <Card><p role={loadError ? 'alert' : 'status'} className="text-sm text-muted">{loadError || 'Loading your saved files…'}</p>{loadError && <Button className="mt-4" onClick={() => { setLoadError(''); setAttempt((value) => value + 1) }}>Try again</Button>}</Card>}
      <Card>
        <div className="flex items-center gap-3"><ImagePlus size={22} className="text-brand" aria-hidden="true" /><h2 className="text-xl font-semibold tracking-tight">Profile photo</h2></div>
        <p className="mt-2 text-sm leading-7 text-muted">Choose a clear photo. We crop it to a square and remove image metadata.</p>
        <div className="mt-6 flex flex-wrap items-center gap-5">
          {preview ? <img src={preview} alt="Selected photo preview" className="size-24 rounded-full border border-border object-cover" /> : <Avatar src={user.avatarUrl} name={user.displayName} className="size-24 text-2xl" />}
          <div className="text-xs leading-6 text-muted"><p>JPEG, PNG or WebP · up to 5 MB</p><p>Still images · up to 16 megapixels</p>{files.avatar && <Badge tone="warning">Preview — not saved</Badge>}{assets?.avatar && !files.avatar && <p>Saved photo · {sizeLabel(assets.avatar.size)}</p>}</div>
        </div>
        <label htmlFor="profile-photo-file" className="mb-2 mt-6 block text-sm font-medium">Choose profile photo</label>
        <input id="profile-photo-file" ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={!!busy || !assets} className={fileInputClass} onChange={(event) => choose('avatar', event)} />
        <div className="mt-4 flex flex-wrap gap-2"><Button loading={busy === 'avatar' && !!files.avatar} disabled={!files.avatar || !!busy} onClick={() => upload('avatar')} loadingText="Uploading…"><Upload size={16} aria-hidden="true" />Upload photo</Button>{files.avatar && <Button variant="ghost" disabled={!!busy} onClick={() => { clearFile('avatar'); status(false); setFeedback(null) }}>Discard selected photo</Button>}{assets?.avatar && <Button variant="ghost" disabled={!!busy || !!files.avatar} onClick={() => setRemoving('avatar')}>Remove saved photo</Button>}</div>
        {feedbackFor('avatar')}
      </Card>
      {freelancerProfile && <Card>
        <div className="flex items-center gap-3"><FileText size={22} className="text-brand" aria-hidden="true" /><h2 className="text-xl font-semibold tracking-tight">Resume</h2><Badge tone={freelancerProfile.showResumeOnProfile ? 'brand' : 'neutral'}>{freelancerProfile.showResumeOnProfile ? 'Sharing enabled' : 'Private'}</Badge></div>
        <p className="mt-2 text-sm leading-7 text-muted">Upload a PDF of up to 5 MB and 20 pages. Interactive fields, hyperlinks and annotations are removed from the stored copy.</p>
        {assets?.resume && <div className="mt-5 rounded-2xl border border-border bg-surface-2 p-4"><p className="text-sm font-medium">Your saved resume · {sizeLabel(assets.resume.size)}</p><a href="/api/profile/resume" download="resume.pdf" className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-brand hover:underline">Download saved resume</a></div>}
        <label htmlFor="profile-resume-file" className="mb-2 mt-6 block text-sm font-medium">Choose PDF resume</label>
        <input id="profile-resume-file" ref={resumeInput} type="file" accept="application/pdf,.pdf" disabled={!!busy || !assets} className={fileInputClass} onChange={(event) => choose('resume', event)} />
        {files.resume && <p className="mt-2 text-xs text-muted">Selected resume is not saved yet.</p>}
        <div className="mt-4 flex flex-wrap gap-2"><Button loading={busy === 'resume' && !!files.resume} disabled={!files.resume || !!busy} onClick={() => upload('resume')} loadingText="Saving…"><Upload size={16} aria-hidden="true" />Upload resume</Button>{files.resume && <Button variant="ghost" disabled={!!busy} onClick={() => { clearFile('resume'); status(false); setFeedback(null) }}>Discard selected resume</Button>}{assets?.resume && <Button variant="ghost" disabled={!!busy || !!files.resume} onClick={() => setRemoving('resume')}>Remove saved resume</Button>}</div>
        <div className="mt-6 border-t border-border pt-5"><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-brand" checked={Boolean(freelancerProfile.showResumeOnProfile)} disabled={!!busy || !assets?.resume || !!files.resume} onChange={(event) => changeSharing(event.target.checked)} /><span>Allow signed-in clients to download this resume from my published profile.</span></label><p className="mt-3 text-xs leading-6 text-muted">{freelancerProfile.visibility === 'published' ? 'Turning sharing off immediately blocks new profile downloads.' : 'Your profile is currently private. Clients cannot download the resume until you publish your profile and enable this option.'} Uploading a replacement switches sharing off again.</p></div>
        {feedbackFor('resume')}
      </Card>}
      <Modal open={!!removing} onClose={() => { if (!busy) setRemoving('') }} title={removing === 'avatar' ? 'Remove saved photo?' : 'Remove saved resume?'} description="You can upload a replacement later." size="sm" closeOnBackdrop={!busy} footer={<><Button variant="secondary" disabled={!!busy} onClick={() => setRemoving('')}>Cancel</Button><Button variant="danger" loading={!!busy} onClick={remove}>Remove file</Button></>}><p className="text-sm leading-7 text-muted">{removing === 'avatar' ? 'Your account will show your initials instead.' : 'The saved resume will be removed and profile download sharing will be turned off.'}</p></Modal>
    </div>
  )
}
