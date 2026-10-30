import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../auth/api'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

export default function Notifications() {
  const navigate = useNavigate(),
    active = useRef(null)
  const [open, setOpen] = useState(false),
    [data, setData] = useState(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    try {
      const result = await api(`/notifications?page=${page}`, { signal: controller.signal })
      if (!controller.signal.aborted) {
        setData(result)
        setError('')
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    }
  }, [page])
  useEffect(() => {
    const initial = setTimeout(load, 0)
    const refresh = () => {
      if (document.visibilityState === 'visible') load()
    }
    const timer = setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(initial)
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      active.current?.abort()
    }
  }, [load])
  async function mark(item) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await api(item ? `/notifications/${item.id}/read` : '/notifications/read-all', {
        method: 'POST',
        body: {},
      })
      await load()
      if (
        item &&
        /^\/(requests|projects|collaborations|reviews|invoices)(\/|\?|$)/.test(item.path)
      ) {
        setOpen(false)
        navigate(item.path)
      }
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Notifications${data?.unread ? `, ${data.unread} unread` : ''}`}
        onClick={() => {
          setOpen(true)
          load()
        }}
      >
        <Bell size={19} aria-hidden="true" />
        {Boolean(data?.unread) && (
          <span className="rounded-full bg-brand px-1.5 text-xs text-white">
            {data.unread > 99 ? '99+' : data.unread}
          </span>
        )}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        description="Updates for your account"
        footer={
          <>
            <Button variant="secondary" disabled={busy || !data?.unread} onClick={() => mark(null)}>
              Mark all read
            </Button>
            <Button variant="ghost" onClick={load}>
              Refresh
            </Button>
          </>
        }
      >
        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error}
          </p>
        )}
        {!data ? (
          <p role="status">Loading updates…</p>
        ) : (
          <>
            <ul className="space-y-3">
              {data.notifications.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => mark(item)}
                    className={`w-full rounded-2xl border p-4 text-left ${item.read ? 'border-border' : 'border-brand/30 bg-brand/5'}`}
                  >
                    <span className="block wrap-break-word text-sm font-medium">{item.title}</span>
                    <span className="mt-2 block text-xs text-muted">
                      {new Date(item.createdAt).toLocaleString()} · {item.read ? 'Read' : 'Unread'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!data.notifications.length && (
              <p className="text-sm text-muted">No notifications.</p>
            )}
            <nav aria-label="Notification pages" className="mt-5 flex justify-between">
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button
                variant="ghost"
                disabled={page >= data.pagination.pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          </>
        )}
      </Modal>
    </>
  )
}
