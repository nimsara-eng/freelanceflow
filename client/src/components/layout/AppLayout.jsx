import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import PageWrapper from './PageWrapper'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const mainRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname, location.search])

  function handleNavigate() {
    setSidebarOpen(false)
    mainRef.current?.focus()
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && sidebarOpen) {
      event.preventDefault()
      setSidebarOpen(false)
      menuButtonRef.current?.focus()
    }
  }

  return (
    <div className="min-h-screen" onKeyDown={handleKeyDown}>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only"
      >
        Skip to content
      </a>

      <div className="lg:pl-64">
        <Topbar
          sidebarOpen={sidebarOpen}
          onMenuToggle={() => setSidebarOpen((current) => !current)}
          menuButtonRef={menuButtonRef}
        />

        <Sidebar
          open={sidebarOpen}
          onNavigate={handleNavigate}
          onClose={() => setSidebarOpen(false)}
        />

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="min-w-0 p-4 sm:p-6 lg:p-8"
        >
          <PageWrapper key={location.pathname}>
            <Outlet />
          </PageWrapper>
        </main>
      </div>
    </div>
  )
}
