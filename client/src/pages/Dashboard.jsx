import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, CheckCheck, FolderKanban, MessageSquare, Plus } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { useProjects } from '../features/projects/useProjects'

const statusDetails = {
  active: { label: 'In progress', tone: 'brand' },
  review: { label: 'Awaiting review', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
}
const formatDate = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useProjects('limit=5')
  const projects = data?.projects ?? []
  const featured = projects.find((project) => project.status !== 'completed') ?? projects[0]
  const statistics = [
    { label: 'Total projects', value: data?.statistics.total, icon: FolderKanban },
    { label: 'Awaiting review', value: data?.statistics.review, icon: MessageSquare },
    { label: 'Completed', value: data?.statistics.completed, icon: CheckCheck },
  ]
  function viewProject(project) { navigate(`/projects?project=${project.id}`) }

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Freelancer workspace</p><h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Less admin.<br />More creating.</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">A clearer view of your projects, client reviews, and next steps.</p></div>
        <Button onClick={() => navigate('/projects')}>View projects<ArrowUpRight size={17} aria-hidden="true" /></Button>
      </header>
      <p className="text-xs text-muted">Your projects, saved to your account.</p>
      {error && <Card><p role="alert" className="text-sm leading-7">{error}</p><Button variant="secondary" className="mt-4" onClick={refresh}>Try again</Button></Card>}
      <dl className="grid gap-4 sm:grid-cols-3">{statistics.map(({ label, value, icon: Icon }) => <Card key={label}><dt className="flex items-center justify-between gap-3 text-sm text-muted">{label}<Icon size={19} aria-hidden="true" className="text-brand" /></dt><dd className="mt-5 text-4xl font-semibold tracking-tight tabular-nums">{value === undefined ? '—' : String(value).padStart(2, '0')}</dd></Card>)}</dl>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl border border-brand/15 bg-brand/10 p-6 sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-12 size-56 -rotate-25 rounded-[3rem] border-28 border-brand/10" />
          <div className="relative"><p className="text-xs font-semibold uppercase tracking-widest text-brand">Project spotlight</p>
            {loading ? <p role="status" className="mt-5 text-sm text-muted">Loading your workspace…</p> : featured ? <>
              <h2 className="mt-5 max-w-sm wrap-break-word text-3xl font-semibold tracking-tight">{featured.name}</h2><p className="mt-2 wrap-break-word text-sm text-muted">{featured.client}</p><p className="mt-4 max-w-md line-clamp-3 whitespace-pre-wrap wrap-break-word text-sm leading-7 text-text/80">{featured.description || 'A new project, ready for your ideas.'}</p>
              <div className="mt-6 flex flex-wrap items-center gap-4"><Badge tone={statusDetails[featured.status].tone} dot>{statusDetails[featured.status].label}</Badge><span className="inline-flex items-center gap-2 text-xs text-muted"><CalendarDays size={15} aria-hidden="true" />{formatDate(featured.dueDate)}</span></div>
              <Button className="mt-7" onClick={() => viewProject(featured)}>View project details<ArrowUpRight size={17} aria-hidden="true" /></Button>
            </> : <><h2 className="mt-5 text-3xl font-semibold tracking-tight">Make room for great work.</h2><p className="mt-4 max-w-md text-sm leading-7 text-muted">{error ? 'Your saved projects will appear when the connection is restored.' : 'Create your first project and bring your brief, client and deadline together.'}</p><Button className="mt-7" onClick={() => navigate('/projects')}><Plus size={17} aria-hidden="true" />Open projects</Button></>}
          </div>
        </section>
        <Card><h2 className="text-lg font-semibold tracking-tight">Your workspace</h2><p className="mt-2 text-sm leading-relaxed text-muted">Move between the areas where you manage your work.</p><div className="mt-6 flex flex-col gap-3">{[['Clients', '/clients'], ['Time tracking', '/time'], ['Invoices', '/invoices']].map(([label, route]) => <Button key={route} variant="secondary" onClick={() => navigate(route)}>{label}<ArrowUpRight size={16} aria-hidden="true" /></Button>)}</div></Card>
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold tracking-tight">Projects at a glance</h2><p className="mt-1 text-sm text-muted">Up to five projects, ordered by deadline.</p></div><Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>View all<ArrowUpRight size={16} aria-hidden="true" /></Button></div>
        {loading ? <p role="status" className="mt-6 text-sm text-muted">Loading projects…</p> : error ? <p className="mt-6 text-sm text-muted">Use Try again above to reload your workspace.</p> : projects.length === 0 ? <EmptyState icon={<FolderKanban size={24} />} title="Your next project starts here" description="Projects you create will appear on your dashboard." action={<Button variant="secondary" onClick={() => navigate('/projects')}>Go to projects</Button>} /> : <ul className="mt-4 divide-y divide-border">{projects.map((project) => <li key={project.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-lg font-semibold text-brand">{project.client.charAt(0)}</span><div className="min-w-0"><h3 className="wrap-break-word text-sm font-semibold">{project.name}</h3><p className="mt-1 wrap-break-word text-xs text-muted">{project.client}</p></div></div><div className="flex flex-wrap items-center gap-3"><Badge tone={statusDetails[project.status].tone} dot>{statusDetails[project.status].label}</Badge><Button variant="ghost" size="sm" aria-label={`View ${project.name}`} onClick={() => viewProject(project)}>View<ArrowUpRight size={16} aria-hidden="true" /></Button></div></div></li>)}</ul>}
      </Card>
    </section>
  )
}
