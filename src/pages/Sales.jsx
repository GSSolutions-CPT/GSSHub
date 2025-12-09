import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Search, FileText, Receipt, Banknote, Calendar, User, ArrowRight, Download, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { generateInvoicePDF, generateQuotePDF } from '@/lib/pdf-service'
import { useCurrency } from '@/lib/use-currency.jsx'


export default function Sales() {
  const navigate = useNavigate()
  const { formatCurrency } = useCurrency()
  const [quotations, setQuotations] = useState([])
  const [invoices, setInvoices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchQuotations()
    fetchInvoices()
  }, [])

  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          clients (name, company)
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
          clients (name, company)
        `)
        .order('date_created', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }

  const updateStatus = async (type, id, newStatus) => {
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
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const convertToInvoice = async (quotation) => {
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

      alert('Quotation converted to invoice successfully!')
      fetchQuotations()
      fetchInvoices()
    } catch (error) {
      console.error('Error converting to invoice:', error)
      alert('Error converting quotation. Please try again.')
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
    } catch (error) {
      console.error('Error deleting sale:', error)
      alert('Error deleting item. Ensure no other records depend on it.')
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
              onClick={() => type === 'quotation' ? generateQuotePDF(sale) : generateInvoicePDF(sale)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>

            {(sale.status === 'Draft' || sale.status === 'Cancelled' || sale.status === 'Rejected') && (
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
              {type === 'quotation' && sale.status === 'Approved' && (
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

        <Button onClick={() => navigate('/create-sale')}>
          Create New Sale
        </Button>
      </div>

      {/* Tabs for Quotations and Invoices */}
      <Tabs defaultValue="quotations" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="quotations">
            <FileText className="mr-2 h-4 w-4" />
            Quotations ({quotations.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="mr-2 h-4 w-4" />
            Invoices ({invoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuotations.map((quotation) => renderSaleCard(quotation, 'quotation'))}
          </div>
          {filteredQuotations.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No quotations found' : 'No quotations yet. Create your first quotation to get started.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice) => renderSaleCard(invoice, 'invoice'))}
          </div>
          {filteredInvoices.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No invoices found' : 'No invoices yet. Create your first invoice to get started.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

