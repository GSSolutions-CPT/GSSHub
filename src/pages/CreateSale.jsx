import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, FileText, Receipt, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { SmartEstimator } from '@/components/SmartEstimator'
import { useCurrency } from '@/lib/use-currency'

export default function CreateSale() {
  const navigate = useNavigate()
  const { formatCurrency } = useCurrency()
  const [mode, setMode] = useState('quotation') // 'quotation' or 'invoice'
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [formData, setFormData] = useState({
    client_id: '',
    valid_until: '',
    due_date: '',
    vat_applicable: false
  })
  const [lineItems, setLineItems] = useState([
    { product_id: '', quantity: 1, unit_price: 0, cost_price: 0 }
  ])

  useEffect(() => {
    fetchClients()
    fetchProducts()
  }, [])

  const fetchClients = async () => {
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
  }

  const fetchProducts = async () => {
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
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { product_id: '', quantity: 1, unit_price: 0, cost_price: 0 }])
  }

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems]
    updated[index][field] = value

    // Auto-fill prices and description when product is selected
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value)
      if (product) {
        updated[index].unit_price = parseFloat(product.retail_price)
        updated[index].cost_price = parseFloat(product.cost_price)
        updated[index].description = product.name // Auto-fill description
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
    const vat = formData.vat_applicable ? subtotal * 0.15 : 0
    const total = subtotal + vat

    return { subtotal, tradeSubtotal, profit, vat, total }
  }

  const handleAiEstimate = (items) => {
    // If the only item is empty (default state), replace it
    let newItems = [...lineItems]
    if (newItems.length === 1 && !newItems[0].product_id && newItems[0].unit_price === 0) {
      newItems = []
    }

    const mappedItems = items.map(item => ({
      product_id: null, // Custom item
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
      description: item.description // We need to add logic to handle description in rendering if product_id is null
    }))

    setLineItems([...newItems, ...mappedItems])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.client_id || lineItems.length === 0) {
      alert('Please select a client and add at least one line item')
      return
    }

    try {
      const totals = calculateTotals()

      // Create quotation or invoice
      const table = mode === 'quotation' ? 'quotations' : 'invoices'

      // Base payload
      const basePayload = {
        client_id: formData.client_id,
        status: 'Draft',
        date_created: new Date().toISOString(),
        total_amount: totals.total,
        vat_applicable: formData.vat_applicable,
        trade_subtotal: totals.tradeSubtotal,
        profit_estimate: totals.profit
      }

      // Add specific fields based on mode
      const payload = mode === 'quotation'
        ? { ...basePayload, valid_until: formData.valid_until || null }
        : { ...basePayload, due_date: formData.due_date || null }


      const { data: saleData, error: saleError } = await supabase
        .from(table)
        .insert([payload])
        .select()

      if (saleError) throw saleError

      const saleId = saleData[0].id


      if (linesError) throw linesError

      // Log activity
      await supabase.from('activity_log').insert([{
        type: mode === 'quotation' ? 'Quotation Created' : 'Invoice Created',
        description: `New ${mode} created for client`,
        related_entity_id: saleId,
        related_entity_type: mode
      }])

      alert(`${mode === 'quotation' ? 'Quotation' : 'Invoice'} created successfully!`)
      navigate('/sales')
    } catch (error) {
      console.error('Error creating sale:', error)
      alert(`Error creating sale: ${error.message}`)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Create Sale Document</CardTitle>
              <CardDescription>Generate a quotation or invoice</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/products')}
                title="Manage Products"
              >
                <Package className="mr-2 h-4 w-4" />
                Manage Products
              </Button>
              <div className="flex items-center gap-2">
                <FileText className={`h-5 w-5 ${mode === 'quotation' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={mode === 'quotation' ? 'font-semibold' : 'text-muted-foreground'}>
                  Quotation
                </span>
              </div>
              <Switch
                checked={mode === 'invoice'}
                onCheckedChange={(checked) => setMode(checked ? 'invoice' : 'quotation')}
              />
              <div className="flex items-center gap-2">
                <Receipt className={`h-5 w-5 ${mode === 'invoice' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={mode === 'invoice' ? 'font-semibold' : 'text-muted-foreground'}>
                  Invoice
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit}>
        {/* Client & Date Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client_id">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.company && `(${client.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === 'quotation' && (
                <div className="grid gap-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              )}

              {mode === 'invoice' && (
                <div className="grid gap-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id="vat_applicable"
                  checked={formData.vat_applicable}
                  onCheckedChange={(checked) => setFormData({ ...formData, vat_applicable: checked })}
                />
                <Label htmlFor="vat_applicable">VAT Applicable (15%)</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <div className="flex gap-2">
                <SmartEstimator onApply={handleAiEstimate} />
                <Button type="button" onClick={addLineItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <div className="flex-1 grid gap-2">
                    <Label>Item Details</Label>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select product or Custom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Item / Labour</SelectItem>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.retail_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Description"
                      value={item.description || ''}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                  </div>

                  <div className="w-24 grid gap-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="w-32 grid gap-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="w-32 grid gap-2">
                    <Label>Line Total</Label>
                    <Input
                      type="text"
                      value={formatCurrency(item.quantity * item.unit_price)}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1 && !item.product_id && !item.description}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totals Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Cost (Trade Subtotal):</span>
                <span>{formatCurrency(totals.tradeSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Estimated Profit:</span>
                <span>{formatCurrency(totals.profit)}</span>
              </div>
              {formData.vat_applicable && (
                <div className="flex justify-between text-sm">
                  <span>VAT (15%):</span>
                  <span>{formatCurrency(totals.vat)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/sales')}>
            Cancel
          </Button>
          <Button type="submit">
            Create {mode === 'quotation' ? 'Quotation' : 'Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}

