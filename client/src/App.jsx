import { Link, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppLayout from './components/layout/AppLayout'
import Clients from './pages/Clients'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'

import UiPreview from './pages/UiPreview'
import Auth from './pages/Auth'
import ClientHome from './pages/ClientHome'
import ClientProjects from './pages/ClientProjects'
import FindFreelancer from './pages/FindFreelancer'
import AuthProvider from './features/auth/AuthProvider'
import AccountGate from './features/auth/AccountGate'
import { useAuth } from './features/auth/useAuth'

const DesignReview = lazy(() => import('./pages/DesignReview'))
const Invitation = lazy(() => import('./pages/Invitation'))
const WorkRequests = lazy(() => import('./pages/WorkRequests'))

const Projects = lazy(() => import('./pages/Projects'))
const Settings = lazy(() => import('./pages/Settings'))
const TimeTracking = lazy(() => import('./pages/TimeTracking'))

function WorkspaceHome() {
  const { workspace } = useAuth()
  return workspace === 'freelancer' ? <Dashboard /> : <ClientHome />
}

function NotFoundPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">
        Page not found
      </h1>

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
    <AuthProvider>
    <Routes>
      <Route path="login" element={<Auth key="login" mode="login" />} />
      <Route path="signup" element={<Auth key="signup" mode="register" />} />
      <Route element={<AccountGate />}>
      <Route element={<AppLayout />}>
        <Route index element={<WorkspaceHome />} />
        <Route element={<AccountGate freelancerOnly />}>
        <Route path="clients" element={<Clients />} />
        <Route path="projects" element={<Suspense fallback={<p role="status" className="text-sm text-muted">Opening projects…</p>}><Projects /></Suspense>} />
        <Route path="time" element={<Suspense fallback={<p role="status" className="text-sm text-muted">Opening time tracking…</p>}><TimeTracking /></Suspense>} />
        <Route path="invoices" element={<Invoices />} />
        </Route>
        <Route path="invitations" element={<Suspense fallback={<p role="status" className="text-sm text-muted">Opening invitation…</p>}><Invitation /></Suspense>} />
        <Route path="reviews/:projectId" element={<Suspense fallback={<p role="status" className="text-sm text-muted">Opening design review…</p>}><DesignReview /></Suspense>} />
        <Route path="collaborations" element={<ClientProjects />} />
        <Route path="requests" element={<Suspense fallback={<p role="status">Opening requests…</p>}><WorkRequests /></Suspense>} />
        <Route path="find-freelancer" element={<FindFreelancer />} />
        <Route path="freelancers/:freelancerId" element={<FindFreelancer />} />
        <Route path="settings" element={<Suspense fallback={<p role="status" className="text-sm text-muted">Opening settings…</p>}><Settings /></Suspense>} />

        {import.meta.env.DEV && (
          <Route path="ui-preview" element={<UiPreview />} />
        )}

        <Route path="*" element={<NotFoundPage />} />
      </Route>
      </Route>
    </Routes>
    </AuthProvider>
  )
}
