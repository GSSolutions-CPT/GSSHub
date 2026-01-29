import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, CheckCircle, Upload, MessageCircle, Phone, Mail, HelpCircle, PenTool } from 'lucide-react'
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

  useEffect(() => {
    if (!clientId) {
      setLoading(false)
    }
  }, [clientId])

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
    if (clientId) {
      fetchClientData()
    }
  }, [clientId, fetchClientData])

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

  const submitFinalPaymentProof = async (proofBase64) => {
    const toastId = toast.loading('Uploading final payment proof...')
    try {
      if (!proofBase64) throw new Error('File is required')

      const { error } = await supabase
        .from('quotations')
        .update({
          final_payment_proof: proofBase64,
          // final_payment_approved: false // defaults to false anyway
        })
        .eq('id', acceptingQuote.id)

      if (error) throw error

      await supabase.from('activity_log').insert([{
        type: 'Final Payment Proof Uploaded',
        description: `Client uploaded final payment proof for quotation #${acceptingQuote.id.substring(0, 6)}`,
        related_entity_id: acceptingQuote.id,
        related_entity_type: 'quotation'
      }])

      setStep(3) // Reuse Success Message
      fetchClientData()
      toast.success('Final proof uploaded successfully!', { id: toastId })
    } catch (error) {
      console.error('Error uploading final proof:', error)
      toast.error(`Failed to upload: ${error.message}`, { id: toastId })
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
          // If final payment is approved, nothing is outstanding on the Quote itself
          if (q.final_payment_approved) return sum

          const isApproved = q.status === 'Approved' || q.admin_approved
          const depositRatio = (q.payment_type === 'full' ? 100 : (q.deposit_percentage || 75)) / 100
          if (isApproved) {
            return sum + (q.total_amount * (1 - depositRatio))
          } else {
            return sum + (q.total_amount * depositRatio)
          }
        }, 0)

    const activeQuotes = quotations
      .filter(q => q.status === 'Sent')
      .length

    const pendingActions = []
    if (activeQuotes > 0) pendingActions.push({ type: 'quote', count: activeQuotes, label: 'Review Pending Quotes' })
    if (totalOutstanding > 0) pendingActions.push({ type: 'invoice', count: 1, label: 'Settle Outstanding Invoices' })

    const recentSuccesses = quotations
      .filter(q => q.final_payment_approved)

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2 tracking-tight">Welcome back, {client.name.split(' ')[0]}</h2>
            <p className="text-slate-300">Here is what is happening with your account today.</p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                <p className="text-xs text-slate-300 uppercase tracking-widest font-medium">Outstanding Balance</p>
                <p className="text-2xl font-bold mt-1 text-white">{formatCurrency(totalOutstanding)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                <p className="text-xs text-slate-300 uppercase tracking-widest font-medium">Active Quotes</p>
                <p className="text-2xl font-bold mt-1 text-white">{activeQuotes}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                <p className="text-xs text-slate-300 uppercase tracking-widest font-medium">Active Jobs</p>
                <p className="text-2xl font-bold mt-1 text-white">0</p>
              </div>
            </div>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-1000"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-1000"></div>
        </div>

        {/* Success / Notifications */}
        {recentSuccesses.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
              Recent Updates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentSuccesses.map(q => (
                <div key={q.id} className="bg-green-50/50 dark:bg-green-900/10 backdrop-blur-sm border border-green-100 dark:border-green-900/30 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex justify-between items-center group relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Payment Verified
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Final payment for Quote <strong>#{q.id.substring(0, 6)}</strong> has been approved.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Center */}
        {pendingActions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
              Action Required
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotations.filter(q => q.status === 'Sent').map(q => (
                <div key={q.id} className="bg-white/80 dark:bg-card/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex justify-between items-center group relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                  <div>
                    <p className="font-semibold text-foreground">Quote #{q.id.substring(0, 6)} needs review</p>
                    <p className="text-sm text-muted-foreground">Created {new Date(q.date_created).toLocaleDateString()}</p>
                  </div>
                  <Button onClick={() => document.getElementById('tab-quotations').click()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">View Quote</Button>
                </div>
              ))}

              {invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').map(inv => (
                <div key={inv.id} className="bg-white/80 dark:bg-card/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex justify-between items-center relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                  <div>
                    <p className="font-semibold text-foreground">Invoice #{inv.id.substring(0, 6)} is due</p>
                    <p className="text-sm text-muted-foreground font-medium text-orange-600">Due: {formatCurrency(inv.total_amount)}</p>
                  </div>
                  <Button variant="outline" onClick={() => document.getElementById('tab-invoices').click()} className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800">Pay Now</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links / Services */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
            <span className="w-1.5 h-6 bg-slate-300 rounded-full"></span>
            Quick Access
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-28 flex-col gap-3 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all bg-white/50 backdrop-blur-sm" onClick={() => setContactOpen(true)}>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                <HelpCircle className="h-6 w-6 text-blue-500" />
              </div>
              <span className="font-medium">Support</span>
            </Button>
            <Button variant="outline" className="h-28 flex-col gap-3 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all bg-white/50 backdrop-blur-sm" onClick={() => window.open(whatsappUrl, '_blank')}>
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-full">
                <MessageCircle className="h-6 w-6 text-green-500" />
              </div>
              <span className="font-medium">WhatsApp</span>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative font-sans overflow-x-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black opacity-80" />
      <div className="fixed -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="fixed top-40 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <header className="fixed top-0 left-0 right-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-white/20 dark:border-slate-800/50 z-50">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/gss-logo-full.png" alt="Global Security Solutions" className="h-10 md:h-12 w-auto object-contain" />
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none tracking-tight">Client Portal</h1>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Global Security Solutions</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" className="hidden md:flex hover:bg-white/50" onClick={() => setContactOpen(true)}>
              <HelpCircle className="mr-2 h-4 w-4" /> Help
            </Button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-white to-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shadow-sm" title={client.name}>
              {client.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8 pt-24 pb-32 max-w-7xl relative z-10">
        <Tabs defaultValue="overview" className="space-y-8">
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="bg-slate-200/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-full border border-white/20 dark:border-slate-800 shadow-sm w-max md:w-auto inline-flex h-auto">
              <TabsTrigger value="overview" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all font-medium whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger id="tab-quotations" value="quotations" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all font-medium whitespace-nowrap">Quotes</TabsTrigger>
              <TabsTrigger value="proforma" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all font-medium whitespace-nowrap">Proforma</TabsTrigger>
              <TabsTrigger id="tab-invoices" value="invoices" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all font-medium whitespace-nowrap">Invoices</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="quotations" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {quotations
              .filter(q => q.status === 'Sent' || q.status === 'Draft' || q.status === 'Rejected')
              .map((quotation) => (
                <Card key={quotation.id} className="group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-card/80 backdrop-blur-sm overflow-hidden rounded-2xl">
                  <div className={`h-1.5 w-full ${getStatusColor(quotation.status)}`}></div>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded-md">#{quotation.id.substring(0, 6)}</Badge>
                          <span className="text-xs text-muted-foreground font-medium">{new Date(quotation.date_created).toLocaleDateString()}</span>
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Security System Quote</CardTitle>
                      </div>
                      <Badge className={cn("px-2.5 py-0.5 rounded-full text-white shadow-sm", getStatusColor(quotation.status))}>{quotation.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-2">
                    <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-4 border-dashed">
                      <span className="text-muted-foreground text-sm font-medium">Total Value</span>
                      <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{formatCurrency(quotation.total_amount)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="w-full hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-700" onClick={() => generateQuotePDF({ ...quotation, clients: client }, settings)}>
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
                        <button onClick={() => handleDecline(quotation)} className="text-xs text-red-500 hover:text-red-600 hover:underline font-medium transition-colors">
                          Decline this quotation
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            {quotations.filter(q => q.status === 'Sent' || q.status === 'Draft').length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <CheckCircle className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">All caught up!</h3>
                <p className="text-slate-500 max-w-sm">You have no pending quotations requiring your attention.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="proforma" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {quotations
              .filter(q => q.status === 'Accepted' || q.status === 'Approved')
              .map((quotation) => (
                <Card key={quotation.id} className="hover:shadow-lg transition-all border-l-4 border-l-green-500 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          PROFORMA <span className="text-sm font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-md">#{quotation.id.substring(0, 6)}</span>
                        </CardTitle>
                        <CardDescription className="mt-1">Accepted on {new Date(quotation.accepted_at || quotation.date_created).toLocaleDateString()}</CardDescription>
                      </div>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-sm rounded-full">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-muted-foreground font-medium">Total Value:</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(quotation.total_amount)}</span>
                    </div>

                    <div className={cn(
                      "p-3 rounded-lg text-sm text-center border font-medium",
                      (quotation.status === 'Approved' || quotation.admin_approved)
                        ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        : "bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30"
                    )}>
                      {(quotation.status === 'Approved' || quotation.admin_approved) ? (
                        (() => {
                          const depositRatio = (quotation.payment_type === 'full' ? 100 : (quotation.deposit_percentage || 75)) / 100
                          const balance = quotation.total_amount * (1 - depositRatio)
                          return <p>Outstanding Balance: <strong className="ml-1">{formatCurrency(balance)}</strong></p>
                        })()
                      ) : (
                        (() => {
                          const depositRatio = (quotation.payment_type === 'full' ? 100 : (quotation.deposit_percentage || 75)) / 100
                          const depositAmount = quotation.total_amount * depositRatio
                          return (
                            <p>
                              {quotation.payment_proof ? "Payment Review Pending: " : (quotation.payment_type === 'full' ? "Full Payment Required: " : "Deposit Required: ")}
                              <strong className="block text-lg mt-1">{formatCurrency(depositAmount)}</strong>
                            </p>
                          )
                        })()
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <Button className="w-full border-slate-200 hover:bg-slate-50" variant="outline" onClick={() => generateQuotePDF({ ...quotation, clients: client }, settings)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Proforma Invoice
                      </Button>

                      {quotation.payment_proof && !quotation.final_payment_proof && (
                        <Button
                          variant="ghost"
                          className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => downloadProof(quotation.payment_proof, `PaymentProof_${quotation.id.substring(0, 6)}`)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Deposit Proof Uploaded
                        </Button>
                      )}

                      {/* Final Payment Button */}
                      {(quotation.status === 'Approved' || quotation.admin_approved) && !quotation.final_payment_approved && (
                        <>
                          {!quotation.final_payment_proof ? (
                            <Button
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md"
                              onClick={() => {
                                setAcceptingQuote(quotation)
                                setStep(4)
                              }}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Complete Payment
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => downloadProof(quotation.final_payment_proof, `FinalProof_${quotation.id.substring(0, 6)}`)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Final Proof Uploaded
                            </Button>
                          )}
                        </>
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
                <Card key={invoice.id} className="hover:shadow-lg transition-all border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl overflow-hidden group">
                  <div className={`h-1.5 w-full ${getStatusColor(invoice.status)}`}></div>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                          <span className="font-bold text-slate-500 dark:text-slate-400 text-xs">INV</span>
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Invoice #{invoice.id.substring(0, 6)}</CardTitle>
                          <p className="text-xs text-muted-foreground font-medium">{new Date(invoice.date_created).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge className={cn("px-2.5 py-0.5 rounded-full shadow-sm", getStatusColor(invoice.status))}>{invoice.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div className="flex justify-between items-center py-3 border-y border-dashed border-slate-100 dark:border-slate-800">
                      <span className="text-muted-foreground font-medium">Amount Due</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{formatCurrency(invoice.total_amount)}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 dark:shadow-none" onClick={() => generateInvoicePDF({ ...invoice, clients: client }, settings)}>
                        <Download className="mr-2 h-4 w-4" /> Download Tax Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {invoices.filter(inv => inv.status !== 'Draft').length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <CheckCircle className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Invoices Found</h3>
                <p className="text-slate-500 max-w-sm">There are no invoices available for your account at this time.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center animate-in zoom-in duration-300"
        title="Chat on WhatsApp"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="h-7 w-7 fill-current" />
      </a>

      {/* Acceptance Modal - Kept same logic, styling updated */}
      <Dialog open={step > 0} onOpenChange={(open) => !open && setStep(0)}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {step === 1 ? (
                <>
                  <PenTool className="h-5 w-5 text-blue-500" />
                  Sign Acceptance
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Next Steps
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {step === 1
                ? 'Please sign below to accept this quotation and proceed to payment.'
                : 'Quotation accepted! Here are the banking details for the deposit.'}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-inner bg-white">
                <SignaturePad onSave={handleSignatureSave} />
              </div>
              <p className="text-xs text-muted-foreground text-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                By signing, you agree to the Terms & Conditions outlined in the quotation document.
              </p>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setStep(0)} className="rounded-lg border-slate-200">Cancel</Button>
                <Button onClick={submitAcceptance} disabled={!signature} className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-lg shadow-slate-900/20">Confirm & Sign</Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-5 rounded-xl text-sm space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                    <span className="font-bold text-lg">1</span>
                  </div>
                  <p className="font-bold text-lg text-slate-900 dark:text-white">Banking Details</p>
                </div>

                <div className="grid grid-cols-[80px_1fr] gap-y-2 gap-x-4 pl-3 text-slate-600 dark:text-slate-300">
                  <span className="text-muted-foreground font-medium text-right">Bank:</span> <span className="font-semibold text-slate-900 dark:text-white">{settings.bankName || 'FNB / RMB'}</span>
                  <span className="text-muted-foreground font-medium text-right">Account:</span> <span className="font-semibold text-slate-900 dark:text-white font-mono">{settings.bankAccountNumber || '63182000223'}</span>
                  <span className="text-muted-foreground font-medium text-right">Branch:</span> <span className="text-slate-900 dark:text-white">{settings.bankBranchCode || '250655'}</span>
                  <span className="text-muted-foreground font-medium text-right pt-1">Ref:</span>
                  <span className="font-mono bg-white dark:bg-black px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 select-all font-bold tracking-wide w-fit">
                    {settings.bankReference || acceptingQuote?.id.substring(0, 6)}
                  </span>
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
                    Please make a <strong>{acceptingQuote?.payment_type === 'full' ? 'Full Payment' : `${acceptingQuote?.deposit_percentage || 75}% deposit`} ({formatCurrency((acceptingQuote?.total_amount || 0) * ((acceptingQuote?.payment_type === 'full' ? 100 : (acceptingQuote?.deposit_percentage || 75)) / 100))})</strong> to secure your booking.
                  </p>
                    <label htmlFor="proof-upload-initial" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                      <Upload className="h-10 w-10 text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-600">Click to upload or drag file here</p>
                      <input
                        id="proof-upload-initial"
                        name="proof-upload-initial"
                        type="file"
                        accept="image/*,application/pdf"
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = async (event) => {
                            if (step === 2) {
                              // Initial Acceptance Upload
                              await submitFinalAcceptance(event.target.result)
                            } else if (step === 4) {
                              // Final Payment Upload
                              await submitFinalPaymentProof(event.target.result)
                            }
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(0)}>Cancel</Button>
              </DialogFooter>
            </div>
          )}



        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <Upload className="h-4 w-4" />
                </div>
                <p className="font-semibold text-slate-800">Upload Final Proof of Payment</p>
              </div>

              <div className="pl-10">
                <p className="text-sm text-slate-500 mb-3">
                  Please upload the proof for your <strong>Outstanding Balance</strong>.
                </p>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <label htmlFor="proof-upload-final" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                    <Upload className="h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-600">Click to upload or drag file here</p>
                    <input
                      id="proof-upload-final"
                      name="proof-upload-final"
                      type="file"
                      accept="image/*,application/pdf"
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = async (event) => {
                          await submitFinalPaymentProof(event.target.result)
                        }
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
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

      {/* Contact Support Modal */ }
      <Dialog open={contactOpen} onOpenChange={setContactOpen} >
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
