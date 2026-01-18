import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, FileText, Receipt, Banknote, ArrowRight, Download, Trash2, CheckCircle, Package, FileSignature, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { generateInvoicePDF, generateQuotePDF, generatePurchaseOrderPDF } from '@/lib/pdf-service'
import { useCurrency } from '@/lib/use-currency.jsx'
import { toast } from 'sonner'
import { useSettings } from '@/lib/use-settings.jsx'


export default function Sales() {
  const navigate = useNavigate()
  const { formatCurrency } = useCurrency()
  const { settings } = useSettings()

  // Data State
  const [quotations, setQuotations] = useState([])
  const [invoices, setInvoices] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])

  // Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All Time')

  useEffect(() => {
    fetchQuotations()
    fetchInvoices()
    fetchPurchaseOrders()
  }, [])

  // --- Metrics Calculation ---
  const metrics = useMemo(() => {
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid')
    const outstandingInvoices = invoices.filter(inv => inv.status === 'Sent' || inv.status === 'Overdue' || inv.status === 'Partially Paid')
    const pipelineQuotes = quotations.filter(q => q.status === 'Sent' || q.status === 'Draft')

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const pipelineValue = pipelineQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0)

    return { totalRevenue, totalOutstanding, pipelineValue }
  }, [invoices, quotations])

  // --- Filter Logic ---
  const filterData = (data, type) => {
    return data.filter(item => {
      const matchesSearch =
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clients?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (type === 'po' && item.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'All' || item.status === statusFilter

      let matchesDate = true
      if (dateFilter !== 'All Time') {
        const date = new Date(item.date_created)
        const now = new Date()
        if (dateFilter === 'This Month') {
          matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        } else if (dateFilter === 'Last Month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          matchesDate = date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear()
        }
      }

      return matchesSearch && matchesStatus && matchesDate
    })
  }

  const filteredQuotations = filterData(quotations, 'quotation')
  const filteredInvoices = filterData(invoices, 'invoice')
  const filteredPOs = filterData(purchaseOrders, 'po')


  // --- Actions ---
  const handleDownloadPO = async (po) => {
    try {
      const toastId = toast.loading('Generating Purchase Order PDF...')
      // Fetch full PO details including lines and supplier info
      const { data: fullPO, error } = await supabase
        .from('purchase_orders')
        .select(`
            *,
            suppliers (*),
            lines:purchase_order_lines(*)
          `)
        .eq('id', po.id)
        .single()

      if (error) throw error
      await generatePurchaseOrderPDF(fullPO, settings)
      toast.success(`PDF Generated for Order #${po.id.substring(0, 8)}`, { id: toastId })
    } catch (error) {
      console.error('Error generating PO PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const handleDeletePO = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) return
    const toastId = toast.loading('Deleting Purchase Order...')
    try {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
      if (error) throw error
      setPurchaseOrders(purchaseOrders.filter(po => po.id !== id))
      toast.success('Purchase Order deleted', { id: toastId })
    } catch (error) {
      console.error('Error deleting PO:', error)
      toast.error('Failed to delete Purchase Order', { id: toastId })
    }
  }

  const fetchPurchaseOrders = async () => {
    try {
      const { data, error } = await supabase.from('purchase_orders').select(`*, suppliers (name)`).order('date_created', { ascending: false })
      if (error) throw error
      setPurchaseOrders(data || [])
    } catch (error) { console.error('Error fetching POs:', error) }
  }

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase.from('quotations').select(`*, clients (name, company, email, address)`).order('date_created', { ascending: false })
      if (error) throw error
      setQuotations(data || [])
    } catch (error) { console.error('Error fetching quotations:', error) }
  }

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`*, clients (name, company, email, address), quotations (payment_proof)`)
        .order('date_created', { ascending: false })

      const processedData = (data || []).map(inv => ({ ...inv, payment_proof: inv.quotations?.payment_proof || null }))
      if (error) throw error
      setInvoices(processedData)
    } catch (error) { console.error('Error fetching invoices:', error) }
  }

  const updateStatus = async (type, id, newStatus) => {
    const toastId = toast.loading(`Updating ${type} status...`)
    try {
      const table = type === 'quotation' ? 'quotations' : 'invoices'
      const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', id)
      if (error) throw error

      await supabase.from('activity_log').insert([{
        type: `${type === 'quotation' ? 'Quotation' : 'Invoice'} Status Updated`,
        description: `Status changed to ${newStatus}`,
        related_entity_id: id,
        related_entity_type: type
      }])

      if (type === 'quotation') fetchQuotations(); else fetchInvoices()
      toast.success(`${type === 'quotation' ? 'Quotation' : 'Invoice'} marked as ${newStatus}`, { id: toastId })
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status', { id: toastId })
    }
  }

  const handleConfirmPayment = async (quotation) => {
    const toastId = toast.loading('Confirming payment...')
    try {
      const { error } = await supabase.from('quotations').update({ status: 'Accepted' }).eq('id', quotation.id)
      if (error) throw error

      await supabase.from('activity_log').insert([{
        type: 'Payment Accepted',
        description: `Admin approved payment for quotation #${quotation.id.substring(0, 6)}`,
        related_entity_id: quotation.id,
        related_entity_type: 'quotation'
      }])

      fetchQuotations()
      toast.success('Payment accepted! Redirecting to jobs...', { id: toastId })
      navigate('/jobs', { state: { createFromQuote: true, quoteData: quotation } })
    } catch (error) {
      console.error('Error confirming payment:', error)
      toast.error('Failed to confirm payment', { id: toastId })
    }
  }

  const downloadProof = (dataUrl, filename) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const convertToInvoice = async (quotation) => {
    const toastId = toast.loading('Converting quotation to invoice...')
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          client_id: quotation.client_id,
          quotation_id: quotation.id,
          status: 'Draft',
          date_created: new Date().toISOString(),
          total_amount: quotation.total_amount,
          vat_applicable: quotation.vat_applicable,
          trade_subtotal: quotation.trade_subtotal,
          profit_estimate: quotation.profit_estimate
        }])
        .select()
      if (invoiceError) throw invoiceError

      const invoiceId = invoiceData[0].id
      const { data: quotationLines, error: linesError } = await supabase.from('quotation_lines').select('*').eq('quotation_id', quotation.id)
      if (linesError) throw linesError

      const invoiceLines = quotationLines.map(line => ({
        invoice_id: invoiceId,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.line_total,
        cost_price: line.cost_price
      }))

      const { error: insertLinesError } = await supabase.from('invoice_lines').insert(invoiceLines)
      if (insertLinesError) throw insertLinesError

      await updateStatus('quotation', quotation.id, 'Converted')

      await supabase.from('activity_log').insert([{
        type: 'Quotation Converted',
        description: `Quotation converted to invoice`,
        related_entity_id: quotation.id,
        related_entity_type: 'quotation'
      }])

      toast.success('Quotation converted to invoice successfully!', { id: toastId })
      fetchQuotations()
      fetchInvoices()
    } catch (error) {
      console.error('Error converting to invoice:', error)
      toast.error('Error converting quotation. Please try again.', { id: toastId })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-500'
      case 'Sent': return 'bg-blue-500'
      case 'Approved': return 'bg-green-500'
      case 'Rejected': return 'bg-red-500'
      case 'Converted': return 'bg-purple-500'
      case 'Paid': return 'bg-green-600'
      case 'Overdue': return 'bg-red-600'
      case 'Cancelled': return 'bg-gray-600'
      case 'Pending Review': return 'bg-yellow-500'
      case 'Accepted': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const handleDelete = async (id, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This cannot be undone.`)) return
    const toastId = toast.loading(`Deleting ${type}...`)
    try {
      const table = type === 'quotation' ? 'quotations' : 'invoices'
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error

      if (type === 'quotation') fetchQuotations(); else fetchInvoices()
      toast.success(`${type} deleted successfully`, { id: toastId })
    } catch (error) {
      console.error(`Error deleting ${type}:`, error)
      toast.error(`Failed to delete ${type}`, { id: toastId })
    }
  }


  !isLocked && (
    <>
      <Button size="sm" variant="ghost" onClick={() => navigate(`/create-sale?edit=${sale.id}&type=${type}`)}>Edit</Button>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(sale.id, type)}>Delete</Button>
    </>
  )
}
          </div >
        </CardContent >
      </Card >
    )
  }

return (
  <div className="p-6 space-y-8 animate-fade-in">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales & Finance</h1>
        <p className="text-muted-foreground mt-1">Manage quotes, invoices, and purchase orders.</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => navigate('/create-sale?type=quotation')}>New Quote</Button>
        <Button variant="outline" onClick={() => navigate('/create-sale?type=invoice')}>New Invoice</Button>
        <Button variant="secondary" onClick={() => navigate('/create-po')}>
          <Package className="mr-2 h-4 w-4" /> New PO
        </Button>
      </div>
    </div>

    {/* Dashboard Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <Banknote className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(metrics.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">From paid invoices (All Time)</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.totalOutstanding)}</div>
          <p className="text-xs text-muted-foreground">{filteredInvoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').length} invoices pending payment</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.pipelineValue)}</div>
          <p className="text-xs text-muted-foreground">Active quotations awaiting response</p>
        </CardContent>
      </Card>
    </div>

    {/* Filters */}
    <div className="flex flex-col md:flex-row gap-4 bg-muted/30 p-4 rounded-lg items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients, invoice numbers..."
          className="pl-8 bg-background"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Statuses</SelectItem>
          <SelectItem value="Paid">Paid</SelectItem>
          <SelectItem value="Sent">Sent / Unpaid</SelectItem>
          <SelectItem value="Draft">Draft</SelectItem>
          <SelectItem value="Overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>
      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectTrigger className="w-[180px] bg-background">
          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Date Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All Time">All Time</SelectItem>
          <SelectItem value="This Month">This Month</SelectItem>
          <SelectItem value="Last Month">Last Month</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <Tabs defaultValue="quotations" className="space-y-4">
      <TabsList>
        <TabsTrigger value="quotations">Quotations ({filteredQuotations.length})</TabsTrigger>
        <TabsTrigger value="invoices">Invoices ({filteredInvoices.length})</TabsTrigger>
        <TabsTrigger value="purchase_orders">Purchase Orders ({filteredPOs.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="quotations" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotations.map(quote => renderSaleCard(quote, 'quotation'))}
          {filteredQuotations.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No quotations found fitting criteria.</p>}
        </div>
      </TabsContent>

      <TabsContent value="invoices" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvoices.map(inv => renderSaleCard(inv, 'invoice'))}
          {filteredInvoices.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No invoices found fitting criteria.</p>}
        </div>
      </TabsContent>

      <TabsContent value="purchase_orders" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPOs.map((po) => (
            <Card key={po.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {po.suppliers?.name || 'Unknown Supplier'}
                    </CardTitle>
                    <CardDescription>PO #{po.id.substring(0, 8)} • {new Date(po.date_created).toLocaleDateString()}</CardDescription>
                  </div>
                  <Badge variant="outline">{po.status || 'Draft'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold">Total: {formatCurrency(po.total_amount || 0)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPO(po)} className="w-full">
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive w-full" onClick={() => handleDeletePO(po.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete PO
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredPOs.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No purchase orders found.</p>}
        </div>
      </TabsContent>
    </Tabs>
  </div>
)
}

