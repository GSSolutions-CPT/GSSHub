import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showPrompt, setShowPrompt] = useState(false)

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowPrompt(true)
        }

        window.addEventListener('beforeinstallprompt', handler)

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowPrompt(false)
        }

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            setDeferredPrompt(null)
            setShowPrompt(false)
        }
    }

    if (!showPrompt) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-primary/20 z-50 animate-in slide-in-from-bottom-5">
            <div className="container mx-auto max-w-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center">
                        <img src="/logo.png" alt="App Icon" className="h-8 w-8 object-contain" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-foreground">Install GSS Hub</p>
                        <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleInstallClick} className="tech-glow">
                        <Download className="mr-2 h-4 w-4" /> Install
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPrompt(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
