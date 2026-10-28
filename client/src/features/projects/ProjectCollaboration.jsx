import { useRef, useState } from 'react'
import { Copy, Link2, UserRoundCheck } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { api } from '../auth/api'

export default function ProjectCollaboration({ project, onChanged, onBusy }) {
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const locked = useRef(false)
  const access = project.collaboration ?? { status: 'none' }
  const accepted = access.status === 'accepted'
  const pending = ['pending', 'expired'].includes(access.status)

  async function mutate(action) {
    if (locked.current) return
    locked.current = true
    setBusy(true); onBusy(true); setError(''); setNotice('')
    try {
      const result = await api(`/projects/${project.id}/invitation`, {
        method: action === 'create' ? 'POST' : 'DELETE', body: { version: project.version },
      })
      setLink(result.token ? `${window.location.origin}/invitations#${result.token}` : '')
      setConfirm('')
      onChanged(result.project)
      setNotice(action === 'create' ? 'Invitation ready. Copy the link and share it privately.' : accepted ? 'Client access removed.' : 'Invitation cancelled.')
    } catch (failure) { setError(failure.message) }
    finally { locked.current = false; setBusy(false); onBusy(false) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setNotice('Invitation link copied.'); setError('') }
    catch { setError('Copy was blocked. Select and copy the invitation link below.') }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-border p-4 sm:p-5" aria-label="Client invitation">
      <div className="flex items-start gap-3">
        {accepted ? <UserRoundCheck size={21} className="mt-1 shrink-0 text-success" aria-hidden="true" /> : <Link2 size={21} className="mt-1 shrink-0 text-brand" aria-hidden="true" />}
        <div><h3 className="font-semibold">{accepted ? 'Client connected' : 'Invite your client'}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{accepted
            ? `${access.clientName} can view this project’s brief, deadline and status from their Client workspace.`
            : access.status === 'pending' ? 'Waiting for a client to accept. You can replace the link or cancel the invitation.'
              : access.status === 'expired' ? 'The last invitation expired. Create a fresh link for your client.'
                : access.status === 'declined' ? 'The invitation was declined. You can create a new one when you are ready.'
                  : 'Create a private link. Your client signs in and accepts before they can open the project.'}</p>
        </div>
      </div>
      {access.expiresAt && !accepted && <p className="text-xs leading-6 text-muted">Invitation expires: {new Date(access.expiresAt).toLocaleString()}</p>}
      {error && <p role="alert" className="text-sm leading-6 text-danger">{error}</p>}
      {notice && <p role="status" className="text-sm leading-6 text-brand">{notice}</p>}
      {link && <div className="space-y-3">
        <Input label="Private invitation link" readOnly value={link} onFocus={(event) => event.target.select()} />
        <Button variant="secondary" size="sm" onClick={copy}><Copy size={16} aria-hidden="true" />Copy invitation link</Button>
        <p className="text-xs leading-6 text-muted">Anyone with this link can accept it once. Share it only with your intended client. Copy it before closing; creating a replacement invalidates the old link.</p>
        {['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <p className="text-xs leading-6 text-muted">This local address opens only on this computer. Remote sharing will work after deployment.</p>}
      </div>}
      {confirm ? <div className="space-y-3 rounded-xl bg-surface-2 p-4">
        <p className="text-sm leading-6">{confirm === 'replace' ? 'Replace this invitation? The previous link will stop working.' : accepted ? 'Remove this client’s access? They will no longer be able to load the project.' : 'Cancel this invitation? Its link will stop working.'}</p>
        <div className="flex flex-wrap gap-3"><Button variant="secondary" size="sm" disabled={busy} onClick={() => setConfirm('')}>Keep current access</Button><Button variant={confirm === 'replace' ? 'primary' : 'danger'} size="sm" loading={busy} onClick={() => mutate(confirm === 'replace' ? 'create' : 'revoke')}>{confirm === 'replace' ? 'Replace invitation' : accepted ? 'Remove access' : 'Cancel invitation'}</Button></div>
      </div> : <div className="flex flex-wrap gap-3">
        {!accepted && <Button size="sm" loading={busy} onClick={() => pending ? setConfirm('replace') : mutate('create')}>{pending ? 'Create replacement link' : 'Create invitation link'}</Button>}
        {(accepted || pending) && <Button variant="secondary" size="sm" disabled={busy} onClick={() => setConfirm('revoke')}>{accepted ? 'Remove client access' : 'Cancel invitation'}</Button>}
      </div>}
    </section>
  )
}
