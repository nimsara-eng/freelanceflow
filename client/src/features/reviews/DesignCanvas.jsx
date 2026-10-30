import { useState } from 'react'
import { MessageCircle, ZoomIn, ZoomOut } from 'lucide-react'
import Button from '../../components/ui/Button'

export default function DesignCanvas({ projectId, design, commentMode, disabled, point, selected, onPoint, onSelect }) {
  const [zoom, setZoom] = useState(1)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const source = `/api/reviews/${projectId}/designs/${design.id}/image`
  function place(event) {
    if (disabled || !commentMode || !loaded) return
    const bounds = event.currentTarget.getBoundingClientRect()
    onPoint(event.detail === 0 ? { x: 0.5, y: 0.5 } : { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) })
  }
  const image = <img src={source} alt={design.title} width={design.width} height={design.height} draggable={false} onLoad={() => setLoaded(true)} onError={() => { setError(true); setLoaded(false) }} className="block h-auto w-full select-none" />
  return (
    <section aria-label="Design preview" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><p className="text-xs font-medium text-muted">{design.width} × {design.height} · {commentMode ? 'Click the design to leave feedback' : 'View mode'}</p><div className="flex items-center gap-2"><Button variant="ghost" size="sm" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - 0.5))}><ZoomOut size={18} /></Button><button type="button" className="min-h-11 px-2 text-xs font-semibold text-brand" onClick={() => setZoom(1)} aria-label="Fit design to width">{zoom === 1 ? 'Fit width' : `${Math.round(zoom * 100)}%`}</button><Button variant="ghost" size="sm" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + 0.5))}><ZoomIn size={18} /></Button></div></div>
      {error ? <p role="alert" className="p-8 text-sm leading-7">This image could not be loaded. Access may have changed. Use Reload review to check.</p> : <div className="max-h-[65dvh] min-h-72 overflow-auto overscroll-contain bg-surface-2 p-4 sm:p-6" tabIndex={0} aria-label="Scrollable design preview">
        <div className="relative shadow-lg" style={{ width: `${zoom * 100}%` }}>
          {commentMode ? <button type="button" disabled={disabled || !loaded} onClick={place} aria-label="Place feedback pin on design; press Enter for the center" className="block w-full cursor-crosshair border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{image}</button> : image}
          {commentMode && loaded && design.comments.map((comment, index) => !comment.deleted && <button type="button" key={comment.id} onClick={() => onSelect(comment.id)} aria-label={`Comment ${index + 1}: ${comment.text}`} aria-pressed={selected === comment.id} className={`absolute z-10 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${comment.resolved ? 'bg-success' : selected === comment.id ? 'bg-sidebar ring-4 ring-brand/25' : 'bg-brand'}`} style={{ left: `${comment.x * 100}%`, top: `${comment.y * 100}%` }}>{index + 1}</button>)}
          {commentMode && loaded && point && <span aria-hidden="true" className="pointer-events-none absolute z-20 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-sidebar text-white shadow-lg ring-4 ring-brand/20" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}><MessageCircle size={16} /></span>}
        </div>
      </div>}
      {!loaded && !error && <p role="status" className="p-4 text-xs text-muted">Loading design…</p>}
      {commentMode && loaded && <p className="border-t border-border p-4 text-xs leading-6 text-muted">Keyboard: focus the design and press Enter to place a pin at the center. Adjust its horizontal and vertical position in the feedback form.</p>}
    </section>
  )
}
