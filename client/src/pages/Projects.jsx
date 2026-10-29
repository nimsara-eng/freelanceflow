import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUpRight, CalendarDays, FolderKanban, Plus, SearchX, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { readPreferences } from '../features/settings/preferences'
import { api } from '../features/auth/api'
import { useProjects } from '../features/projects/useProjects'
import ProjectCollaboration from '../features/projects/ProjectCollaboration'
import TaskPanel from '../features/projects/TaskPanel'
import TaskProgress from '../features/projects/TaskProgress'
import ProjectEditor from '../features/projects/ProjectEditor'

const statuses = {
  active: { label: 'In progress', tone: 'brand' },
  review: { label: 'Awaiting review', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
}
function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export default function Projects() {
  const id = useId()
  const [params, setParams] = useSearchParams()
  const clientFilter = params.get('client')?.trim() ?? ''
  const [draftSearch, setDraftSearch] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [defaultSort] = useState(() => readPreferences().projectSort)
  const [sort, setSort] = useState(defaultSort)
  const [pageState, setPage] = useState({ filter: '', page: 1 })
  const [editor, setEditor] = useState(null)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const [notice, setNotice] = useState('')
  const [detailError, setDetailError] = useState('')
  const projectId = params.get('project') ?? ''
  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    api(`/projects/${encodeURIComponent(projectId)}`, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) { setSelected(result.project); setDeleting(false); setDeleteError(''); setDetailError('') }
    }).catch((failure) => { if (!controller.signal.aborted) setDetailError(failure.message) })
    return () => controller.abort()
  }, [projectId])
  const filterKey = JSON.stringify([search, status, sort, clientFilter])
  const page = pageState.filter === filterKey ? pageState.page : 1
  const query = new URLSearchParams({ q: search, status, sort, page: String(page), ...(clientFilter ? { client: clientFilter } : {}) }).toString()
  const { data, loading, error, refresh } = useProjects(query)
  const projects = data?.projects ?? []
  const statistics = data?.statistics
  const filtered = search || status !== 'all' || clientFilter

  function clearFilters() {
    setDraftSearch(''); setSearch(''); setStatus('all'); setSort(defaultSort)
    setParams((current) => { const next = new URLSearchParams(current); next.delete('client'); return next })
  }
  function clearProjectLink() { setParams((current) => { const next = new URLSearchParams(current); next.delete('project'); return next }, { replace: true }); setDetailError('') }
  function openDetails(project) { setSelected(null); setDetailError(''); setDeleting(false); setDeleteError(''); setParams((current) => { const next = new URLSearchParams(current); next.set('project', project.id); return next }) }
  async function removeProject() {
    if (locked.current) return
    locked.current = true; setBusy(true); setDeleteError('')
    try {
      await api(`/projects/${selected.id}`, { method: 'DELETE', body: { version: selected.version } })
      clearProjectLink(); setSelected(null); setDeleting(false); setNotice('Project deleted.')
      if (projects.length === 1 && page > 1) setPage({ filter: filterKey, page: page - 1 })
      refresh()
    } catch (failure) { setDeleteError(failure.message) }
    finally { locked.current = false; setBusy(false) }
  }
  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Your workspace</p><h1 className="text-4xl font-semibold tracking-tight">Projects</h1><p className="mt-3 max-w-xl text-sm leading-7 text-muted">Your work, thoughtfully organised. Keep every brief, deadline and next step in view.</p></div>
        <Button onClick={() => { setNotice(''); setEditor({ project: null }) }}><Plus size={18} aria-hidden="true" />New project</Button>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted"><span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-brand" aria-hidden="true" />Your project workspace</span>{clientFilter && <Badge>Client: {clientFilter}</Badge>}</div>
      {notice && <p role="status" className="rounded-2xl border border-success/25 bg-success/5 px-4 py-3 text-sm">{notice}</p>}
      {projectId && !selected && !detailError && <p role="status" className="text-sm text-muted">Opening project…</p>}
      {detailError && <p role="alert" className="rounded-2xl border border-danger/25 p-4 text-sm">{detailError}<Button variant="ghost" size="sm" onClick={clearProjectLink}>Dismiss</Button></p>}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['All projects', statistics?.total], ['In progress', statistics?.active], ['Awaiting review', statistics?.review], ['Completed', statistics?.completed]].map(([label, value]) => <Card key={label}><dt className="text-xs leading-5 text-muted">{label}</dt><dd className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value ?? '—'}</dd></Card>)}
      </dl>

      <Card><form role="search" aria-label="Filter projects" onSubmit={(event) => { event.preventDefault(); setSearch(draftSearch.trim()) }} className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_10rem_10rem_auto]">
        <Input type="search" label="Search projects" maxLength={160} placeholder="Project or client name" value={draftSearch} onChange={(event) => { setDraftSearch(event.target.value); if (!event.target.value) setSearch('') }} />
        <div><label htmlFor={`${id}-status`} className="mb-2 block text-sm font-medium">Status</label><select id={`${id}-status`} value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base sm:text-sm"><option value="all">All statuses</option><option value="active">In progress</option><option value="review">Awaiting review</option><option value="completed">Completed</option></select></div>
        <div><label htmlFor={`${id}-sort`} className="mb-2 block text-sm font-medium">Sort by</label><select id={`${id}-sort`} value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base sm:text-sm"><option value="due-date">Due date</option><option value="name">Project name</option></select></div>
        <Button variant="secondary" type="submit">Search</Button>
      </form></Card>

      <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-muted">{loading ? 'Loading your projects…' : error ? 'Projects could not be loaded.' : `${data.pagination.total} ${filtered ? 'matching ' : ''}project${data.pagination.total === 1 ? '' : 's'}`}</p><div className="flex gap-2">{(filtered || sort !== defaultSort || draftSearch) && <Button variant="ghost" size="sm" onClick={clearFilters}>Reset filters</Button>}<Button variant="ghost" size="sm" disabled={loading} onClick={refresh}>Refresh</Button></div></div>
      {loading ? <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3" aria-hidden="true">{[1, 2, 3].map((key) => <Card key={key}><div className="h-8 w-1/3 animate-pulse rounded-xl bg-brand/10 motion-reduce:animate-none" /><div className="mt-6 h-24 rounded-xl bg-brand/5" /></Card>)}</div> : error ? <Card><p role="alert" className="text-sm leading-7">{error}</p><Button variant="secondary" className="mt-4" onClick={refresh}>Try again</Button></Card> : projects.length === 0 ? <Card padding="none"><EmptyState icon={filtered ? <SearchX size={25} /> : <FolderKanban size={25} />} title={filtered ? 'No matching projects' : page > 1 ? 'No projects on this page' : 'A little space for your next big idea'} description={filtered ? 'Try another name or choose a different status.' : 'Start with a name, a client and a deadline. Your projects will be saved here.'} action={filtered ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : <Button onClick={() => setEditor({ project: null })}>Create your first project</Button>} /></Card> : <ul className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {projects.map((project) => <li key={project.id} className="min-w-0"><Card className="flex h-full flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3"><span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-xl font-semibold text-brand">{project.client.charAt(0)}</span><Badge tone={statuses[project.status].tone} dot>{statuses[project.status].label}</Badge></div>
          <h2 className="mt-5 wrap-break-word text-xl font-semibold tracking-tight">{project.name}</h2><p className="mt-2 wrap-break-word text-xs font-medium text-brand">{project.client}</p><p className="mt-4 line-clamp-3 whitespace-pre-wrap wrap-break-word text-sm leading-7 text-muted">{project.description || 'Add a brief to keep the work focused.'}</p>
          <div className="my-5"><TaskProgress progress={project.progress} name={project.name} /></div><div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><span className="inline-flex items-center gap-2 text-xs text-muted"><CalendarDays size={15} aria-hidden="true" />{formatDate(project.dueDate)}</span><Button variant="secondary" size="sm" aria-label={`View ${project.name}`} onClick={() => openDetails(project)}>View project<ArrowUpRight size={16} aria-hidden="true" /></Button></div>
        </Card></li>)}
      </ul>}
      {!loading && !error && (page > 1 || data.pagination.pages > 1) && <nav aria-label="Project pages" className="flex flex-wrap items-center justify-center gap-4"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage({ filter: filterKey, page: page - 1 })}>Previous</Button><span className="text-sm text-muted">Page {page} of {Math.max(page, data.pagination.pages)}</span><Button variant="secondary" disabled={page >= data.pagination.pages} onClick={() => setPage({ filter: filterKey, page: page + 1 })}>Next</Button></nav>}

      <Modal open={Boolean(selected && selected.id === projectId)} onClose={() => { if (!busy) { clearProjectLink(); setSelected(null); setDeleting(false) } }} closeOnBackdrop={!busy} title={deleting ? 'Delete this project?' : selected?.name ?? 'Project details'} description={deleting ? 'This permanently removes the project from your workspace.' : selected?.collaboration?.status === 'accepted' ? 'Shared with your accepted client' : 'Private project details'} size="lg" footer={selected && selected.id === projectId && (deleting ? <><Button variant="secondary" disabled={busy} onClick={() => { setDeleting(false); setDeleteError('') }}>Keep project</Button><Button variant="danger" loading={busy} disabled={Boolean(deleteError)} loadingText="Deleting…" onClick={removeProject}>Delete project</Button></> : <><Button variant="danger" disabled={busy} onClick={() => setDeleting(true)}>Delete</Button><Button variant="secondary" disabled={busy} onClick={() => { clearProjectLink(); setSelected(null) }}>Close</Button><Button disabled={busy} onClick={() => { clearProjectLink(); setEditor({ project: selected }); setSelected(null) }}>Edit project</Button></>)}>
        {selected && selected.id === projectId && (deleting ? <div className="space-y-4"><p className="wrap-break-word text-sm leading-7">Delete <strong>{selected.name}</strong>? This action cannot be undone.</p>{deleteError && <p role="alert" className="text-sm leading-7">{deleteError} Close this dialog and refresh the list before retrying.</p>}</div> : <div className="space-y-6"><Badge tone={statuses[selected.status].tone} dot>{statuses[selected.status].label}</Badge><p className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-muted">{selected.description || 'No brief added yet.'}</p><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-muted">Client label</dt><dd className="mt-1 wrap-break-word text-sm font-medium">{selected.client}</dd></div><div><dt className="text-xs text-muted">Deadline</dt><dd className="mt-1 text-sm font-medium">{formatDate(selected.dueDate)}</dd></div></dl><p className="rounded-2xl bg-surface-2 p-4 text-xs leading-6 text-muted">The client label is your private record. Access is granted only after someone accepts an invitation below.</p><TaskPanel key={'tasks:' + selected.id} project={selected} disabled={busy} onBusy={setBusy} onChanged={(project) => { setSelected(project); refresh() }} /><ProjectCollaboration disabled={busy} key={selected.id} project={selected} onBusy={setBusy} onChanged={(project) => { setSelected(project); refresh() }} /></div>)}
      </Modal>
      {editor && <ProjectEditor key={editor.project?.id ?? 'new'} project={editor.project} onClose={() => setEditor(null)} onSaved={() => { setNotice(editor.project ? 'Project updated.' : 'Project created and saved.'); setEditor(null); refresh() }} />}
    </section>
  )
}
