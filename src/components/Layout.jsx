import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Receipt,
  Briefcase,
  Banknote,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/sales', label: 'Sales', icon: Receipt },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/financials', label: 'Financials', icon: Banknote },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Layout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { signOut } = useAuth()

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full glass-effect tech-border">
        <div className="container flex h-16 items-center px-4 md:px-6">
          {/* Logo */}
          <div className="mr-4 hidden md:flex">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <img src="/logo.png" alt="GSSHub" className="h-8 w-auto transition-transform group-hover:scale-110 duration-300" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="flex items-center space-x-1 hidden md:flex mx-6">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-primary/10 text-primary tech-glow'
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Mobile Menu Button & Mobile Logo */}
          <div className="flex flex-1 items-center justify-between md:hidden">
            <Button
              variant="ghost"
              className="px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="hidden font-bold sm:inline-block text-primary">GSSHub</span>
            </Link>
            <div className="w-6" /> {/* Spacer for centering if needed, or put profile here */}
          </div>

          {/* User Profile / Search (Right Side) */}
          <div className="flex flex-1 items-center justify-end space-x-2 md:justify-end">
            <div className="h-8 w-8 rounded-full bg-secondary text-xs flex items-center justify-center font-bold text-secondary-foreground border border-input">
              JM
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="text-muted-foreground hover:text-foreground"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Content */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden">
          <div className="fixed inset-x-4 top-20 z-50 grid gap-4 rounded-lg bg-popover p-4 shadow-lg border text-popover-foreground animate-in slide-in-from-top-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Navigation</span>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="grid gap-2">
              {navItems.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={index}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground ${isActive ? 'bg-accent' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 bg-muted/20">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
