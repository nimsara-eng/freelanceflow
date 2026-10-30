const paddingOptions = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

export default function Card({
  children,
  padding = 'md',
  className = '',
  ...props
}) {
  return (
    <div
      {...props}
      className={[
        'min-w-0 rounded-3xl',
        'border border-border/70 bg-surface',
        'shadow-[0_8px_28px_rgb(27_18_53/0.04)]',
        paddingOptions[padding] ?? paddingOptions.md,
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}