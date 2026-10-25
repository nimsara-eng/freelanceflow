export default function Skeleton({
  className = 'h-4 w-full',
  ...props
}) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={[
        'animate-pulse rounded-xl bg-border/70',
        'motion-reduce:animate-none',
        className,
      ].join(' ')}
    />
  )
}