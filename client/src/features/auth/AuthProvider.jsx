import { useCallback, useEffect, useRef, useState } from 'react'
import { api, clearSecurityToken } from './api'
import { AuthContext } from './AuthContext'

const anonymous = { status: 'anonymous', user: null, freelancerProfile: null, error: '' }
const eventKey = 'freelanceflow:account-event'

function savedWorkspace(user) {
  try {
    const value = sessionStorage.getItem(`freelanceflow:workspace:${user.id}`)
    if (value === 'client' || (value === 'freelancer' && user.roles.includes('freelancer'))) return value
  } catch { /* Ignore blocked preference storage. */ }
  return user.roles.includes('freelancer') ? 'freelancer' : 'client'
}

function announceSessionChange() {
  try { localStorage.setItem(eventKey, crypto.randomUUID()) } catch { /* Cross-tab updates are optional. */ }
}

export default function AuthProvider({ children }) {
  const [account, setAccount] = useState({ ...anonymous, status: 'loading' })
  const [workspace, setWorkspace] = useState('client')
  const revision = useRef(0)

  const acceptAccount = useCallback((data) => {
    setAccount({ status: 'authenticated', user: data.user, freelancerProfile: data.freelancerProfile, error: '' })
    setWorkspace(savedWorkspace(data.user))
  }, [])

  const refresh = useCallback(async () => {
    const current = ++revision.current
    try {
      const data = await api('/auth/me')
      if (current === revision.current) acceptAccount(data)
    } catch (error) {
      if (current !== revision.current) return
      if (error.status === 401) {
        clearSecurityToken()
        setAccount(anonymous)
      } else setAccount({ ...anonymous, status: 'error', error: error.message })
    }
  }, [acceptAccount])

  useEffect(() => {
    const current = ++revision.current
    api('/auth/me').then((data) => {
      if (current === revision.current) acceptAccount(data)
    }).catch((failure) => {
      if (current !== revision.current) return
      if (failure.status === 401) {
        clearSecurityToken()
        setAccount(anonymous)
      } else setAccount({ ...anonymous, status: 'error', error: failure.message })
    })
    const expire = () => {
      revision.current += 1
      clearSecurityToken()
      setAccount({ ...anonymous, error: 'Your session ended. Please sign in again.' })
    }
    const sync = (event) => {
      if (event.key === eventKey) {
        clearSecurityToken()
        refresh()
      }
    }
    window.addEventListener('freelanceflow:session-expired', expire)
    window.addEventListener('storage', sync)
    return () => {
      revision.current += 1
      window.removeEventListener('freelanceflow:session-expired', expire)
      window.removeEventListener('storage', sync)
    }
  }, [acceptAccount, refresh])

  async function authenticate(mode, input) {
    revision.current += 1
    const data = await api(`/auth/${mode}`, { method: 'POST', body: input })
    acceptAccount(data)
    announceSessionChange()
  }

  async function signOut() {
    await api('/auth/logout', { method: 'POST', body: {} })
    revision.current += 1
    clearSecurityToken()
    setAccount(anonymous)
    announceSessionChange()
  }

  function updateProfile(accountId, data) {
    setAccount((current) => {
      if (current.user?.id !== accountId) return current
      return {
        ...current,
        user: data.user ? { ...current.user, displayName: data.user.displayName, ...(data.user.avatarUrl !== undefined ? { avatarUrl: data.user.avatarUrl } : {}) } : current.user,
        freelancerProfile: data.freelancerProfile ?? current.freelancerProfile,
      }
    })
    announceSessionChange()
  }

  async function changePassword(input) {
    await api('/auth/change-password', { method: 'POST', body: input })
    revision.current += 1
    clearSecurityToken()
    setAccount({ ...anonymous, notice: 'Password updated. Sign in with your new password.' })
    announceSessionChange()
  }

  function switchWorkspace(next) {
    if (next !== 'client' && !(next === 'freelancer' && account.user?.roles.includes('freelancer'))) return
    setWorkspace(next)
    try { sessionStorage.setItem(`freelanceflow:workspace:${account.user.id}`, next) } catch { /* Ignore blocked preference storage. */ }
  }

  return (
    <AuthContext.Provider value={{ ...account, workspace, refresh, authenticate, signOut, switchWorkspace, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}
