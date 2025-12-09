import React from 'react'
import { Button } from '@/components/ui/button'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo)

        // Auto-reload on chunk load error (deployment cache issue)
        if (error.message && error.message.includes('Failed to fetch dynamically imported module')) {
            console.log('Chunk load error detected, reloading page...')
            window.location.reload()
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
                    <h1 className="text-4xl font-bold mb-4">Oops! Something went wrong.</h1>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        We encountered an unexpected error. Please try refreshing the page or contact support if the issue persists.
                    </p>
                    <div className="bg-destructive/10 p-4 rounded-md mb-6 max-w-lg overflow-auto">
                        <code className="text-destructive text-sm font-mono">
                            {this.state.error && this.state.error.toString()}
                        </code>
                    </div>
                    <Button onClick={() => window.location.reload()}>
                        Refresh Page
                    </Button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
