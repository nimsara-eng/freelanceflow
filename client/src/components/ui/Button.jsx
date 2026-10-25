import { LoaderCircle } from 'lucide-react'

const variants = {
  primary:
    'bg-brand text-white shadow-sm enabled:hover:bg-brand-hover',

  secondary:
    'border border-border bg-surface text-text enabled:hover:bg-surface-2',

  ghost:
    'bg-transparent text-muted enabled:hover:bg-brand/10 enabled:hover:text-brand',

  danger:
    'bg-danger text-white enabled:hover:bg-danger/90',
}

const sizes = {
  sm: 'min-h-11 gap-2 px-3 text-xs sm:min-h-9',
  md: 'min-h-11 gap-2 px-5 text-sm',
  lg: 'min-h-12 gap-2.5 px-6 text-sm',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  loadingText,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex shrink-0 items-center justify-center',
        'rounded-full font-semibold',
        'transition-colors duration-150',
        'motion-reduce:transition-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      ].join(' ')}
    >
      {loading && (
        <LoaderCircle
          size={16}
          aria-hidden="true"
          className="shrink-0 animate-spin motion-reduce:animate-none"
        />
      )}

      {loading && loadingText ? loadingText : children}
    </button>
  )
}