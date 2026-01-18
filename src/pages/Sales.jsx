import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Search, FileText, Receipt, Banknote, Calendar, ArrowRight, Download, Trash2, CheckCircle, Package, FileSignature } from 'lucide-react'
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
  const [quotations, setQuotations] = useState([])
  const [invoices, setInvoices] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchQuotations()
    fetchInvoices()
    fetchPurchaseOrders()
  }, [])

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
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (name)
        `)
        .order('date_created', { ascending: false })

      if (error) throw error
      setPurchaseOrders(data || [])
    } catch (error) {
      console.error('Error fetching POs:', error)
    }
  }

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          clients (name, company, email, address)
        `)
        .order('date_created', { ascending: false })

      if (error) throw error
      setQuotations(data || [])
    } catch (error) {
      console.error('Error fetching quotations:', error)
    }
  }

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (name, company, email, address),
          quotations (payment_proof)
        `)
        .order('date_created', { ascending: false })

      // Flatten payment_proof from quotation into invoice object for easy access
      const processedData = (data || []).map(inv => ({
        ...inv,
        payment_proof: inv.quotations?.payment_proof || null
      }))

      if (error) throw error
      setInvoices(processedData)
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  const updateStatus = async (type, id, newStatus) => {
    const toastId = toast.loading(`Updating ${type} status...`)
    try {
      const table = type === 'quotation' ? 'quotations' : 'invoices'
      const { error } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      // Log activity
      await supabase.from('activity_log').insert([{
        type: `${type === 'quotation' ? 'Quotation' : 'Invoice'} Status Updated`,
        description: `Status changed to ${newStatus}`,
        related_entity_id: id,
        related_entity_type: type
      }])

      if (type === 'quotation') {
        fetchQuotations()
      } else {
        fetchInvoices()
      }
      toast.success(`${type === 'quotation' ? 'Quotation' : 'Invoice'} marked as ${newStatus}`, { id: toastId })
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status', { id: toastId })
    }
  }

  const handleConfirmPayment = async (quotation) => {
    // 1. Mark Quotation as Accepted
    // 2. Redirect to Job Booking with data pre-filled
    const toastId = toast.loading('Confirming payment...')
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status: 'Accepted' })
        .eq('id', quotation.id)

      if (error) throw error

      // Log activity
      await supabase.from('activity_log').insert([{
        type: 'Payment Accepted',
        description: `Admin approved payment for quotation #${quotation.id.substring(0, 6)}`,
        related_entity_id: quotation.id,
        related_entity_type: 'quotation'
      }])

      fetchQuotations()
      toast.success('Payment accepted! Redirecting to jobs...', { id: toastId })

      // Redirect to Jobs with create intent
      navigate('/jobs', {
        state: {
          createFromQuote: true,
          quoteData: quotation
        }
      })

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
      // Create invoice from quotation
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

      // Copy quotation lines to invoice lines
      const { data: quotationLines, error: linesError } = await supabase
        .from('quotation_lines')
        .select('*')
        .eq('quotation_id', quotation.id)

      if (linesError) throw linesError

      const invoiceLines = quotationLines.map(line => ({
        invoice_id: invoiceId,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.line_total,
        cost_price: line.cost_price
      }))

      const { error: insertLinesError } = await supabase
        .from('invoice_lines')
        .insert(invoiceLines)

      if (insertLinesError) throw insertLinesError

      // Update quotation status
      await updateStatus('quotation', quotation.id, 'Converted')

      // Log activity
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
      default: return 'bg-gray-500'
    }
  }

  const handleDelete = async (id, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This cannot be undone.`)) return

    const toastId = toast.loading(`Deleting ${type}...`)

    try {
      const table = type === 'quotation' ? 'quotations' : 'invoices'
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error

      if (type === 'quotation') {
        fetchQuotations()
      } else {
        fetchInvoices()
      }
      toast.success(`${type === 'quotation' ? 'Quotation' : 'Invoice'} deleted successfully`, { id: toastId })
    } catch (error) {
      console.error('Error deleting sale:', error)
      toast.error('Error deleting item. Ensure no other records depend on it.', { id: toastId })
    }
  }

  const handleDownloadPDF = async (sale, type) => {
    const toastId = toast.loading('Generating PDF...')
    try {
      // Fetch line items
      const table = type === 'quotation' ? 'quotation_lines' : 'invoice_lines'
      const idColumn = type === 'quotation' ? 'quotation_id' : 'invoice_id'

      const { data: lines, error } = await supabase
        .from(table)
        .select('*')
        .eq(idColumn, sale.id)

      if (error) throw error

      const fullData = { ...sale, lines: lines || [] }

      if (type === 'quotation') {
        generateQuotePDF(fullData, settings)
      } else {
        generateInvoicePDF(fullData, settings)
      }
      toast.success('PDF Downloaded', { id: toastId })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF', { id: toastId })
    }
  }

  const filteredQuotations = quotations.filter(q =>
    q.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.clients?.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredInvoices = invoices.filter(i =>
    i.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.clients?.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredPurchaseOrders = purchaseOrders.filter(po =>
    po.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const renderSaleCard = (sale, type) => (
    <Card key={sale.id} className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {type === 'quotation' ? <FileText className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
              {sale.clients?.name || 'Unknown Client'}
            </CardTitle>
            {sale.clients?.company && (
              <CardDescription>{sale.clients.company}</CardDescription>
            )}
          </div>
          <Badge className={`${getStatusColor(sale.status)} text-white`}>
            {sale.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(sale.date_created).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-lg font-semibold text-green-600">
              <Banknote className="h-5 w-5" />
              <span>{formatCurrency(sale.total_amount)}</span>
            </div>
          </div>

          {sale.profit_estimate && (
            <div className="text-sm text-muted-foreground">
              Est. Profit: <span className="text-green-600 font-medium">
                {formatCurrency(sale.profit_estimate)}
              </span>
            </div>
          )}

          {type === 'quotation' && sale.valid_until && (
            <div className="text-sm text-muted-foreground">
              Valid until: {new Date(sale.valid_until).toLocaleDateString()}
            </div>
          )}

          {type === 'invoice' && sale.due_date && (
            <div className="text-sm text-muted-foreground">
              Due: {new Date(sale.due_date).toLocaleDateString()}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleDownloadPDF(sale, type)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>

            {sale.payment_proof && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => downloadProof(sale.payment_proof, `PaymentProof_${sale.id.substring(0, 6)}`)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Proof
              </Button>
            )}

            {/* Edit Button - for drafts or accepted/approved quotes */}
            {type === 'quotation' && (sale.status === 'Draft' || sale.status === 'Accepted' || sale.status === 'Approved') && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/create-sale?edit=${sale.id}&type=quotation`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Edit Quote
              </Button>
            )}

            {/* Edit Button for Invoices - LOCKED if Paid */}
            {type === 'invoice' && sale.status !== 'Paid' && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/create-sale?edit=${sale.id}&type=invoice`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Edit Invoice
              </Button>
            )}

            {/* Delete Button - Available for most statuses if needed, or restricted. User requested "delete button" so enabling broadly for now but asking confirmation */}
            {/* LOCKED if Invoice is Paid */}
            {!(type === 'invoice' && sale.status === 'Paid') && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(sale.id, type)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {type === 'quotation' ? 'Quote' : 'Invoice'}
              </Button>
            )}

            <div className="flex gap-2">
              {type === 'quotation' && sale.status === 'Draft' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => updateStatus('quotation', sale.id, 'Sent')}
                    className="flex-1"
                  >
                    Send
                  </Button>
                </>
              )}
              {type === 'quotation' && sale.status === 'Sent' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => updateStatus('quotation', sale.id, 'Approved')}
                    className="flex-1"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus('quotation', sale.id, 'Rejected')}
                  >
                    Reject
                  </Button>
                </>
              )}
              {/* Convert Button - for Accepted OR Approved */}
              {type === 'quotation' && (sale.status === 'Approved' || sale.status === 'Accepted') && (
                <Button
                  size="sm"
                  onClick={() => convertToInvoice(sale)}
                  className="flex-1"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Convert to Invoice
                </Button>
              )}
              {type === 'invoice' && sale.status === 'Draft' && (
                <Button
                  size="sm"
                  onClick={() => updateStatus('invoice', sale.id, 'Sent')}
                  className="flex-1"
                >
                  Send Invoice
                </Button>
              )}
              {type === 'invoice' && (sale.status === 'Sent' || sale.status === 'Overdue') && (
                <Button
                  size="sm"
                  onClick={() => updateStatus('invoice', sale.id, 'Paid')}
                  className="flex-1"
                >
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => navigate('/contracts')} variant="outline">
            <FileSignature className="mr-2 h-4 w-4" />
            Contracts
          </Button>
          <Button onClick={() => navigate('/create-purchase-order')} variant="outline">
            <Package className="mr-2 h-4 w-4" />
            Create Purchase Order
          </Button>
          <Button onClick={() => navigate('/create-sale')}>
            Create New Sale
          </Button>
        </div>
      </div>

      {/* Tabs for Quotations, Proforma, and Invoices */}
      <Tabs defaultValue="quotations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quotations">Quotes</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Review
            {quotations.filter(q => q.status === 'Pending Review').length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="proforma">Proforma</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="quotations" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotations
            .filter(q => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Rejected' || q.status === 'Cancelled')
            .map((quotation) => renderSaleCard(quotation, 'quotation'))}
          {filteredQuotations.filter(q => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Rejected' || q.status === 'Cancelled').length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No open quotations found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotations
            .filter(q => q.status === 'Pending Review')
            .map((quotation) => (
              <Card key={quotation.id} className="border-l-4 border-l-yellow-500 shadow-md">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>#{quotation.id.substring(0, 6)}</CardTitle>
                      <CardDescription>{quotation.clients?.name}</CardDescription>
                    </div>
                    <Badge className="bg-yellow-500">Action Required</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center bg-muted p-2 rounded">
                    <span className="text-muted-foreground text-sm">Amount:</span>
                    <span className="font-bold">{formatCurrency(quotation.total_amount)}</span>
                  </div>



                  {quotation.payment_proof && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Proof of Payment</p>

                      {quotation.payment_proof.startsWith('data:') ? (
                        <div className="relative h-32 w-full rounded-md overflow-hidden border bg-black/5 cursor-pointer group" onClick={() => window.open(quotation.payment_proof)}>
                          <img src={quotation.payment_proof} alt="Proof" className="object-contain w-full h-full" />

                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs">Click to Zoom</span>
                          </div>
                        </div>
                      ) : (
                        <a href={quotation.payment_proof} target="_blank" rel="noopener noreferrer" className="text-primary underline">View Proof</a>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => downloadProof(quotation.payment_proof, `PaymentProof_${quotation.id.substring(0, 6)}`)}
                      >
                        <Download className="mr-2 h-4 w-4" /> Download Proof
                      </Button>
                    </div>
                  )}


                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => handleConfirmPayment(quotation)}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve & Book
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus('quotation', quotation.id, 'Rejected')}>
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          {filteredQuotations.filter(q => q.status === 'Pending Review').length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending reviews. All clear!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="proforma" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotations
            .filter(q => q.status === 'Accepted' || q.status === 'Approved')
            .map((quotation) => renderSaleCard(quotation, 'quotation'))}
          {filteredQuotations.filter(q => q.status === 'Accepted' || q.status === 'Approved').length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No accepted proforma invoices found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvoices.map((invoice) => renderSaleCard(invoice, 'invoice'))}
          {filteredInvoices.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchase-orders" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPurchaseOrders.map((po) => (
            <Card key={po.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {po.suppliers?.name || 'Unknown Supplier'}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <CardDescription>Purchase Order</CardDescription>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="xs" className="h-5 px-2 text-muted-foreground text-xs" onClick={() => navigate(`/create-purchase-order?id=${po.id}`)}>
                          Edit
                        </Button>
                        <span className="text-muted-foreground text-[10px]">•</span>
                        <Button variant="ghost" size="xs" className="h-5 px-2 text-destructive text-xs hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeletePO(po.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-blue-500 text-white">
                    {po.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(po.date_created).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-green-600">
                      <Banknote className="h-5 w-5" />
                      <span>{formatCurrency(po.total_amount)}</span>
                    </div>
                  </div>
                  {po.expected_date && (
                    <div className="text-sm text-muted-foreground">
                      Expected: {new Date(po.expected_date).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full"
                      onClick={() => handleDownloadPO(po)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Purchase Order
                    </Button>

                    {po.pdf_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(po.pdf_url, '_blank')}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Source Quote
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredPurchaseOrders.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase orders found.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

