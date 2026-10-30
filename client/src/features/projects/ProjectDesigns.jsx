import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ImagePlus } from 'lucide-react'
import Button from '../../components/ui/Button'
import { api } from '../auth/api'

export default function ProjectDesigns({ projectId, readOnly = false, disabled = false }) {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api(`/reviews/${projectId}/summary`, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) { setSummary(data.summary); setError('') }
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [projectId, attempt])
  return (
    <section aria-label="Project designs" className="space-y-4 rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold"><ImagePlus size={20} className="text-brand" aria-hidden="true" />Designs & feedback</h3>{readOnly && <Button variant="ghost" size="sm" onClick={() => { setSummary(null); setError(''); setAttempt((value) => value + 1) }}>Refresh designs</Button>}</div>
      {readOnly ? <>
        {error ? <p role="alert" className="text-sm leading-7">{error}</p> : !summary ? <p role="status" className="text-sm text-muted">Checking shared designs…</p> : summary.count === 0 ? <p className="text-sm leading-7 text-muted">No design versions have been shared.</p> : <><p className="text-sm leading-7 text-muted">{summary.count} shared design version{summary.count === 1 ? '' : 's'} ready to view. Open a design to leave pinned comments or reply to feedback.</p><Link to={`/reviews/${projectId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover">Review shared designs<ArrowUpRight size={16} aria-hidden="true" /></Link></>}
      </> : <>
        <p className="text-sm leading-7 text-muted">Upload design versions and share them with your client for review.</p>
        {summary && <p className="text-xs text-muted">{summary.count} uploaded · {summary.sharedCount} shared with client</p>}
        {disabled ? <Button disabled>Upload & share designs</Button> : <Link to={`/reviews/${projectId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover"><ImagePlus size={17} aria-hidden="true" />Upload & share designs<ArrowUpRight size={16} aria-hidden="true" /></Link>}
      </>}
    </section>
  )
}
