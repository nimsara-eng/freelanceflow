import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

let openDialogCount = 0
let originalOverflow = ''

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({
  open = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) {
  const dialogRef = useRef(null)
  const pointerStartedOnBackdrop = useRef(false)
  const generatedId = useId()

  const titleId = `${generatedId}-title`
  const descriptionId = `${generatedId}-description`

  useEffect(() => {
    const dialog = dialogRef.current

    if (!open) {
      if (dialog.open) {
        dialog.close()
      }

      return
    }

    if (openDialogCount === 0) originalOverflow = document.body.style.overflow
    openDialogCount += 1

    if (!dialog.open) {
      dialog.showModal()
    }

    document.body.style.overflow = 'hidden'

    return () => {
      openDialogCount = Math.max(0, openDialogCount - 1)
      if (openDialogCount === 0) document.body.style.overflow = originalOverflow

      if (dialog.open) {
        dialog.close()
      }
    }
  }, [open])

  function handleCancel(event) {
    event.preventDefault()
    onClose()
  }

  function handleNativeClose(event) {
    if (open && !event.currentTarget.open) {
      onClose()
    }
  }

  function handlePointerDown(event) {
    pointerStartedOnBackdrop.current =
      event.target === event.currentTarget
  }

  function handleBackdropClick(event) {
    const clickedBackdrop = event.target === event.currentTarget

    if (
      closeOnBackdrop &&
      clickedBackdrop &&
      pointerStartedOnBackdrop.current
    ) {
      onClose()
    }

    pointerStartedOnBackdrop.current = false
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClose={handleNativeClose}
      onPointerDown={handlePointerDown}
      onClick={handleBackdropClick}
      className={[
        'm-auto w-[calc(100%-2rem)]',
        'max-h-[calc(100dvh-2rem)]',
        'overflow-hidden rounded-3xl',
        'border border-border bg-surface p-0 text-text',
        'shadow-2xl',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        sizes[size] ?? sizes.md,
      ].join(' ')}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-semibold tracking-tight"
            >
              {title}
            </h2>

            {description && (
              <p
                id={descriptionId}
                className="mt-2 text-sm text-muted"
              >
                {description}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={19} aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {children}
        </div>

        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-surface-2 p-5 sm:p-6">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  )
}