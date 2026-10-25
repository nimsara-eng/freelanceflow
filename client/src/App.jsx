import { Link, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import UiPreview from './pages/UiPreview'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Clients from './pages/Clients'
import TimeTracking from './pages/TimeTracking'
import Invoices from './pages/Invoices'

function PlaceholderPage({ title, description }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>

      <p className="mt-2 max-w-2xl text-muted">
        {description}
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          This section is under development.
        </p>
      </div>
    </section>
  )
}

function NotFoundPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Page not found</h1>

      <p className="mt-2 text-muted">
        The page you requested does not exist.
      </p>

      <Link
        to="/"
        className="mt-6 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
      >
        Back to dashboard
      </Link>
    </section>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>

        <Route index element={<Dashboard />} />

        <Route path="clients" element={<Clients />} />

        <Route path="projects" element={<Projects />} />

        <Route path="time" element={<TimeTracking />} />

        <Route path="invoices" element={<Invoices />} />

        <Route
          path="settings"
          element={
            <PlaceholderPage
              title="Settings"
              description="Manage your profile and workspace preferences."
            />
          }
        />

        {import.meta.env.DEV && (
          <Route path="ui-preview" element={<UiPreview />} />
        )}

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}