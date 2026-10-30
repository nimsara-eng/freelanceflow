import { useEffect, useId, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, FolderKanban } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ProjectDesigns from '../features/projects/ProjectDesigns'
import TaskPanel from '../features/projects/TaskPanel'
import TaskProgress from '../features/projects/TaskProgress'
import { api } from '../features/auth/api'
import { useProjects } from '../features/projects/useProjects'

const statuses = {
  active: { label: 'In progress', tone: 'brand' },
  review: { label: 'Awaiting review', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
}
const date = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })

export default function ClientProjects({ embedded = false }) {
  const id = useId()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [status, setStatus] = useState('all')
  const [pageState, setPage] = useState({ key: '', page: 1 })
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const filterKey = `${applied}:${status}`
  const page = pageState.key === filterKey ? pageState.page : 1
  const query = new URLSearchParams({ q: applied, status, page: String(page), limit: embedded ? '3' : '12' }).toString()
  const { data, loading, error, refresh } = useProjects(query, '/collaboration/projects')
  const projectId = embedded ? '' : params.get('project') ?? ''
  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    api(`/collaboration/projects/${encodeURIComponent(projectId)}`, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) { setDetail(result.project); setDetailError('') }
    }).catch((failure) => { if (!controller.signal.aborted) { setDetail(null); setDetailError(failure.message) } })
    return () => controller.abort()
  }, [projectId])
  function close() {
    setParams((current) => { const next = new URLSearchParams(current); next.delete('project'); return next }, { replace: true })
    setDetail(null); setDetailError('')
  }
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4"><div>
        {!embedded && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Client workspace</p>}
        {embedded ? <h2 className="text-2xl font-semibold tracking-tight">Shared projects</h2> : <h1 className="text-4xl font-semibold tracking-tight">My projects</h1>}
        <p className="mt-3 text-sm leading-7 text-muted">Projects shared with your account.</p>
      </div>{embedded ? <Button variant="secondary" size="sm" onClick={() => navigate('/collaborations')}>View all<ArrowUpRight size={16} aria-hidden="true" /></Button> : <Button variant="secondary" disabled={loading} onClick={refresh}>Refresh projects</Button>}</header>
      {!embedded && <Card><form role="search" aria-label="Filter client projects" onSubmit={(event) => { event.preventDefault(); setApplied(search.trim()) }} className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_auto]"><Input label="Search my projects" type="search" maxLength={160} value={search} onChange={(event) => { setSearch(event.target.value); if (!event.target.value) setApplied('') }} placeholder="Project name" /><div><label htmlFor={`${id}-status`} className="mb-2 block text-sm font-medium">Status</label><select id={`${id}-status`} value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"><option value="all">All statuses</option><option value="active">In progress</option><option value="review">Awaiting review</option><option value="completed">Completed</option></select></div><Button variant="secondary" type="submit">Search</Button></form></Card>}
      {detailError && <p role="alert" className="rounded-2xl border border-danger/25 p-4 text-sm leading-7">{detailError}<Button variant="ghost" size="sm" onClick={() => { close(); refresh() }}>Close and refresh</Button></p>}
      {loading ? <p role="status" className="text-sm text-muted">Loading shared projects…</p> : error ? <Card><p role="alert" className="text-sm leading-7">{error}</p><Button variant="secondary" className="mt-4" onClick={refresh}>Try again</Button></Card> : data.projects.length === 0 ? <Card padding="none"><EmptyState icon={<FolderKanban size={25} />} title={applied || status !== 'all' ? 'No matching projects' : 'No shared projects yet'} description={applied || status !== 'all' ? 'Try another project name or status.' : 'Accept a project invitation or send a work request to a freelancer.'} action={applied || status !== 'all' ? <Button variant="secondary" onClick={() => { setSearch(''); setApplied(''); setStatus('all') }}>Clear filters</Button> : undefined} /></Card> : <ul className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">{data.projects.map((project) => <li key={project.id} className="min-w-0"><Card className="flex h-full flex-col"><Badge className="self-start" tone={statuses[project.status].tone} dot>{statuses[project.status].label}</Badge><h2 className="mt-5 wrap-break-word text-xl font-semibold">{project.name}</h2><p className="mt-2 wrap-break-word text-xs font-medium text-brand">With {project.freelancerName}</p><p className="mt-4 line-clamp-3 whitespace-pre-wrap wrap-break-word text-sm leading-7 text-muted">{project.description || 'No project brief.'}</p><div className="mt-5"><TaskProgress progress={project.progress} name={project.name} /></div><p className="mt-5 inline-flex items-center gap-2 text-xs text-muted"><CalendarDays size={15} aria-hidden="true" />{date(project.dueDate)}</p><Button variant="secondary" className="mt-5 self-start" size="sm" aria-label={`Open ${project.name}`} onClick={() => navigate(`/collaborations?project=${project.id}`)}>Open project<ArrowUpRight size={16} aria-hidden="true" /></Button></Card></li>)}</ul>}
      {!embedded && !loading && !error && (page > 1 || data.pagination.pages > 1) && <nav aria-label="Client project pages" className="flex flex-wrap items-center justify-center gap-4"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage({ key: filterKey, page: page - 1 })}>Previous</Button><span className="text-sm text-muted">Page {page} of {Math.max(page, data.pagination.pages)}</span><Button variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage({ key: filterKey, page: page + 1 })}>Next</Button></nav>}
      <Modal open={Boolean(detail && detail.id === projectId)} onClose={close} title={detail?.name ?? 'Shared project'} description="Shared project details" size="lg" footer={<Button variant="secondary" onClick={close}>Close</Button>}>
        {detail && <div className="space-y-5"><Badge tone={statuses[detail.status].tone} dot>{statuses[detail.status].label}</Badge><p className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-muted">{detail.description || 'No brief added yet.'}</p><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-muted">Freelancer</dt><dd className="mt-2 wrap-break-word text-sm font-medium">{detail.freelancerName}</dd></div><div><dt className="text-xs text-muted">Deadline</dt><dd className="mt-2 text-sm font-medium">{date(detail.dueDate)}</dd></div></dl><ProjectDesigns key={`designs:${detail.id}`} projectId={detail.id} readOnly /><TaskPanel key={detail.id} project={detail} readOnly onChanged={(project) => { setDetail(project); refresh() }} onUnavailable={(message) => { setDetail(null); setDetailError(message); refresh() }} /></div>}
      </Modal>
    </section>
  )
}
