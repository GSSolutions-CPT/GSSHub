import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Search, Building2, Users, Mail, Phone, MapPin, Pencil, Trash2, ExternalLink, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { shareLink } from '@/lib/share-utils'
import { toast } from 'sonner'
import { ClientDialog } from '@/components/ClientDialog'

import { useNavigate } from 'react-router-dom'

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)

  // Calculate Stats
  const totalClients = clients.length
  const newThisMonth = clients.filter(c => {
    const clientDate = new Date(c.created_at)
    const now = new Date()
    return clientDate.getMonth() === now.getMonth() && clientDate.getFullYear() === now.getFullYear()
  }).length

  /* 1. UPDATE fetchClients to hide archived profiles */
  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filter out archived clients client-side to handle null metadata safely
      const activeClients = (data || []).filter(client => client.metadata?.status !== 'archived')
      setClients(activeClients)
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleEdit = (client) => {
    setEditingClient(client)
    setIsDialogOpen(true)
  }

  /* 2. UPDATE handleDelete to "Soft Delete" (Archive) */
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to archive this client? Their financial history will be preserved but hidden from this list.')) return

    const toastId = toast.loading('Archiving client...')

    try {
      // Instead of DELETE, we UPDATE metadata
      const clientToArchive = clients.find(c => c.id === id)
      const newMetadata = {
        ...clientToArchive.metadata,
        status: 'archived',
        archived_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('clients')
        .update({ metadata: newMetadata })
        .eq('id', id)

      if (error) throw error

      toast.success('Client archived successfully', { id: toastId })
      fetchClients() // Refresh list
    } catch (error) {
      console.error('Error archiving client:', error)
      toast.error('Error archiving client.', { id: toastId })
    }
  }

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium">Total Clients</p>
            <h3 className="text-3xl font-bold mt-1">{totalClients}</h3>
            <p className="text-blue-100 text-xs mt-2">Active database</p>
          </div>
          <Users className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white opacity-10 rotate-12" />
        </div>
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-medium">New This Month</p>
            <h3 className="text-3xl font-bold mt-1">+{newThisMonth}</h3>
            <p className="text-emerald-100 text-xs mt-2">Growing your network</p>
          </div>
          <Building2 className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-white opacity-10 rotate-12" />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <ClientDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setEditingClient(null)
          }}
          clientToEdit={editingClient}
          onSuccess={() => {
            fetchClients()
            setIsDialogOpen(false)
            setEditingClient(null)
          }}
          trigger={
            <Button className="ssh-button-gradient shadow-md hover:shadow-lg transition-all">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          }
        />
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border overflow-hidden relative cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <CardHeader className="pb-3 pl-6">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg text-slate-900 dark:text-slate-100">{client.name}</CardTitle>
                  {client.company && (
                    <CardDescription className="flex items-center gap-2 font-medium text-slate-500 mt-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {client.company}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50" onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(client)
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(client.id)
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-6">
              <div className="space-y-3 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <span className="truncate">{client.address}</span>
                  </div>
                )}

                <div className="pt-4 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 group-hover:border-blue-200 dark:group-hover:border-blue-900/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      const portalLink = `${window.location.origin}/portal?client=${client.id}`
                      shareLink('GSS Client Portal', 'Access your client portal here:', portalLink)
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4 text-blue-500" />
                    Share Portal Link
                  </Button >
                </div >
                <div className="text-[10px] text-center text-muted-foreground/50 pt-1">
                  Added {new Date(client.created_at).toLocaleDateString()}
                </div>
              </div >
            </CardContent >
          </Card >
        ))}
      </div >
      {
        filteredClients.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">
              {searchTerm ? 'No matching clients' : 'No clients yet'}
            </h3>
            <p className="mb-6 max-w-sm text-center">
              {searchTerm ? 'Try adjusting your search terms.' : 'Add your first client to start creating quotes and invoices.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsDialogOpen(true)} className="ssh-button-gradient">
                Add First Client
              </Button>
            )}
          </div>
        )
      }
    </div >
  )
}
