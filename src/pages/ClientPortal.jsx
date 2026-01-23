import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, CheckCircle, Upload, MessageCircle, Phone, Mail, HelpCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'react-router-dom'
import { generateInvoicePDF, generateQuotePDF } from '@/lib/pdf-service'
import { useCurrency } from '@/lib/use-currency.jsx'
import { SignaturePad } from '@/components/ui/signature-pad'
import { toast } from 'sonner'
import { useSettings } from '@/lib/use-settings.jsx'
import { InstallPrompt } from '@/components/InstallPrompt'
import { cn } from '@/lib/utils'

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
  const [contactOpen, setContactOpen] = useState(false)

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

  // Helpers for links
  const companyPhone = settings.companyPhone || '0629558559'
  const companyEmail = settings.companyEmail || 'Kyle@GSSolutions.co.za'
  const whatsappUrl = `https://wa.me/${companyPhone.replace(/\s+/g, '')}`


  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  if (!client) return <div className="min-h-screen bg-background flex items-center justify-center">Invalid Link</div>

  /* 
   * NEW DASHBOARD COMPONENTS
   */
  const DashboardOverview = () => {
    // Calculate Stats
    const totalOutstanding = invoices
      .filter(i => i.status !== 'Paid' && i.status !== 'Draft')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0) +
      quotations
        .filter(q => q.status === 'Accepted' || q.status === 'Approved')
        .reduce((sum, q) => {
          const isApproved = q.status === 'Approved' || q.admin_approved
          return sum + (q.total_amount * (isApproved ? 0.25 : 0.75))
        }, 0)

    const activeQuotes = quotations
      .filter(q => q.status === 'Sent')
      .length

    const pendingActions = []
    if (activeQuotes > 0) pendingActions.push({ type: 'quote', count: activeQuotes, label: 'Review Pending Quotes' })
    if (totalOutstanding > 0) pendingActions.push({ type: 'invoice', count: 1, label: 'Settle Outstanding Invoices' })

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">Welcome back, {client.name.split(' ')[0]}</h2>
            <p className="text-slate-300">Here is what is happening with your account today.</p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                <p className="text-xs text-slate-300 uppercase tracking-wider">Outstanding Balance</p>
                <p className="text-2xl font-bold mt-1 text-white">{formatCurrency(totalOutstanding)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                <p className="text-xs text-slate-300 uppercase tracking-wider">Active Quotes</p>
                <p className="text-2xl font-bold mt-1 text-white">{activeQuotes}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                <p className="text-xs text-slate-300 uppercase tracking-wider">Active Jobs</p>
                <p className="text-2xl font-bold mt-1 text-white">0</p>
              </div>
            </div>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Action Center */}
        {pendingActions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Action Required</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotations.filter(q => q.status === 'Sent').map(q => (
                <div key={q.id} className="bg-white dark:bg-card border border-l-4 border-l-blue-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-all flex justify-between items-center group">
                  <div>
                    <p className="font-semibold text-foreground">Quote #{q.id.substring(0, 6)} needs review</p>
                    <p className="text-sm text-muted-foreground">Created {new Date(q.date_created).toLocaleDateString()}</p>
                  </div>
                  <Button onClick={() => document.getElementById('tab-quotations').click()}>View Quote</Button>
                </div>
              ))}

              {invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').map(inv => (
                <div key={inv.id} className="bg-white dark:bg-card border border-l-4 border-l-orange-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-all flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-foreground">Invoice #{inv.id.substring(0, 6)} is due</p>
                    <p className="text-sm text-muted-foreground font-medium text-orange-600">Due: {formatCurrency(inv.total_amount)}</p>
                  </div>
                  <Button variant="outline" onClick={() => document.getElementById('tab-invoices').click()}>Pay Now</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links / Services */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 border-2 border-dashed" onClick={() => setContactOpen(true)}>
              <HelpCircle className="h-6 w-6 text-slate-500" />
              <span>Support</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 border-2 border-dashed" onClick={() => window.open(whatsappUrl, '_blank')}>
              <MessageCircle className="h-6 w-6 text-green-500" />
              <span>WhatsApp</span>
            </Button>
          </div>
        </div>

      </div>
    )
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
  if (!client) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
      <p className="text-slate-500">Invalid or expired portal link. Please contact support.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background relative font-sans">
      <header className="bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
              GS
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-none">Client Portal</h1>
              <p className="text-xs text-muted-foreground">Global Security Solutions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="hidden md:flex" onClick={() => setContactOpen(true)}>
              <HelpCircle className="mr-2 h-4 w-4" /> Help
            </Button>
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs" title={client.name}>
              {client.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8 pb-32 max-w-7xl">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-white/50 backdrop-blur p-1 rounded-xl border shadow-sm w-full md:w-auto grid grid-cols-4 h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg py-2.5 transition-all">Overview</TabsTrigger>
            <TabsTrigger id="tab-quotations" value="quotations" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg py-2.5 transition-all">Quotes</TabsTrigger>
            <TabsTrigger value="proforma" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg py-2.5 transition-all">Proforma</TabsTrigger>
            <TabsTrigger id="tab-invoices" value="invoices" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg py-2.5 transition-all">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="quotations" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {quotations
              .filter(q => q.status === 'Sent' || q.status === 'Draft' || q.status === 'Rejected')
              .map((quotation) => (
                <Card key={quotation.id} className="group hover:shadow-xl transition-all duration-300 border-slate-200/60 overflow-hidden">
                  <div className={`h-1 w-full ${getStatusColor(quotation.status)}`}></div>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">#{quotation.id.substring(0, 6)}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(quotation.date_created).toLocaleDateString()}</span>
                        </div>
                        <CardTitle className="text-xl">Security System Quote</CardTitle>
                      </div>
                      <Badge className={getStatusColor(quotation.status)}>{quotation.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-2">
                    <div className="flex justify-between items-end border-b pb-4 border-dashed">
                      <span className="text-muted-foreground text-sm">Total Value</span>
                      <span className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(quotation.total_amount)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="w-full hover:bg-slate-50 transition-colors" onClick={() => generateQuotePDF({ ...quotation, clients: client }, settings)}>
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                      {quotation.status === 'Sent' && (
                        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20" onClick={() => initiateAcceptance(quotation)}>
                          Accept & Sign
                        </Button>
                      )}
                    </div>

                    {quotation.status === 'Sent' && (
                      <div className="text-center">
                        <button onClick={() => handleDecline(quotation)} className="text-xs text-red-500 hover:underline">
                          Decline this text
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            {quotations.filter(q => q.status === 'Sent' || q.status === 'Draft').length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed text-center">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
                <p className="text-slate-500">You have no pending quotations to review.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="proforma" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {quotations
              .filter(q => q.status === 'Accepted' || q.status === 'Approved')
              .map((quotation) => (
                <Card key={quotation.id} className="hover:shadow-lg transition-all border-l-4 border-l-green-500 bg-white">
                  <CardHeader>
                    <div className="flex justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          PROFORMA <span className="text-sm font-normal text-muted-foreground">Quotation #{quotation.id.substring(0, 6)}</span>
                        </CardTitle>
                        <CardDescription>Accepted on {new Date(quotation.accepted_at || quotation.date_created).toLocaleDateString()}</CardDescription>
                      </div>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="text-xl font-bold text-slate-900">{formatCurrency(quotation.total_amount)}</span>
                    </div>

                    <div className={cn(
                      "p-3 rounded text-sm text-center border",
                      (quotation.status === 'Approved' || quotation.admin_approved)
                        ? "bg-slate-100 text-slate-800 border-slate-200"
                        : "bg-yellow-50 text-yellow-800 border-yellow-100"
                    )}>
                      {(quotation.status === 'Approved' || quotation.admin_approved) ? (
                        <p>Outstanding Balance: <strong>{formatCurrency(quotation.total_amount * 0.25)}</strong></p>
                      ) : (
                        <p>
                          {quotation.payment_proof ? "Payment Review Pending: " : "Deposit Required: "}
                          <strong>{formatCurrency(quotation.total_amount * 0.75)}</strong>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button className="w-full" variant="outline" onClick={() => generateQuotePDF({ ...quotation, clients: client }, settings)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Proforma Invoice
                      </Button>

                      {quotation.payment_proof && (
                        <Button
                          variant="ghost"
                          className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => downloadProof(quotation.payment_proof, `PaymentProof_${quotation.id.substring(0, 6)}`)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Payment Proof Uploaded
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="invoices" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {invoices
              .filter(inv => inv.status !== 'Draft')
              .map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-lg transition-all border-slate-200">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="font-bold text-slate-500">INV</span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">Invoice #{invoice.id.substring(0, 6)}</CardTitle>
                          <p className="text-xs text-muted-foreground">{new Date(invoice.date_created).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-y border-dashed">
                      <span className="text-muted-foreground">Amount Due</span>
                      <span className="text-xl font-bold">{formatCurrency(invoice.total_amount)}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button className="w-full" onClick={() => generateInvoicePDF({ ...invoice, clients: client }, settings)}>
                        <Download className="mr-2 h-4 w-4" /> Download Tax Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>

      {/* Acceptance Modal - Kept same logic, just styled */}
      <Dialog open={step > 0} onOpenChange={(open) => !open && setStep(0)}>
        <DialogContent className="sm:max-w-md">
          {/* ... (Existing Modal Content logic is fine, maybe slight style tweaks if needed later) ... */}
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
              <div className="border rounded-lg overflow-hidden">
                <SignaturePad onSave={handleSignatureSave} />
              </div>
              <p className="text-xs text-muted-foreground text-center bg-slate-50 p-2 rounded">
                By signing, you agree to the Terms & Conditions outlined in the document.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(0)}>Cancel</Button>
                <Button onClick={submitAcceptance} disabled={!signature} className="bg-green-600 hover:bg-green-700 text-white">Confirm & Sign</Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl text-sm space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <span className="font-bold">1</span>
                  </div>
                  <p className="font-semibold text-lg text-slate-800">Banking Details</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pl-10 text-slate-600">
                  <span className="text-muted-foreground">Bank:</span> <span className="font-medium text-slate-900">{settings.bankName || 'FNB / RMB'}</span>
                  <span className="text-muted-foreground">Account:</span> <span className="font-medium text-slate-900">{settings.bankAccountNumber || '63182000223'}</span>
                  <span className="text-muted-foreground">Branch:</span> <span>{settings.bankBranchCode || '250655'}</span>
                  <span className="text-muted-foreground">Ref:</span> <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900 select-all">{settings.bankReference || acceptingQuote?.id.substring(0, 6)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <span className="font-bold">2</span>
                  </div>
                  <p className="font-semibold text-slate-800">Upload Proof of Payment</p>
                </div>

                <div className="pl-10">
                  <p className="text-sm text-slate-500 mb-3">
                    Please make a <strong>75% deposit ({formatCurrency((acceptingQuote?.total_amount || 0) * 0.75)})</strong> to secure your booking.
                  </p>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <Upload className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">Click to upload or drag file here</p>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleProofUpload}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(0)}>Cancel</Button>
              </DialogFooter>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center mb-6">
                <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Submission Received!</h3>
              <p className="text-slate-500 max-w-xs mx-auto">
                Thank you! We have received your signature and payment proof. Our team will review your submission shortly.
              </p>
              <Button onClick={() => setStep(0)} className="w-full mt-4">Return to Dashboard</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Support Modal */}
      < Dialog open={contactOpen} onOpenChange={setContactOpen} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              Need help? Reach out to us directly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <a href={`tel:${companyPhone}`} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted transition-colors">
              <div className="bg-primary/10 p-2 rounded-full">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Phone Support</p>
                <p className="text-sm text-muted-foreground">{companyPhone}</p>
              </div>
            </a>
            <a href={`mailto:${companyEmail}`} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted transition-colors">
              <div className="bg-primary/10 p-2 rounded-full">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">{companyEmail}</p>
              </div>
            </a>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContactOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
      <InstallPrompt />
    </div >
  )
}
