import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Banknote, TrendingUp, Users, AlertCircle, Activity, FileText, Receipt, Briefcase, Package, FileSignature, Plus, UserPlus, FilePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrency } from '@/lib/use-currency.jsx'

const FinancialCharts = lazy(() => import('./FinancialCharts.jsx'))

const getActivityConfig = (type) => {
  const t = (type || '').toLowerCase()
  if (t.includes('quotation') || t.includes('quote')) return { icon: FileText, color: 'text-blue-500', path: '/sales' }
  if (t.includes('invoice')) return { icon: Receipt, color: 'text-purple-500', path: '/sales' }
  if (t.includes('payment')) return { icon: Banknote, color: 'text-green-500', path: '/sales' }
  if (t.includes('job')) return { icon: Briefcase, color: 'text-orange-500', path: '/jobs' }
  if (t.includes('client')) return { icon: Users, color: 'text-teal-500', path: '/clients' }
  if (t.includes('purchase order') || t.includes('order')) return { icon: Package, color: 'text-indigo-500', path: '/sales' }
  if (t.includes('contract')) return { icon: FileSignature, color: 'text-cyan-500', path: '/contracts' }
  return { icon: Activity, color: 'text-muted-foreground', path: '/dashboard' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { formatCurrency } = useCurrency()
  const [metrics, setMetrics] = useState({
    monthlyRevenue: 0,
    monthlyProfit: 0,
    newClients: 0,
    overdueInvoices: 0
  })
  const [monthlyData, setMonthlyData] = useState([])
  const [expenseBreakdown, setExpenseBreakdown] = useState([])
  const [activities, setActivities] = useState([])

  const fetchDashboardData = useCallback(async () => {
    try {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Fetch Clients
      const { data: clients } = await supabase.from('clients').select('*')

      // Fetch Invoices
      const { data: invoices } = await supabase.from('invoices').select('*')

      // Fetch Expenses
      const { data: expenses } = await supabase.from('expenses').select('*')

      // Fetch Activity Log
      const { data: activityLog } = await supabase
        .from('activity_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5)

      // Calculate Metrics
      const currentMonthInvoices = invoices?.filter(inv =>
        new Date(inv.date_created) >= new Date(firstDayOfMonth) &&
        inv.status !== 'Draft'
      ) || []

      const monthlyRevenue = currentMonthInvoices
        .filter(inv => ['Paid', 'Sent', 'Overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0)

      const monthlyProfit = currentMonthInvoices
        .filter(inv => ['Paid', 'Sent', 'Overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + (parseFloat(inv.profit_estimate) || 0), 0)

      const newClients = clients?.filter(c =>
        new Date(c.created_at) >= new Date(firstDayOfMonth)
      ).length || 0

      const overdueInvoices = invoices?.filter(inv => inv.status === 'Overdue').length || 0

      setMetrics({
        monthlyRevenue,
        monthlyProfit,
        newClients,
        overdueInvoices
      })

      setActivities(activityLog || [])

      // Prepare Chart Data (reuse logic)
      prepareChartData(invoices || [], expenses || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }, []) // No dependencies needed as supabase is imported

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const prepareChartData = (invoices, expenses) => {
    const data = {}
    const expenseTypes = { job: 0, general: 0 }

    // Process Invoices
    invoices.forEach(inv => {
      if (['Paid', 'Sent', 'Overdue'].includes(inv.status)) {
        const month = new Date(inv.date_created).toLocaleDateString('en-US', { month: 'short' })
        if (!data[month]) data[month] = { month, revenue: 0, profit: 0, expenses: 0 }
        data[month].revenue += parseFloat(inv.total_amount) || 0
        data[month].profit += parseFloat(inv.profit_estimate) || 0
      }
    })

    // Process Expenses
    expenses.forEach(exp => {
      const month = new Date(exp.date).toLocaleDateString('en-US', { month: 'short' })
      if (!data[month]) data[month] = { month, revenue: 0, profit: 0, expenses: 0 }
      data[month].expenses += parseFloat(exp.amount) || 0

      if (exp.type) {
        expenseTypes[exp.type] += parseFloat(exp.amount) || 0
      }
    })

    // Sort by month (rudimentary sort, assumes current year roughly)
    const sortedData = Object.values(data).reverse().slice(0, 6).reverse() // Last 6 months
    setMonthlyData(sortedData)

    setExpenseBreakdown([
      { name: 'Job Expenses', value: expenseTypes.job },
      { name: 'General Overhead', value: expenseTypes.general }
    ])
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-1">
            {(() => {
              const hour = new Date().getHours()
              if (hour < 12) return 'Good Morning'
              if (hour < 18) return 'Good Afternoon'
              return 'Good Evening'
            })()}
          </h2>
          <p className="text-slate-300">Here&apos;s your daily overview.</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/create-sale?type=quotation')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg transition-all border border-white/10 text-sm font-medium"
          >
            <FilePlus className="h-4 w-4" /> New Quote
          </button>
          <button
            onClick={() => navigate('/create-sale?type=invoice')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg transition-all border border-white/10 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> New Invoice
          </button>
          <button
            onClick={() => navigate('/clients')} // Redirecting to clients list to add client is standard pattern, or a modal? Let's assume navigating to clients page is safer for now or if there is a create client route? No create client route seen, usually handled in Clients page.
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg transition-all border border-white/10 text-sm font-medium"
          >
            <UserPlus className="h-4 w-4" /> Add Client
          </button>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Banknote className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-medium">+20.1%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Est. Profit</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.monthlyProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-medium">+15%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-purple-50 to-white dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Clients</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">+{metrics.newClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Joined this month
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-orange-50 to-white dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.overdueInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <Suspense fallback={<div>Loading charts...</div>}>
            <FinancialCharts monthlyData={monthlyData} expenseBreakdown={expenseBreakdown} />
          </Suspense>
        </div>

        {/* Activity Feed */}
        <Card className="col-span-3 glass-effect tech-border bg-transparent">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Latest actions across the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const config = getActivityConfig(activity.type)
                const Icon = config.icon

                return (
                  <div
                    key={activity.id || index}
                    className="flex items-center p-3 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 cursor-pointer transition-all duration-200"
                    onClick={() => navigate(config.path)}
                  >
                    <Icon className={`mr-4 h-4 w-4 ${config.color}`} />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none text-foreground">
                        {activity.type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )
              })}
              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}