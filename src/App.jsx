import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import './App.css'
import { ThemeProvider } from '@/lib/use-theme.jsx'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

const Layout = lazy(() => import('./components/Layout.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Clients = lazy(() => import('./pages/Clients.jsx'))
const Products = lazy(() => import('./pages/Products.jsx'))
const CreateSale = lazy(() => import('./pages/CreateSale.jsx'))
const CreatePurchaseOrder = lazy(() => import('./pages/CreatePurchaseOrder.jsx'))
const Sales = lazy(() => import('./pages/Sales.jsx'))
const Jobs = lazy(() => import('./pages/Jobs.jsx'))
const Financials = lazy(() => import('./pages/Financials.jsx'))
const ClientPortal = lazy(() => import('./pages/ClientPortal.jsx'))
const Contracts = lazy(() => import('./pages/Contracts.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))


function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router>
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/portal" element={<ClientPortal />} />

              {/* Protected Admin Routes */}
              <Route path="/" element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="clients" element={<Clients />} />
                <Route path="products" element={<Products />} />
                <Route path="create-sale" element={<CreateSale />} />
                <Route path="create-purchase-order" element={<CreatePurchaseOrder />} />
                <Route path="sales" element={<Sales />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="contracts" element={<Contracts />} />
                <Route path="financials" element={<Financials />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
