import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, FileText, Receipt, Banknote, Calendar, Download, Trash2, CheckCircle, Package, FileSignature, AlertCircle, Share2, Wrench } from 'lucide-react'
import InstallationDetails from '@/components/InstallationDetails'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { generateInvoicePDF, generateQuotePDF, generatePurchaseOrderPDF } from '@/lib/pdf-service'
import { shareLink } from '@/lib/share-utils'
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
  const [installationDetailsOpen, setInstallationDetailsOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)

  // Calculate Summary Stats
  const activeQuotes = quotations.filter(q => ['Draft', 'Sent', 'Pending Review'].includes(q.status))
  const activeQuoteValue = activeQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0)

  const outstandingInvoices = invoices.filter(i => ['Sent', 'Overdue'].includes(i.status))
  const outstandingValue = outstandingInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0)

  const paidInvoices = invoices.filter(i => i.status === 'Paid')
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0)

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
        .update({ status: 'Accepted', admin_approved: true })
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

  const handleRequestPayment = async (quotation) => {
    const toastId = toast.loading('Sending payment request...')
    try {
      // 1. Update DB flag
      const { error } = await supabase
        .from('quotations')
        .update({ payment_request_sent: true })
        .eq('id', quotation.id)

      if (error) throw error

      // 2. Log Activity
      await supabase.from('activity_log').insert([{
        type: 'Payment Requested',
        description: `Outstanding payment requested for Quote #${quotation.id.substring(0, 6)}`,
        related_entity_id: quotation.id,
        related_entity_type: 'quotation'
      }])

      // 3. (Optional) Simulate Email Sending
      console.log('Payment request email triggered for:', quotation.clients?.email)

      fetchQuotations()
      toast.success('Payment request sent to client!', { id: toastId })
    } catch (error) {
      console.error('Error requesting payment:', error)
      toast.error('Failed to update status', { id: toastId })
    }
  }

  const handleApproveFinalPayment = async (quotation) => {
    const toastId = toast.loading('Approving final payment...')
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ final_payment_approved: true })
        .eq('id', quotation.id)

      if (error) throw error

      await supabase.from('activity_log').insert([{
        type: 'Final Payment Approved',
        description: `Admin approved final payment for Quote #${quotation.id.substring(0, 6)}`,
        related_entity_id: quotation.id,
        related_entity_type: 'quotation'
      }])

      fetchQuotations()
      toast.success('Final payment approved! You can now convert to invoice.', { id: toastId })
    } catch (error) {
      console.error('Error approving payment:', error)
      toast.error('Failed to approve payment', { id: toastId })
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
        // Fetch site plan if exists
        const { data: sitePlanData } = await supabase
          .from('site_plans')
          .select('flattened_url')
          .eq('quotation_id', sale.id)
          .single()

        if (sitePlanData?.flattened_url) {
          fullData.site_plan_url = sitePlanData.flattened_url
        }

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
    <Card key={sale.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border overflow-hidden relative">
      <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(sale.status)}`}></div>
      <CardHeader className="pb-3 pl-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
              {type === 'quotation' ? <FileText className="h-5 w-5 text-blue-500" /> : <Receipt className="h-5 w-5 text-purple-500" />}
              {sale.clients?.name || 'Unknown Client'}
            </CardTitle>
            {sale.clients?.company && (
              <CardDescription className="text-slate-500 font-medium">{sale.clients.company}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy Client Portal Link"
              onClick={(e) => {
                e.stopPropagation()
                const link = `${window.location.origin}/portal?client=${sale.client_id}`
                shareLink('GSS Client Portal', 'Access your client portal here:', link)
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Badge className={`${getStatusColor(sale.status)} text-white shadow-sm px-3 py-1`}>
              {sale.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-6">
        <div className="space-y-4">
          <div className="flex items-end justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(sale.date_created).toLocaleDateString()}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
              <div className="flex items-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                <span className="text-xs text-muted-foreground self-start mt-1">R</span>
                {formatCurrency(sale.total_amount).replace('R', '')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {sale.profit_estimate && (
              <div>
                Profit: <span className="text-green-600 font-medium">{formatCurrency(sale.profit_estimate)}</span>
              </div>
            )}
            {type === 'quotation' && sale.valid_until && (
              <div>Valid: {new Date(sale.valid_until).toLocaleDateString()}</div>
            )}
            {type === 'invoice' && sale.due_date && (
              <div>Due: {new Date(sale.due_date).toLocaleDateString()}</div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {/* Primary Actions based on status */}
            {type === 'quotation' && (
              <>
                {['Draft', 'Sent', 'Accepted', 'Approved'].includes(sale.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 text-blue-700"
                    onClick={() => navigate(`/create-sale?edit=${sale.id}&type=quotation`)}
                  >
                    Edit
                  </Button>
                )}
                {sale.status === 'Draft' && (
                  <Button size="sm" onClick={() => updateStatus('quotation', sale.id, 'Sent')} className="w-full bg-blue-600 hover:bg-blue-700">Send</Button>
                )}
                {sale.status === 'Sent' && (
                  <Button size="sm" onClick={() => updateStatus('quotation', sale.id, 'Approved')} className="w-full bg-green-600 hover:bg-green-700">Approve</Button>
                )}

                {/* Payment Request Workflow */}
                {(sale.status === 'Approved' || sale.status === 'Accepted') && (
                  <>
                    {!sale.payment_request_sent ? (
                      <Button
                        size="sm"
                        onClick={() => handleRequestPayment(sale)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        Request Payment
                      </Button>
                    ) : (
                      // If requested, check if verified
                      sale.final_payment_approved ? (
                        <Button size="sm" onClick={() => convertToInvoice(sale)} className="w-full bg-purple-600 hover:bg-purple-700">Convert</Button>
                      ) : (
                        // If not verified, check if proof uploaded
                        sale.final_payment_proof ? (
                          <div className="flex gap-1 w-full">
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-xs" onClick={() => handleApproveFinalPayment(sale)}>
                              Approve Pay
                            </Button>
                            <Button size="sm" variant="outline" className="px-2" onClick={() => downloadProof(sale.final_payment_proof, `FinalProof_${sale.id.substring(0, 6)}`)} title="View Proof">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" disabled variant="outline" className="w-full text-muted-foreground border-dashed">
                            Waiting for Payment
                          </Button>
                        )
                      )
                    )}
                  </>
                )}
              </>
            )}

            {type === 'invoice' && (
              <>
                {sale.status !== 'Paid' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/create-sale?edit=${sale.id}&type=invoice`)}
                  >
                    Edit
                  </Button>
                )}
                {sale.status === 'Draft' && (
                  <Button size="sm" onClick={() => updateStatus('invoice', sale.id, 'Sent')} className="w-full">Send</Button>
                )}
                {(sale.status === 'Sent' || sale.status === 'Overdue') && (
                  <Button size="sm" onClick={() => updateStatus('invoice', sale.id, 'Paid')} className="w-full bg-green-600 hover:bg-green-700">Mark Paid</Button>
                )}
                {sale.status === 'Paid' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    onClick={() => {
                      setSelectedInvoiceId(sale.id)
                      setInstallationDetailsOpen(true)
                    }}
                  >
                    <Wrench className="h-4 w-4 mr-1" />
                    Installation
                  </Button>
                )}
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => handleDownloadPDF(sale, type)}
            >
              <Download className="h-4 w-4" />
            </Button>

            {!(type === 'invoice' && sale.status === 'Paid') && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-red-500 hover:bg-red-50"
                onClick={() => handleDelete(sale.id, type)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {sale.payment_proof && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-green-600 hover:bg-green-50"
                onClick={() => downloadProof(sale.payment_proof, `Proof_${sale.id.substring(0, 6)}`)}
                title="Download Proof"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}

          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium">Active Quotes</p>
            <h3 className="text-3xl font-bold mt-1">{activeQuotes.length}</h3>
            <p className="text-blue-100 text-xs mt-2">Value: {formatCurrency(activeQuoteValue)}</p>
          </div>
          <FileText className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white opacity-10 rotate-12" />
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-purple-100 text-sm font-medium">Outstanding Invoices</p>
            <h3 className="text-3xl font-bold mt-1">{outstandingInvoices.length}</h3>
            <p className="text-purple-100 text-xs mt-2">Due: {formatCurrency(outstandingValue)}</p>
          </div>
          <AlertCircle className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white opacity-10 rotate-12" />
        </div>
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-medium">Revenue (All Time)</p>
            <h3 className="text-3xl font-bold mt-1">{formatCurrency(totalRevenue)}</h3>
            <p className="text-emerald-100 text-xs mt-2">{paidInvoices.length} Paid Invoices</p>
          </div>
          <Banknote className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white opacity-10 rotate-12" />
        </div>
      </div>
      {/* Header Actions */}
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button onClick={() => navigate('/create-sale')} className="flex-1 md:flex-none">
            Create New Sale
          </Button>
          <Button onClick={() => navigate('/create-purchase-order')} variant="outline" className="flex-1 md:flex-none">
            <Package className="mr-2 h-4 w-4 md:hidden lg:inline" />
            <span className="md:hidden lg:inline">Create </span>PO
          </Button>
          <Button onClick={() => navigate('/contracts')} variant="outline" className="flex-1 md:flex-none">
            <FileSignature className="mr-2 h-4 w-4 md:hidden lg:inline" />
            Contracts
          </Button>
        </div>
      </div>

      {/* Tabs for Quotations, Proforma, and Invoices */}
      <Tabs defaultValue="pending" className="space-y-6">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="w-max inline-flex">
            <TabsTrigger value="pending" className="relative">
              Pending Review Quotes
              {quotations.filter(q => q.status === 'Pending Review').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="quotations">Quotes</TabsTrigger>
            <TabsTrigger value="proforma">Proforma Invoices</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="quotations" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotations
            .filter(q => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Rejected' || q.status === 'Cancelled')
            .map((quotation) => renderSaleCard(quotation, 'quotation'))}
          {filteredQuotations.filter(q => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Rejected' || q.status === 'Cancelled').length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">No active quotations</h3>
              <p className="mb-6 max-w-sm text-center">Create a new quote to get started with your sales pipeline.</p>
              <Button onClick={() => navigate('/create-sale')}>Create Quote</Button>
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
                    <Badge className="bg-yellow-500 text-white shadow-sm animate-pulse">Action Required</Badge>
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
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">All clear!</h3>
              <p className="text-center">No quotations are currently pending review.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="proforma" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotations
            .filter(q => q.status === 'Accepted' || q.status === 'Approved')
            .map((quotation) => renderSaleCard(quotation, 'quotation'))}
          {filteredQuotations.filter(q => q.status === 'Accepted' || q.status === 'Approved').length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">No accepted quotes</h3>
              <p className="text-center">Approved quotations converted to Proforma invoices will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvoices.map((invoice) => renderSaleCard(invoice, 'invoice'))}
          {filteredInvoices.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full mb-4">
                <Receipt className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">No invoices generated</h3>
              <p className="mb-6 max-w-sm text-center">Invoices from converted quotes will appear here.</p>
              <Button variant="outline" onClick={() => navigate('/create-sale?type=invoice')}>Draft Invoice</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchase-orders" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPurchaseOrders.map((po) => (
            <Card key={po.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-1 h-full bg-blue-500`}></div>
              <CardHeader className="pb-3 pl-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <Package className="h-5 w-5 text-indigo-500" />
                      {po.suppliers?.name || 'Unknown Supplier'}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <CardDescription className="text-slate-500 font-medium">Purchase Order</CardDescription>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="xs" className="h-5 px-2 text-muted-foreground text-xs hover:text-blue-600" onClick={() => navigate(`/create-purchase-order?id=${po.id}`)}>
                          Edit
                        </Button>
                        <span className="text-muted-foreground text-[10px]">•</span>
                        <Button variant="ghost" size="xs" className="h-5 px-2 text-destructive text-xs hover:text-white hover:bg-destructive" onClick={() => handleDeletePO(po.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-blue-500 text-white shadow-sm px-3 py-1">
                    {po.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pl-6">
                <div className="space-y-4">
                  <div className="flex items-end justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(po.date_created).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
                      <div className="flex items-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                        <span className="text-xs text-muted-foreground self-start mt-1">R</span>
                        {formatCurrency(po.total_amount).replace('R', '')}
                      </div>
                    </div>
                  </div>

                  {po.expected_date && (
                    <div className="text-xs text-muted-foreground">
                      Expected: {new Date(po.expected_date).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="default" // keep default or use outline with color? Default blue pops well here
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => handleDownloadPO(po)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Purchase Order
                    </Button>

                    {po.pdf_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
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
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
                <Package className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">No purchase orders</h3>
              <p className="mb-6 max-w-sm text-center">Manage your supplier orders here.</p>
              <Button onClick={() => navigate('/create-purchase-order')}>Create New Order</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Installation Details Modal */}
      <Dialog open={installationDetailsOpen} onOpenChange={setInstallationDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Installation Details</DialogTitle>
            <DialogDescription>
              Manage installation photos and serial numbers for Invoice #{selectedInvoiceId?.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoiceId && (
            <InstallationDetails invoiceId={selectedInvoiceId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

