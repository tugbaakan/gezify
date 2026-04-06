import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AppLayout } from './AppLayout'
import './RequireAuth.css'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <AppLayout>
        <main className="require-auth require-auth--center">
          <p className="require-auth__message">Loading…</p>
        </main>
      </AppLayout>
    )
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
