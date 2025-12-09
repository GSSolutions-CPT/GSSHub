import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Receipt, Briefcase, Download, CheckCircle, XCircle, Upload, FileSignature } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'react-router-dom'
import { generateInvoicePDF, generateQuotePDF } from '@/lib/pdf-service'
import { useCurrency } from '@/lib/use-currency.jsx'

export default function ClientPortal() {
  const { formatCurrency } = useCurrency()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('client')
  const accessToken = searchParams.get('token')

  const [client, setClient] = useState(null)
  const [quotations, setQuotations] = useState([])
  const [invoices, setInvoices] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (clientId && accessToken) {
      fetchClientData()
    }
  }, [clientId, accessToken])

  const fetchClientData = async () => {
    try {
      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Fetch quotations
      const { data: quotationsData, error: quotationsError } = await supabase
        .from('quotations')
        .select('*')
        .eq('client_id', clientId)
        .order('date_created', { ascending: false })

      if (quotationsError) throw quotationsError
      setQuotations(quotationsData || [])

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('date_created', { ascending: false })

      if (invoicesError) throw invoicesError
      setInvoices(invoicesData || [])

      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (jobsError) throw jobsError
      setJobs(jobsData || [])

      setLoading(false)
    } catch (error) {
      console.error('Error fetching client data:', error)
      setLoading(false)
    }
  }

  const handleQuotationAction = async (quotationId, action) => {
    try {
      const newStatus = action === 'approve' ? 'Approved' : 'Rejected'

      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus })
        .eq('id', quotationId)

      if (error) throw error

      // Log activity
      await supabase.from('activity_log').insert([{
        type: 'Quotation Status Updated',
        description: `Client ${action}d quotation`,
        related_entity_id: quotationId,
        related_entity_type: 'quotation'
      }])

      fetchClientData()
      alert(`Quotation ${action}d successfully!`)
    } catch (error) {
      console.error('Error updating quotation:', error)
      alert('Error updating quotation. Please try again.')
    }
  }

  const handlePaymentUpload = async (invoiceId, file) => {
    // This would integrate with Supabase Storage
    // For now, we'll just update the invoice status
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'Paid',
          metadata: { payment_proof_uploaded: true, upload_date: new Date().toISOString() }
        })
        .eq('id', invoiceId)

      if (error) throw error

      // Log activity
      await supabase.from('activity_log').insert([{
        type: 'Payment Proof Uploaded',
        description: 'Client uploaded payment proof',
        related_entity_id: invoiceId,
        related_entity_type: 'invoice'
      }])

      fetchClientData()
      alert('Payment proof uploaded successfully!')
    } catch (error) {
      console.error('Error uploading payment proof:', error)
      alert('Error uploading payment proof. Please try again.')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-500'
      case 'Sent': return 'bg-blue-500'
      case 'Approved': return 'bg-green-500'
      case 'Rejected': return 'bg-red-500'
      case 'Paid': return 'bg-green-600'
      case 'Overdue': return 'bg-red-600'
      case 'Pending': return 'bg-yellow-500'
      case 'In Progress': return 'bg-blue-500'
      case 'Completed': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getWorkflowStatus = () => {
    const hasQuotation = quotations.some(q => q.status === 'Approved')
    const hasJob = jobs.some(j => j.status === 'Completed')
    const hasInvoice = invoices.some(i => i.status === 'Paid')

    return {
      quotation: hasQuotation,
      job: hasJob,
      invoice: hasInvoice
    }
  }

  const workflowStatus = getWorkflowStatus()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading your portal...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Invalid access link. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Global Security Solutions Client Portal</h1>
              <p className="text-muted-foreground mt-1">Welcome, {client.name}</p>
            </div>
            <div className="text-right">
              {client.company && (
                <p className="text-sm font-medium">{client.company}</p>
              )}
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Workflow Status Tracker */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
            <CardDescription>Track your project progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${workflowStatus.quotation ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium mt-2">Quotation</p>
                <p className="text-xs text-muted-foreground">
                  {workflowStatus.quotation ? 'Approved' : 'Pending'}
                </p>
              </div>

              <div className={`flex-1 h-1 ${workflowStatus.quotation ? 'bg-green-500' : 'bg-gray-300'}`} />

              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${workflowStatus.job ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium mt-2">Job</p>
                <p className="text-xs text-muted-foreground">
                  {workflowStatus.job ? 'Completed' : 'Scheduled'}
                </p>
              </div>

              <div className={`flex-1 h-1 ${workflowStatus.job ? 'bg-green-500' : 'bg-gray-300'}`} />

              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${workflowStatus.invoice ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium mt-2">Invoice</p>
                <p className="text-xs text-muted-foreground">
                  {workflowStatus.invoice ? 'Paid' : 'Pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Documents and Jobs */}
        <Tabs defaultValue="quotations" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="quotations">
              <FileText className="mr-2 h-4 w-4" />
              Quotations ({quotations.length})
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <Receipt className="mr-2 h-4 w-4" />
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="jobs">
              <Briefcase className="mr-2 h-4 w-4" />
              Jobs ({jobs.length})
            </TabsTrigger>
          </TabsList>

          {/* Quotations Tab */}
          <TabsContent value="quotations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quotations.map((quotation) => (
                <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Quotation #{quotation.id.substring(0, 8)}
                        </CardTitle>
                        <CardDescription>
                          Created {new Date(quotation.date_created).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className={`${getStatusColor(quotation.status)} text-white`}>
                        {quotation.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Amount:</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(quotation.total_amount)}
                        </span>
                      </div>

                      {quotation.valid_until && (
                        <div className="text-sm text-muted-foreground">
                          Valid until: {new Date(quotation.valid_until).toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => generateQuotePDF(quotation)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </div>

                      {quotation.status === 'Sent' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleQuotationAction(quotation.id, 'approve')}
                            className="flex-1"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleQuotationAction(quotation.id, 'decline')}
                            className="flex-1"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {quotations.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No quotations available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Invoice #{invoice.id.substring(0, 8)}
                        </CardTitle>
                        <CardDescription>
                          Created {new Date(invoice.date_created).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className={`${getStatusColor(invoice.status)} text-white`}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Amount Due:</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(invoice.total_amount)}
                        </span>
                      </div>

                      {invoice.due_date && (
                        <div className="text-sm text-muted-foreground">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => generateInvoicePDF(invoice)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </div>

                      {(invoice.status === 'Sent' || invoice.status === 'Overdue') && (
                        <div className="space-y-2">
                          <Button size="sm" className="w-full">
                            Pay Now
                          </Button>
                          <div className="relative">
                            <input
                              type="file"
                              id={`payment-${invoice.id}`}
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handlePaymentUpload(invoice.id, e.target.files[0])
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => document.getElementById(`payment-${invoice.id}`).click()}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Payment Proof
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {invoices.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No invoices available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Job #{job.id.substring(0, 8)}
                        </CardTitle>
                        <CardDescription>
                          Created {new Date(job.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className={`${getStatusColor(job.status)} text-white`}>
                        {job.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {job.scheduled_datetime && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Scheduled:</span>
                          <br />
                          <span className="font-medium">
                            {new Date(job.scheduled_datetime).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {job.assigned_technicians && job.assigned_technicians.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Assigned to:</span>
                          <br />
                          <span className="font-medium">
                            {job.assigned_technicians.join(', ')}
                          </span>
                        </div>
                      )}

                      {job.notes && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Notes:</span>
                          <br />
                          <span>{job.notes}</span>
                        </div>
                      )}

                      {job.completion_notes && (
                        <div className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <span className="text-muted-foreground">Completion Notes:</span>
                          <br />
                          <span>{job.completion_notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {jobs.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No jobs scheduled</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="container mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>© 2025 Global Security Solutions. All rights reserved.</p>
          <p className="mt-1">Need help? Contact support@gssolutions.co.za</p>
        </div>
      </footer>
    </div>
  )
}
