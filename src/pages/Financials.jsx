import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { Plus, Banknote, TrendingUp, TrendingDown, Receipt, Pencil, Trash2, Paperclip, FileText, Calendar, Wallet, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const FinancialCharts = lazy(() => import('./FinancialCharts.jsx'))

export default function Financials() {
  const [expenses, setExpenses] = useState([])
  const [jobs, setJobs] = useState([])
  const [invoices, setInvoices] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: 'general',
    job_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    receipt_url: ''
  })
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsDialogOpen(true)
      // Optional: Clear the param so it doesn't reopen on refresh, 
      // but keeping it might be fine for now. 
      // Better to clear it after opening.
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('action')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchExpenses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    }
  }, [])

  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (name)
        `)
        .eq('status', 'Completed')

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }, [])

  const fetchInvoices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (name)
        `)
        .gte('date_created', dateRange.start)
        .lte('date_created', dateRange.end)

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    }
  }, [dateRange])

  useEffect(() => {
    fetchExpenses()
    fetchJobs()
    fetchInvoices()
  }, [fetchExpenses, fetchJobs, fetchInvoices])

  const handleFileChange = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // MOCK OVERRIDE: Since the mock public URL won't display a local file,
      // we use a blob URL for immediate preview/usage in this session.
      const displayUrl = URL.createObjectURL(file)

      setFormData(prev => ({ ...prev, receipt_url: displayUrl }))
      toast.success('Receipt attached!')

    } catch (error) {
      console.error('Error uploading receipt:', error)
      toast.error('Error uploading receipt')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingId) {
        const { error } = await supabase
          .from('expenses')
          .update({
            ...formData,
            amount: parseFloat(formData.amount),
            job_id: formData.type === 'job' && formData.job_id ? formData.job_id : null
          })
          .eq('id', editingId)

        if (error) throw error

        // Log activity
        await supabase.from('activity_log').insert([{
          type: 'Expense Updated',
          description: `Updated ${formData.type} expense: ${formData.description}`,
          related_entity_type: 'expense',
          related_entity_id: editingId
        }])

        toast.success('Expense updated successfully')
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([{
            ...formData,
            amount: parseFloat(formData.amount),
            job_id: formData.type === 'job' && formData.job_id ? formData.job_id : null
          }])

        if (error) throw error

        // Log activity
        await supabase.from('activity_log').insert([{
          type: 'Expense Added',
          description: `New ${formData.type} expense: ${formData.description}`,
          related_entity_type: 'expense'
        }])

        toast.success('Expense recorded successfully')
      }

      setFormData({
        type: 'general',
        job_id: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        receipt_url: ''
      })
      setEditingId(null)
      setIsDialogOpen(false)
      fetchExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error('Failed to save expense')
    }
  }


  const handleEdit = (expense) => {
    setFormData({
      type: expense.type,
      job_id: expense.job_id || '',
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      receipt_url: expense.receipt_url || ''
    })
    setEditingId(expense.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Expense deleted successfully')
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  // Calculate financial metrics
  const calculateMetrics = () => {
    const filteredInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.date_created)
      return invDate >= new Date(dateRange.start) && invDate <= new Date(dateRange.end)
    })

    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date)
      return expDate >= new Date(dateRange.start) && expDate <= new Date(dateRange.end)
    })

    const totalRevenue = filteredInvoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)

    const totalProfit = filteredInvoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + parseFloat(inv.profit_estimate || 0), 0)

    const totalExpenses = filteredExpenses
      .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)

    const netProfit = totalProfit - totalExpenses

    return {
      totalRevenue,
      totalProfit,
      totalExpenses,
      netProfit,
      profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0
    }
  }

  // Prepare chart data
  const prepareMonthlyData = () => {
    const monthlyData = {}

    // Group invoices by month
    invoices.forEach(inv => {
      if (inv.status === 'Paid') {
        const month = new Date(inv.date_created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        if (!monthlyData[month]) {
          monthlyData[month] = { month, revenue: 0, profit: 0, expenses: 0 }
        }
        monthlyData[month].revenue += parseFloat(inv.total_amount || 0)
        monthlyData[month].profit += parseFloat(inv.profit_estimate || 0)
      }
    })

    // Add expenses by month
    expenses.forEach(exp => {
      const month = new Date(exp.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, profit: 0, expenses: 0 }
      }
      monthlyData[month].expenses += parseFloat(exp.amount || 0)
    })

    return Object.values(monthlyData).sort((a, b) =>
      new Date(a.month) - new Date(b.month)
    )
  }

  // Prepare expense breakdown
  const prepareExpenseBreakdown = () => {
    const breakdown = {
      job: 0,
      general: 0
    }

    expenses.forEach(exp => {
      const expDate = new Date(exp.date)
      if (expDate >= new Date(dateRange.start) && expDate <= new Date(dateRange.end)) {
        breakdown[exp.type] += parseFloat(exp.amount || 0)
      }
    })

    return [
      { name: 'Job Expenses', value: breakdown.job },
      { name: 'General Overhead', value: breakdown.general }
    ]
  }

  const metrics = calculateMetrics()
  const monthlyData = prepareMonthlyData()
  const expenseBreakdown = prepareExpenseBreakdown()

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))']

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Financial Period</CardTitle>
              <CardDescription>Analyze performance over a specific timeframe</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-2">
              <Label htmlFor="start_date" className="text-xs font-medium text-muted-foreground ml-1">START DATE</Label>
              <Input
                id="start_date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="bg-white dark:bg-slate-950"
              />
            </div>
            <div className="flex-1 w-full space-y-2">
              <Label htmlFor="end_date" className="text-xs font-medium text-muted-foreground ml-1">END DATE</Label>
              <Input
                id="end_date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="bg-white dark:bg-slate-950"
              />
            </div>
            <Button onClick={fetchInvoices} className="w-full sm:w-auto bg-slate-900 dark:bg-slate-100 dark:text-slate-900">Apply Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-medium flex items-center gap-2">
              Total Revenue
              <ArrowUpRight className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">R{metrics.totalRevenue.toLocaleString()}</h3>
            <p className="text-emerald-100 text-xs mt-3 bg-emerald-700/30 w-fit px-2 py-1 rounded-full">
              From paid invoices
            </p>
          </div>
          <Banknote className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
              Gross Profit
              <PieChart className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">R{metrics.totalProfit.toLocaleString()}</h3>
            <div className="flex items-center gap-2 mt-3">
              <p className="text-blue-100 text-xs bg-blue-700/30 w-fit px-2 py-1 rounded-full">
                Margin: {metrics.profitMargin}%
              </p>
            </div>
          </div>
          <TrendingUp className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className="bg-gradient-to-br from-rose-600 to-rose-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="relative z-10">
            <p className="text-rose-100 text-sm font-medium flex items-center gap-2">
              Total Expenses
              <ArrowDownRight className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">R{metrics.totalExpenses.toLocaleString()}</h3>
            <p className="text-rose-100 text-xs mt-3 bg-rose-700/30 w-fit px-2 py-1 rounded-full">
              Recorded overheads
            </p>
          </div>
          <Receipt className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className={`rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300 ${metrics.netProfit >= 0 ? 'bg-gradient-to-br from-indigo-600 to-indigo-500' : 'bg-gradient-to-br from-orange-600 to-orange-500'
          }`}>
          <div className="relative z-10">
            <p className={`text-sm font-medium flex items-center gap-2 ${metrics.netProfit >= 0 ? 'text-indigo-100' : 'text-orange-100'}`}>
              Net Profit
              <Wallet className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">R{metrics.netProfit.toLocaleString()}</h3>
            <p className={`text-xs mt-3 w-fit px-2 py-1 rounded-full ${metrics.netProfit >= 0 ? 'text-indigo-100 bg-indigo-700/30' : 'text-orange-100 bg-orange-700/30'}`}>
              Bottom line
            </p>
          </div>
          {metrics.netProfit >= 0 ? (
            <TrendingUp className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <TrendingDown className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
          )}
        </div>
      </div>

      {/* Charts */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Revenue, profit, and expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Loading charts…
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Job vs general expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Loading charts…
                </div>
              </CardContent>
            </Card>
          </div>
        }
      >
        <FinancialCharts
          monthlyData={monthlyData}
          expenseBreakdown={expenseBreakdown}
          colors={COLORS}
        />
      </Suspense>

      {/* Expenses Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Expense Tracking</CardTitle>
              <CardDescription>Log and manage business expenses</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingId(null)
                  setFormData({
                    job_id: '',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    receipt_url: ''
                  })
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                  <DialogDescription>
                    Record a business expense
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Expense Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="job">Job Expense</SelectItem>
                          <SelectItem value="general">General Overhead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.type === 'job' && (
                      <div className="grid gap-2">
                        <Label htmlFor="job_id">Related Job</Label>
                        <Select
                          value={formData.job_id}
                          onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a job" />
                          </SelectTrigger>
                          <SelectContent>
                            {jobs.map((job) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.clients?.name} - {new Date(job.scheduled_datetime).toLocaleDateString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="receipt">Receipt (Optional)</Label>
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                      {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                      {formData.receipt_url && !uploading && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Paperclip className="h-4 w-4" />
                          Receipt attached
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploading}>
                      {editingId ? 'Update Expense' : 'Add Expense'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.slice(0, 10).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{expense.description}</p>
                    {expense.type === 'job' && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">JOB</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> {new Date(expense.date).toLocaleDateString()}
                    {expense.type === 'general' && <span className="opacity-50">• General Overhead</span>}
                  </p>

                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-rose-600 dark:text-rose-500">
                      -R{parseFloat(expense.amount).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {expense.receipt_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" asChild title="View Receipt">
                        <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => handleEdit(expense)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(expense.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No expenses recorded yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div >
  )
}

