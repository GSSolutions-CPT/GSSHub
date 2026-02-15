import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import './App.css'
import { ThemeProvider } from '@/lib/use-theme.jsx'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

const Layout = lazy(() => import('./components/Layout.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Clients = lazy(() => import('./pages/Clients.jsx'))
const ClientDetails = lazy(() => import('./pages/ClientDetails.jsx'))
const Products = lazy(() => import('./pages/Products.jsx'))
const CreateSale = lazy(() => import('./pages/CreateSale.jsx'))
const CreatePurchaseOrder = lazy(() => import('./pages/CreatePurchaseOrder.jsx'))
const Sales = lazy(() => import('./pages/Sales.jsx'))
const Jobs = lazy(() => import('./pages/Jobs.jsx'))
const Financials = lazy(() => import('./pages/Financials.jsx'))
const ClientPortal = lazy(() => import('./pages/ClientPortal.jsx'))
const Contracts = lazy(() => import('./pages/Contracts.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const ProfileSetup = lazy(() => import('./pages/ProfileSetup.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

// Smart root component: if ?client= param is present, show ClientPortal
// Otherwise, show the admin dashboard (via PrivateRoute)
function RootRedirect() {
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('client')

  if (clientId) {
    return <ClientPortal />
  }

  return (
    <PrivateRoute>
      <Navigate to="/dashboard" replace />
    </PrivateRoute>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router basename="/portal">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/client-portal" element={<ClientPortal />} />
              <Route path="/setup-profile/:id" element={<ProfileSetup />} />

              {/* Smart root: client portal or admin redirect */}
              <Route index element={<RootRedirect />} />

              {/* Protected Admin Routes */}
              <Route path="/" element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/:id" element={<ClientDetails />} />
                <Route path="products" element={<Products />} />
                <Route path="create-sale" element={<CreateSale />} />
                <Route path="create-purchase-order" element={<CreatePurchaseOrder />} />
                <Route path="sales" element={<Sales />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="contracts" element={<Contracts />} />
                <Route path="financials" element={<Financials />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

