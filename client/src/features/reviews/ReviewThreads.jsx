import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const date = (value) => new Date(value).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function MessageBody({ item, commentId, isReply = false, controls }) {
  const { busy, editing, onEdit, onEditText, onSaveEdit, onCancelEdit, onDelete, draftBusy } = controls
  const active = editing?.commentId === commentId && (editing.replyId ?? null) === (isReply ? item.id : null)
  return <>
    <p className="text-xs font-semibold">{item.authorName} <span className="font-normal text-muted">· {item.authorRole}</span></p>
    {active ? <form onSubmit={(event) => { event.preventDefault(); onSaveEdit() }} className="mt-3 space-y-3">
      <label htmlFor={`edit-${item.id}`} className="block text-xs font-medium">{isReply ? 'Edit reply' : 'Edit comment'}</label>
      <textarea id={`edit-${item.id}`} autoFocus required maxLength={1000} rows={4} disabled={busy} value={editing.text} onChange={(event) => onEditText(event.target.value)} className="w-full rounded-xl border border-border bg-surface p-3 text-sm" />
      {!isReply && <p className="text-xs leading-6 text-muted">Saving an edit reopens this thread for review.</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={busy || !editing.text.trim() || editing.text === editing.initialText}>Save edit</Button><Button variant="ghost" size="sm" disabled={busy} onClick={onCancelEdit}>Cancel edit</Button></div>
    </form> : <p className={`mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-7 ${item.deleted ? 'italic text-muted' : ''}`}>{item.deleted ? 'Comment deleted by its author. Existing replies are preserved below.' : item.text}</p>}
    <p className="mt-3 text-[11px] text-muted">{date(item.createdAt)}{item.editedAt && ' · Edited'}</p>
    {!active && item.canManage && <div className="mt-3 flex flex-wrap gap-2"><Button variant="ghost" size="sm" disabled={busy || draftBusy || Boolean(editing)} onClick={() => onEdit(commentId, isReply ? item.id : null, item)}>{isReply ? 'Edit reply' : 'Edit comment'}</Button><Button variant="ghost" size="sm" disabled={busy || draftBusy || Boolean(editing)} onClick={() => onDelete(commentId, isReply ? item.id : null, item)}>{isReply ? 'Delete reply' : 'Delete comment'}</Button></div>}
  </>
}

export default function ReviewThreads({ design, owner, selected, onSelect, busy, onResolve, reply, setReply, onReply, editing, onEdit, onEditText, onSaveEdit, onCancelEdit, onDelete, draftBusy }) {
  const thread = design.comments.find((comment) => comment.id === selected)
  const controls = { busy, editing, onEdit, onEditText, onSaveEdit, onCancelEdit, onDelete, draftBusy }
  return (
    <section aria-label="Design feedback" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Feedback</h2><span className="text-xs text-muted">{design.comments.filter((comment) => !comment.resolved && !comment.deleted).length} open · {design.comments.filter((comment) => !comment.deleted).length} total</span></div>
      {design.comments.length === 0 ? <p className="text-sm leading-7 text-muted">A fresh canvas. Choose a point on the design to start a conversation.</p> : <ol className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1">{design.comments.map((comment, index) => <li key={comment.id}><button type="button" aria-pressed={selected === comment.id} onClick={() => onSelect(comment.id)} className={`flex w-full gap-3 rounded-xl border p-3 text-left transition-colors ${selected === comment.id ? 'border-brand/40 bg-brand/5' : 'border-border hover:bg-surface-2'}`}><span aria-hidden="true" className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${comment.deleted ? 'bg-muted' : comment.resolved ? 'bg-success' : 'bg-brand'}`}>{index + 1}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{comment.authorName}</span><span className="mt-1 block line-clamp-2 wrap-break-word text-xs leading-6 text-muted">{comment.deleted ? 'Comment deleted' : comment.text}</span><span className="mt-1 block text-[11px] text-muted">{comment.deleted ? 'Deleted' : comment.resolved ? 'Resolved' : 'Open'} · {comment.replies.length} replies</span></span></button></li>)}</ol>}
      {thread && <div className="space-y-4 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">Comment {design.comments.indexOf(thread) + 1}</h3><Badge tone={thread.deleted ? 'neutral' : thread.resolved ? 'success' : 'brand'}>{thread.deleted ? 'Deleted' : thread.resolved ? 'Resolved' : 'Open'}</Badge></div>
        <div className="rounded-xl bg-surface-2 p-4"><MessageBody item={thread} commentId={thread.id} controls={controls} /></div>
        {thread.replies.map((item) => <div key={item.id} className="ml-3 border-l-2 border-brand/15 pl-4"><MessageBody item={item} commentId={thread.id} isReply controls={controls} /></div>)}
        {owner && !thread.deleted && <Button size="sm" variant="secondary" disabled={busy || draftBusy || Boolean(editing)} onClick={() => onResolve(thread)}>{thread.resolved ? 'Reopen thread' : 'Resolve thread'}</Button>}
        {thread.deleted ? <p className="text-xs leading-6 text-muted">This comment has been removed. Start a new pinned comment to continue the discussion.</p> : thread.resolved ? <p className="text-xs leading-6 text-muted">Resolved. The freelancer can reopen this thread if more discussion is needed.</p> : thread.replies.length >= 10 ? <p className="text-xs text-muted">This thread has reached its limit of 10 replies.</p> : <form onSubmit={(event) => { event.preventDefault(); onReply(thread.id) }} className="space-y-3"><label htmlFor="review-reply" className="block text-xs font-medium">Reply to this thread</label><textarea id="review-reply" required maxLength={1000} rows={3} disabled={busy || Boolean(editing)} value={reply} onChange={(event) => setReply(event.target.value)} className="w-full rounded-xl border border-border bg-surface p-3 text-sm" /><Button type="submit" size="sm" disabled={busy || Boolean(editing) || !reply.trim()}>Send reply</Button></form>}
      </div>}
    </section>
  )
}
