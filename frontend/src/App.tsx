import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import RegistrationPage from './pages/RegistrationPage'
import DownloadPage from './pages/DownloadPage'
import ExamRoomQueryPage from './pages/ExamRoomQueryPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="registration" element={<RegistrationPage />} />
          <Route path="download" element={<DownloadPage />} />
          <Route path="query-room" element={<ExamRoomQueryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Router>
  )
}

export default App