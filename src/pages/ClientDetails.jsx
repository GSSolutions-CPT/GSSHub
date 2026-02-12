import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail, Phone, MapPin, Loader2, Building2, Image as ImageIcon, FileText } from 'lucide-react'
import { ClientDialog } from '@/components/ClientDialog'
import { formatCurrency } from '@/lib/utils'

export default function ClientDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [client, setClient] = useState(null)
    const [jobs, setJobs] = useState([])
    const [invoices, setInvoices] = useState([])
    const [quotations, setQuotations] = useState([])
    const [attachments, setAttachments] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            // Fetch Client
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single()

            if (clientError) throw clientError
            setClient(clientData)

            // Fetch Jobs
            const { data: jobsData } = await supabase
                .from('jobs')
                .select('*')
                .eq('client_id', id)
                .order('created_at', { ascending: false })
            setJobs(jobsData || [])

            // Fetch Attachments for these jobs
            if (jobsData && jobsData.length > 0) {
                const jobIds = jobsData.map(job => job.id)
                const { data: attachmentsData } = await supabase
                    .from('job_attachments')
                    .select('*')
                    .in('job_id', jobIds)
                    .order('created_at', { ascending: false })
                setAttachments(attachmentsData || [])
            } else {
                setAttachments([])
            }

            // Fetch Invoices
            const { data: invoicesData } = await supabase
                .from('invoices')
                .select('*')
                .eq('client_id', id)
                .order('created_at', { ascending: false })
            setInvoices(invoicesData || [])

            // Fetch Quotations
            const { data: quotationsData } = await supabase
                .from('quotations')
                .select('*')
                .eq('client_id', id)
                .order('created_at', { ascending: false })
            setQuotations(quotationsData || [])

        } catch (error) {
            console.error('Error fetching client details:', error)
        } finally {
            setIsLoading(false)
        }
    }, [id])

    useEffect(() => {
        if (id) fetchData()
    }, [id, fetchData])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <h2 className="text-xl font-semibold">Client not found</h2>
                <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Button variant="ghost" className="w-fit p-0 hover:bg-transparent" onClick={() => navigate('/clients')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Clients
                </Button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
                        {client.company && (
                            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                <Building2 className="h-4 w-4" />
                                <span className="font-medium">{client.company}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <ClientDialog
                            open={isEditing}
                            onOpenChange={setIsEditing}
                            clientToEdit={client}
                            onSuccess={(updatedClient) => {
                                setClient(updatedClient)
                                setIsEditing(false)
                            }}
                            trigger={
                                <Button variant="outline">Edit Profile</Button>
                            }
                        />
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {client.email && (
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-sm text-muted-foreground">{client.email}</p>
                                </div>
                            </div>
                        )}
                        {client.phone && (
                            <div className="flex items-center gap-3">
                                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Phone</p>
                                    <p className="text-sm text-muted-foreground">{client.phone}</p>
                                </div>
                            </div>
                        )}
                        {client.address && (
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                                    <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Address</p>
                                    <p className="text-sm text-muted-foreground">{client.address}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Key Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium">Total Spend</p>
                            <h3 className="text-2xl font-bold mt-1">
                                {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0))}
                            </h3>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Outstanding</p>
                            <h3 className="text-2xl font-bold mt-1 text-red-500">
                                {formatCurrency(invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0))}
                            </h3>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Total Jobs</p>
                            <h3 className="text-2xl font-bold mt-1">{jobs.length}</h3>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Last Activity</p>
                            <p className="text-sm mt-2 text-muted-foreground">
                                {jobs[0] ? new Date(jobs[0].created_at).toLocaleDateString() : 'Never'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* History Tabs */}
            <Tabs defaultValue="jobs" className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-[500px]">
                    <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
                    <TabsTrigger value="quotes">Quotes ({quotations.length})</TabsTrigger>
                    <TabsTrigger value="photos">Photos ({attachments?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="jobs" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Job History</CardTitle>
                            <CardDescription>All jobs scheduled and completed for this client.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {jobs.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No jobs found.</p>
                            ) : (
                                <div className="space-y-4">
                                    {jobs.map(job => (
                                        <div key={job.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-sm">{new Date(job.created_at).toLocaleDateString()}</h4>
                                                    <Badge variant={job.status === 'Completed' ? 'default' : 'secondary'} className={job.status === 'Completed' ? 'bg-green-500' : ''}>
                                                        {job.status}
                                                    </Badge>
                                                </div>
                                                {job.notes && <p className="text-sm text-muted-foreground mt-1 max-w-xl">{job.notes}</p>}
                                            </div>
                                            <div className="text-right text-sm text-muted-foreground">
                                                {job.scheduled_datetime && <p>Scheduled: {new Date(job.scheduled_datetime).toLocaleDateString()}</p>}
                                                {job.assigned_technicians && job.assigned_technicians.length > 0 && (
                                                    <p className="mt-1">Techs: {job.assigned_technicians.join(', ')}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invoices" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoice History</CardTitle>
                            <CardDescription>All invoices generated for this client.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {invoices.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No invoices found.</p>
                            ) : (
                                <div className="space-y-4">
                                    {invoices.map(inv => (
                                        <div key={inv.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-sm">#{inv.id.substring(0, 8)}</h4>
                                                    <Badge variant={inv.status === 'Paid' ? 'default' : 'outline'} className={inv.status === 'Paid' ? 'bg-green-500' : inv.status === 'Overdue' ? 'text-red-500 border-red-500' : ''}>
                                                        {inv.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">Due: {new Date(inv.due_date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{formatCurrency(inv.total_amount)}</p>
                                                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate('/sales')}>View Invoice</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="quotes" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quotation History</CardTitle>
                            <CardDescription>All quotations sent to this client.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {quotations.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No quotations found.</p>
                            ) : (
                                <div className="space-y-4">
                                    {quotations.map(quote => (
                                        <div key={quote.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-sm">#{quote.id.substring(0, 8)}</h4>
                                                    <Badge variant="secondary">
                                                        {quote.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">Created: {new Date(quote.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{formatCurrency(quote.total_amount)}</p>
                                                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate('/sales')}>View Quote</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="photos" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Job Photos</CardTitle>
                            <CardDescription>Gallery of photos from all jobs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {attachments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-3">
                                        <ImageIcon className="h-6 w-6" />
                                    </div>
                                    <p>No photos uploaded yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {attachments.map((file) => (
                                        <div key={file.id} className="group relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border">
                                            {file.file_type.startsWith('image/') ? (
                                                <img
                                                    src={file.file_url}
                                                    alt={file.file_name}
                                                    className="w-full h-full object-cover transition-transform hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                                                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                                    <span className="text-xs truncate w-full">{file.file_name}</span>
                                                </div>
                                            )}

                                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="font-medium truncate">{file.description || file.file_name}</p>
                                                <p className="text-white/70 text-[10px]">
                                                    {new Date(file.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
