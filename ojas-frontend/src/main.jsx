import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider'
import { DeviceProvider } from './context/DeviceProvider'
import { MQTTProvider } from './context/MQTTProvider'
import './styles/index.css'

const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark')
}
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <MQTTProvider>
          <DeviceProvider>
            <App />
          </DeviceProvider>
        </MQTTProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
