import { useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { api } from '../auth/api'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FormFeedback, SaveActions, TextArea } from './FormParts'
import { professionalDraft, validateProfessional } from './profileValidation'
import { useDraftForm } from './useDraftForm'

function ProfileVisibility({ profile, disabled, onBusy, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const locked = useRef(false)
  const published = profile.visibility === 'published'
  async function toggle() {
    if (locked.current || disabled) return
    locked.current = true; setBusy(true); onBusy(true); setError(''); setMessage('')
    const visibility = published ? 'private' : 'published'
    try {
      const data = await api('/profile/visibility', { method: 'PATCH', body: { visibility } })
      onChanged(data)
      setMessage(visibility === 'published' ? 'Profile published. Signed-in clients can now find you by ID, profile link or QR code.' : 'Profile unpublished. Clients can no longer find or open it.')
    } catch (failure) { setError(failure.message) }
    finally { locked.current = false; setBusy(false); onBusy(false) }
  }
  return (
    <section aria-label="Profile publishing" className="mt-7 space-y-4 rounded-2xl border border-brand/15 bg-brand/5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold">{published ? <Eye size={19} aria-hidden="true" /> : <EyeOff size={19} aria-hidden="true" />}Profile visibility</h3><Badge tone={published ? 'success' : 'neutral'} dot>{published ? 'Published' : 'Private'}</Badge></div>
      <p className="text-sm leading-7 text-muted">{published ? 'Signed-in clients can find your saved profile using your freelancer ID, link or QR code. Unpublish to hide it from new lookups.' : 'Your profile is private. Publish it when you are ready for signed-in clients to find you.'}</p>
      <p className="text-xs leading-6 text-muted">Publishing shares your saved name, photo, bio, professional details and public location. Your email, private address and projects stay private. Resume downloads remain a separate sharing choice.</p>
      <div className="flex flex-wrap items-center gap-4"><Button variant={published ? 'secondary' : 'primary'} disabled={disabled} loading={busy} loadingText={published ? 'Unpublishing…' : 'Publishing…'} onClick={toggle}>{published ? 'Unpublish profile' : 'Publish profile'}</Button>{published && <Link to={`/freelancers/${profile.freelancerId}`} className="text-sm font-semibold text-brand hover:underline">View published profile</Link>}</div>
      {disabled && !busy && <p className="text-xs leading-6 text-muted">Save or discard your unsaved settings and wait for any current save to finish before changing visibility.</p>}
      {error && <p role="alert" className="text-sm leading-6 text-danger">{error}</p>}
      {message && <p role="status" className="text-sm leading-6 text-brand">{message}</p>}
    </section>
  )
}

export default function ProfessionalProfileForm({ initial, report, publicationDisabled = false }) {
  const { user, freelancerProfile, updateProfile } = useAuth()
  const [publishing, setPublishing] = useState(false)
  const form = useDraftForm(professionalDraft(initial), report)
  const profile = freelancerProfile ?? initial
  const field = (name) => ({ name, value: form.draft[name], error: form.errors[name], onChange: (event) => form.change({ ...form.draft, [name]: event.target.value }) })

  async function save(event) {
    event.preventDefault()
    if (form.busy || publishing || !form.dirty) return
    const result = validateProfessional(form.draft)
    if (!form.validate(result, event.currentTarget)) return
    form.start()
    try {
      const data = await api('/profile/freelancer', { method: 'PATCH', body: result.input })
      form.finish(professionalDraft(data.freelancerProfile))
      updateProfile(user.id, data)
    } catch (error) { form.fail(error) }
  }

  function publicationBusy(value) {
    setPublishing(value)
    report({ dirty: form.dirty, busy: value || form.busy })
  }
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight">Freelancer profile</h2><Badge tone="brand">{profile.freelancerId}</Badge></div>
      <p className="mt-2 text-sm leading-6 text-muted">Shape how clients see your work. Save your changes, then use the publishing controls below.</p>
      <form noValidate onSubmit={save} className="mt-7 space-y-6">
        <fieldset disabled={form.busy || publishing} className="space-y-6 disabled:opacity-70">
          <Input label="Professional headline" maxLength={120} placeholder="e.g. Frontend developer & interface designer" {...field('headline')} />
          <TextArea label="Skills" hint="Separate skills with commas. Up to 20 skills, 50 characters each." rows={3} maxLength={1100} {...field('skills')} />
          <TextArea label="Services" hint="One service per line. Up to 10 services, 160 characters each." rows={4} maxLength={1700} {...field('services')} />
          <div className="space-y-5 border-t border-border pt-6">
            <h3 className="text-sm font-semibold">Professional links</h3>
            <Input label="GitHub" type="url" placeholder="https://github.com/your-name" maxLength={2048} {...field('githubUrl')} />
            <Input label="LinkedIn" type="url" placeholder="https://www.linkedin.com/in/your-name" maxLength={2048} {...field('linkedinUrl')} />
            <Input label="Portfolio website" type="url" placeholder="https://your-portfolio.com" maxLength={2048} {...field('portfolioUrl')} />
          </div>
          <div className="border-t border-border pt-6"><h3 className="text-sm font-semibold">Public location</h3><p className="mt-2 text-xs leading-6 text-muted">Optional city and country only. Your private address stays separate.</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><Input label="Public city" maxLength={80} {...field('publicCity')} /><Input label="Public country" maxLength={80} {...field('publicCountry')} /></div></div>
        </fieldset>
        <FormFeedback form={form} />
        <SaveActions form={form} label="Save freelancer profile" />
      </form>
      <ProfileVisibility profile={profile} disabled={publicationDisabled || form.dirty || form.busy} onBusy={publicationBusy} onChanged={(data) => updateProfile(user.id, data)} />
    </Card>
  )
}
