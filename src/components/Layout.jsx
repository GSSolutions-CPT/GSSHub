import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import {
    LayoutDashboard,
    Users,
    Banknote,
    Briefcase,
    PieChart,
    Settings,
    LogOut,
    Menu,
    X
} from 'lucide-react'
import { CurrencyProvider } from '@/lib/use-currency'

export default function Layout() {
    const { signOut, user } = useAuth()
    const navigate = useNavigate()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Sales', path: '/sales', icon: Banknote },
        { name: 'Clients', path: '/clients', icon: Users },
        { name: 'Jobs', path: '/jobs', icon: Briefcase },
        { name: 'Financials', path: '/financials', icon: PieChart },
        { name: 'Settings', path: '/settings', icon: Settings },
    ]

    const handleSignOut = async () => {
        try {
            await signOut()
            navigate('/login')
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    return (
        <CurrencyProvider>
            <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="GSS Logo" className="h-8 w-auto mb-1" />
                            {/* <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hidden md:inline-block">GSS Hub</span> */}
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 
                      ${isActive
                                                ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                            }`
                                        }
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.name}
                                    </NavLink>
                                )
                            })}
                        </nav>

                        {/* User & Mobile Toggle */}
                        <div className="flex items-center gap-2">
                            <div className="hidden md:flex items-center gap-2 pr-4 border-r border-white/10 mr-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-medium leading-none text-foreground">{user?.email?.split('@')[0]}</span>
                                    <span className="text-[10px] text-muted-foreground">Admin</span>
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSignOut}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 hidden md:flex"
                                title="Sign Out"
                            >
                                <LogOut className="h-5 w-5" />
                            </Button>

                            {/* Mobile Menu Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-md pt-20 px-4 animate-in slide-in-from-top-10 fade-in duration-200">
                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors
                      ${isActive
                                                ? 'bg-primary/10 text-primary border border-primary/20'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                            }`
                                        }
                                    >
                                        <Icon className="h-5 w-5" />
                                        {item.name}
                                    </NavLink>
                                )
                            })}
                            <Button
                                variant="destructive"
                                className="mt-6 w-full gap-2"
                                onClick={handleSignOut}
                            >
                                <LogOut className="h-4 w-4" /> Sign Out
                            </Button>
                        </nav>
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 container mx-auto p-4 md:py-8 animate-fade-in text-foreground">
                    <Outlet />
                </main>
            </div>
        </CurrencyProvider>
    )
}