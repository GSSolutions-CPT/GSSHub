import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileSpreadsheet, Clipboard, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function ImportProductsDialog({ onImportSuccess }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [mode, setMode] = useState('csv') // 'csv' or 'paste'
    const [pasteData, setPasteData] = useState('')
    const [parsedData, setParsedData] = useState([])
    const [headers, setHeaders] = useState([])
    const [mapping, setMapping] = useState({
        name: '',
        code: '',
        category: '',
        retail_price: '',
        cost_price: '',
        description: ''
    })
    const [step, setStep] = useState(1) // 1: Input, 2: Mapping, 3: Preview

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    processParsedData(results.data, results.meta.fields)
                },
                error: (error) => {
                    toast.error(`Error parsing CSV: ${error.message}`)
                }
            })
        }
    }

    const handlePasteParse = () => {
        if (!pasteData.trim()) {
            toast.error('Please paste some data first')
            return
        }

        // Try to detect delimiter (Tab for excel/pdf copy, or Comma)
        const firstLine = pasteData.trim().split('\n')[0]
        const delimiter = firstLine.includes('\t') ? '\t' : ','

        Papa.parse(pasteData.trim(), {
            delimiter: delimiter,
            header: true, // Assume first row is header for now, or we can add a toggle
            skipEmptyLines: true,
            complete: (results) => {
                // If header seems wrong (e.g. fields are empty or indices), we might need generic headers
                // For now assume user copies with headers or we map by index later (simplified)
                processParsedData(results.data, results.meta.fields || Object.keys(results.data[0]))
            }
        })
    }

    const processParsedData = (data, fields) => {
        if (!data || data.length === 0) {
            toast.error('No data found')
            return
        }
        setParsedData(data)
        setHeaders(fields || [])

        // Auto-map if headers match loosely
        const lowerFields = fields.map(f => f.toLowerCase())
        const newMapping = { ...mapping }

        if (lowerFields.includes('name') || lowerFields.includes('product name')) newMapping.name = fields.find(f => f.toLowerCase().includes('name'))
        if (lowerFields.includes('code') || lowerFields.includes('sku')) newMapping.code = fields.find(f => f.toLowerCase().includes('code') || f.toLowerCase().includes('sku'))
        if (lowerFields.includes('retail') || lowerFields.includes('price')) newMapping.retail_price = fields.find(f => f.toLowerCase().includes('retail') || f.toLowerCase().includes('price'))
        if (lowerFields.includes('cost')) newMapping.cost_price = fields.find(f => f.toLowerCase().includes('cost'))
        if (lowerFields.includes('category')) newMapping.category = fields.find(f => f.toLowerCase().includes('category'))

        setMapping(newMapping)
        setStep(2)
    }

    const handleImport = async () => {
        if (!mapping.name || !mapping.retail_price) {
            toast.error('Please map at least Name and Retail Price')
            return
        }

        setIsLoading(true)
        const toastId = toast.loading('Importing products...')

        try {
            const productsToInsert = parsedData.map(row => ({
                name: row[mapping.name],
                code: mapping.code ? row[mapping.code] : null,
                category: mapping.category ? row[mapping.category] : null,
                retail_price: parseFloat(row[mapping.retail_price]?.replace(/[^0-9.-]+/g, '')) || 0,
                cost_price: mapping.cost_price ? (parseFloat(row[mapping.cost_price]?.replace(/[^0-9.-]+/g, '')) || 0) : 0,
                description: mapping.description ? row[mapping.description] : null
            })).filter(p => p.name) // Filter out empty names

            const { error } = await supabase
                .from('products')
                .insert(productsToInsert)

            if (error) throw error

            await supabase.from('activity_log').insert([{
                type: 'Bulk Import',
                description: `Imported ${productsToInsert.length} products`,
                related_entity_type: 'product'
            }])

            toast.success(`Successfully imported ${productsToInsert.length} products`, { id: toastId })
            if (onImportSuccess) onImportSuccess()
            setIsOpen(false)
            // Reset state
            setStep(1)
            setPasteData('')
            setParsedData([])
        } catch (error) {
            console.error('Import error:', error)
            toast.error(`Import failed: ${error.message}`, { id: toastId })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Import Products
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Import Products</DialogTitle>
                    <DialogDescription>
                        Import products via CSV file or Copy-Paste from Excel/PDF
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <Tabs value={mode} onValueChange={setMode}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="csv">Upload CSV</TabsTrigger>
                            <TabsTrigger value="paste">Paste from Clipboard</TabsTrigger>
                        </TabsList>
                        <TabsContent value="csv" className="py-4">
                            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
                                <Input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="csv-upload"
                                />
                                <Label htmlFor="csv-upload" className="flex flex-col items-center cursor-pointer">
                                    <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                                    <span className="text-lg font-medium">Click to upload CSV</span>
                                    <span className="text-sm text-muted-foreground mt-1">or drag and drop here</span>
                                </Label>
                            </div>
                        </TabsContent>
                        <TabsContent value="paste" className="py-4">
                            <div className="space-y-4">
                                <Label>Paste table data here (from Excel or PDF):</Label>
                                <Textarea
                                    value={pasteData}
                                    onChange={(e) => setPasteData(e.target.value)}
                                    placeholder={`Name\tCode\tPrice\nProduct A\tABC\t100\nProduct B\tXYZ\t200`}
                                    rows={10}
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Ensure usage of headers in the first row for easier mapping.
                                </p>
                                <Button onClick={handlePasteParse} className="w-full">
                                    <Clipboard className="mr-2 h-4 w-4" />
                                    Parse Data
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Map &quot;Name&quot; Column *</Label>
                                <Select value={mapping.name} onValueChange={(v) => setMapping({ ...mapping, name: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                                    <SelectContent>
                                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Map &quot;Retail Price&quot; Column *</Label>
                                <Select value={mapping.retail_price} onValueChange={(v) => setMapping({ ...mapping, retail_price: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                                    <SelectContent>
                                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Map &quot;Cost Price&quot; Column (Optional)</Label>
                                <Select value={mapping.cost_price} onValueChange={(v) => setMapping({ ...mapping, cost_price: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                                    <SelectContent>
                                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Map &quot;Code/SKU&quot; Column (Optional)</Label>
                                <Select value={mapping.code} onValueChange={(v) => setMapping({ ...mapping, code: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                                    <SelectContent>
                                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-md border p-4 bg-muted/20">
                            <Label className="mb-2 block">Data Preview (First 3 rows)</Label>
                            <div className="space-y-2 text-sm">
                                {parsedData.slice(0, 3).map((row, i) => (
                                    <div key={i} className="flex gap-4 border-b pb-2 last:border-0">
                                        <span className="font-semibold w-8 text-muted-foreground">{i + 1}</span>
                                        <div className="grid grid-cols-4 gap-4 w-full">
                                            <span>{row[mapping.name] || <span className="text-red-400 font-mono text-xs">Missing Name</span>}</span>
                                            <span>{row[mapping.retail_price] || <span className="text-red-400 font-mono text-xs">Missing Price</span>}</span>
                                            <span className="text-muted-foreground">{row[mapping.code]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={handleImport} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Import {parsedData.length} Products
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
