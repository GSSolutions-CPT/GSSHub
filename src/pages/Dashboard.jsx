import { useState, useEffect, Suspense, lazy } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Banknote, TrendingUp, Users, AlertCircle, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrency } from '@/lib/use-currency.jsx'

const FinancialCharts = lazy(() => import('./FinancialCharts.jsx'))

export default function Dashboard() {
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
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

      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

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
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.monthlyProfit)}</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.newClients}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics.overdueInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Action required
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
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest actions across the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {activities.map((activity, index) => (
                <div key={activity.id || index} className="flex items-center">
                  <Activity className="mr-4 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
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