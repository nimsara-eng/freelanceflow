import { useState } from 'react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import { FormFeedback, SaveActions } from './FormParts'
import { defaultPreferences, readPreferences, savePreferences } from './preferences'
import { useDraftForm } from './useDraftForm'

const fields = [
  { key: 'projectSort', label: 'Default project sorting', hint: 'Applied when you open the freelancer Projects page.', options: [['due-date', 'Due date'], ['name', 'Project name']] },
  { key: 'timeZone', label: 'Time-entry time zone', hint: 'Choose how recorded time entries are displayed.', options: [['Asia/Colombo', 'Sri Lanka — Asia/Colombo'], ['UTC', 'UTC']] },
  { key: 'timeFormat', label: 'Time display', hint: 'Choose your preferred clock format.', options: [['12h', '12-hour clock'], ['24h', '24-hour clock']] },
]

export default function PreferencesForm({ report }) {
  const [initial] = useState(readPreferences)
  const form = useDraftForm(initial, report)
  const [resetOpen, setResetOpen] = useState(false)

  function persist(value) {
    try {
      const saved = savePreferences(value)
      form.finish(saved, 'Preferences saved on this browser.')
      return true
    } catch { form.fail(new Error('Preferences could not be saved in this browser.')); return false }
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold tracking-tight">Workspace preferences</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Set your preferred project order, timezone and time format.</p>
      <form onSubmit={(event) => { event.preventDefault(); if (form.dirty) persist(form.draft) }} className="mt-7 space-y-6">
        {fields.map(({ key, label, hint, options }) => <div key={key}><label htmlFor={`preference-${key}`} className="mb-2 block text-sm font-medium">{label}</label><select id={`preference-${key}`} name={key} value={form.draft[key]} onChange={(event) => form.change({ ...form.draft, [key]: event.target.value })} aria-describedby={`preference-${key}-hint`} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select><p id={`preference-${key}-hint`} className="mt-2 text-xs text-muted">{hint}</p></div>)}
        <FormFeedback form={form} />
        <SaveActions form={form} label="Save preferences" />
      </form>
      <div className="mt-5 border-t border-border pt-5"><Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>Restore defaults</Button></div>
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Restore default preferences?" description="Restores browser preferences. Your profile and time entries are kept." size="sm" footer={<><Button variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button><Button onClick={() => { if (persist(defaultPreferences)) setResetOpen(false) }}>Restore defaults</Button></>}><p className="text-sm leading-7 text-muted">Projects will sort by due date, with Sri Lanka time and a 12-hour clock.</p>{form.error && <p role="alert" className="mt-4 text-sm text-danger">{form.error}</p>}</Modal>
    </Card>
  )
}
