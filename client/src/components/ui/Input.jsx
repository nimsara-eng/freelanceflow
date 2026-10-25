import { useId, useState } from 'react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'

export default function Input({
  id,
  label,
  hint,
  error,
  type = 'text',
  disabled = false,
  required = false,
  className = '',
  containerClassName = '',
  ...props
}) {
  const generatedId = useId()
  const [showPassword, setShowPassword] = useState(false)

  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`

  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  const describedBy = [
    props['aria-describedby'],
    hint ? hintId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className={['min-w-0', containerClassName].join(' ')}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-medium text-text"
        >
          {label}

          {required && (
            <span aria-hidden="true" className="ml-1 text-danger">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={inputType}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={describedBy}
          className={[
            'block min-h-11 w-full rounded-xl border',
            'bg-surface px-3.5 py-2.5',
            'text-base text-text sm:text-sm',
            'placeholder:text-muted/70',
            'transition-colors duration-150',
            'motion-reduce:transition-none',
            'disabled:cursor-not-allowed',
            'disabled:bg-surface-2 disabled:text-muted',
            error
              ? 'border-danger focus:border-danger'
              : 'border-border enabled:hover:border-brand/40 focus:border-brand',
            isPassword ? 'pr-12' : '',
            className,
          ].join(' ')}
        />

        {isPassword && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-controls={inputId}
            className={[
              'absolute inset-y-0 right-0',
              'flex w-11 items-center justify-center rounded-r-xl',
              'text-muted transition-colors',
              'enabled:hover:text-brand',
              'disabled:cursor-not-allowed disabled:opacity-50',
            ].join(' ')}
          >
            {showPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {hint && (
        <p id={hintId} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-sm text-text"
        >
          <CircleAlert
            size={16}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-danger"
          />

          <span>{error}</span>
        </p>
      )}
    </div>
  )
}