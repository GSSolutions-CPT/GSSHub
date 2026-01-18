import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Mail, Phone, Building2, MapPin, ExternalLink, Users, Pencil, Trash2, Loader2, TrendingUp, UserPlus, Receipt, ArrowUpDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useCurrency } from '@/lib/use-currency.jsx'

export default function Clients() {
  const { formatCurrency } = useCurrency()
  const [clients, setClients] = useState([])
  const [invoices, setInvoices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest') // 'name', 'newest', 'revenue'
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingClient, setEditingClient] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: ''
  })

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    try {
      // Fetch Clients
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
      if (clientError) throw clientError

      // Fetch Invoices (for revenue stats)
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('client_id, total_amount, status')
      if (invoiceError) throw invoiceError

      setClients(clientData || [])
      setInvoices(invoiceData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load client data')
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Computed Metrics ---
  const clientRevenue = useMemo(() => {
    const revenueMap = {}
    invoices.forEach(inv => {
      if (inv.status === 'Paid') {
        revenueMap[inv.client_id] = (revenueMap[inv.client_id] || 0) + (inv.total_amount || 0)
      }
    })
    return revenueMap
  }, [invoices])

  const dashboardMetrics = useMemo(() => {
    const totalClients = clients.length
    const totalRevenue = Object.values(clientRevenue).reduce((sum, val) => sum + val, 0)

    // New Clients this month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const newClients = clients.filter(c => new Date(c.created_at) >= firstDay).length

    return { totalClients, totalRevenue, newClients }
  }, [clients, clientRevenue])

  // --- Filtering & Sorting ---
  const filteredAndSortedClients = useMemo(() => {
    const result = clients.filter(client =>
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'revenue') return (clientRevenue[b.id] || 0) - (clientRevenue[a.id] || 0)
      return 0
    })

    return result
  }, [clients, searchTerm, sortBy, clientRevenue])


  // --- Handlers ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingClient) {
        const { error } = await supabase.from('clients').update(formData).eq('id', editingClient.id)
        if (error) throw error

        await supabase.from('activity_log').insert([{
          type: 'Client Updated',
          description: `Client updated: ${formData.name}`,
          related_entity_id: editingClient.id,
          related_entity_type: 'client'
        }])

        toast.success('Client updated successfully')
      } else {
        const { error } = await supabase.from('clients').insert([formData])
        if (error) throw error

        await supabase.from('activity_log').insert([{
          type: 'Client Created',
          description: `New client added: ${formData.name}`,
          related_entity_type: 'client'
        }])

        toast.success('Client created successfully')
      }

      setIsDialogOpen(false)
      setEditingClient(null)
      setFormData({ name: '', company: '', email: '', phone: '', address: '' })
      fetchData()
    } catch (error) {
      console.error('Error saving client:', error)
      toast.error('Failed to save client')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this client? This will implicitly delete all their sales and jobs!')) return
    const toastId = toast.loading('Deleting client...')
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
      toast.success('Client deleted successfully', { id: toastId })
      fetchData()
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Error: Client may have active records.', { id: toastId })
    }
  }

  const copyPortalLink = (client) => {
    const portalLink = `${window.location.origin}/portal?client=${client.id}`
    navigator.clipboard.writeText(portalLink)
    toast.success('Portal link copied to clipboard!')
  }

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your client relationships and view performance.</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingClient(null)
              setFormData({ name: '', company: '', email: '', phone: '', address: '' })
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              <DialogDescription>Enter the client&apos;s information below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingClient ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">Active client profiles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(dashboardMetrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Total paid invoices from all clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">+{dashboardMetrics.newClients}</div>
            <p className="text-xs text-muted-foreground">New clients added recently</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Sorting */}
      <div className="flex flex-col md:flex-row gap-4 bg-muted/30 p-4 rounded-lg items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or email..."
            className="pl-8 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] bg-background">
            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest Added</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="revenue">Highest Revenue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedClients.map((client) => (
          <Card key={client.id} className="hover:shadow-lg transition-all duration-200 group">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  {client.company && (
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Building2 className="h-3 w-3" /> {client.company}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(client)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(client.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>

              {/* Revenue Badge */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Receipt className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Lifetime Revenue</p>
                    <p className="text-sm font-bold">{formatCurrency(clientRevenue[client.id] || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => copyPortalLink(client)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Client Portal Link
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAndSortedClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-lg border border-dashed">
          <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No clients found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or add a new client.</p>
        </div>
      )}
    </div>
  )
}
