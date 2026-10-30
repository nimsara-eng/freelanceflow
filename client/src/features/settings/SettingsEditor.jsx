import { useCallback, useState } from 'react'
import { BriefcaseBusiness, ImagePlus, Link2, LockKeyhole, SlidersHorizontal, UserRound } from 'lucide-react'
import { useBeforeUnload, useBlocker, useSearchParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../auth/useAuth'
import PersonalProfileForm from './PersonalProfileForm'
import PreferencesForm from './PreferencesForm'
import ProfessionalProfileForm from './ProfessionalProfileForm'
import SecurityForm from './SecurityForm'
import SharingPanel from './SharingPanel'
import MediaPanel from './MediaPanel'
import Avatar from '../../components/ui/Avatar'

const allSections = [
  { key: 'profile', label: 'Personal profile', Icon: UserRound },
  { key: 'media', label: 'Photo & resume', Icon: ImagePlus },
  { key: 'freelancer', label: 'Freelancer profile', Icon: BriefcaseBusiness, freelancer: true },
  { key: 'sharing', label: 'Sharing', Icon: Link2, freelancer: true },
  { key: 'security', label: 'Password & security', Icon: LockKeyhole },
  { key: 'preferences', label: 'Preferences', Icon: SlidersHorizontal },
]

export default function SettingsEditor({ initial }) {
  const { user, freelancerProfile } = useAuth()
  const [params, setParams] = useSearchParams()
  const [forms, setForms] = useState({})
  const sections = allSections.filter((entry) => !entry.freelancer || user.roles.includes('freelancer')).map((entry) => entry.key === 'media' && !user.roles.includes('freelancer') ? { ...entry, label: 'Profile photo' } : entry)
  const section = sections.some((entry) => entry.key === params.get('section')) ? params.get('section') : 'profile'
  const dirty = Object.values(forms).some((form) => form.dirty)
  const busy = Object.values(forms).some((form) => form.busy)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || busy) && currentLocation.pathname !== nextLocation.pathname)

  useBeforeUnload(useCallback((event) => {
    if (dirty || busy) { event.preventDefault(); event.returnValue = '' }
  }, [dirty, busy]))

  function report(key, status) { setForms((current) => ({ ...current, [key]: status })) }
  function selectSection(key) {
    const next = new URLSearchParams(params)
    next.set('section', key)
    setParams(next, { replace: true })
  }

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Account settings</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1><p className="mt-3 text-sm leading-7 text-muted">Manage your profile, security and preferences.</p></div>{dirty && <Badge tone="warning">Unsaved changes</Badge>}</header>
      <div className="grid items-start gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:space-y-5">
          <div className="flex items-center gap-4 rounded-3xl bg-sidebar p-4 text-white xl:block xl:p-6">
            <Avatar src={user.avatarUrl} name={user.displayName} className="size-10 text-sm xl:size-14 xl:text-lg" />
            <div className="min-w-0"><p className="break-words text-sm font-semibold xl:mt-4 xl:text-lg">{user.displayName}</p>
            <p className="mt-2 hidden break-all text-xs leading-6 text-violet-100/80 sm:block">{user.email}</p>
            <p className="mt-1 text-xs text-violet-100/80 xl:mt-4">{user.roles.includes('freelancer') ? 'Client + Freelancer account' : 'Client account'}</p></div>
          </div>
          <div className="xl:hidden"><label htmlFor="settings-section" className="mb-2 block text-xs font-semibold text-muted">Settings section</label><select id="settings-section" value={section} disabled={busy} onChange={(event) => selectSection(event.target.value)} className="min-h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium">{sections.map(({ key, label }) => <option key={key} value={key}>{label}{forms[key]?.dirty ? ' — unsaved changes' : ''}</option>)}</select></div>
          <nav aria-label="Settings sections" className="hidden flex-col gap-2 rounded-3xl border border-border bg-surface p-3 xl:flex">
            {sections.map(({ key, label, Icon }) => <Button key={key} variant={section === key ? 'primary' : 'ghost'} className="w-full justify-start" disabled={busy} aria-current={section === key ? 'page' : undefined} onClick={() => selectSection(key)}><Icon size={17} aria-hidden="true" />{label}{forms[key]?.dirty && <span className={`ml-auto size-1.5 rounded-full ${section === key ? 'bg-white' : 'bg-brand'}`} aria-label="Unsaved changes" />}</Button>)}
          </nav>
        </div>
        <div className="min-w-0">
          <div hidden={section !== 'profile'}><PersonalProfileForm initial={initial.user} report={(status) => report('profile', status)} /></div>
          <div hidden={section !== 'media'}><MediaPanel report={(status) => report('media', status)} /></div>
          {initial.freelancerProfile && <>
            <div hidden={section !== 'freelancer'}><ProfessionalProfileForm publicationDisabled={dirty || busy} initial={initial.freelancerProfile} report={(status) => report('freelancer', status)} /></div>
            <div hidden={section !== 'sharing'}><SharingPanel profile={freelancerProfile ?? initial.freelancerProfile} /></div>
          </>}
          <div hidden={section !== 'security'}><SecurityForm report={(status) => report('security', status)} /></div>
          <div hidden={section !== 'preferences'}><PreferencesForm report={(status) => report('preferences', status)} /></div>
        </div>
      </div>
      <Modal open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} title={busy ? 'Your changes are being saved' : 'Leave without saving?'} description={busy ? 'Please wait until the current request finishes.' : 'Unsaved profile, password or preference changes will be lost.'} size="sm" closeOnBackdrop={!busy} footer={<><Button variant="secondary" onClick={() => blocker.reset?.()}>Keep editing</Button><Button variant="danger" disabled={busy} onClick={() => blocker.proceed?.()}>Leave without saving</Button></>}><p className="text-sm leading-7 text-muted">{busy ? 'Saving changes. Please wait.' : 'Unsaved changes will be discarded.'}</p></Modal>
    </section>
  )
}
