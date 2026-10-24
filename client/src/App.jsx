import { Link, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

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
        <Route
          index
          element={
            <PlaceholderPage
              title="Dashboard"
              description="An overview of your freelance work."
            />
          }
        />

        <Route
          path="clients"
          element={
            <PlaceholderPage
              title="Clients"
              description="Manage your clients and their contact details."
            />
          }
        />

        <Route
          path="projects"
          element={
            <PlaceholderPage
              title="Projects"
              description="Organize projects, deadlines, and progress."
            />
          }
        />

        <Route
          path="time"
          element={
            <PlaceholderPage
              title="Time Tracking"
              description="Track the time you spend on project tasks."
            />
          }
        />

        <Route
          path="invoices"
          element={
            <PlaceholderPage
              title="Invoices"
              description="Manage invoices and payment records."
            />
          }
        />

        <Route
          path="settings"
          element={
            <PlaceholderPage
              title="Settings"
              description="Manage your profile and workspace preferences."
            />
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}