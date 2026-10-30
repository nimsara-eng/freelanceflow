import { ArrowUpRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import ClientProjects from './ClientProjects'
import Card from '../components/ui/Card'
import { useAuth } from '../features/auth/useAuth'

export default function ClientHome() {
  const { user } = useAuth()
  return (
    <section className="space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Client workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome, {user.displayName}.</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted">Review project updates, designs and invoices.</p>
      </header>
      <Card className="overflow-hidden bg-linear-to-br from-surface to-surface-2">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Search aria-hidden="true" size={23} /></span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">Find a freelancer</h2>
            <p className="mt-2 max-w-md text-sm leading-7 text-muted">Search by freelancer ID or open a profile link.</p>
          </div>
          <Link to="/find-freelancer" className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover">Find a freelancer<ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
      </Card>
      <ClientProjects embedded />
    </section>
  )
}
