import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
const DEFAULT_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export default function FinancialCharts({ monthlyData, expenseBreakdown, colors = DEFAULT_COLORS }) {
  const resolvedColors = colors.length ? colors : DEFAULT_COLORS;
  const hasMonthlyData = Array.isArray(monthlyData) && monthlyData.length > 0;
  const hasExpenseData =
    Array.isArray(expenseBreakdown) && expenseBreakdown.some((entry) => (entry?.value ?? 0) > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass-effect tech-border bg-transparent col-span-2 lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-900/50">
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription className="text-muted-foreground/80">Revenue, profit, and expenses over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {hasMonthlyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.2)" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Not enough data to render this chart yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect tech-border bg-transparent col-span-2 lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-900/50">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription className="text-muted-foreground/80">Job vs general expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {hasExpenseData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${entry?.name ?? index}`}
                        fill={resolvedColors[index % resolvedColors.length]}
                        stroke="rgba(0,0,0,0)"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Add expenses to see the breakdown.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

