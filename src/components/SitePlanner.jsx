import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { SECURITY_ICONS } from '@/lib/security-icons'
import {
    MousePointer2, Pencil, Type, ArrowUpRight,
    Save, X, Undo2, Trash2, Loader2, RotateCcw, Upload
} from 'lucide-react'

// Tool modes
const TOOL = {
    SELECT: 'select',
    DRAW: 'draw',
    ARROW: 'arrow',
    TEXT: 'text',
    ICON: 'icon'
}

export default function SitePlanner({ quotationId, existingPlan, onSave, onClose }) {
    const canvasRef = useRef(null)
    const fabricRef = useRef(null)
    const fileInputRef = useRef(null)
    const [activeTool, setActiveTool] = useState(TOOL.SELECT)
    const [drawColor, setDrawColor] = useState('#ef4444')
    const [drawWidth, setDrawWidth] = useState(3)
    const [selectedIcon, setSelectedIcon] = useState(null)
    const [saving, setSaving] = useState(false)
    const [canvasReady, setCanvasReady] = useState(false)
    const [hasBackground, setHasBackground] = useState(false)
    const [statusText, setStatusText] = useState('Upload a floor plan to begin')
    const historyRef = useRef([])
    const historyIndexRef = useRef(-1)

    // Initialize Fabric.js canvas
    useEffect(() => {
        let canvas = null
        const initCanvas = async () => {
            const fabric = await import('fabric')

            canvas = new fabric.Canvas(canvasRef.current, {
                width: 900,
                height: 600,
                backgroundColor: '#f8fafc',
                selection: true,
                preserveObjectStacking: true
            })

            fabricRef.current = canvas
            setCanvasReady(true)

            // Event: save history on object modification
            canvas.on('object:modified', () => saveHistory())
            canvas.on('object:added', () => saveHistory())

            // Load existing plan if provided
            if (existingPlan?.canvas_json) {
                canvas.loadFromJSON(existingPlan.canvas_json, () => {
                    canvas.renderAll()
                    setHasBackground(!!existingPlan.background_url)
                    setStatusText('Plan loaded — ready to edit')
                })
            }
        }

        initCanvas()

        return () => {
            if (canvas) {
                canvas.dispose()
            }
        }
    }, [existingPlan, saveHistory])

    // Save canvas state for undo
    const saveHistory = useCallback(() => {
        const canvas = fabricRef.current
        if (!canvas) return
        const json = canvas.toJSON()
        const idx = historyIndexRef.current
        const history = historyRef.current.slice(0, idx + 1)
        history.push(json)
        if (history.length > 30) history.shift()
        historyRef.current = history
        historyIndexRef.current = history.length - 1
    }, [])

    // Undo
    const handleUndo = useCallback(() => {
        const canvas = fabricRef.current
        if (!canvas || historyIndexRef.current <= 0) return
        historyIndexRef.current -= 1
        const state = historyRef.current[historyIndexRef.current]
        canvas.loadFromJSON(state, () => canvas.renderAll())
    }, [])

    // Update canvas mode when tool changes
    useEffect(() => {
        const canvas = fabricRef.current
        if (!canvas) return

        // Reset drawing mode
        canvas.isDrawingMode = false
        canvas.selection = true
        canvas.defaultCursor = 'default'
        canvas.hoverCursor = 'move'

        // Remove any click handlers
        canvas.off('mouse:down')

        switch (activeTool) {
            case TOOL.SELECT:
                setStatusText('Click objects to select, drag to move, use handles to resize/rotate')
                break

            case TOOL.DRAW:
                canvas.isDrawingMode = true
                canvas.freeDrawingBrush.color = drawColor
                canvas.freeDrawingBrush.width = drawWidth
                canvas.selection = false
                setStatusText('Draw freely on the canvas — use color picker to change color')
                break

            case TOOL.ARROW: {
                canvas.selection = false
                canvas.defaultCursor = 'crosshair'
                let startPoint = null

                const handleMouseDown = async (opt) => {
                    const pointer = canvas.getPointer(opt.e)
                    if (!startPoint) {
                        startPoint = pointer
                        setStatusText('Click to set arrow end point')
                    } else {
                        const fabric = await import('fabric')
                        // Create line
                        const line = new fabric.Line(
                            [startPoint.x, startPoint.y, pointer.x, pointer.y],
                            {
                                stroke: drawColor,
                                strokeWidth: drawWidth,
                                selectable: true,
                                evented: true
                            }
                        )

                        // Create arrowhead
                        const angle = Math.atan2(pointer.y - startPoint.y, pointer.x - startPoint.x)
                        const headLen = 15
                        const arrowHead = new fabric.Polygon([
                            { x: 0, y: 0 },
                            { x: -headLen, y: headLen / 2.5 },
                            { x: -headLen, y: -headLen / 2.5 }
                        ], {
                            left: pointer.x,
                            top: pointer.y,
                            fill: drawColor,
                            angle: (angle * 180) / Math.PI,
                            originX: 'center',
                            originY: 'center',
                            selectable: true,
                            evented: true
                        })

                        // Group them
                        const group = new fabric.Group([line, arrowHead], {
                            selectable: true,
                            evented: true
                        })

                        canvas.add(group)
                        canvas.renderAll()
                        startPoint = null
                        setStatusText('Click to set arrow start point')
                    }
                }

                canvas.on('mouse:down', handleMouseDown)
                setStatusText('Click to set arrow start point')
                break
            }

            case TOOL.TEXT: {
                canvas.selection = false
                canvas.defaultCursor = 'text'

                const handleTextClick = async (opt) => {
                    const pointer = canvas.getPointer(opt.e)
                    const labelText = prompt('Enter label text:', 'Label')
                    if (!labelText) return

                    const fabric = await import('fabric')

                    // Create text with background
                    const text = new fabric.IText(labelText, {
                        left: pointer.x,
                        top: pointer.y,
                        fontSize: 16,
                        fontFamily: 'Arial',
                        fill: '#1e293b',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(255, 255, 255, 0.85)',
                        padding: 6,
                        borderColor: '#3b82f6',
                        cornerColor: '#3b82f6',
                        cornerSize: 8,
                        transparentCorners: false,
                        editable: true
                    })

                    canvas.add(text)
                    canvas.setActiveObject(text)
                    canvas.renderAll()
                }

                canvas.on('mouse:down', handleTextClick)
                setStatusText('Click anywhere to place a text label')
                break
            }

            case TOOL.ICON: {
                canvas.selection = false
                canvas.defaultCursor = 'copy'

                if (selectedIcon) {
                    const handleIconPlace = async (opt) => {
                        const pointer = canvas.getPointer(opt.e)
                        const fabric = await import('fabric')

                        const imgEl = new Image()
                        imgEl.src = selectedIcon.svg
                        imgEl.onload = () => {
                            const img = new fabric.Image(imgEl, {
                                left: pointer.x - 32,
                                top: pointer.y - 32,
                                scaleX: 1,
                                scaleY: 1,
                                hasRotatingPoint: true,
                                cornerSize: 10,
                                transparentCorners: false,
                                borderColor: '#3b82f6',
                                cornerColor: '#3b82f6'
                            })

                            // Add label below icon
                            const label = new fabric.Text(selectedIcon.name, {
                                left: pointer.x,
                                top: pointer.y + 36,
                                fontSize: 11,
                                fontFamily: 'Arial',
                                fill: '#475569',
                                textAlign: 'center',
                                originX: 'center',
                                backgroundColor: 'rgba(255,255,255,0.8)',
                                padding: 2
                            })

                            const group = new fabric.Group([img, label], {
                                left: pointer.x - 32,
                                top: pointer.y - 32,
                                hasRotatingPoint: true,
                                cornerSize: 10,
                                transparentCorners: false,
                                borderColor: '#3b82f6',
                                cornerColor: '#3b82f6'
                            })

                            canvas.add(group)
                            canvas.renderAll()
                        }
                    }

                    canvas.on('mouse:down', handleIconPlace)
                    setStatusText(`Click to place: ${selectedIcon.name}`)
                }
                break
            }

            default:
                break
        }
    }, [activeTool, drawColor, drawWidth, selectedIcon])

    // Update brush when color/width change during draw mode
    useEffect(() => {
        const canvas = fabricRef.current
        if (!canvas || activeTool !== TOOL.DRAW) return
        canvas.freeDrawingBrush.color = drawColor
        canvas.freeDrawingBrush.width = drawWidth
    }, [drawColor, drawWidth, activeTool])

    // Handle background image upload
    const handleBackgroundUpload = useCallback(async (file) => {
        if (!file || !fabricRef.current) return
        const canvas = fabricRef.current

        const reader = new FileReader()
        reader.onload = async (e) => {
            const fabric = await import('fabric')
            const imgEl = new Image()
            imgEl.src = e.target.result
            imgEl.onload = () => {
                const fImg = new fabric.Image(imgEl)

                // Scale to fit canvas
                const scaleX = canvas.width / fImg.width
                const scaleY = canvas.height / fImg.height
                const scale = Math.min(scaleX, scaleY)

                canvas.setBackgroundImage(fImg, canvas.renderAll.bind(canvas), {
                    scaleX: scale,
                    scaleY: scale,
                    originX: 'left',
                    originY: 'top'
                })

                setHasBackground(true)
                setStatusText('Floor plan loaded — use tools to annotate')
                saveHistory()
            }
        }
        reader.readAsDataURL(file)
    }, [saveHistory])

    // Drag and drop
    const handleDrop = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        const files = e.dataTransfer?.files
        if (files?.[0]) {
            const file = files[0]
            if (file.type.startsWith('image/')) {
                handleBackgroundUpload(file)
            }
        }
    }, [handleBackgroundUpload])

    const handleDragOver = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
    }, [])

    // Delete selected objects
    const handleDelete = useCallback(() => {
        const canvas = fabricRef.current
        if (!canvas) return
        const selected = canvas.getActiveObjects()
        selected.forEach(obj => canvas.remove(obj))
        canvas.discardActiveObject()
        canvas.renderAll()
        saveHistory()
    }, [saveHistory])

    // Clear all objects (keep background)
    const handleClear = useCallback(() => {
        const canvas = fabricRef.current
        if (!canvas) return
        if (!confirm('Clear all annotations? The background image will be kept.')) return
        const bg = canvas.backgroundImage
        canvas.clear()
        if (bg) {
            canvas.setBackgroundImage(bg, canvas.renderAll.bind(canvas))
        }
        canvas.backgroundColor = '#f8fafc'
        canvas.renderAll()
        saveHistory()
    }, [saveHistory])

    // Save: flatten → upload → store in DB
    const handleSave = useCallback(async () => {
        const canvas = fabricRef.current
        if (!canvas) return

        setSaving(true)
        const toastId = toast.loading('Saving site plan...')

        try {
            // 1. Flatten canvas to image
            const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 })

            // Convert data URL to blob
            const res = await fetch(dataUrl)
            const blob = await res.blob()

            // 2. Upload flattened image to storage
            const flatFilename = `${quotationId}/flattened-${Date.now()}.png`
            const { error: uploadError } = await supabase.storage
                .from('site-plans')
                .upload(flatFilename, blob, { contentType: 'image/png', upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl: flattenedUrl } } = supabase.storage
                .from('site-plans')
                .getPublicUrl(flatFilename)

            // 3. Save canvas JSON for re-editing
            const canvasJson = canvas.toJSON()

            // 4. Upload or get background URL
            let backgroundUrl = existingPlan?.background_url || null

            // 5. Upsert to database
            if (existingPlan?.id) {
                const { error } = await supabase
                    .from('site_plans')
                    .update({
                        canvas_json: canvasJson,
                        flattened_url: flattenedUrl,
                        background_url: backgroundUrl,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingPlan.id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('site_plans')
                    .insert([{
                        quotation_id: quotationId,
                        canvas_json: canvasJson,
                        flattened_url: flattenedUrl,
                        background_url: backgroundUrl
                    }])

                if (error) throw error
            }

            toast.success('Site plan saved!', { id: toastId })
            onSave?.(flattenedUrl)
        } catch (error) {
            console.error('Error saving site plan:', error)
            toast.error(`Failed to save: ${error.message}`, { id: toastId })
        } finally {
            setSaving(false)
        }
    }, [quotationId, existingPlan, onSave])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Don't delete if editing text
                const active = fabricRef.current?.getActiveObject()
                if (active?.isEditing) return
                handleDelete()
            }
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault()
                handleUndo()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleDelete, handleUndo])

    const selectIcon = (icon) => {
        setSelectedIcon(icon)
        setActiveTool(TOOL.ICON)
    }

    const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff']

    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1">
                    {/* Tool buttons */}
                    <ToolButton
                        active={activeTool === TOOL.SELECT}
                        onClick={() => { setActiveTool(TOOL.SELECT); setSelectedIcon(null) }}
                        icon={<MousePointer2 className="h-4 w-4" />}
                        label="Select"
                    />
                    <ToolButton
                        active={activeTool === TOOL.DRAW}
                        onClick={() => { setActiveTool(TOOL.DRAW); setSelectedIcon(null) }}
                        icon={<Pencil className="h-4 w-4" />}
                        label="Draw"
                    />
                    <ToolButton
                        active={activeTool === TOOL.ARROW}
                        onClick={() => { setActiveTool(TOOL.ARROW); setSelectedIcon(null) }}
                        icon={<ArrowUpRight className="h-4 w-4" />}
                        label="Arrow"
                    />
                    <ToolButton
                        active={activeTool === TOOL.TEXT}
                        onClick={() => { setActiveTool(TOOL.TEXT); setSelectedIcon(null) }}
                        icon={<Type className="h-4 w-4" />}
                        label="Text"
                    />

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />

                    {/* Color picker */}
                    <div className="flex items-center gap-1">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setDrawColor(c)}
                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${drawColor === c ? 'border-slate-900 dark:border-white scale-110' : 'border-slate-300 dark:border-slate-600'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />

                    {/* Stroke width */}
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Width</Label>
                        <Input
                            type="range"
                            min="1"
                            max="10"
                            value={drawWidth}
                            onChange={(e) => setDrawWidth(parseInt(e.target.value))}
                            className="w-20 h-6"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleUndo} title="Undo (Ctrl+Z)">
                        <Undo2 className="h-4 w-4 mr-1" /> Undo
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDelete} title="Delete selected">
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClear}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Clear
                    </Button>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />

                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        Save Plan
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Icon Sidebar */}
                <div className="w-48 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-3 space-y-2">
                    <div className="mb-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Security Icons</h3>
                        <p className="text-[10px] text-muted-foreground">Click an icon, then click the canvas to place it</p>
                    </div>

                    {SECURITY_ICONS.map(icon => (
                        <button
                            key={icon.id}
                            onClick={() => selectIcon(icon)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-sm ${selectedIcon?.id === icon.id
                                ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 text-blue-700 dark:text-blue-300'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                        >
                            <img src={icon.svg} alt={icon.name} className="w-10 h-10" />
                            <span className="text-xs font-medium">{icon.name}</span>
                        </button>
                    ))}

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Background</h3>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Plan
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleBackgroundUpload(e.target.files[0])
                            }}
                        />
                    </div>
                </div>

                {/* Canvas Area */}
                <div
                    className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950 overflow-auto p-4"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                        <canvas ref={canvasRef} />
                        {!hasBackground && canvasReady && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl p-8 text-center">
                                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                        Drop Floor Plan Here
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Drag and drop a JPG/PNG image, or use the Upload button
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                        {activeTool.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{statusText}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                    Ctrl+Z: Undo | Delete: Remove selected | Drag corners: Resize | Drag circle: Rotate
                </span>
            </div>
        </div>
    )
}

// Toolbar button component
function ToolButton({ active, onClick, icon, label }) {
    return (
        <Button
            variant={active ? 'default' : 'ghost'}
            size="sm"
            onClick={onClick}
            className={`${active ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
            title={label}
        >
            {icon}
            <span className="ml-1 text-xs hidden sm:inline">{label}</span>
        </Button>
    )
}
