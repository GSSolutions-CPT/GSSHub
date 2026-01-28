import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, FileText, Calendar, RefreshCw, AlertCircle, Search, CreditCard, CheckCircle, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useCurrency } from '@/lib/use-currency.jsx'

export default function Contracts() {
  const { formatCurrency } = useCurrency()
  const [contracts, setContracts] = useState([])
  const [clients, setClients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    description: '',
    amount: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    next_billing_date: '',
    active: true
  })

  // Fetch Logic Preserved
  const fetchContracts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_contracts')
        .select(`
          *,
          clients (name, company, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContracts(data || [])
    } catch (error) {
      console.error('Error fetching contracts:', error)
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

  useEffect(() => {
    fetchContracts()
    fetchClients()
  }, [fetchContracts, fetchClients])

  const calculateNextBillingDate = (startDate, frequency) => {
    const date = new Date(startDate)
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'annually':
        date.setFullYear(date.getFullYear() + 1)
        break
    }
    return date.toISOString().split('T')[0]
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const nextBilling = formData.next_billing_date || calculateNextBillingDate(formData.start_date, formData.frequency)

      const { error } = await supabase
        .from('recurring_contracts')
        .insert([{
          ...formData,
          amount: parseFloat(formData.amount),
          next_billing_date: nextBilling
        }])

      if (error) throw error

      await supabase.from('activity_log').insert([{
        type: 'Contract Created',
        description: `New recurring contract created`,
        related_entity_type: 'contract'
      }])

      setIsDialogOpen(false)
      setFormData({
        client_id: '',
        description: '',
        amount: '',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        next_billing_date: '',
        active: true
      })
      fetchContracts()
      toast.success('Contract created successfully!')
    } catch (error) {
      console.error('Error creating contract:', error)
      toast.error('Error creating contract. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleContractStatus = async (contractId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('recurring_contracts')
        .update({ active: !currentStatus })
        .eq('id', contractId)

      if (error) throw error

      await supabase.from('activity_log').insert([{
        type: 'Contract Status Changed',
        description: `Contract ${!currentStatus ? 'activated' : 'deactivated'}`,
        related_entity_id: contractId,
        related_entity_type: 'contract'
      }])

      fetchContracts()
      toast.success(`Contract ${!currentStatus ? 'activated' : 'deactivated'}`)
    } catch (error) {
      console.error('Error updating contract:', error)
      toast.error('Failed to update status')
    }
  }

  const generateInvoice = async (contract) => {
    const toastId = toast.loading('Generating invoice...')
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          client_id: contract.client_id,
          status: 'Draft',
          date_created: new Date().toISOString(),
          due_date: contract.next_billing_date,
          total_amount: contract.amount,
          vat_applicable: false,
          metadata: {
            contract_id: contract.id,
            auto_generated: true
          }
        }])
        .select()

      if (invoiceError) throw invoiceError

      const invoiceId = invoiceData[0].id

      const { error: lineError } = await supabase
        .from('invoice_lines')
        .insert([{
          invoice_id: invoiceId,
          quantity: 1,
          unit_price: contract.amount,
          line_total: contract.amount,
          cost_price: 0,
          description: contract.description || 'Recurring Service'
        }])

      if (lineError) throw lineError

      const nextBilling = calculateNextBillingDate(contract.next_billing_date, contract.frequency)
      const { error: updateError } = await supabase
        .from('recurring_contracts')
        .update({ next_billing_date: nextBilling })
        .eq('id', contract.id)

      if (updateError) throw updateError

      await supabase.from('activity_log').insert([{
        type: 'Invoice Generated',
        description: `Invoice auto-generated from recurring contract`,
        related_entity_id: invoiceId,
        related_entity_type: 'invoice'
      }])

      fetchContracts()
      toast.success('Invoice generated successfully!', { id: toastId })
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast.error('Error generating invoice. Please try again.', { id: toastId })
    }
  }



  const isDueSoon = (date) => {
    const today = new Date()
    const dueDate = new Date(date)
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
    return daysUntilDue <= 7 && daysUntilDue >= 0
  }

  const isOverdue = (date) => {
    const today = new Date()
    const dueDate = new Date(date)
    return dueDate < today
  }

  // Filter Logic
  const filteredContracts = contracts.filter(contract =>
    contract.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats Logic
  const activeContracts = contracts.filter(c => c.active)
  const totalMRR = activeContracts.reduce((sum, c) => {
    if (c.frequency === 'monthly') return sum + (c.amount || 0)
    if (c.frequency === 'annually') return sum + ((c.amount || 0) / 12)
    return sum
  }, 0)

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-medium flex items-center gap-2">
              Monthly Recurring Revenue
              <RefreshCw className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">{formatCurrency(totalMRR)}</h3>
            <p className="text-emerald-200 text-xs mt-1">estimated monthly revenue</p>
          </div>
          <CreditCard className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
              Active Contracts
              <CheckCircle className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">{activeContracts.length}</h3>
            <p className="text-blue-200 text-xs mt-1">active subscriptions</p>
          </div>
          <FileText className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="relative z-10">
            <p className="text-amber-100 text-sm font-medium flex items-center gap-2">
              Due Soon
              <AlertCircle className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">
              {contracts.filter(c => c.active && isDueSoon(c.next_billing_date)).length}
            </h3>
            <p className="text-amber-100/80 text-xs mt-1">contracts needing attention</p>
          </div>
          <Calendar className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts or clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20">
              <Plus className="mr-2 h-4 w-4" />
              New Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Recurring Contract</DialogTitle>
              <DialogDescription>
                Set up a new service agreement or maintenance contract
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
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Monthly maintenance service"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="frequency">Billing Frequency *</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="next_billing_date">Next Billing Date</Label>
                    <Input
                      id="next_billing_date"
                      type="date"
                      value={formData.next_billing_date}
                      onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Active (start billing immediately)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Contract
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContracts.map((contract) => {
          return (
            <Card key={contract.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-1 h-full ${contract.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {contract.clients?.name || 'Unknown Client'}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </CardTitle>
                    <CardDescription className="line-clamp-1">{contract.clients?.company}</CardDescription>
                  </div>
                  <Badge variant={contract.active ? 'default' : 'secondary'} className={contract.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200' : ''}>
                    {contract.active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(contract.amount)}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium capitalize">
                    /{contract.frequency}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[40px]">
                    {contract.description}
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                    <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Next Billing</span>
                    <span className={`font-medium ${isOverdue(contract.next_billing_date) ? 'text-red-600' : isDueSoon(contract.next_billing_date) ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {new Date(contract.next_billing_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => generateInvoice(contract)}
                  disabled={!contract.active}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Invoice
                </Button>
                <Button
                  variant={contract.active ? 'ghost' : 'default'}
                  size="sm"
                  className={`flex-1 ${contract.active ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  onClick={() => toggleContractStatus(contract.id, contract.active)}
                >
                  {contract.active ? 'Pause' : 'Resume'}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {filteredContracts.length === 0 && (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-6 rounded-full mb-4">
              <FileText className="h-12 w-12 text-emerald-400" />
            </div>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
              {searchTerm ? 'No contracts found' : 'No active contracts'}
            </p>
            <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">
              {searchTerm ? `Try adjusting your search for "${searchTerm}"` : 'Create your first recurring revenue contract to get started.'}
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Create Contract
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

