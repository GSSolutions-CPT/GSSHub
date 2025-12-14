import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser } from 'lucide-react'

export function SignaturePad({ onSave, className = '' }) {
    const canvasRef = useRef(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current
        if (canvas) {
            const ctx = canvas.getContext('2d')
            ctx.lineWidth = 2
            ctx.lineCap = 'round'
            ctx.strokeStyle = '#000000'

            // Handle resizing if needed
            canvas.width = canvas.parentElement.clientWidth
            canvas.height = 200
        }
    }, [])

    const startDrawing = (e) => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX || e.touches[0].clientX) - rect.left
        const y = (e.clientY || e.touches[0].clientY) - rect.top

        ctx.beginPath()
        ctx.moveTo(x, y)
        setIsDrawing(true)
    }

    const draw = (e) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX || e.touches[0].clientX) - rect.left
        const y = (e.clientY || e.touches[0].clientY) - rect.top

        ctx.lineTo(x, y)
        ctx.stroke()
        setHasSignature(true)
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        if (onSave && hasSignature) {
            onSave(canvasRef.current.toDataURL())
        }
    }

    const clear = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
        if (onSave) onSave(null)
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden relative bg-white">
                <canvas
                    ref={canvasRef}
                    className="touch-none cursor-crosshair w-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/50">
                        Sign here
                    </div>
                )}
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Draw your signature above</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clear}
                    className="text-destructive hover:text-destructive"
                >
                    <Eraser className="w-4 h-4 mr-1" />
                    Clear
                </Button>
            </div>
        </div>
    )
}
