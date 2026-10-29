import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBeforeUnload, useBlocker, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, MessageCircle, Eye } from 'lucide-react'
import { api, uploadFile } from '../features/auth/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import DesignCanvas from '../features/reviews/DesignCanvas'
import ReviewThreads from '../features/reviews/ReviewThreads'

export default function DesignReview() {
  const { projectId } = useParams()
  return <ReviewWorkspace key={projectId} projectId={projectId} />
}

function ReviewWorkspace({ projectId }) {
  const [review, setReview] = useState(null)
  const [designId, setDesignId] = useState('')
  const [selected, setSelected] = useState('')
  const [mode, setMode] = useState('view')
  const [point, setPoint] = useState(null)
  const [comment, setComment] = useState('')
  const [reply, setReply] = useState('')
  const [editingMessage, setEditingMessage] = useState(null)
  const [deletingMessage, setDeletingMessage] = useState(null)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [removing, setRemoving] = useState(false)
  const [discard, setDiscard] = useState(null)
  const locked = useRef(false)
  const fileRef = useRef(null)
  const editDirty = Boolean(editingMessage && editingMessage.text !== editingMessage.initialText)
  const dirty = Boolean(comment.trim() || reply.trim() || editDirty || file || title.trim())
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || busy) && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  useBeforeUnload(useCallback((event) => { if (dirty || busy) { event.preventDefault(); event.returnValue = '' } }, [dirty, busy]))
  useEffect(() => {
    const controller = new AbortController()
    api(`/reviews/${encodeURIComponent(projectId)}`, { signal: controller.signal }).then((data) => { if (!controller.signal.aborted) { setReview(data.review); setDesignId(data.review.designs.at(-1)?.id ?? '') } }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [projectId])
  const design = review?.designs.find((item) => item.id === designId)

  async function request(action, message, selectLatest = false) {
    if (locked.current) return false
    locked.current = true; setBusy(true); setError(''); setNotice('')
    try {
      const data = await action()
      setReview(data.review); setNotice(message)
      if (selectLatest || !data.review.designs.some((item) => item.id === designId)) { setDesignId(data.review.designs.at(-1)?.id ?? ''); setSelected(''); setPoint(null) }
      else if (selected && !data.review.designs.find((item) => item.id === designId).comments.some((item) => item.id === selected)) { setSelected(''); setReply('') }
      return true
    } catch (failure) {
      setError(failure.message + (failure.status === 0 ? ' The result is uncertain. Reload review and check before retrying.' : '') + (failure.status === 409 && editingMessage ? ' Copy your draft if needed, then cancel this edit, reload the review and reopen Edit before retrying.' : ''))
      if ([401, 404].includes(failure.status)) { setReview(null); setPoint(null); setRemoving(false); setDeletingMessage(null) }
      return false
    } finally { locked.current = false; setBusy(false) }
  }
  const path = `/reviews/${projectId}/designs/${designId}`
  function changeDesign(next) {
    if (next === designId || busy) return
    if (comment.trim() || reply.trim() || editingMessage) { setDiscard({ type: 'design', id: next }); return }
    setDesignId(next); setSelected(''); setPoint(null); setComment(''); setReply(''); setRemoving(false); setError('')
  }
  function selectThread(next) {
    if (busy || next === selected) return
    if (comment.trim() || reply.trim() || editingMessage) { setDiscard({ type: 'thread', id: next }); return }
    setSelected(next); setPoint(null); setComment(''); setReply('')
  }
  function placePoint(next) {
    if (reply.trim() || editingMessage) { setError('Save or cancel your current feedback before starting another comment.'); return }
    setSelected(''); setPoint(next)
  }
  async function upload(event) {
    event.preventDefault()
    if (!file || !title.trim() || !review || editingMessage) return
    if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Choose a JPEG, PNG or WebP image under 5 MB.'); return }
    const ok = await request(() => uploadFile(`/reviews/${projectId}/designs`, file, { title: title.trim(), version: String(review.version) }), 'Version uploaded privately. Share it when it is ready for your accepted client.', true)
    if (ok) { setFile(null); setTitle(''); if (fileRef.current) fileRef.current.value = ''; setPoint(null); setComment(''); setReply(''); setSelected('') }
  }
  async function addComment(event) {
    event.preventDefault()
    if (!point || !comment.trim()) return
    const ok = await request(() => api(`${path}/comments`, { method: 'POST', body: { ...point, text: comment, version: review.version } }), 'Feedback saved to this design version.')
    if (ok) { setPoint(null); setComment('') }
  }
  async function sendReply(commentId) {
    const ok = await request(() => api(`${path}/comments/${commentId}/replies`, { method: 'POST', body: { text: reply, version: review.version } }), 'Reply saved.')
    if (ok) setReply('')
  }
  function discardDrafts() {
    if (busy) return
    setComment(''); setReply(''); setPoint(null); setEditingMessage(null)
    if (discard?.type === 'design') { setDesignId(discard.id); setSelected(''); setRemoving(false) }
    if (discard?.type === 'thread') setSelected(discard.id)
    if (blocker.state === 'blocked') blocker.proceed()
    setDiscard(null)
  }
  function startEdit(commentId, replyId, item) {
    if (busy || comment.trim() || reply.trim() || editingMessage || !item.canManage) return
    setError(''); setEditingMessage({ commentId, replyId, text: item.text, initialText: item.text, version: review.version })
  }
  function cancelEdit() {
    if (busy) return
    if (editDirty) setDiscard({ type: 'edit' })
    else setEditingMessage(null)
  }
  async function saveEdit() {
    if (!editingMessage || !editingMessage.text.trim()) return
    const target = `${path}/comments/${editingMessage.commentId}${editingMessage.replyId ? `/replies/${editingMessage.replyId}` : '/text'}`
    const ok = await request(() => api(target, { method: 'PATCH', body: { text: editingMessage.text, version: editingMessage.version } }), editingMessage.replyId ? 'Your reply was updated.' : 'Your comment was updated and the thread reopened.')
    if (ok) setEditingMessage(null)
  }
  async function deleteMessage() {
    if (!deletingMessage) return
    const target = `${path}/comments/${deletingMessage.commentId}${deletingMessage.replyId ? `/replies/${deletingMessage.replyId}` : ''}`
    const ok = await request(() => api(target, { method: 'DELETE', body: { version: deletingMessage.version } }), deletingMessage.replyId ? 'Your reply was deleted.' : 'Your comment and its pin were removed. Any existing replies have been kept.')
    if (ok) setDeletingMessage(null)
  }
  return (
    <section className="min-w-0 space-y-6">
      <Link to={review?.isOwner ? `/projects?project=${projectId}` : `/collaborations?project=${projectId}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-brand"><ArrowLeft size={16} aria-hidden="true" />Back to project</Link>
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">A clearer conversation</p><h1 className="mt-3 wrap-break-word text-3xl font-semibold tracking-tight sm:text-4xl">{review?.name ?? 'Design review'}</h1><p className="mt-3 text-sm leading-7 text-muted">Keep every detail, decision and revision connected to the work.</p></div><Button variant="secondary" disabled={busy} onClick={() => request(() => api(`/reviews/${projectId}`), 'Review reloaded. Your drafts have been kept.')}>Reload review</Button></header>
      {error && <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/5 p-4 text-sm leading-7">{error}</p>}
      {notice && <p role="status" className="rounded-2xl border border-success/25 bg-success/5 p-4 text-sm leading-7">{notice}</p>}
      {!review && !error && <p role="status" className="text-sm text-muted">Opening review…</p>}
      {review && <>
        {review.isOwner && <Card><form onSubmit={upload} className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><ImagePlus size={19} className="text-brand" aria-hidden="true" />Upload a design version</h2><span className="text-xs text-muted">{review.designs.length}/5 versions</span></div><p className="text-xs leading-6 text-muted">JPEG, PNG or WebP · up to 5 MB and 16 megapixels. Each upload keeps its own comments and starts private. Large exports may need reducing to fit the processed 2 MB limit.</p><fieldset disabled={busy || review.designs.length >= 5} className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><Input label="Version title" required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Homepage — revision 2" /><div><label htmlFor="design-file" className="mb-2 block text-sm font-medium">Design image</label><input ref={fileRef} id="design-file" type="file" accept="image/png,image/jpeg,image/webp" required className="min-h-11 w-full min-w-0 rounded-xl border border-border p-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-brand/10 file:px-3 file:py-1 file:text-brand" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div><Button type="submit" disabled={!file || !title.trim() || Boolean(comment.trim() || reply.trim() || editingMessage)}>Upload privately</Button></fieldset>{review.designs.length >= 5 && <p className="text-xs text-muted">Remove an old version to make room. Removing it also removes its feedback.</p>}{(file || title) && <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setFile(null); setTitle(''); if (fileRef.current) fileRef.current.value = '' }}>Clear upload draft</Button>}</form></Card>}
        {review.designs.length === 0 ? <Card><h2 className="text-lg font-semibold">{review.isOwner ? 'A space for your next revision' : 'No designs shared yet'}</h2><p className="mt-3 text-sm leading-7 text-muted">{review.isOwner ? 'Upload a design above. Once your client accepts the project invitation, you can share each version for feedback.' : 'Your freelancer will share a design here when it is ready for your feedback.'}</p></Card> : <>
          <div className="flex flex-wrap items-end justify-between gap-4"><div className="min-w-0 flex-1 sm:max-w-md"><label htmlFor="design-version" className="mb-2 block text-xs font-medium text-muted">Design version</label><select id="design-version" disabled={busy} value={designId} onChange={(event) => changeDesign(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"><option value="" disabled>Select a version</option>{review.designs.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.title}{review.isOwner ? item.shared ? ' · Shared' : ' · Private' : ''}</option>)}</select></div><div role="group" aria-label="Review mode" className="flex gap-1 rounded-xl border border-border bg-surface p-1"><Button size="sm" variant={mode === 'view' ? 'primary' : 'ghost'} aria-pressed={mode === 'view'} disabled={busy} onClick={() => { if (comment.trim() || reply.trim() || editingMessage) { setError('Save or cancel your feedback before changing mode.'); return } setMode('view'); setPoint(null); setSelected('') }}><Eye size={16} aria-hidden="true" />View</Button><Button size="sm" variant={mode === 'comment' ? 'primary' : 'ghost'} aria-pressed={mode === 'comment'} disabled={busy} onClick={() => setMode('comment')}><MessageCircle size={16} aria-hidden="true" />Comment</Button></div></div>
          {design && <>
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-3"><h2 className="wrap-break-word text-lg font-semibold">{design.title}</h2><Badge tone={design.shared ? 'success' : 'neutral'}>{design.shared ? 'Shared with client' : 'Private version'}</Badge></div>{review.isOwner && <div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" disabled={busy || (!design.shared && !review.canShare)} onClick={() => request(() => api(`${path}/sharing`, { method: 'PATCH', body: { shared: !design.shared, version: review.version } }), design.shared ? 'Version is private. New client requests can no longer open it.' : 'Version shared with your accepted client.')}>{design.shared ? 'Unshare version' : 'Share with client'}</Button><Button variant="ghost" size="sm" disabled={busy || dirty} onClick={() => { setError(''); setRemoving(true) }}>Remove version</Button></div>}</div>
            {review.isOwner && !review.canShare && <p className="text-xs leading-6 text-muted">Sharing becomes available after a client accepts the project invitation.</p>}
            <div className={`grid min-w-0 items-start gap-5 ${mode === 'comment' ? 'xl:grid-cols-[minmax(0,1fr)_20rem]' : ''}`}><DesignCanvas key={design.id} projectId={projectId} design={design} commentMode={mode === 'comment'} disabled={busy} point={point} selected={selected} onPoint={placePoint} onSelect={selectThread} />{mode === 'comment' && <div className="min-w-0 space-y-5">
              {point && <form onSubmit={addComment} className="space-y-4 rounded-2xl border border-brand/25 bg-surface p-5"><h2 className="font-semibold">New pinned comment</h2><p className="text-xs leading-6 text-muted">Your feedback stays attached to this exact version.</p><div className="grid grid-cols-2 gap-3">{[['x', 'Horizontal position'], ['y', 'Vertical position']].map(([axis, label]) => <Input key={axis} label={`${label} (%)`} type="number" min="0" max="100" step="0.1" required disabled={busy} value={Math.round(point[axis] * 1000) / 10} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value <= 100) setPoint((current) => ({ ...current, [axis]: value / 100 })) }} />)}</div><label htmlFor="design-comment" className="block text-xs font-medium">Feedback</label><textarea id="design-comment" autoFocus required maxLength={1000} rows={4} value={comment} disabled={busy} onChange={(event) => setComment(event.target.value)} placeholder="What should change here?" className="w-full rounded-xl border border-border bg-surface p-3 text-sm" /><div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={busy || !comment.trim() || design.comments.length >= 20}>Post comment</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (comment.trim()) setDiscard({ type: 'cancel' }); else setPoint(null) }}>Cancel comment</Button></div>{design.comments.length >= 20 && <p className="text-xs text-muted">This version has reached its limit of 20 feedback threads.</p>}</form>}
              <ReviewThreads design={design} owner={review.isOwner} selected={selected} onSelect={selectThread} busy={busy} onResolve={(thread) => request(() => api(`${path}/comments/${thread.id}`, { method: 'PATCH', body: { resolved: !thread.resolved, version: review.version } }), thread.resolved ? 'Thread reopened.' : 'Thread resolved.')} reply={reply} setReply={setReply} onReply={sendReply} editing={editingMessage} onEdit={startEdit} onEditText={(text) => setEditingMessage((current) => ({ ...current, text }))} onSaveEdit={saveEdit} onCancelEdit={cancelEdit} draftBusy={Boolean(comment.trim() || reply.trim())} onDelete={(commentId, replyId, item) => { if (busy || dirty || editingMessage || !item.canManage) return; setError(''); setDeletingMessage({ commentId, replyId, version: review.version, hasReplies: Boolean(item.replies?.length) }) }} />
            </div>}</div>
          </>}
        </>}
      </>}
      <Modal open={Boolean(deletingMessage)} title={deletingMessage?.replyId ? 'Delete your reply?' : 'Delete your comment?'} description="Only your own words will be removed." onClose={() => { if (!busy) setDeletingMessage(null) }} footer={<><Button variant="secondary" disabled={busy} onClick={() => setDeletingMessage(null)}>Keep {deletingMessage?.replyId ? 'reply' : 'comment'}</Button><Button variant="danger" disabled={busy} onClick={deleteMessage}>Delete {deletingMessage?.replyId ? 'reply' : 'comment'}</Button></>}><p className="text-sm leading-7">{deletingMessage?.replyId ? 'Your reply will be permanently removed.' : deletingMessage?.hasReplies ? 'Your comment and its pin will be removed. Other people’s replies will stay in a deleted thread.' : 'Your comment and its pin will be permanently removed.'}</p>{error && <p role="alert" className="mt-4 text-sm leading-7 text-danger">{error} Close this dialog and reload review before retrying.</p>}</Modal>
      <Modal open={removing} title="Remove this design version?" description="The image, pinned comments and replies will be permanently removed." onClose={() => { if (!busy) setRemoving(false) }} footer={<><Button variant="secondary" disabled={busy} onClick={() => setRemoving(false)}>Keep version</Button><Button variant="danger" disabled={busy} onClick={async () => { const ok = await request(() => api(path, { method: 'DELETE', body: { version: review.version } }), 'Design version removed.'); if (ok) setRemoving(false) }}>Remove version</Button></>}><p className="wrap-break-word text-sm leading-7">Remove <strong>{design?.title}</strong>? Clients will no longer be able to open this version.</p>{error && <p role="alert" className="mt-4 text-sm leading-7 text-danger">{error} Close this dialog and reload review before retrying.</p>}</Modal>
      <Modal open={Boolean(discard || blocker.state === 'blocked')} title={busy ? 'Saving your changes' : 'Discard unsaved feedback?'} onClose={() => { if (!busy) { setDiscard(null); blocker.reset?.() } }} footer={<><Button variant="secondary" onClick={() => { setDiscard(null); blocker.reset?.() }}>Keep editing</Button><Button variant="danger" disabled={busy} onClick={discardDrafts}>Discard changes</Button></>}><p className="text-sm leading-7 text-muted">{busy ? 'Wait for the current request to finish before leaving.' : 'Your saved feedback will stay on its design version. Unsaved comments, replies and upload drafts will be discarded if you leave this page.'}</p></Modal>
    </section>
  )
}
