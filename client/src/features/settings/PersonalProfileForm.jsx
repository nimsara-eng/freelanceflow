import { useAuth } from '../auth/useAuth'
import { api } from '../auth/api'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FormFeedback, SaveActions, TextArea } from './FormParts'
import { addressFields, personalDraft, validatePersonal } from './profileValidation'
import { useDraftForm } from './useDraftForm'

export default function PersonalProfileForm({ initial, report }) {
  const { user, updateProfile } = useAuth()
  const form = useDraftForm(personalDraft(initial), report)

  async function save(event) {
    event.preventDefault()
    if (form.busy || !form.dirty) return
    const result = validatePersonal(form.draft)
    if (!form.validate(result, event.currentTarget)) return
    form.start()
    try {
      const data = await api('/profile/me', { method: 'PATCH', body: result.input })
      form.finish(personalDraft(data.user))
      updateProfile(user.id, data)
    } catch (error) { form.fail(error) }
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold tracking-tight">Personal profile</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Your name and bio help people recognise you. Your address stays private.</p>
      <form noValidate onSubmit={save} className="mt-7 space-y-6">
        <fieldset disabled={form.busy} className="space-y-6 disabled:opacity-70">
          <Input name="displayName" label="Display name" autoComplete="name" required maxLength={80} value={form.draft.displayName} error={form.errors.displayName} onChange={(event) => form.change({ ...form.draft, displayName: event.target.value })} />
          <Input label="Email address" type="email" value={user.email} readOnly hint="Email changes will be available with email verification." />
          <TextArea name="bio" label="About you" hint="Tell clients a little about your experience and how you work." maxLength={2000} value={form.draft.bio} error={form.errors.bio} onChange={(event) => form.change({ ...form.draft, bio: event.target.value })} />
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-semibold">Private address</h3>
            <p className="mt-2 text-xs leading-6 text-muted">Visible only in your account settings. This address is not copied to your public profile.</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {addressFields.map(([key, label, limit, autoComplete]) => <Input key={key} name={`address.${key}`} label={label} autoComplete={autoComplete} maxLength={limit} value={form.draft.address[key]} error={form.errors[`address.${key}`]} onChange={(event) => form.change({ ...form.draft, address: { ...form.draft.address, [key]: event.target.value } })} containerClassName={key.startsWith('line') ? 'sm:col-span-2' : ''} />)}
            </div>
          </div>
        </fieldset>
        <FormFeedback form={form} />
        <SaveActions form={form} label="Save profile" />
      </form>
    </Card>
  )
}
