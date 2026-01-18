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
import { useCurrency } from '@/lib/use-currency.jsx';

const DEFAULT_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export default function FinancialCharts({ monthlyData, expenseBreakdown, colors = DEFAULT_COLORS }) {
  const { formatCurrency } = useCurrency();
  const resolvedColors = colors.length ? colors : DEFAULT_COLORS;
  const hasMonthlyData = Array.isArray(monthlyData) && monthlyData.length > 0;
  const hasExpenseData =
    Array.isArray(expenseBreakdown) && expenseBreakdown.some((entry) => (entry?.value ?? 0) > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="glass-effect tech-border bg-transparent col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription className="text-muted-foreground/80">Revenue, profit, and expenses over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {hasMonthlyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted)/0.2)" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--state-popover))' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" radius={[4, 4, 0, 0]} />
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

      <Card className="glass-effect tech-border bg-transparent col-span-2 lg:col-span-2">
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
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={100}
                    fill="#8884d8"
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
                  <Tooltip />
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

