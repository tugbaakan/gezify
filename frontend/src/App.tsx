import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './components/RequireAuth'
import { RouteTransitionLayout } from './components/RouteTransitionLayout'
import AuthCallbackPage from './pages/AuthCallbackPage'
import InvitePage from './pages/InvitePage'
import NewExpensePage from './pages/NewExpensePage'
import SettlementPage from './pages/SettlementPage'
import TravelDetailPage from './pages/TravelDetailPage'
import TravelListPage from './pages/TravelListPage'
import TravelPeoplePage from './pages/TravelPeoplePage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RouteTransitionLayout />}>
            <Route path="/" element={<TravelListPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/invite/:token" element={<InvitePage />} />
            <Route
              path="/travels/:id"
              element={
                <RequireAuth>
                  <TravelDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/travels/:id/people"
              element={
                <RequireAuth>
                  <TravelPeoplePage />
                </RequireAuth>
              }
            />
            <Route
              path="/travels/:id/expenses/new"
              element={
                <RequireAuth>
                  <NewExpensePage />
                </RequireAuth>
              }
            />
            <Route
              path="/travels/:id/settlement"
              element={
                <RequireAuth>
                  <SettlementPage />
                </RequireAuth>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
