export default function TaskProgress({ progress, name = 'Project' }) {
  const total = progress?.total ?? 0
  const percent = progress?.percent ?? 0
  if (!total) return <p className="text-xs text-muted">No tasks yet</p>
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-xs text-muted"><span>{progress.completed} of {total} tasks done</span><span className="font-semibold tabular-nums text-brand">{percent}%</span></div>
      <div role="progressbar" aria-label={`${name} task progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-brand/10"><div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} /></div>
    </div>
  )
}
