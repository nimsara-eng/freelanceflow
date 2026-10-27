import { useAuth } from '../auth/useAuth'
import { api } from '../auth/api'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FormFeedback, SaveActions, TextArea } from './FormParts'
import { professionalDraft, validateProfessional } from './profileValidation'
import { useDraftForm } from './useDraftForm'

export default function ProfessionalProfileForm({ initial, report }) {
  const { user, updateProfile } = useAuth()
  const form = useDraftForm(professionalDraft(initial), report)
  const field = (name) => ({ name, value: form.draft[name], error: form.errors[name], onChange: (event) => form.change({ ...form.draft, [name]: event.target.value }) })

  async function save(event) {
    event.preventDefault()
    if (form.busy || !form.dirty) return
    const result = validateProfessional(form.draft, user.emailVerified)
    if (!form.validate(result, event.currentTarget)) return
    form.start()
    try {
      // Only send visibility when it changed, so an unverified account can still edit a previously saved draft.
      if (result.input.visibility === form.saved.visibility) delete result.input.visibility
      const data = await api('/profile/freelancer', { method: 'PATCH', body: result.input })
      form.finish(professionalDraft(data.freelancerProfile))
      updateProfile(user.id, data)
    } catch (error) { form.fail(error) }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight">Freelancer profile</h2><Badge tone="brand">{initial.freelancerId}</Badge></div>
      <p className="mt-2 text-sm leading-6 text-muted">Shape how clients see your work. Save your details privately before publishing.</p>
      <form noValidate onSubmit={save} className="mt-7 space-y-6">
        <fieldset disabled={form.busy} className="space-y-6 disabled:opacity-70">
          <Input label="Professional headline" maxLength={120} placeholder="e.g. Frontend developer & interface designer" {...field('headline')} />
          <TextArea label="Skills" hint="Separate skills with commas. Up to 20 skills, 50 characters each." rows={3} maxLength={1100} {...field('skills')} />
          <TextArea label="Services" hint="One service per line. Up to 10 services, 160 characters each." rows={4} maxLength={1700} {...field('services')} />
          <div className="space-y-5 border-t border-border pt-6">
            <h3 className="text-sm font-semibold">Professional links</h3>
            <Input label="GitHub" type="url" placeholder="https://github.com/your-name" maxLength={2048} {...field('githubUrl')} />
            <Input label="LinkedIn" type="url" placeholder="https://www.linkedin.com/in/your-name" maxLength={2048} {...field('linkedinUrl')} />
            <Input label="Portfolio website" type="url" placeholder="https://your-portfolio.com" maxLength={2048} {...field('portfolioUrl')} />
          </div>
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold">Public location</h3>
            <p className="mt-2 text-xs leading-6 text-muted">Optional city and country only. Your private address stays separate.</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2"><Input label="Public city" maxLength={80} {...field('publicCity')} /><Input label="Public country" maxLength={80} {...field('publicCountry')} /></div>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2 p-5">
            <label htmlFor="profile-visibility" className="block text-sm font-semibold">Profile visibility</label>
            <select id="profile-visibility" name="visibility" value={form.draft.visibility} onChange={(event) => form.change({ ...form.draft, visibility: event.target.value })} aria-describedby="visibility-hint" aria-invalid={!!form.errors.visibility} className="mt-3 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm">
              <option value="private">Private — only you can access this draft</option>
              <option value="published" disabled={!user.emailVerified}>Published — visible to signed-in clients</option>
            </select>
            <p id="visibility-hint" className="mt-3 text-xs leading-6 text-muted">{user.emailVerified ? 'Publishing lets signed-in clients find your profile by its ID or link.' : 'You can save all your details now. Publishing opens after email verification is configured and your email is verified.'}</p>
            {form.errors.visibility && <p role="alert" className="mt-2 text-sm text-danger">{form.errors.visibility}</p>}
          </div>
        </fieldset>
        <FormFeedback form={form} />
        <SaveActions form={form} label="Save freelancer profile" />
      </form>
    </Card>
  )
}
