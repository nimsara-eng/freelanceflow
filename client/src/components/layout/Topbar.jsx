import { Bell, Menu, Search, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const titles = {
  '/': 'Dashboard',
  '/clients': 'Clients',
  '/projects': 'Projects',
  '/time': 'Time Tracking',
  '/invoices': 'Invoices',
  '/settings': 'Settings',
}

export default function Topbar({
  sidebarOpen,
  onMenuToggle,
  menuButtonRef,
}) {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'FreelanceFlow'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenuToggle}
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text lg:hidden"
      >
        {sidebarOpen ? (
          <X size={22} aria-hidden="true" />
        ) : (
          <Menu size={22} aria-hidden="true" />
        )}
      </button>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="hidden text-xs text-muted sm:block">
          Smart Freelance Management
        </p>
      </div>

      <div className="relative ml-auto hidden w-full max-w-xs md:block">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          aria-label="Search"
          placeholder="Search clients, projects..."
          className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm placeholder:text-muted focus:border-brand"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <Bell size={20} aria-hidden="true" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-brand" />
        </button>

        <div
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-linear-to-br from-brand to-fuchsia-500 text-sm font-semibold text-white"
        >
          F
        </div>
      </div>
    </header>
  )
}