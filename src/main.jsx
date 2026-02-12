import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { CurrencyProvider } from './lib/use-currency.jsx'
import { SettingsProvider } from './lib/use-settings.jsx'
import { Toaster } from 'sonner'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CurrencyProvider>
        <SettingsProvider>
          <App />
          <Toaster richColors position="top-center" />
        </SettingsProvider>
      </CurrencyProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)