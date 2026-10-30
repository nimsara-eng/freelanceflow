import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import {
  Clock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
  X,
  Search,
  Inbox,
} from 'lucide-react'
import { useAuth } from '../../features/auth/useAuth'
import freelanceflowMark from '../../assets/freelanceflow-mark.png'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/requests', label: 'Work requests', icon: Inbox },
  { to: '/time', label: 'Time Tracking', icon: Clock },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function SidebarContent({ idPrefix, onNavigate, onClose }) {
  const { workspace } = useAuth()
  const links = workspace === 'freelancer' ? navigation : [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/collaborations', label: 'My projects', icon: FolderKanban },
    { to: '/requests', label: 'My requests', icon: Inbox },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/find-freelancer', label: 'Find a freelancer', icon: Search },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]
  const reduceMotion = useReducedMotion()
  const pillTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 400, damping: 34 }

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <img src={freelanceflowMark} alt="" width="1295" height="1214" className="size-9 shrink-0 rounded-lg bg-white object-contain p-0.5" />

        <span className="text-lg font-semibold tracking-tight text-white">
          FreelanceFlow
        </span>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-1 overflow-y-auto p-4"
      >
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'relative flex items-center gap-3 rounded-xl px-3 py-3',
                'text-sm font-medium transition-colors',
                isActive
                  ? 'text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={`${idPrefix}-pill`}
                    transition={pillTransition}
                    className="absolute inset-0 rounded-xl bg-white/15 ring-1 ring-white/20"
                  />
                )}
                <Icon
                  size={19}
                  aria-hidden="true"
                  className={`relative ${isActive ? 'text-violet-300' : ''}`}
                />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs text-white/70">{workspace === 'freelancer' ? 'Freelancer workspace' : 'Client workspace'}</p>
      </div>
    </>
  )
}

export default function Sidebar({ open = false, onNavigate, onClose }) {
  const reduceMotion = useReducedMotion()
  const slide = reduceMotion
    ? { duration: 0 }
    : { type: 'tween', duration: 0.25, ease: 'easeOut' }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-sidebar lg:flex">
        <SidebarContent idPrefix="desktop" onNavigate={onNavigate} />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              aria-hidden="true"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={slide}
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            />

            <motion.aside
              key="drawer"
              id="app-sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={slide}
              className="fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-sidebar lg:hidden"
            >
              <SidebarContent
                idPrefix="mobile"
                onNavigate={onNavigate}
                onClose={onClose}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
