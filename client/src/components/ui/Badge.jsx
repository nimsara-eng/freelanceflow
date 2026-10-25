const tones = {
  neutral: 'bg-surface-2 text-muted',
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/10 text-text',
  warning: 'bg-warning/10 text-text',
  danger: 'bg-danger/10 text-text',
}

const dotColors = {
  neutral: 'bg-muted',
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export default function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className = '',
  ...props
}) {
  return (
    <span
      {...props}
      className={[
        'inline-flex max-w-full items-center gap-1.5',
        'rounded-full px-2.5 py-1',
        'text-xs font-medium',
        tones[tone] ?? tones.neutral,
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={[
            'size-1.5 shrink-0 rounded-full',
            dotColors[tone] ?? dotColors.neutral,
          ].join(' ')}
        />
      )}

      <span className="min-w-0">{children}</span>
    </span>
  )
}