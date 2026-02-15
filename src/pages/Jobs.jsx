import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, Search, Briefcase, Calendar as CalendarIcon, User, Clock, List as ListIcon, Kanban, Pencil, Trash2, Loader2, CheckCircle, Activity, Upload, FileText, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { generateOutlookLink } from '@/lib/calendar-utils'

// Lazy load heavy components
const JobBoard = lazy(() => import('./jobs/JobBoard'))
const JobCalendar = lazy(() => import('./jobs/JobCalendar'))

import { useLocation, useSearchParams } from 'react-router-dom'

export default function Jobs() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [jobs, setJobs] = useState([])
  const [clients, setClients] = useState([])
  const [quotations, setQuotations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [viewMode, setViewMode] = useState('list') // list, board, calendar
  const [attachments, setAttachments] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [formData, setFormData] = useState({
    client_id: '',
    quotation_id: '',
    assigned_technicians: '',
    scheduled_datetime: '',
    scheduled_end_datetime: '',
    notes: '',
    status: 'Pending'
  })

  // Calculate Stats
  const activeJobs = jobs.filter(j => ['Pending', 'In Progress'].includes(j.status)).length
  const completedJobs = jobs.filter(j => j.status === 'Completed').length
  const pendingJobs = jobs.filter(j => j.status === 'Pending').length

  // REFACTORED: Handle incoming "Create Job from Quote" via URL search params.
  // This survives page refreshes unlike location.state.
  // Usage: navigate('/jobs?fromQuote=<quotation_id>')
  useEffect(() => {
    const fromQuoteId = searchParams.get('fromQuote')

    // Also support the legacy location.state approach for backwards-compatibility
    const quoteData = location.state?.createFromQuote ? location.state.quoteData : null

    if (fromQuoteId) {
      // Fetch the quotation from Supabase and pre-fill the form
      const fetchAndPrefill = async () => {
        try {
          const { data: quote, error } = await supabase
            .from('quotations')
            .select('id, client_id')
            .eq('id', fromQuoteId)
            .single()

          if (error || !quote) {
            console.error('Could not find quotation:', error)
            toast.error('Quotation not found')
            return
          }

          setViewMode('board')
          setFormData(prev => ({
            ...prev,
            client_id: quote.client_id,
            quotation_id: quote.id,
            notes: `Job for Quotation #${quote.id.substring(0, 6)}`,
            status: 'Pending'
          }))
          setIsDialogOpen(true)
        } catch (err) {
          console.error('Error fetching quotation for job creation:', err)
        }
      }
      fetchAndPrefill()
      // Clear the search param to prevent re-opening on navigation
      setSearchParams({}, { replace: true })
    } else if (quoteData) {
      // Legacy fallback: support location.state
      setViewMode('board')
      setFormData(prev => ({
        ...prev,
        client_id: quoteData.client_id,
        quotation_id: quoteData.id,
        notes: `Job for Quotation #${quoteData.id.substring(0, 6)}`,
        status: 'Pending'
      }))
      setIsDialogOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [searchParams, location.state, setSearchParams])

  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (name, company),
          quotations (id, payment_proof)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }, [])

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

  const fetchQuotations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('id, client_id')
        .eq('status', 'Approved')

      if (error) throw error
      setQuotations(data || [])
    } catch (error) {
      console.error('Error fetching quotations:', error)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
    fetchClients()
    fetchQuotations()
  }, [fetchJobs, fetchClients, fetchQuotations])

  const fetchAttachments = async (jobId) => {
    try {
      const { data, error } = await supabase
        .from('job_attachments')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAttachments(data || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
      // toast.error('Failed to load attachments') // Optional: suppress to avoid noise if table doesn't exist yet
    }
  }

  const handleFileUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (!editingJob) {
      toast.error('Please save the job before adding attachments')
      return
    }

    setIsUploading(true)
    const toastId = toast.loading('Uploading files...')

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${editingJob.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
          .from('job-attachments')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('job-attachments')
          .getPublicUrl(fileName)

        // 3. Save to Database
        const { error: dbError } = await supabase
          .from('job_attachments')
          .insert([{
            job_id: editingJob.id,
            file_url: publicUrl,
            file_type: file.type,
            file_name: file.name,
            description: '' // Initial empty description
          }])

        if (dbError) throw dbError
      }

      toast.success('Files uploaded successfully', { id: toastId })
      fetchAttachments(editingJob.id)
    } catch (error) {
      console.error('Error uploading files:', error)
      toast.error('Failed to upload files', { id: toastId })
    } finally {
      setIsUploading(false)
      // Reset file input
      e.target.value = null
    }
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      // 1. Delete from Database
      const { error: dbError } = await supabase
        .from('job_attachments')
        .delete()
        .eq('id', attachmentId)

      if (dbError) throw dbError

      // 2. Delete from Storage (Optional but recommended)
      // Note: We'd need the path, which we didn't store explicitly, but we can infer or just leave it for now.
      // Ideally we store the storage path in the DB.
      // For now, just DB delete is sufficient to hide it.

      toast.success('Attachment deleted')
      fetchAttachments(editingJob.id)
    } catch (error) {
      console.error('Error deleting attachment:', error)
      toast.error('Failed to delete attachment')
    }
  }

  const handleUpdateAttachmentDescription = async (attachmentId, description) => {
    try {
      const { error } = await supabase
        .from('job_attachments')
        .update({ description })
        .eq('id', attachmentId)

      if (error) throw error

      // Update local state to reflect change without re-fetching
      setAttachments(prev => prev.map(a => a.id === attachmentId ? { ...a, description } : a))
    } catch (error) {
      console.error('Error updating description:', error)
      toast.error('Failed to save description')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const technicians = formData.assigned_technicians.split(',').map(t => t.trim())

      const jobPayload = {
        client_id: formData.client_id,
        quotation_id: formData.quotation_id || null,
        assigned_technicians: technicians,
        scheduled_datetime: formData.scheduled_datetime || null,
        notes: formData.notes,
        status: formData.status
      }

      if (editingJob) {
        // Update existing job
        const { error } = await supabase
          .from('jobs')
          .update(jobPayload)
          .eq('id', editingJob.id)

        if (error) throw error

        await supabase.from('activity_log').insert([{
          type: 'Job Updated',
          description: `Job updated for client`,
          related_entity_id: editingJob.id,
          related_entity_type: 'job'
        }])
        toast.success('Job updated successfully')
      } else {
        // Create new job
        const { data: newJob, error } = await supabase
          .from('jobs')
          .insert([jobPayload])
          .select()
          .single()

        if (error) throw error

        // Log activity
        await supabase.from('activity_log').insert([{
          type: 'Job Created',
          description: `New job created for client`,
          related_entity_id: newJob?.id,
          related_entity_type: 'job'
        }])

        // Create calendar event
        if (formData.scheduled_datetime) {
          await supabase.from('calendar_events').insert([{
            event_type: 'Job',
            title: `Job scheduled`,
            datetime: formData.scheduled_datetime,
            end_datetime: formData.scheduled_end_datetime,
            related_entity_type: 'job'
          }])
        }
        toast.success('Job created successfully')
      }

      setIsDialogOpen(false)
      setEditingJob(null)
      setFormData({
        client_id: '',
        quotation_id: '',
        assigned_technicians: '',
        scheduled_datetime: '',
        notes: '',
        status: 'Pending'
      })
      fetchJobs()
    } catch (error) {
      console.error('Error saving job:', error)
      toast.error('Failed to save job')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (job) => {
    setEditingJob(job)
    setFormData({
      client_id: job.client_id,
      quotation_id: job.quotation_id || '',
      assigned_technicians: job.assigned_technicians ? job.assigned_technicians.join(', ') : '',
      scheduled_datetime: job.scheduled_datetime || '',
      notes: job.notes || '',
      status: job.status
    })
    setIsDialogOpen(true)
    fetchAttachments(job.id) // Fetch attachments when editing
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this job?')) return

    const toastId = toast.loading('Deleting job...')

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Job deleted successfully', { id: toastId })
      fetchJobs()
    } catch (error) {
      console.error('Error deleting job:', error)
      toast.error('Error deleting job', { id: toastId })
    }
  }

  const updateJobStatus = async (jobId, newStatus) => {
    try {
      // Optimistic Update
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));

      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', jobId)

      if (error) throw error

      // Log activity
      await supabase.from('activity_log').insert([{
        type: 'Job Status Updated',
        description: `Job status changed to ${newStatus}`,
        related_entity_id: jobId,
        related_entity_type: 'job'
      }])

      // --- Custom Workflow: Auto-Generate Invoice on Completion ---
      if (newStatus === 'Completed') {
        const job = jobs.find(j => j.id === jobId)
        if (job && job.quotation_id) {
          if (confirm('Job completed! Do you want to generate a Tax Invoice from the linked quotation?')) {
            const toastId = toast.loading('Generating invoice...')
            try {
              // 1. Fetch Quote Details
              const { data: quote, error: quoteError } = await supabase
                .from('quotations')
                .select('*, quotation_lines(*)')
                .eq('id', job.quotation_id)
                .single()

              if (quoteError) throw quoteError

              // 2. Create Invoice
              const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .insert([{
                  client_id: quote.client_id,
                  quotation_id: quote.id,
                  status: 'Draft', // Draft so they can check it first
                  date_created: new Date().toISOString(),
                  due_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(), // 7 days default
                  total_amount: quote.total_amount,
                  vat_applicable: quote.vat_applicable,
                  trade_subtotal: quote.trade_subtotal,
                  profit_estimate: quote.profit_estimate,
                  metadata: { ...quote.metadata, generated_from_job: jobId }
                }])
                .select()
                .single()

              if (invoiceError) throw invoiceError

              // 3. Create Invoice Lines
              if (quote.quotation_lines && quote.quotation_lines.length > 0) {
                const invoiceLines = quote.quotation_lines.map(line => ({
                  invoice_id: invoiceData.id,
                  product_id: line.product_id,
                  quantity: line.quantity,
                  unit_price: line.unit_price,
                  line_total: line.line_total,
                  cost_price: line.cost_price || 0
                }))

                const { error: linesError } = await supabase
                  .from('invoice_lines')
                  .insert(invoiceLines)

                if (linesError) throw linesError
              }

              toast.success('Tax Invoice generated successfully!', { id: toastId })
            } catch (invError) {
              console.error('Invoice generation failed:', invError)
              toast.error('Failed to generate invoice', { id: toastId })
            }
          }
        }
      }
      // -------------------------------------------------------------

      fetchJobs()
    } catch (error) {
      console.error('Error updating job status:', error)
      fetchJobs() // Revert on error
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      job.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.notes?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || job.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500'
      case 'In Progress': return 'bg-blue-500'
      case 'Completed': return 'bg-green-500'
      case 'Cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const openOutlook = (job) => {
    const link = generateOutlookLink({
      title: `${job.clients?.name} - ${job.status}`,
      start: job.scheduled_datetime ? new Date(job.scheduled_datetime) : new Date(),
      end: job.scheduled_datetime ? new Date(new Date(job.scheduled_datetime).getTime() + 60 * 60 * 1000) : new Date(new Date().getTime() + 60 * 60 * 1000),
      description: job.notes || '',
      location: job.clients?.address || ''
    })
    window.open(link, '_blank')
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium">Active Jobs</p>
            <h3 className="text-3xl font-bold mt-1">{activeJobs}</h3>
            <p className="text-blue-100 text-xs mt-2">Currently in progress or pending</p>
          </div>
          <Activity className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white opacity-10 rotate-12" />
        </div>
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-green-100 text-sm font-medium">Completed Jobs</p>
            <h3 className="text-3xl font-bold mt-1">{completedJobs}</h3>
            <p className="text-green-100 text-xs mt-2">Successfully delivered</p>
          </div>
          <CheckCircle className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white opacity-10 rotate-12" />
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-amber-100 text-sm font-medium">Pending Start</p>
            <h3 className="text-3xl font-bold mt-1">{pendingJobs}</h3>
            <p className="text-amber-100 text-xs mt-2">Awaiting action</p>
          </div>
          <Clock className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white opacity-10 rotate-12" />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full xl:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3 sm:w-[300px]">
              <TabsTrigger value="list">
                <ListIcon className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
              <TabsTrigger value="board">
                <Kanban className="h-4 w-4 mr-2" />
                Board
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setEditingJob(null)
                setAttachments([]) // Clear attachments
                setActiveTab('details') // Reset tab
                setFormData({
                  client_id: '',
                  quotation_id: '',
                  assigned_technicians: '',
                  scheduled_datetime: '',
                  scheduled_end_datetime: '',
                  notes: '',
                  status: 'Pending'
                })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] h-[90vh] sm:h-auto overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJob ? 'Edit Job' : 'Create New Job'}</DialogTitle>
                <DialogDescription>
                  {activeTab === 'details' ? 'Schedule a new job or work order' : 'Manage job photos and documents'}
                </DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="details">Job Details</TabsTrigger>
                  <TabsTrigger value="attachments">
                    Attachments
                    {attachments.length > 0 && (
                      <span className="ml-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-xs font-semibold">
                        {attachments.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
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

                      {!formData.quotation_id && (
                        <div className="grid gap-2">
                          <Label htmlFor="quotation_id">Related Quotation (Optional)</Label>
                          <Select
                            value={formData.quotation_id}
                            onValueChange={(value) => setFormData({ ...formData, quotation_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a quotation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {quotations
                                .filter(q => q.client_id === formData.client_id)
                                .map((quotation) => (
                                  <SelectItem key={quotation.id} value={quotation.id}>
                                    Quotation {quotation.id.substring(0, 8)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label htmlFor="assigned_technicians">Assigned Technicians</Label>
                        <Input
                          id="assigned_technicians"
                          placeholder="Enter names separated by commas"
                          value={formData.assigned_technicians}
                          onChange={(e) => setFormData({ ...formData, assigned_technicians: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Example: John Doe, Jane Smith
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="scheduled_datetime">Scheduled Date & Time Start</Label>
                          <div className="relative">
                            <Input
                              id="scheduled_datetime"
                              type="datetime-local"
                              value={formData.scheduled_datetime}
                              onChange={(e) => setFormData({ ...formData, scheduled_datetime: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="scheduled_end_datetime">Scheduled Date & Time End</Label>
                          <div className="relative">
                            <Input
                              id="scheduled_end_datetime"
                              type="datetime-local"
                              value={formData.scheduled_end_datetime}
                              onChange={(e) => setFormData({ ...formData, scheduled_end_datetime: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          placeholder="Job details, requirements, etc."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingJob ? 'Update Job' : 'Create Job'}
                      </Button>
                    </DialogFooter>
                  </form>
                </TabsContent>

                <TabsContent value="attachments" className="min-h-[300px]">
                  <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center bg-muted/40 p-4 rounded-lg border border-border">
                      <div>
                        <h3 className="text-sm font-medium">Job Documentation</h3>
                        <p className="text-xs text-muted-foreground mt-1">Upload photos of work done, serial numbers, etc.</p>
                      </div>
                      <div>
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isUploading || !editingJob}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => document.getElementById('file-upload').click()}
                          disabled={isUploading || !editingJob}
                        >
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Upload Files
                        </Button>
                      </div>
                    </div>

                    {!editingJob ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                        <FileText className="h-10 w-10 mb-3 opacity-20" />
                        <p>Please save the job first to add attachments.</p>
                      </div>
                    ) : attachments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                        <ImageIcon className="h-10 w-10 mb-3 opacity-20" />
                        <p>No attachments yet.</p>
                        <p className="text-xs mt-1">Upload photos to document your work.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                        {attachments.map((file) => (
                          <div key={file.id} className="group relative border border-border rounded-lg p-3 bg-card hover:shadow-md transition-all">
                            <div className="aspect-video bg-muted rounded-md mb-3 overflow-hidden flex items-center justify-center relative border border-border/50">
                              {file.file_type?.startsWith('image/') ? (
                                <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" />
                              ) : (
                                <FileText className="h-10 w-10 text-muted-foreground" />
                              )}
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                onClick={() => handleDeleteAttachment(file.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium truncate text-foreground" title={file.file_name}>{file.file_name}</p>
                              <Input
                                placeholder="Description / Serial No."
                                className="h-8 text-xs bg-background"
                                value={file.description || ''}
                                onChange={(e) => {
                                  // Optimistic UI update
                                  const newDescription = e.target.value;
                                  setAttachments(prev => prev.map(a => a.id === file.id ? { ...a, description: newDescription } : a));
                                }}
                                onBlur={(e) => handleUpdateAttachmentDescription(file.id, e.target.value)}
                              />
                              <p className="text-[10px] text-muted-foreground text-right">{new Date(file.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <DialogFooter className="mt-4 sm:justify-between border-t pt-4">
                    <div className="text-xs text-muted-foreground self-center italic hidden sm:block">
                      {editingJob ? 'Photos and descriptions are saved automatically.' : ''}
                    </div>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Close Dialog</Button>
                  </DialogFooter>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Content */}
      <Suspense fallback={<div className="text-center py-10">Loading view...</div>}>
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(job.status)}`}></div>
                <CardHeader className="pb-3 pl-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <Briefcase className="h-5 w-5 text-indigo-500" />
                        {job.clients?.name || 'Unknown Client'}
                      </CardTitle>
                      {job.clients?.company && (
                        <CardDescription className="text-slate-500 font-medium">{job.clients.company}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge className={`${getStatusColor(job.status)} text-white shadow-sm px-3 py-1`}>
                        {job.status}
                      </Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600" title="Add to Outlook" onClick={() => openOutlook(job)}>
                          <CalendarIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-indigo-600" onClick={() => handleEdit(job)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(job.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-3">
                      {job.scheduled_datetime ? (
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <CalendarIcon className="h-4 w-4 text-blue-500" />
                          <span>{new Date(job.scheduled_datetime).toLocaleString()}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400 italic">Unscheduled</div>
                      )}

                      {job.assigned_technicians && job.assigned_technicians.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-slate-600 dark:text-slate-400">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{job.assigned_technicians.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {job.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md italic border border-slate-100 dark:border-slate-800">
                        &quot;{job.notes}&quot;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Created {new Date(job.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Status Update Buttons */}
                      <div className="flex gap-2">
                        {job.status === 'Pending' && (
                          <Button
                            size="sm"
                            onClick={() => updateJobStatus(job.id, 'In Progress')}
                            className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                          >
                            Start Job
                          </Button>
                        )}
                        {job.status === 'In Progress' && (
                          <Button
                            size="sm"
                            onClick={() => updateJobStatus(job.id, 'Completed')}
                            className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                          >
                            Complete
                          </Button>
                        )}
                        {(job.status === 'Pending' || job.status === 'In Progress') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateJobStatus(job.id, 'Cancelled')}
                            className="h-8 text-xs hover:bg-red-50 hover:text-red-600 border-slate-200"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {viewMode === 'board' && (
          <JobBoard jobs={filteredJobs} onStatusChange={updateJobStatus} />
        )}

        {viewMode === 'calendar' && (
          <JobCalendar />
        )}
      </Suspense>

      {filteredJobs.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
            <Briefcase className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">
            {searchTerm || filterStatus !== 'all' ? 'No jobs found' : 'No jobs scheduled'}
          </h3>
          <p className="mb-6 max-w-sm text-center">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Create your first job card to track work orders.'}
          </p>
          {filterStatus === 'all' && !searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)} className="ssh-button-gradient">
              Create First Job
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

