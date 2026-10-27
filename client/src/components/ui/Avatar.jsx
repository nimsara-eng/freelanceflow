import { useState } from 'react'

export default function Avatar({ src, name = '', className = 'size-10 text-sm' }) {
  const [failed, setFailed] = useState(null)
  const valid = typeof src === 'string' && /^\/api\/(profile\/avatar|freelancers\/FF-[A-F0-9]{12}\/avatar)(\?v=\d+)?$/.test(src)
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'F'
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-brand to-fuchsia-500 font-semibold text-white ${className}`}>{valid && src !== failed ? <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(src)} /> : initials}</span>
}
