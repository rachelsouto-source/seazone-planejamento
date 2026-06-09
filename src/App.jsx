import { useState } from 'react'
import { isDemo } from './storage'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('seazone_user')
    return saved ? JSON.parse(saved) : null
  })
  const [displayName, setDisplayName] = useState(() => {
    const saved = localStorage.getItem('seazone_user')
    return saved ? JSON.parse(saved).name : ''
  })

  function handleLogin(name) {
    const u = { uid: name.toLowerCase(), name }
    localStorage.setItem('seazone_user', JSON.stringify(u))
    setUser(u)
    setDisplayName(name)
  }

  function handleLogout() {
    localStorage.removeItem('seazone_user')
    setUser(null)
    setDisplayName('')
  }

  if (!user) return <Login onLogin={handleLogin} />

  return (
    <Dashboard
      user={user}
      displayName={displayName}
      isDemo={isDemo}
      onDemoLogout={handleLogout}
    />
  )
}
