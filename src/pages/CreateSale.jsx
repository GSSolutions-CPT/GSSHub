import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, FileText, Receipt, Package, Loader2, User, Calendar, Percent, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SmartEstimator } from '@/components/SmartEstimator'
import { useCurrency } from '@/lib/use-currency'
import { useSettings } from '@/lib/use-settings'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function CreateSale() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultType = searchParams.get('type')
  const { formatCurrency } = useCurrency()
  const { settings } = useSettings()
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState(defaultType === 'invoice' ? 'invoice' : 'quotation') // 'quotation' or 'invoice'
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [formData, setFormData] = useState({
    client_id: '',
    valid_until: '',
    due_date: '',
    vat_applicable: false,
    deposit_amount: 0,
    payment_type: 'deposit',
    deposit_percentage: 75
  })
  const [lineItems, setLineItems] = useState([
    { product_id: '', quantity: 1, unit_price: 0, cost_price: 0, description: '' }
  ])

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company')
        .order('name', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }, [])

  useEffect(() => {
    fetchClients()
    fetchProducts()
  }, [fetchClients, fetchProducts])

  // Set default validity for quotations
  useEffect(() => {
    if (mode === 'quotation' && !formData.valid_until && settings) {
      const days = parseInt(settings.defaultQuoteValidityDays) || 14
      const date = new Date()
      date.setDate(date.getDate() + days)
      setFormData(prev => ({ ...prev, valid_until: date.toISOString().split('T')[0] }))
    }
  }, [mode, settings, formData.valid_until])

  const addLineItem = () => {
    setLineItems([...lineItems, { product_id: '', quantity: 1, unit_price: 0, cost_price: 0, description: '' }])
  }

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    } else {
      // Reset the last item instead of removing
      setLineItems([{ product_id: '', quantity: 1, unit_price: 0, cost_price: 0, description: '' }])
    }
  }

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems]
    updated[index][field] = value

    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value)
      if (product) {
        updated[index].unit_price = parseFloat(product.retail_price)
        updated[index].cost_price = parseFloat(product.cost_price)
        updated[index].description = product.name
      }
    }

    setLineItems(updated)
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)

    const tradeSubtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.cost_price)
    }, 0)

    const profit = subtotal - tradeSubtotal
    const taxRate = (parseFloat(settings.taxRate) || 15) / 100
    const vat = formData.vat_applicable ? subtotal * taxRate : 0
    const total = subtotal + vat

    return { subtotal, tradeSubtotal, profit, vat, total }
  }

  const handleAiEstimate = (items) => {
    let newItems = [...lineItems]
    // If only one empty item, clear it
    if (newItems.length === 1 && !newItems[0].product_id && !newItems[0].description && newItems[0].unit_price === 0) {
      newItems = []
    }

    const mappedItems = items.map(item => ({
      product_id: null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
      description: item.description || 'Estimated Service'
    }))

    setLineItems([...newItems, ...mappedItems])
  }

  const [editId, setEditId] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editParam = params.get('edit')
    const typeParam = params.get('type')

    if (editParam) {
      setEditId(editParam)
      if (typeParam) setMode(typeParam)
      fetchEditData(editParam, typeParam || 'quotation')
    }
  }, [])

  const fetchEditData = async (id, type) => {
    try {
      setIsLoading(true)
      const table = type === 'quotation' ? 'quotations' : 'invoices'
      const linesTable = type === 'quotation' ? 'quotation_lines' : 'invoice_lines'
      const idColumn = type === 'quotation' ? 'quotation_id' : 'invoice_id'

      const { data: sale, error: saleError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      if (saleError) throw saleError

      const { data: lines, error: linesError } = await supabase
        .from(linesTable)
        .select('*')
        .eq(idColumn, id)

      if (linesError) throw linesError

      setFormData({
        client_id: sale.client_id,
        valid_until: sale.valid_until ? sale.valid_until.split('T')[0] : '',
        due_date: sale.due_date ? sale.due_date.split('T')[0] : '',
        vat_applicable: sale.vat_applicable,
        deposit_amount: sale.deposit_amount || 0,
        payment_type: sale.payment_type || 'deposit',
        deposit_percentage: sale.deposit_percentage || 75
      })

      if (lines && lines.length > 0) {
        setLineItems(lines.map(line => ({
          product_id: line.product_id || '',
          quantity: line.quantity,
          unit_price: line.unit_price,
          cost_price: line.cost_price,
          description: line.description || ''
        })))
      }

    } catch (error) {
      console.error('Error fetching edit data:', error)
      toast.error('Failed to load data for editing')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.client_id || lineItems.length === 0) {
      toast.error('Please select a client and add at least one line item')
      return
    }

    setIsLoading(true)

    try {
      const totals = calculateTotals()
      const table = mode === 'quotation' ? 'quotations' : 'invoices'

      const basePayload = {
        client_id: formData.client_id,
        total_amount: totals.total,
        vat_applicable: formData.vat_applicable,
        trade_subtotal: totals.tradeSubtotal,
        profit_estimate: totals.profit
      }

      const payload = mode === 'quotation'
        ? {
          ...basePayload,
          valid_until: formData.valid_until || null,
          payment_type: formData.payment_type,
          deposit_percentage: parseFloat(formData.deposit_percentage) || 0
        }
        : { ...basePayload, due_date: formData.due_date || null, deposit_amount: parseFloat(formData.deposit_amount) || 0 }

      let saleId = editId

      if (editId) {
        const { error: updateError } = await supabase
          .from(table)
          .update(payload)
          .eq('id', editId)

        if (updateError) throw updateError

        const linesTable = mode === 'quotation' ? 'quotation_lines' : 'invoice_lines'
        const idColumn = mode === 'quotation' ? 'quotation_id' : 'invoice_id'

        await supabase.from(linesTable).delete().eq(idColumn, editId)

      } else {
        const { data: saleData, error: saleError } = await supabase
          .from(table)
          .insert([{ ...payload, status: 'Draft', date_created: new Date().toISOString() }])
          .select()

        if (saleError) throw saleError
        saleId = saleData[0].id
      }

      const lines = lineItems.map(item => ({
        [`${mode}_id`]: saleId,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        line_total: item.quantity * item.unit_price
      }))

      const { error: linesError } = await supabase
        .from(`${mode}_lines`)
        .insert(lines)

      if (linesError) throw linesError

      await supabase.from('activity_log').insert([{
        type: editId ? `${mode === 'quotation' ? 'Quotation' : 'Invoice'} Updated` : `${mode === 'quotation' ? 'Quotation' : 'Invoice'} Created`,
        description: `${editId ? 'Updated' : 'New'} ${mode} ${editId ? 'details' : 'created'} for client`,
        related_entity_id: saleId,
        related_entity_type: mode
      }])

      toast.success(`${mode === 'quotation' ? 'Quotation' : 'Invoice'} ${editId ? 'updated' : 'created'} successfully!`)
      navigate('/sales')
    } catch (error) {
      console.error('Error saving sale:', error)
      toast.error(`Error saving sale: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const totals = calculateTotals()
  const selectedClient = clients.find(c => c.id === formData.client_id)

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 -m-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sales')} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
              New {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </h1>
            <p className="text-muted-foreground text-sm">Create a new sales document</p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setMode('quotation')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium",
              mode === 'quotation'
                ? "bg-white dark:bg-slate-800 shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-4 w-4" />
            Quotation
          </button>
          <button
            onClick={() => setMode('invoice')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium",
              mode === 'invoice'
                ? "bg-white dark:bg-slate-800 shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Receipt className="h-4 w-4" />
            Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input Form */}
        <div className="space-y-6">

          {/* Client Selection */}
          <Card className="border-none shadow-md bg-white dark:bg-slate-900/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Client Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Select Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <span className="font-medium">{client.name}</span>
                        {client.company && <span className="text-muted-foreground ml-2">({client.company})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {mode === 'quotation' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Valid Until</Label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={formData.valid_until}
                          onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                          className="pl-9"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Select
                        value={formData.payment_type}
                        onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Deposit (75%)</SelectItem>
                          <SelectItem value="full">Full Upfront</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="pl-9"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-none shadow-md bg-white dark:bg-slate-900/50 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Items & Services
                </CardTitle>
                <CardDescription>Add products or custom services.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <SmartEstimator onApply={handleAiEstimate} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="group relative grid gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex gap-4 items-start">
                      <div className="grid gap-2 flex-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Product / Description</Label>
                        <div className="flex gap-2">
                          <div className="w-1/3 min-w-[140px]">
                            <Select
                              value={item.product_id || "custom"}
                              onValueChange={(value) => {
                                if (value === "custom") {
                                  updateLineItem(index, 'product_id', null)
                                } else {
                                  updateLineItem(index, 'product_id', value)
                                }
                              }}
                            >
                              <SelectTrigger className="bg-white dark:bg-slate-950">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="custom">Custom Item</SelectItem>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Input
                            className="flex-1 bg-white dark:bg-slate-950"
                            placeholder="Item description..."
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 items-end">
                      <div className="w-24 grid gap-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          className="bg-white dark:bg-slate-950"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="w-32 grid gap-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Price</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-7 bg-white dark:bg-slate-950"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Total</p>
                        <div className="h-10 flex items-center justify-end px-3 font-semibold text-lg">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-500"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 p-4">
              <Button variant="outline" onClick={addLineItem} className="w-full border-dashed border-2 hover:border-solid hover:bg-slate-100 dark:hover:bg-slate-800">
                <Plus className="mr-2 h-4 w-4" />
                Add Another Item
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Live Preview */}
        <div className="space-y-6 lg:sticky lg:top-8 h-fit">
          <Card className="border-none shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className={`h-2 w-full ${mode === 'quotation' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
            <CardHeader className="text-center pb-2">
              <Badge variant="outline" className="w-fit mx-auto mb-2 uppercase tracking-widest text-[10px]">
                Draft Preview
              </Badge>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {selectedClient ? selectedClient.name : <span className="text-muted-foreground/30">Select Client</span>}
              </CardTitle>
              <CardDescription>
                {selectedClient?.company}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Items Summary */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Item Summary</Label>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 divide-y divide-slate-100 dark:divide-slate-800">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center p-0">{item.quantity}</Badge>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {item.description || item.product_id ? (item.description || products.find(p => p.id === item.product_id)?.name) : <span className="italic text-muted-foreground">Item {i + 1}</span>}
                        </span>
                      </div>
                      <span className="text-slate-600 dark:text-slate-400">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals Block */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {formData.vat_applicable && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT ({settings.taxRate || 15}%)</span>
                    <span>{formatCurrency(totals.vat)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-base font-semibold">Total Due</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>

              {/* VAT Toggle within Preview for Context */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="vat-toggle" className="text-sm cursor-pointer">Add VAT ({settings.taxRate || 15}%)</Label>
                </div>
                <Switch
                  id="vat-toggle"
                  checked={formData.vat_applicable}
                  onCheckedChange={(c) => setFormData({ ...formData, vat_applicable: c })}
                />
              </div>

            </CardContent>
            <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isLoading}
                className={`w-full text-lg shadow-lg shadow-blue-500/20 ${mode === 'quotation' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {editId ? 'Update' : 'Create'} {mode === 'quotation' ? 'Quotation' : 'Invoice'}
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/sales')}>
                Cancel
              </Button>
            </CardFooter>
          </Card>

          {/* Profit Indicator (Admin Only - simplified view) */}
          <div className="text-center">
            <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
              Est. Profit: {formatCurrency(totals.profit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

