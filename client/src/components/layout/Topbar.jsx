import { useState } from 'react'
import { ArrowLeftRight, LogOut, Menu, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import Notifications from '../../features/notifications/Notifications'
import { useAuth } from '../../features/auth/useAuth'

const titles = {
  '/requests': 'Work requests',
  '/collaborations': 'My projects', '/invitations': 'Project invitation',
  '/clients': 'Clients', '/projects': 'Projects', '/time': 'Time Tracking',
  '/invoices': 'Invoices', '/settings': 'Settings', '/find-freelancer': 'Find a freelancer',
}

export default function Topbar({ sidebarOpen, onMenuToggle, menuButtonRef }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, workspace, switchWorkspace, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const title = pathname === '/' ? (workspace === 'freelancer' ? 'Dashboard' : 'Overview') : titles[pathname] ?? 'FreelanceFlow'

  async function logout() {
    setBusy(true)
    setError('')
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="flex min-h-18 flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <button ref={menuButtonRef} type="button" onClick={onMenuToggle} aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={sidebarOpen} aria-controls="app-sidebar" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text lg:hidden">
          {sidebarOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted">{workspace === 'freelancer' ? 'Freelancer workspace' : 'Client workspace'}</p></div>
        <Link to="/settings" aria-label={`Account settings for ${user.displayName}`} className="flex min-w-0 items-center gap-2 rounded-full">
          <Avatar src={user.avatarUrl} name={user.displayName} className="size-9 text-xs" />
          <span className="hidden max-w-36 truncate text-xs font-medium xl:block">{user.displayName}</span>
        </Link>
        <Notifications />
        <Button variant="ghost" size="sm" loading={busy} onClick={logout} aria-label="Sign out"><LogOut size={18} aria-hidden="true" /><span className="hidden sm:inline">Sign out</span></Button>
        {user.roles.includes('freelancer') && (
          <Button variant="secondary" size="sm" disabled={busy} className="order-last w-full sm:order-0 sm:w-auto" onClick={() => { switchWorkspace(workspace === 'freelancer' ? 'client' : 'freelancer'); navigate('/'); }}>
            <ArrowLeftRight size={16} aria-hidden="true" />Switch to {workspace === 'freelancer' ? 'Client' : 'Freelancer'}
          </Button>
        )}
      </div>
      {error && <p role="alert" className="px-6 pb-3 text-sm text-danger">{error}</p>}
    </header>
  )
}
