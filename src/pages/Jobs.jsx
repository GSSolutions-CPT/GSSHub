import { useState, useEffect, Suspense, lazy } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Briefcase, Calendar as CalendarIcon, User, Clock, LayoutGrid, List as ListIcon, Kanban, Pencil, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { generateOutlookLink } from '@/lib/calendar-utils'

// Lazy load heavy components
const JobBoard = lazy(() => import('./jobs/JobBoard'))
const JobCalendar = lazy(() => import('./jobs/JobCalendar'))

import { useLocation } from 'react-router-dom'

export default function Jobs() {
  const location = useLocation()
  const [jobs, setJobs] = useState([])
  const [clients, setClients] = useState([])
  const [quotations, setQuotations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [viewMode, setViewMode] = useState('list') // list, board, calendar
  const [formData, setFormData] = useState({
    client_id: '',
    quotation_id: '',
    assigned_technicians: '',
    scheduled_datetime: '',
    notes: '',
    status: 'Pending'
  })

  // Handle incoming navigation state (e.g. from Sales)
  useEffect(() => {
    if (location.state?.createFromQuote && location.state?.quoteData) {
      const { quoteData } = location.state

      // Switch to Board view as requested
      setViewMode('board')

      // optimize UX: wait for clients to load before setting form data to ensure matching
      // Pre-fill form
      setFormData(prev => ({
        ...prev,
        client_id: quoteData.client_id,
        quotation_id: quoteData.id,
        notes: `Job for Quotation #${quoteData.id.substring(0, 6)}`,
        status: 'Pending'
      }))

      // Open dialog to prompt for scheduling
      setIsDialogOpen(true)

      // Clear state to prevent re-opening on refresh (optional, but good practice)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  useEffect(() => {
    fetchJobs()
    fetchClients()
    fetchQuotations()
  }, [])

  const fetchJobs = async () => {
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
  }

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

  const fetchQuotations = async () => {
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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const technicians = formData.assigned_technicians.split(',').map(t => t.trim())

      if (editingJob) {
        // Update existing job
        const { error } = await supabase
          .from('jobs')
          .update({
            ...formData,
            assigned_technicians: technicians,
            quotation_id: formData.quotation_id || null
          })
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
        const { error } = await supabase
          .from('jobs')
          .insert([{
            ...formData,
            assigned_technicians: technicians,
            quotation_id: formData.quotation_id || null
          }])

        if (error) throw error

        // Log activity
        await supabase.from('activity_log').insert([{
          type: 'Job Created',
          description: `New job created for client`,
          related_entity_type: 'job'
        }])

        // Create calendar event
        if (formData.scheduled_datetime) {
          await supabase.from('calendar_events').insert([{
            event_type: 'Job',
            title: `Job scheduled`,
            datetime: formData.scheduled_datetime,
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
    <div className="space-y-6">
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
                setFormData({
                  client_id: '',
                  quotation_id: '',
                  assigned_technicians: '',
                  scheduled_datetime: '',
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
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingJob ? 'Edit Job' : 'Create New Job'}</DialogTitle>
                <DialogDescription>
                  Schedule a new job or work order
                </DialogDescription>
              </DialogHeader>
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

                  <div className="grid gap-2">
                    <Label htmlFor="scheduled_datetime">Scheduled Date & Time</Label>
                    <Input
                      id="scheduled_datetime"
                      type="datetime-local"
                      value={formData.scheduled_datetime}
                      onChange={(e) => setFormData({ ...formData, scheduled_datetime: e.target.value })}
                    />
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
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Content */}
      <Suspense fallback={<div className="text-center py-10">Loading view...</div>}>
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        {job.clients?.name || 'Unknown Client'}
                      </CardTitle>
                      {job.clients?.company && (
                        <CardDescription>{job.clients.company}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${getStatusColor(job.status)} text-white`}>
                        {job.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Add to Outlook" onClick={() => openOutlook(job)}>
                          <CalendarIcon className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(job)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(job.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {job.scheduled_datetime && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{new Date(job.scheduled_datetime).toLocaleString()}</span>
                      </div>
                    )}

                    {job.assigned_technicians && job.assigned_technicians.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{job.assigned_technicians.join(', ')}</span>
                      </div>
                    )}

                    {job.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Clock className="h-3 w-3" />
                      Created {new Date(job.created_at).toLocaleDateString()}
                    </div>

                    {/* Status Update Buttons */}
                    <div className="flex gap-2 pt-2">
                      {job.status === 'Pending' && (
                        <Button
                          size="sm"
                          onClick={() => updateJobStatus(job.id, 'In Progress')}
                          className="flex-1"
                        >
                          Start Job
                        </Button>
                      )}
                      {job.status === 'In Progress' && (
                        <Button
                          size="sm"
                          onClick={() => updateJobStatus(job.id, 'Completed')}
                          className="flex-1"
                        >
                          Complete Job
                        </Button>
                      )}
                      {(job.status === 'Pending' || job.status === 'In Progress') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateJobStatus(job.id, 'Cancelled')}
                        >
                          Cancel
                        </Button>
                      )}
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all'
                ? 'No jobs found matching your filters'
                : 'No jobs yet. Create your first job to get started.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

