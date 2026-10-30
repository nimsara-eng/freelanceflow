import { useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Check, Layers3, ShieldCheck, Users } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { SessionStatus } from '../features/auth/AccountGate'
import { safeReturnTo } from '../features/auth/redirect'
import { useAuth } from '../features/auth/useAuth'
import freelanceflowMark from '../assets/freelanceflow-mark.png'

export default function Auth({ mode }) {
  const signup = mode === 'register'
  const { status, error: sessionError, notice, authenticate } = useAuth()
  const [params] = useSearchParams()
  const next = safeReturnTo(params.get('next'))
  const [accountType, setAccountType] = useState('client')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading' || status === 'error') return <SessionStatus />
  if (status === 'authenticated') return <Navigate to={next} replace />

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const password = form.get('password')
    if (signup && password !== form.get('confirmation')) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await authenticate(mode, {
        email: form.get('email').trim(), password,
        ...(signup ? { displayName: form.get('displayName').trim(), accountType } : {}),
      })
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative overflow-hidden bg-sidebar p-7 text-white sm:p-12 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 top-24 size-96 rounded-full border border-white/10 ring-[70px] ring-white/5" />
        <Link to="/login" className="relative inline-flex items-center gap-3 text-lg font-semibold tracking-tight">
          <img src={freelanceflowMark} alt="" width="1295" height="1214" className="size-10 shrink-0 rounded-xl bg-white object-contain p-0.5" />
          FreelanceFlow
        </Link>
        <div className="relative mt-10 max-w-lg lg:my-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">Freelance management</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Manage projects.<br />Collaborate with clients.</h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-violet-100/80">Manage projects, client reviews, time tracking and invoices in one workspace.</p>
          <div className="mt-9 hidden space-y-5 sm:block">
            {[[Users, 'Freelancer and client workspaces'], [Layers3, 'Project updates and design reviews'], [ShieldCheck, 'Time tracking and invoicing']].map(([Icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-sm text-violet-100"><Icon size={19} aria-hidden="true" />{text}</div>
            ))}
          </div>
        </div>
        <p className="relative hidden text-xs text-violet-200/70 lg:block">Freelance project management.</p>
      </aside>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:py-14" aria-labelledby="auth-heading">
        <div className="w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{signup ? 'Account registration' : 'Account access'}</p>
          <h2 id="auth-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{signup ? 'Create your account' : 'Welcome back.'}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{signup ? 'Select an account type.' : 'Sign in to your account.'}</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {notice && <p role="status" className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-sm text-text">{notice}</p>}
            <fieldset disabled={busy} className="space-y-5 disabled:opacity-75">
              {signup && (
                <fieldset>
                  <legend className="mb-3 text-sm font-medium">I am joining as</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'client', title: 'A client', detail: 'Find a freelancer and collaborate.', Icon: Users },
                      { value: 'freelancer', title: 'A freelancer', detail: 'Freelancer + Client workspaces.', Icon: BriefcaseBusiness },
                    ].map(({ value, title, detail, Icon }) => (
                      <label key={value} className={`relative cursor-pointer rounded-2xl border bg-surface p-4 transition-colors ${accountType === value ? 'border-brand ring-1 ring-brand' : 'border-border hover:border-brand/40'}`}>
                        <input className="peer sr-only" type="radio" name="accountType" value={value} checked={accountType === value} onChange={() => setAccountType(value)} required />
                        <span className="absolute inset-0 rounded-2xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-brand" />
                        <span className="flex items-center justify-between text-brand"><Icon size={20} aria-hidden="true" />{accountType === value && <Check size={17} aria-hidden="true" />}</span>
                        <span className="mt-3 block text-sm font-semibold">{title}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted">{detail}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {signup && <Input name="displayName" label="Full name" autoComplete="name" minLength={2} maxLength={80} required />}
              <Input name="email" label="Email address" type="email" autoComplete="email" maxLength={254} required />
              <Input name="password" label="Password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 15 : undefined} maxLength={128} hint={signup ? 'Use 15–128 characters.' : undefined} required />
              {signup && <Input name="confirmation" label="Confirm password" type="password" autoComplete="new-password" minLength={15} maxLength={128} required />}
            </fieldset>
            {(error || sessionError) && <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-text">{error || sessionError}</p>}
            <Button type="submit" loading={busy} loadingText={signup ? 'Creating your account…' : 'Signing in…'} className="w-full" size="lg">
              {signup ? 'Create account' : 'Sign in'}<ArrowRight size={17} aria-hidden="true" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {signup ? 'Already have an account? ' : 'New to FreelanceFlow? '}
            <Link to={`${signup ? '/login' : '/signup'}?next=${encodeURIComponent(next)}`} className="font-semibold text-brand hover:underline">{signup ? 'Sign in' : 'Create an account'}</Link>
          </p>
          {!signup && <p className="mt-5 text-center text-xs leading-5 text-muted">Password recovery is currently unavailable.</p>}
        </div>
      </section>
    </main>
  )
}
