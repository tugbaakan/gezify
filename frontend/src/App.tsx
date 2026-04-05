import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import AuthCallbackPage from './pages/AuthCallbackPage'
import MainPage from './pages/MainPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
