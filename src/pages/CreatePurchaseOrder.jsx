import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useCurrency } from '@/lib/use-currency'
// PDF parser imported dynamically to prevent worker initialization issues

export default function CreatePurchaseOrder() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const editId = searchParams.get('id')
    const { formatCurrency } = useCurrency()

    const [file, setFile] = useState(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [extractedText, setExtractedText] = useState('')

    const [suppliers, setSuppliers] = useState([])
    const [selectedSupplierId, setSelectedSupplierId] = useState('')
    const [newSupplierName, setNewSupplierName] = useState('') // Quick add
    const [isNewSupplier, setIsNewSupplier] = useState(false)

    const [poDetails, setPoDetails] = useState({
        supplier_id: '',
        expected_date: '',
        notes: '',
        reference: '', // Default empty
        extracted_text_snippet: ''
    })
    // Default to true as per user request ("add a tax toggle", usually means handling tax explicitly)
    // But user earlier text said "Prices excluded 15% VAT", implying we add VAT on top.
    const [vatApplicable, setVatApplicable] = useState(true)

    const [lines, setLines] = useState([
        { id: 1, description: '', quantity: 1, unit_price: 0, line_total: 0 }
    ])

    const fetchSuppliers = useCallback(async () => {
        const { data, error } = await supabase.from('suppliers').select('*').order('name')
        if (error) console.error('Error fetching suppliers:', error)
        else setSuppliers(data || [])
    }, [])

    const loadPurchaseOrder = useCallback(async (id) => {
        const toastId = toast.loading('Loading Purchase Order...')
        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                    *,
                    lines:purchase_order_lines(*)
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            setSelectedSupplierId(data.supplier_id)
            setPoDetails({
                expected_date: data.expected_date ? data.expected_date.split('T')[0] : '', // Format for date input
                notes: data.metadata?.notes || '',
                reference: data.metadata?.reference || '', // Load reference
                extracted_text_snippet: data.metadata?.extracted_text_snippet || ''
            })
            setVatApplicable(data.metadata?.vat_applicable ?? true) // Default true if not set

            if (data.lines && data.lines.length > 0) {
                setLines(data.lines.map(l => ({
                    ...l,
                    id: l.id, // Keep original ID for stability purely in UI, though we might wipe/recreate or update
                    // Simpler strategy: just map to UI state. 
                })))
            }

            if (data.metadata?.extracted_text_snippet) {
                setExtractedText(data.metadata.extracted_text_snippet)
            }

            toast.dismiss(toastId)
        } catch (error) {
            console.error('Error loading PO:', error)
            toast.error('Failed to load Purchase Order', { id: toastId })
            navigate('/sales')
        }
    }, [navigate])

    useEffect(() => {
        fetchSuppliers()
        if (editId) {
            loadPurchaseOrder(editId)
        }
    }, [editId, loadPurchaseOrder, fetchSuppliers])

    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0]
        if (!uploadedFile) return

        setFile(uploadedFile)
        setIsProcessing(true)
        try {
            // Dynamic import to avoid initialization issues with pdfjs-dist
            const { extractItemsFromPDF, parseTextToItems } = await import('@/lib/pdf-parser')

            const { text } = await extractItemsFromPDF(uploadedFile)
            setExtractedText(text)

            // Try to auto-parse items
            const parsedItems = parseTextToItems(text)

            if (parsedItems.length > 0) {
                const newLines = parsedItems.map((item, index) => ({
                    id: Date.now() + index,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    line_total: item.quantity * item.unit_price
                }))
                setLines(newLines)
                toast.success(`PDF Processed. Auto-filled ${newLines.length} items from quote!`)
            } else {
                toast.success('PDF Processed. Could not auto-detect items, please enter manually.', { duration: 5000 })
            }
        } catch (error) {
            console.error('PDF parsing error:', error)
            toast.error('Failed to parse PDF. Please verify it is a text-based PDF.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCreateSupplier = async () => {
        if (!newSupplierName) return
        const toastId = toast.loading('Adding supplier...')
        const { data, error } = await supabase
            .from('suppliers')
            .insert([{ name: newSupplierName }])
            .select()

        if (error) {
            toast.error('Failed to add supplier', { id: toastId })
        } else {
            setSuppliers([...suppliers, data[0]])
            setSelectedSupplierId(data[0].id)
            setNewSupplierName('')
            toast.success('Supplier added', { id: toastId })
        }
    }

    const updateLine = (id, field, value) => {
        setLines(prev => prev.map(line => {
            if (line.id === id) {
                const newLine = { ...line, [field]: value }
                if (field === 'quantity' || field === 'unit_price') {
                    newLine.line_total = Number(newLine.quantity) * Number(newLine.unit_price)
                }
                return newLine
            }
            return line
        }))
    }

    const addLine = () => {
        setLines([...lines, { id: Date.now(), description: '', quantity: 1, unit_price: 0, line_total: 0 }])
    }

    const removeLine = (id) => {
        setLines(lines.filter(l => l.id !== id))
    }

    const calculateSubTotal = () => {
        return lines.reduce((sum, line) => sum + line.line_total, 0)
    }

    const calculateTotal = () => {
        const subTotal = calculateSubTotal()
        if (vatApplicable) {
            return subTotal * 1.15
        }
        return subTotal
    }

    const handleSubmit = async () => {
        if (!selectedSupplierId) {
            toast.error('Please select a supplier')
            return
        }

        const toastId = toast.loading(editId ? 'Updating Purchase Order...' : 'Creating Purchase Order...')

        try {
            // 1. Upload PDF if exists (only on create or if new file)
            // For simplicity, we skip re-uploading on edit unless user selects new file.
            // If file is null, keep existing URL if editing.

            // let pdfUrl = null
            // ... (Skipping upload logic as per previous implementation plan for now, reusing existing or null)
            // If editing, we should probably fetch existing URL?
            // Ideally we'd keep it. Since we don't have it in state here easily for re-save without fetching again
            // let's assume if it's an update, we only update metadata unless we implement file replacement.
            // But 'upserting' matches insert structure.

            // To properly handle PDF URL preservation during update, we should have stored it in state during load.
            // Ignoring for now to focus on data update.

            const poPayload = {
                supplier_id: selectedSupplierId,
                status: 'Draft', // Reset to Draft on edit? Or keep? Usually Draft if changing.
                expected_date: poDetails.expected_date || null,
                total_amount: calculateTotal(),
                updated_at: new Date().toISOString(),
                metadata: {
                    notes: poDetails.notes,
                    reference: poDetails.reference, // Custom Reference
                    extracted_text_snippet: extractedText ? extractedText.substring(0, 100) : (poDetails.extracted_text_snippet || ''), // Preserve if not new
                    vat_applicable: vatApplicable
                }
            }

            if (file) {
                // Upload logic placeholder
                // poPayload.pdf_url = ...
            }

            let poId = editId

            if (editId) {
                // Update
                const { error: updateError } = await supabase
                    .from('purchase_orders')
                    .update(poPayload)
                    .eq('id', editId)
                if (updateError) throw updateError

                // Lines: Delete all and re-insert is easiest for this scale
                await supabase.from('purchase_order_lines').delete().eq('purchase_order_id', editId)

            } else {
                // Insert
                const { data: poData, error: insertError } = await supabase
                    .from('purchase_orders')
                    .insert([poPayload])
                    .select()
                if (insertError) throw insertError
                poId = poData[0].id
            }

            // 3. Create Lines (Re-insert)
            const poLines = lines.map(line => ({
                purchase_order_id: poId,
                description: line.description,
                quantity: line.quantity,
                unit_price: line.unit_price,
                line_total: line.line_total
            }))

            const { error: linesError } = await supabase.from('purchase_order_lines').insert(poLines)
            if (linesError) throw linesError

            toast.success(editId ? 'Purchase Order Updated!' : 'Purchase Order Created!', { id: toastId })
            navigate('/sales')
        } catch (error) {
            console.error('Error saving PO:', error)
            toast.error('Failed to save purchase order', { id: toastId })
        }
    }

    return (
        <div className="container mx-auto py-6 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{editId ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
                <Button variant="outline" onClick={() => navigate('/sales')}>Cancel</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Upload & PDF Preview */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Source Document</CardTitle>
                            <CardDescription>Upload Supplier Quote (PDF)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition-colors relative">
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileUpload}
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {file ? file.name : "Click to upload PDF"}
                                    </span>
                                </div>
                            </div>
                            {isProcessing && (
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing PDF...
                                </div>
                            )}
                            {extractedText && (
                                <div className="bg-muted p-4 rounded-lg text-xs font-mono h-64 overflow-y-auto whitespace-pre-wrap">
                                    {extractedText}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: PO Details Form */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Select Supplier</Label>
                                    <Select onValueChange={(val) => {
                                        if (val === 'new') {
                                            setIsNewSupplier(true)
                                            setSelectedSupplierId(null)
                                        } else {
                                            setIsNewSupplier(false)
                                            setSelectedSupplierId(val)
                                        }
                                    }} value={selectedSupplierId || ''}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">+ Add New Supplier</SelectItem>
                                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>

                                    {isNewSupplier && (
                                        <div className="flex gap-2 mt-2">
                                            <Input
                                                placeholder="Or add new supplier..."
                                                value={newSupplierName}
                                                onChange={(e) => setNewSupplierName(e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                            <Button size="sm" variant="secondary" onClick={handleCreateSupplier} disabled={!newSupplierName}>
                                                Add
                                            </Button>
                                        </div>
                                    )}
                                </div> {/* End of Supplier div */}

                                <div className="space-y-2">
                                    <Label>Reference</Label>
                                    <Input
                                        placeholder="e.g. Job 1234 or Invoice Payment"
                                        value={poDetails.reference || ''}
                                        onChange={(e) => setPoDetails({ ...poDetails, reference: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Expected Delivery</Label>
                                    <Input
                                        type="date"
                                        value={poDetails.expected_date}
                                        onChange={(e) => setPoDetails({ ...poDetails, expected_date: e.target.value })}
                                    />
                                </div>
                            </div> {/* End grid */}


                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    placeholder="Internal notes..."
                                    value={poDetails.notes}
                                    onChange={(e) => setPoDetails({ ...poDetails, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center space-x-2 border p-3 rounded-md">
                                <Switch id="vat-mode" checked={vatApplicable} onCheckedChange={setVatApplicable} />
                                <Label htmlFor="vat-mode">Prices Exclude VAT (Add 15% on Total)</Label>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Line Items</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Description</TableHead>
                                        <TableHead className="w-[15%]">Qty</TableHead>
                                        <TableHead className="w-[20%]">Unit Price</TableHead>
                                        <TableHead className="w-[20%]">Total</TableHead>
                                        <TableHead className="w-[5%]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines.map((line) => (
                                        <TableRow key={line.id}>
                                            <TableCell>
                                                <Input
                                                    value={line.description}
                                                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                                                    placeholder="Item name"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={line.unit_price}
                                                    onChange={(e) => updateLine(line.id, 'unit_price', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium px-2">
                                                    {formatCurrency(line.line_total)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="flex justify-between items-center pt-4">
                                <Button variant="outline" onClick={addLine}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Line
                                </Button>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span>{formatCurrency(calculateSubTotal())}</span>
                                    </div>
                                    {vatApplicable && (
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-muted-foreground">VAT (15%):</span>
                                            <span>{formatCurrency(calculateSubTotal() * 0.15)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-muted-foreground font-semibold">Total:</span>
                                        <span className="text-2xl font-bold">{formatCurrency(calculateTotal())}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button variant="outline" size="lg" onClick={() => navigate('/sales')}>Cancel</Button>
                        <Button size="lg" onClick={handleSubmit}>{editId ? 'Update Purchase Order' : 'Create Purchase Order'}</Button>
                    </div>
                </div>
            </div >
        </div >
    )
}
