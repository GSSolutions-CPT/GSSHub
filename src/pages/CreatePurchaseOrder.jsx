import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Trash2, Upload, FileText, Calendar, Building2, ChevronLeft, CreditCard, Receipt, FileSearch } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useCurrency } from '@/lib/use-currency'
import { format } from 'date-fns'
import { Separator } from '@/components/ui/separator'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export default function CreatePurchaseOrder() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const editId = searchParams.get('id')
    const { formatCurrency } = useCurrency()

    const [file, setFile] = useState(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [extractedText, setExtractedText] = useState('')

    const [suppliers, setSuppliers] = useState([])
    const [supplierOpen, setSupplierOpen] = useState(false)
    const [selectedSupplierId, setSelectedSupplierId] = useState('')
    const [newSupplierName, setNewSupplierName] = useState('')

    const [poDetails, setPoDetails] = useState({
        expected_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        reference: '',
        extracted_text_snippet: ''
    })
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
                .select(`*, lines:purchase_order_lines(*)`)
                .eq('id', id)
                .single()

            if (error) throw error

            setSelectedSupplierId(data.supplier_id)
            setPoDetails({
                expected_date: data.expected_date ? data.expected_date.split('T')[0] : '',
                notes: data.metadata?.notes || '',
                reference: data.metadata?.reference || '',
                extracted_text_snippet: data.metadata?.extracted_text_snippet || ''
            })
            setVatApplicable(data.metadata?.vat_applicable ?? true)

            if (data.lines && data.lines.length > 0) {
                setLines(data.lines.map(l => ({ ...l, id: l.id })))
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
        if (editId) loadPurchaseOrder(editId)
    }, [editId, loadPurchaseOrder, fetchSuppliers])

    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0]
        if (!uploadedFile) return

        setFile(uploadedFile)
        setIsProcessing(true)
        try {
            const { extractItemsFromPDF, parseTextToItems } = await import('@/lib/pdf-parser')
            const { text } = await extractItemsFromPDF(uploadedFile)
            setExtractedText(text)
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
                toast.success(`PDF Processed. Auto-filled ${newLines.length} items!`)
            } else {
                toast.success('PDF Processed. Could not auto-detect items, please enter manually.')
            }
        } catch (error) {
            console.error('PDF parsing error:', error)
            toast.error('Failed to parse PDF.')
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
                    newLine.line_total = Number(newLine.quantity) * Number(newLine.unit_price) // Simple calc, no robust rounding here yet
                }
                return newLine
            }
            return line
        }))
    }

    const removeLineItem = (index) => {
        if (lines.length > 1) {
            setLines(lines.filter((_, i) => i !== index))
        } else {
            setLines([{ id: Date.now(), description: '', quantity: 1, unit_price: 0, line_total: 0 }])
        }
    }

    const addLine = () => {
        setLines([...lines, { id: Date.now(), description: '', quantity: 1, unit_price: 0, line_total: 0 }])
    }

    const calculateSubTotal = () => lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0)
    const calculateTotal = () => {
        const sub = calculateSubTotal()
        return vatApplicable ? sub * 1.15 : sub
    }

    const handleSubmit = async () => {
        if (!selectedSupplierId) {
            toast.error('Please select a supplier')
            return
        }

        const toastId = toast.loading(editId ? 'Updating Order...' : 'Creating Order...')

        try {
            const poPayload = {
                supplier_id: selectedSupplierId,
                status: 'Draft',
                expected_date: poDetails.expected_date || null,
                total_amount: calculateTotal(),
                updated_at: new Date().toISOString(),
                metadata: {
                    notes: poDetails.notes,
                    reference: poDetails.reference,
                    extracted_text_snippet: extractedText ? extractedText.substring(0, 100) : (poDetails.extracted_text_snippet || ''),
                    vat_applicable: vatApplicable
                }
            }

            let poId = editId

            if (editId) {
                await supabase.from('purchase_orders').update(poPayload).eq('id', editId)
                await supabase.from('purchase_order_lines').delete().eq('purchase_order_id', editId)
            } else {
                const { data } = await supabase.from('purchase_orders').insert([poPayload]).select()
                poId = data[0].id
            }

            const poLines = lines.map(line => ({
                purchase_order_id: poId,
                description: line.description,
                quantity: line.quantity,
                unit_price: line.unit_price,
                line_total: line.quantity * line.unit_price
            }))

            await supabase.from('purchase_order_lines').insert(poLines)

            toast.success(editId ? 'Order Updated!' : 'Order Created!', { id: toastId })
            navigate('/sales')
        } catch (error) {
            console.error('Error saving PO:', error)
            toast.error('Failed to save order', { id: toastId })
        }
    }

    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId)

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 p-6 pb-20">
            {/* Header */}
            <div className="max-w-[1600px] mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/sales')} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {editId ? 'Edit Purchase Order' : 'New Purchase Order'}
                            <span className="text-sm font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                Draft
                            </span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Create official orders for your suppliers.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/sales')}>
                        Discard
                    </Button>
                    <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                        <FileText className="mr-2 h-4 w-4" />
                        {editId ? 'Save Changes' : 'Create Order'}
                    </Button>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN: Inputs */}
                <div className="space-y-6 animate-in slide-in-from-left-4 duration-500 delay-100">

                    {/* Source Document Card */}
                    <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-black/20 overflow-hidden group">
                        <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                    <FileSearch className="h-4 w-4" />
                                </div>
                                Source Document
                            </CardTitle>
                            <CardDescription>Upload a supplier quote to auto-fill items</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 group-hover:shadow-inner">
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleFileUpload}
                                />
                                <div className="flex flex-col items-center justify-center gap-3 text-center">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                                        {isProcessing ? (
                                            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                                        ) : (
                                            <Upload className="h-6 w-6 text-blue-600" />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {file ? file.name : "Drop PDF or Click to Upload"}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {isProcessing ? "Analyzing text..." : "Supports text-based PDFs"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Details */}
                    <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-slate-400" />
                                Supplier & Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label>Supplier</Label>
                                    <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={supplierOpen}
                                                className="justify-between bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
                                            >
                                                {selectedSupplierId
                                                    ? suppliers.find((s) => s.id === selectedSupplierId)?.name
                                                    : "Select supplier..."}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="p-0 w-[300px]" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search supplier..." />
                                                <CommandList>
                                                    <CommandEmpty>
                                                        <div className="p-2">
                                                            <div className="text-sm text-muted-foreground mb-2">No supplier found.</div>
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    placeholder="New Supplier Name"
                                                                    value={newSupplierName}
                                                                    onChange={(e) => setNewSupplierName(e.target.value)}
                                                                    className="h-8 text-xs"
                                                                />
                                                                <Button size="sm" onClick={handleCreateSupplier} disabled={!newSupplierName} className="h-8 text-xs">
                                                                    Add
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {suppliers.map((supplier) => (
                                                            <CommandItem
                                                                key={supplier.id}
                                                                value={supplier.name}
                                                                onSelect={() => {
                                                                    setSelectedSupplierId(supplier.id)
                                                                    setSupplierOpen(false)
                                                                }}
                                                            >
                                                                {supplier.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Expected Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            className="pl-9 bg-slate-50/50 dark:bg-slate-900/50"
                                            value={poDetails.expected_date}
                                            onChange={(e) => setPoDetails({ ...poDetails, expected_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Order Reference</Label>
                                <Input
                                    placeholder="#PO-2024-001 or Job Ref"
                                    value={poDetails.reference}
                                    onChange={(e) => setPoDetails({ ...poDetails, reference: e.target.value })}
                                    className="bg-slate-50/50 dark:bg-slate-900/50 font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Internal Notes</Label>
                                <Textarea
                                    placeholder="Delivery instructions, payment terms, etc..."
                                    className="bg-slate-50/50 dark:bg-slate-900/50 resize-none"
                                    rows={3}
                                    value={poDetails.notes}
                                    onChange={(e) => setPoDetails({ ...poDetails, notes: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Line Items */}
                    <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-slate-400" />
                                Line Items
                            </CardTitle>
                            <Button size="sm" variant="ghost" onClick={addLine} className="text-blue-600 hover:bg-blue-50">
                                <Plus className="h-4 w-4 mr-1" /> Add Item
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {lines.map((line, index) => (
                                <div key={line.id} className="group relative grid grid-cols-12 gap-3 items-start p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                    <div className="col-span-6 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Description</Label>
                                        <Input
                                            value={line.description}
                                            onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                                            placeholder="Item details"
                                            className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 placeholder:text-muted-foreground/50"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Qty</Label>
                                        <Input
                                            type="number"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                                            className="h-8 bg-white dark:bg-slate-900 border-slate-200"
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <Label className="text-xs text-muted-foreground">Unit Cost</Label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">R</span>
                                            <Input
                                                type="number"
                                                value={line.unit_price}
                                                onChange={(e) => updateLine(line.id, 'unit_price', e.target.value)}
                                                className="h-8 pl-5 bg-white dark:bg-slate-900 border-slate-200 text-right"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1 flex justify-end pt-6">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeLineItem(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Preview */}
                <div className="space-y-6 lg:sticky lg:top-8 h-fit animate-in slide-in-from-right-4 duration-500 delay-200">
                    <Card className="border-0 shadow-2xl shadow-blue-900/5 dark:shadow-black/40 overflow-hidden bg-white dark:bg-slate-950">
                        {/* Preview Header */}
                        <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3" />
                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-wider uppercase opacity-90">Purchase Order</h2>
                                    <p className="text-blue-200 text-sm mt-1">{poDetails.reference || 'Draft Order'}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-blue-300 uppercase tracking-wider mb-1">Total Amount</div>
                                    <div className="text-3xl font-bold">{formatCurrency(calculateTotal())}</div>
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-0">
                            {/* Vendor Info Section */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Vendor</div>
                                        <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                                            {selectedSupplier ? selectedSupplier.name : <span className="text-muted-foreground italic">Select a supplier...</span>}
                                        </div>
                                        {selectedSupplier && (
                                            <div className="text-sm text-muted-foreground">
                                                Supplier ID: {selectedSupplier.id.substring(0, 8)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Expected</div>
                                        <div className="font-medium">
                                            {poDetails.expected_date ? format(new Date(poDetails.expected_date), 'dd MMM yyyy') : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items List Preview */}
                            <div className="p-6 min-h-[300px]">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800">
                                            <th className="text-left font-medium text-muted-foreground py-2 w-[50%]">Item</th>
                                            <th className="text-center font-medium text-muted-foreground py-2 w-[15%]">Qty</th>
                                            <th className="text-right font-medium text-muted-foreground py-2 w-[35%]">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {lines.map((line, i) => (
                                            <tr key={i} className="group">
                                                <td className="py-3 text-slate-700 dark:text-slate-300">
                                                    {line.description || <span className="text-muted-foreground italic">Item description...</span>}
                                                </td>
                                                <td className="py-3 text-center text-slate-600 dark:text-slate-400">{line.quantity}</td>
                                                <td className="py-3 text-right font-medium text-slate-900 dark:text-slate-200">
                                                    {formatCurrency(line.quantity * line.unit_price)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals Section */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium text-slate-900 dark:text-slate-200">{formatCurrency(calculateSubTotal())}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        VAT (15%)
                                        <Switch
                                            checked={vatApplicable}
                                            onCheckedChange={setVatApplicable}
                                            className="scale-75 data-[state=checked]:bg-blue-600"
                                        />
                                    </span>
                                    <span className={`font-medium ${!vatApplicable && 'text-muted-foreground decoration-slate-400 decoration-1 line-through opacity-50'}`}>
                                        {formatCurrency(calculateSubTotal() * 0.15)}
                                    </span>
                                </div>
                                <Separator className="bg-slate-200 dark:bg-slate-700" />
                                <div className="flex justify-between items-end pt-2">
                                    <span className="font-bold text-lg text-slate-900 dark:text-white">Total Due</span>
                                    <div className="text-right">
                                        <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {formatCurrency(calculateTotal())}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Tips */}
                    <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                        <CardContent className="p-4 flex items-start gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
                                <CreditCard className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-200">Payment Terms</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                    Ensure suppliers include your Order Reference ({poDetails.reference || '...'}) on their invoices.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
