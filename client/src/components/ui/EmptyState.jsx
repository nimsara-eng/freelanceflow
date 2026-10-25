export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center',
        'px-4 py-12 text-center',
        className,
      ].join(' ')}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"
        >
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold tracking-tight text-text">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}