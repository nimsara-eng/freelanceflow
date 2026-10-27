import { CheckCircle2, CircleAlert } from 'lucide-react'
import Button from '../../components/ui/Button'

export function TextArea({ label, hint, error, name, value, onChange, maxLength, rows = 4 }) {
  const id = `settings-${name}`
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
      <textarea id={id} name={name} value={value} onChange={onChange} maxLength={maxLength} rows={rows} aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} className={`block w-full resize-y rounded-xl border bg-surface px-3.5 py-3 text-sm leading-6 placeholder:text-muted/70 ${error ? 'border-danger' : 'border-border hover:border-brand/40'}`} />
      <div id={`${id}-hint`} className="mt-2 flex justify-between gap-3 text-xs text-muted"><span>{hint}</span><span className="shrink-0">{value.length.toLocaleString()}{maxLength ? ` / ${maxLength.toLocaleString()}` : ''}</span></div>
      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}

export function FormFeedback({ form }) {
  return <div aria-live="polite" className="empty:hidden">{form.error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm leading-6"><CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />{form.error}</p>}{form.message && <p role="status" className="flex items-start gap-2 text-sm text-brand"><CheckCircle2 size={18} aria-hidden="true" className="shrink-0" />{form.message}</p>}</div>
}

export function SaveActions({ form, label = 'Save changes' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
      <p className="text-xs text-muted">{form.busy ? 'Saving your changes…' : form.dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={!form.dirty || form.busy} onClick={form.discard}>Discard</Button>
        <Button type="submit" disabled={!form.dirty} loading={form.busy} loadingText="Saving…">{label}</Button>
      </div>
    </div>
  )
}
