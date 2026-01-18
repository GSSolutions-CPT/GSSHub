import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, FileText, Calendar, Banknote, RefreshCw, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function Contracts() {
  const [contracts, setContracts] = useState([])
  const [clients, setClients] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    description: '',
    amount: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    next_billing_date: '',
    active: true
  })

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

      // Log activity
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
    }
  }

  const toggleContractStatus = async (contractId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('recurring_contracts')
        .update({ active: !currentStatus })
        .eq('id', contractId)

      if (error) throw error

      // Log activity
      await supabase.from('activity_log').insert([{
        type: 'Contract Status Changed',
        description: `Contract ${!currentStatus ? 'activated' : 'deactivated'}`,
        related_entity_id: contractId,
        related_entity_type: 'contract'
      }])

      fetchContracts()
    } catch (error) {
      console.error('Error updating contract:', error)
    }
  }

  const generateInvoice = async (contract) => {
    try {
      // Create invoice from contract
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

      // Create invoice line
      const { error: lineError } = await supabase
        .from('invoice_lines')
        .insert([{
          invoice_id: invoiceId,
          quantity: 1,
          unit_price: contract.amount,
          line_total: contract.amount,
          cost_price: 0
        }])

      if (lineError) throw lineError

      // Update next billing date
      const nextBilling = calculateNextBillingDate(contract.next_billing_date, contract.frequency)
      const { error: updateError } = await supabase
        .from('recurring_contracts')
        .update({ next_billing_date: nextBilling })
        .eq('id', contract.id)

      if (updateError) throw updateError

      // Log activity
      await supabase.from('activity_log').insert([{
        type: 'Invoice Generated',
        description: `Invoice auto-generated from recurring contract`,
        related_entity_id: invoiceId,
        related_entity_type: 'invoice'
      }])

      fetchContracts()
      toast.success('Invoice generated successfully!')
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast.error('Error generating invoice. Please try again.')
    }
  }

  const getFrequencyLabel = (frequency) => {
    const labels = {
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annually'
    }
    return labels[frequency] || frequency
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Recurring Contracts</h1>
          <p className="text-muted-foreground mt-1">Manage service agreements and maintenance contracts</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                <Button type="submit">Create Contract</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <FileText className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contracts.filter(c => c.active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <Banknote className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R{contracts
                .filter(c => c.active && c.frequency === 'monthly')
                .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Calendar className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contracts.filter(c => c.active && isDueSoon(c.next_billing_date)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contracts.filter(c => c.active && isOverdue(c.next_billing_date)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contracts.map((contract) => (
          <Card key={contract.id} className={`hover:shadow-lg transition-shadow ${!contract.active ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {contract.clients?.name || 'Unknown Client'}
                  </CardTitle>
                  {contract.clients?.company && (
                    <CardDescription>{contract.clients.company}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge className={contract.active ? 'bg-green-500' : 'bg-gray-500'}>
                    {contract.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">
                    {getFrequencyLabel(contract.frequency)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {contract.description}
                </p>

                <div className="flex justify-between items-center py-2 border-t border-b">
                  <span className="text-sm text-muted-foreground">Contract Amount:</span>
                  <span className="text-xl font-bold text-green-600">
                    R{parseFloat(contract.amount).toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span>{new Date(contract.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Billing:</span>
                    <span className={`font-medium ${isOverdue(contract.next_billing_date) ? 'text-red-600' : isDueSoon(contract.next_billing_date) ? 'text-orange-600' : ''}`}>
                      {new Date(contract.next_billing_date).toLocaleDateString()}
                      {isOverdue(contract.next_billing_date) && ' (Overdue)'}
                      {isDueSoon(contract.next_billing_date) && !isOverdue(contract.next_billing_date) && ' (Due Soon)'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {contract.active && (
                    <Button
                      size="sm"
                      onClick={() => generateInvoice(contract)}
                      className="flex-1"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Invoice
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleContractStatus(contract.id, contract.active)}
                  >
                    {contract.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {contracts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No contracts yet. Create your first recurring contract to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

