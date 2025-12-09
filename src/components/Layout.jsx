import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  Briefcase,
  Banknote,
  Calendar as CalendarIcon,
  FileSignature,
  Settings as SettingsIcon,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/sales', label: 'Sales', icon: Receipt },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/contracts', label: 'Contracts', icon: FileSignature },
  { path: '/financials', label: 'Financials', icon: Banknote },
  { path: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const activeItem = navItems.find((item) => item.path === location.pathname)

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0
      `}>
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="flex items-center justify-between gap-2 px-6 pb-5 pt-6 border-b border-sidebar-border/50">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Global Security Solutions" className="h-10 w-auto" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">System</p>
                <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">Control Centre</h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200
                        ${isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                        }
                      `}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'}`} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border px-6 py-5">
            <div className="flex items-center gap-3 text-xs text-sidebar-foreground/40">
              <div className="h-2 w-2 rounded-full bg-emerald-500/50 animate-pulse" />
              <span>System Operational</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 backdrop-blur px-6 shadow-sm">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground">
                {activeItem?.label ?? 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {/* Placeholders for Search/Profile if needed */}
              <div className="h-8 w-8 rounded-full bg-secondary text-xs flex items-center justify-center font-bold text-secondary-foreground">
                JM
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-muted/20 px-6 py-8 md:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

