import { useAuth } from '../auth/useAuth'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FormFeedback } from './FormParts'
import { validatePassword } from './profileValidation'
import { useDraftForm } from './useDraftForm'

const empty = { currentPassword: '', newPassword: '', confirmation: '' }

export default function SecurityForm({ report }) {
  const { changePassword } = useAuth()
  const form = useDraftForm(empty, report)
  const field = (name) => ({ name, type: 'password', required: true, maxLength: 128, value: form.draft[name], error: form.errors[name], onChange: (event) => form.change({ ...form.draft, [name]: event.target.value }) })

  async function save(event) {
    event.preventDefault()
    if (form.busy) return
    const result = validatePassword(form.draft)
    if (!form.validate(result, event.currentTarget)) return
    form.start()
    try { await changePassword(result.input) } catch (error) { form.fail(error) }
  }

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-xl font-semibold tracking-tight">Change password</h2>
        <p className="mt-2 text-sm leading-6 text-muted">After changing your password, you will be signed out on every device and asked to sign in again.</p>
        <form noValidate onSubmit={save} className="mt-7 space-y-6">
          <fieldset disabled={form.busy} className="space-y-5 disabled:opacity-70">
            <Input label="Current password" autoComplete="current-password" {...field('currentPassword')} />
            <Input label="New password" autoComplete="new-password" hint="Use 15–128 characters." {...field('newPassword')} />
            <Input label="Confirm new password" autoComplete="new-password" {...field('confirmation')} />
          </fieldset>
          <FormFeedback form={form} />
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5"><Button variant="ghost" disabled={!form.dirty || form.busy} onClick={form.discard}>Clear fields</Button><Button type="submit" loading={form.busy} disabled={!form.dirty} loadingText="Updating password…">Update password & sign out</Button></div>
        </form>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold">Forgot your password?</h2><Badge>Unavailable</Badge></div>
        <p className="mt-3 text-sm leading-7 text-muted">Password recovery is currently unavailable.</p>
      </Card>
    </div>
  )
}
