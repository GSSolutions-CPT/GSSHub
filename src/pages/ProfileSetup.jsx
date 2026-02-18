import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ShieldCheck, Lock, UserPlus, CheckCircle2 } from 'lucide-react'

export default function ProfileSetup() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [client, setClient] = useState(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        async function fetchClient() {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name, email, auth_user_id')
                    .eq('id', id)
                    .single()

                if (error) throw error
                if (data.auth_user_id) {
                    setError('Profile already setup for this client. Please sign in.')
                    setTimeout(() => navigate('/login'), 3000)
                }
                setClient(data)
            } catch (err) {
                console.error('Error fetching client:', err)
                setError('Invalid or expired invitation link.')
            } finally {
                setLoading(false)
            }
        }

        if (id) fetchClient()
    }, [id, navigate])

    const handleSignup = async (e) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            return setError('Passwords do not match')
        }
        if (password.length < 6) {
            return setError('Password must be at least 6 characters')
        }

        setActionLoading(true)
        try {
            // 1. Sign up the user
            const { error: signUpError } = await supabase.auth.signUp({
                email: client.email,
                password: password,
                options: {
                    data: {
                        full_name: client.name,
                        client_id: client.id,
                        role: 'client'
                    }
                }
            })

            if (signUpError) throw signUpError

            // 2. Securely link the client profile using RPC
            const { error: linkError } = await supabase.rpc('claim_client_profile', {
                p_client_id: client.id
            })
            if (linkError) throw linkError

            setSuccess(true)
            setTimeout(() => {
                // FIX: Force hard redirect with client param to ensure RootRedirect sends them to the Client Portal
                const origin = window.location.origin
                window.location.href = `${origin}/portal/?client=${client.id}`
            }, 2000)
        } catch (err) {
            setError(err.message || 'Failed to create profile')
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black opacity-80" />

            <Card className="w-full max-w-md relative z-10 border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader className="space-y-1 text-center pb-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-blue-600/10 p-4 rounded-full">
                            <UserPlus className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        Client Onboarding
                    </CardTitle>
                    <CardDescription>
                        Set up your profile to access the GSS Client Portal
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                    {error && (
                        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-600">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                            <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-bounce" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Profile Created!</h3>
                                <p className="text-slate-500 dark:text-slate-400">Redirecting to your portal...</p>
                            </div>
                        </div>
                    ) : client ? (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">Full Name</Label>
                                <Input value={client.name} disabled className="bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 opacity-100" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">Email Address</Label>
                                <Input value={client.email} disabled className="bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 opacity-100" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-900 dark:text-white font-medium">Create Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Min 6 characters"
                                        className="pl-10 h-11 bg-white text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-900 dark:text-white font-medium">Confirm Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Confirm your password"
                                        className="pl-10 h-11 bg-white text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-lg mt-4 font-semibold"
                                disabled={actionLoading}
                            >
                                {actionLoading ? <Loader2 className="animate-spin" /> : 'Create Profile'}
                            </Button>
                        </form>
                    ) : null}
                </CardContent>

                <CardFooter className="justify-center border-t border-slate-100 dark:border-slate-800 mt-6 pt-4 text-xs text-slate-400">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Secure Access powered by GSS
                </CardFooter>
            </Card>
        </div>
    )
}
