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
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription>Revenue, profit, and expenses over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {hasMonthlyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue" />
                  <Bar dataKey="profit" fill="hsl(var(--chart-3))" name="Profit" />
                  <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name="Expenses" />
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

      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Job vs general expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {hasExpenseData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: R${value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${entry?.name ?? index}`}
                        fill={resolvedColors[index % resolvedColors.length]}
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

