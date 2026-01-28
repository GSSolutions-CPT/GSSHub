import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Loader2, Lock, ArrowRight, ShieldCheck } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { signIn } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const from = location.state?.from?.pathname || '/dashboard'

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error } = await signIn({ email, password })
            if (error) throw error
            navigate(from, { replace: true })
        } catch (err) {
            setError(err.message || 'Failed to sign in')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black opacity-80" />

            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-40 -left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

            {/* Login Card */}
            <Card className="w-full max-w-md relative z-10 border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader className="space-y-1 text-center pb-8">
                    <div className="flex justify-center mb-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                            <div className="relative p-4 rounded-full bg-white dark:bg-slate-950 ring-1 ring-slate-200 dark:ring-slate-800 shadow-xl">
                                <img src="/logo.png" alt="Company Logo" className="w-12 h-12 object-contain" />
                            </div>
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                        Welcome back
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                        Enter your credentials to access the GSS Hub
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-5">
                        {error && (
                            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-600">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500 hover:underline transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    className="pl-10 h-11 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-2 pb-8">
                        <Button
                            className="w-full h-11 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">
                                    Sign In <ArrowRight className="h-4 w-4" />
                                </span>
                            )}
                        </Button>
                    </CardFooter>
                </form>

                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 opacity-50" />
            </Card>

            <div className="absolute bottom-6 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-600">
                <ShieldCheck className="h-4 w-4" />
                <span>Secured by GSS Solutions</span>
            </div>
        </div>
    )
}
