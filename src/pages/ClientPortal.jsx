import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, CheckCircle, Upload, PenTool } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'react-router-dom'
import { generateInvoicePDF, generateQuotePDF } from '@/lib/pdf-service'
import { useCurrency } from '@/lib/use-currency.jsx'
import { SignaturePad } from '@/components/ui/signature-pad'
import { toast } from 'sonner'
import { useSettings } from '@/lib/use-settings.jsx'

export default function ClientPortal() {
  const { formatCurrency } = useCurrency()
  const { settings } = useSettings()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('client')
  const accessToken = searchParams.get('token')

  const [client, setClient] = useState(null)
  const [quotations, setQuotations] = useState([])
  const [invoices, setInvoices] = useState([])

  const [loading, setLoading] = useState(true)

  // Acceptance Workflow State
  const [acceptingQuote, setAcceptingQuote] = useState(null)
  const [step, setStep] = useState(0) // 0: Closed, 1: Sign, 2: Payment Info
  const [signature, setSignature] = useState(null)

  const fetchClientData = useCallback(async () => {
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
        .select(`
          *,
          quotations (payment_proof)
        `)
        .eq('client_id', clientId)
        .order('date_created', { ascending: false })

      // Flatten payment_proof
      const processedInvoices = (invoicesData || []).map(inv => ({
        ...inv,
        payment_proof: inv.quotations?.payment_proof || null
      }))

      if (invoicesError) throw invoicesError
      setInvoices(processedInvoices)

      await supabase
        .from('jobs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })


      setLoading(false)
    } catch (error) {
      console.error('Error fetching client data:', error)
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (clientId && accessToken) {
      fetchClientData()
    }
  }, [clientId, accessToken, fetchClientData])

  const initiateAcceptance = (quote) => {
    setAcceptingQuote(quote)
    setStep(1)
    setSignature(null)
  }

  const handleSignatureSave = (dataUrl) => {
    setSignature(dataUrl)
  }

  /* 
   * NEW WORKFLOW: 
   * 1. Validate Signature
   * 2. Move to Step 2 (Payment Upload)
   * 3. Do NOT update DB yet. DB Update happens after Payment Upload in Step 2.
   */
  const submitAcceptance = () => {
    if (!signature) {
      toast.error('Please sign the document first.')
      return
    }
    // Proceed to Payment Step
    setStep(2)
  }

  const downloadProof = (dataUrl, filename) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleProofUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64String = event.target.result
      await submitFinalAcceptance(base64String)
    }
    reader.readAsDataURL(file)
  }

  const submitFinalAcceptance = async (paymentProofBase64) => {
    const toastId = toast.loading('Submitting acceptance and payment proof...')
    try {
      // Validate inputs
      if (!paymentProofBase64) {
        throw new Error('Payment proof is required')
      }
      if (!signature) {
        throw new Error('Signature is required')
      }

      const { error } = await supabase
        .from('quotations')
        .update({
          status: 'Pending Review',
          client_signature: signature,
          payment_proof: paymentProofBase64,
          accepted_at: new Date().toISOString()
        })
        .eq('id', acceptingQuote.id)

      if (error) throw error

      await supabase.from('activity_log').insert([{
        type: 'Quotation Pending Review',
        description: `Client signed and uploaded proof for quotation #${acceptingQuote.id.substring(0, 6)}`,
        related_entity_id: acceptingQuote.id,
        related_entity_type: 'quotation'
      }])

      setStep(3) // Move to Success/Review Message
      fetchClientData()
      toast.success('Submitted for review!', { id: toastId })
    } catch (error) {
      console.error('Error submitting final acceptance:', error)
      toast.error(`Failed to submit: ${error.message}`, { id: toastId })
    }
  }



  const handleDecline = async (quote) => {
    if (!confirm('Are you sure you want to decline this quotation?')) return

    try {
      await supabase.from('quotations').update({ status: 'Rejected' }).eq('id', quote.id)
      fetchClientData()
      toast.info('Quotation declined')
    } catch (e) { console.error(e) }
  }


  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-500'
      case 'Sent': return 'bg-blue-500'
      case 'Approved': case 'Accepted': return 'bg-green-500'
      case 'Rejected': return 'bg-red-500'
      case 'Paid': return 'bg-green-600'
      case 'Overdue': return 'bg-red-600'
      default: return 'bg-gray-500'
    }
  }





  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  if (!client) return <div className="min-h-screen bg-background flex items-center justify-center">Invalid Link</div>

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Global Security Solutions</h1>
            <p className="text-muted-foreground mt-1">Client Portal • {client.name}</p>
          </div>
          <div className="text-right">
            {client.company && <p className="text-sm font-medium">{client.company}</p>}
            <p className="text-sm text-muted-foreground">{client.email}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Workflow Tracker (Same as before) */}

        <Tabs defaultValue="quotations" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-3">
            <TabsTrigger value="quotations">Quotes ({quotations.filter(q => q.status === 'Sent' || q.status === 'Draft').length})</TabsTrigger>
            <TabsTrigger value="proforma">Proforma ({quotations.filter(q => q.status === 'Accepted' || q.status === 'Approved').length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="quotations" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quotations
              .filter(q => q.status === 'Sent' || q.status === 'Draft' || q.status === 'Rejected')
              .map((quotation) => (
                <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between">
                      <div>
                        <CardTitle>#{quotation.id.substring(0, 6)}</CardTitle>
                        <CardDescription>{new Date(quotation.date_created).toLocaleDateString()}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(quotation.status)}>{quotation.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(quotation.total_amount)}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => generateQuotePDF({ ...quotation, clients: client }, settings)}>
                        <Download className="mr-2 h-4 w-4" />
                        Quote PDF
                      </Button>
                    </div>

                    {quotation.status === 'Sent' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" onClick={() => initiateAcceptance(quotation)}>
                          <PenTool className="mr-2 h-4 w-4" /> Accept & Sign
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDecline(quotation)}>
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            {quotations.filter(q => q.status === 'Sent' || q.status === 'Draft').length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">No open quotations.</p>
            )}
          </TabsContent>

          <TabsContent value="proforma" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quotations
              .filter(q => q.status === 'Accepted' || q.status === 'Approved')
              .map((quotation) => (
                <Card key={quotation.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex justify-between">
                      <div>
                        <CardTitle>PROFORMA #{quotation.id.substring(0, 6)}</CardTitle>
                        <CardDescription>Accepted on {new Date(quotation.accepted_at || quotation.date_created).toLocaleDateString()}</CardDescription>
                      </div>
                      <Badge className="bg-green-600">Proforma Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(quotation.total_amount)}</span>
                    </div>

                    <div className="bg-muted p-3 rounded text-sm text-center">
                      <p>Deposit Required: <strong>{formatCurrency(quotation.total_amount * 0.75)}</strong></p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button className="w-full" onClick={() => generateQuotePDF({ ...quotation, clients: client }, settings)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Proforma Invoice
                      </Button>

                      {quotation.payment_proof && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => downloadProof(quotation.payment_proof, `PaymentProof_${quotation.id.substring(0, 6)}`)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Proof of Payment
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            {quotations.filter(q => q.status === 'Accepted' || q.status === 'Approved').length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">No proforma invoices yet.</p>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {invoices
              .filter(inv => inv.status !== 'Draft') // Hide Draft invoices (often duplicates of Proforma process)
              .map((invoice) => (
                <Card key={invoice.id}>
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle>INV-#{invoice.id.substring(0, 6)}</CardTitle>
                      <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Due:</span>
                      <span className="text-xl font-bold">{formatCurrency(invoice.total_amount)}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="w-full" onClick={() => generateInvoicePDF({ ...invoice, clients: client }, settings)}>
                        <Download className="mr-2 h-4 w-4" /> Download Invoice
                      </Button>

                      {invoice.payment_proof && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => downloadProof(invoice.payment_proof, `PaymentProof_${invoice.id.substring(0, 6)}`)}
                        >
                          <Download className="mr-2 h-4 w-4" /> Download Proof of Payment
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="jobs">
            {/* Jobs content same as before but minimal for brevity */}
            <p className="text-muted-foreground">Job tracking active.</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Acceptance Modal */}
      <Dialog open={step > 0} onOpenChange={(open) => !open && setStep(0)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 1 ? 'Sign Acceptance' : 'Next Steps'}
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? 'Please sign below to accept this quotation and proceed to payment.'
                : 'Quotation accepted! Here are the banking details for the deposit.'}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <SignaturePad onSave={handleSignatureSave} />
              <p className="text-xs text-muted-foreground">
                By signing, you agree to the Terms & Conditions outlined in the document.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(0)}>Cancel</Button>
                <Button onClick={submitAcceptance} disabled={!signature}>Confirm & Sign</Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p className="font-semibold text-lg">Banking Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Account Name:</span> <span>{settings.bankAccountHolder || 'GSS Solutions'}</span>
                  <span className="text-muted-foreground">Bank:</span> <span>{settings.bankName || 'FNB / RMB'}</span>
                  <span className="text-muted-foreground">Account Type:</span> <span>{settings.bankAccountType || 'Cheque Account'}</span>
                  <span className="text-muted-foreground">Account:</span> <span>{settings.bankAccountNumber || '63182000223'}</span>
                  <span className="text-muted-foreground">Branch:</span> <span>{settings.bankBranchCode || '250655'}</span>
                  <span className="text-muted-foreground">Ref:</span> <span className="font-mono bg-white px-1 rounded border">{settings.bankReference || acceptingQuote?.id.substring(0, 6)}</span>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm">
                  Please make a <strong>75% deposit ({formatCurrency((acceptingQuote?.total_amount || 0) * 0.75)})</strong> to secure your booking.
                </p>
                <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Upload Proof of Payment</p>
                  <p className="text-xs text-muted-foreground">Required to finalize acceptance</p>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    onChange={handleProofUpload}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(0)}>Cancel</Button>
              </DialogFooter>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold">Submission Received!</h3>
              <p className="text-muted-foreground">
                Thank you! We have received your signature and payment proof.
                <br />
                Our team will review your submission shortly. Once approved, you will receive a confirmation and your Proforma Invoice.
              </p>
              <Button onClick={() => setStep(0)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
