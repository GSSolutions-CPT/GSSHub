import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Download, Database, FileSpreadsheet, Users, Package, Receipt, Briefcase, Moon, Sun, UserPlus, Trash2, Wallet, Coins, Building, Scale } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/use-theme.jsx'
import { useCurrency } from '@/lib/use-currency.jsx'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/lib/use-settings.jsx'

export default function Settings() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { theme, setTheme } = useTheme()
  const { currency, updateCurrency } = useCurrency()
  const { settings, updateSetting } = useSettings()
  const [users, setUsers] = useState([])
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', role: 'technician', password: '' })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      // In a real app, you would use supabase.auth.signUp() here
      // For this implementation (demo/mock), we just insert into the users table
      const { error } = await supabase.from('users').insert([{
        email: newUser.email,
        role: newUser.role,
        password_hash: 'hashed_placeholder', // Demo only
        is_active: true
      }])

      if (error) throw error

      alert('User added successfully!')
      setIsUserDialogOpen(false)
      setNewUser({ email: '', role: 'technician', password: '' })
      fetchUsers()
    } catch (error) {
      console.error('Error adding user:', error)
      alert('Failed to add user')
    }
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to remove this user?')) return
    try {
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) throw error
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const handleImportClients = async (file) => {
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())

      const clients = []
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim())
          const client = {}
          headers.forEach((header, index) => {
            client[header] = values[index] || ''
          })
          clients.push(client)
        }
      }

      const { error } = await supabase
        .from('clients')
        .insert(clients)

      if (error) throw error

      alert(`Successfully imported ${clients.length} clients!`)
    } catch (error) {
      console.error('Error importing clients:', error)
      alert('Error importing clients. Please check the file format.')
    } finally {
      setImporting(false)
    }
  }

  const handleImportProducts = async (file) => {
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())

      const products = []
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim())
          const product = {}
          headers.forEach((header, index) => {
            if (header === 'retail_price' || header === 'cost_price') {
              product[header] = parseFloat(values[index]) || 0
            } else {
              product[header] = values[index] || ''
            }
          })
          products.push(product)
        }
      }

      const { error } = await supabase
        .from('products')
        .insert(products)

      if (error) throw error

      alert(`Successfully imported ${products.length} products!`)
    } catch (error) {
      console.error('Error importing products:', error)
      alert('Error importing products. Please check the file format.')
    } finally {
      setImporting(false)
    }
  }

  const exportToCSV = async (table, filename) => {
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')

      if (error) throw error

      if (data && data.length > 0) {
        // Get headers from first object
        const headers = Object.keys(data[0])

        // Create CSV content
        let csv = headers.join(',') + '\n'
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header]
            // Handle values with commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value || ''
          })
          csv += values.join(',') + '\n'
        })

        // Download file
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        window.URL.revokeObjectURL(url)

        alert(`Successfully exported ${data.length} records!`)
      } else {
        alert('No data to export')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Error exporting data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const exportToJSON = async (table, filename) => {
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')

      if (error) throw error

      if (data && data.length > 0) {
        const json = JSON.stringify(data, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        window.URL.revokeObjectURL(url)

        alert(`Successfully exported ${data.length} records!`)
      } else {
        alert('No data to export')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Error exporting data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage data import, export, and system settings</p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="import">
            <Upload className="mr-2 h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building className="mr-2 h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="banking">
            <Wallet className="mr-2 h-4 w-4" />
            Banking
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="mr-2 h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="legal">
            <Scale className="mr-2 h-4 w-4" />
            Legal
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Manage your company details displayed on invoices and quotes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Company Name</Label>
                <Input
                  value={settings.companyName || ''}
                  onChange={(e) => updateSetting('companyName', e.target.value)}
                  placeholder="Global Security Solutions"
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone Number</Label>
                <Input
                  value={settings.companyPhone || ''}
                  onChange={(e) => updateSetting('companyPhone', e.target.value)}
                  placeholder="062 955 8559"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email Address</Label>
                <Input
                  value={settings.companyEmail || ''}
                  onChange={(e) => updateSetting('companyEmail', e.target.value)}
                  placeholder="Kyle@GSSolutions.co.za"
                />
              </div>
              <div className="grid gap-2">
                <Label>Physical Address</Label>
                <Input
                  value={settings.companyAddress || ''}
                  onChange={(e) => updateSetting('companyAddress', e.target.value)}
                  placeholder="66 Robyn RD, Durbanville"
                />
              </div>
              <div className="grid gap-2">
                <Label>VAT Registration (Optional)</Label>
                <Input
                  placeholder="e.g. 4440263660"
                  value={settings.companyVat || ''}
                  onChange={(e) => updateSetting('companyVat', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal / Terms */}
        <TabsContent value="legal" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>Terms & Conditions</CardTitle>
                  <CardDescription>Customize the terms appended to your PDFs.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => localStorage.removeItem('companyTerms') || alert('Resetted to defaults')}>
                  Reset to Default
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground mb-4">
                <p>Currently, terms are managed via a JSON structure for advanced control. A visual editor is coming soon.</p>
              </div>
              <p className="text-sm">For now, your terms are using the system default unless customized.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Clients</CardTitle>
              <CardDescription>
                Upload a CSV file to import multiple clients at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">CSV Format:</p>
                <code className="text-xs">
                  name,company,email,phone,address
                  <br />
                  John Doe,Acme Corp,john@acme.com,555-0100,123 Main St
                </code>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="import-clients">Select CSV File</Label>
                <input
                  id="import-clients"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImportClients(e.target.files[0])
                    }
                  }}
                  disabled={importing}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Products</CardTitle>
              <CardDescription>
                Upload a CSV file to import multiple products at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">CSV Format:</p>
                <code className="text-xs">
                  name,code,category,retail_price,cost_price,description
                  <br />
                  Widget A,WA-001,Electronics,99.99,50.00,High-quality widget
                </code>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="import-products">Select CSV File</Label>
                <input
                  id="import-products"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImportProducts(e.target.files[0])
                    }
                  }}
                  disabled={importing}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Clients</CardTitle>
                </div>
                <CardDescription>Export all client data</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToCSV('clients', 'clients.csv')}
                  disabled={exporting}
                  className="flex-1"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToJSON('clients', 'clients.json')}
                  disabled={exporting}
                  className="flex-1"
                >
                  <Database className="mr-2 h-4 w-4" />
                  JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <CardTitle>Products</CardTitle>
                </div>
                <CardDescription>Export all product data</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToCSV('products', 'products.csv')}
                  disabled={exporting}
                  className="flex-1"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToJSON('products', 'products.json')}
                  disabled={exporting}
                  className="flex-1"
                >
                  <Database className="mr-2 h-4 w-4" />
                  JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle>Invoices</CardTitle>
                </div>
                <CardDescription>Export all invoice data</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToCSV('invoices', 'invoices.csv')}
                  disabled={exporting}
                  className="flex-1"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToJSON('invoices', 'invoices.json')}
                  disabled={exporting}
                  className="flex-1"
                >
                  <Database className="mr-2 h-4 w-4" />
                  JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <CardTitle>Jobs</CardTitle>
                </div>
                <CardDescription>Export all job data</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToCSV('jobs', 'jobs.csv')}
                  disabled={exporting}
                  className="flex-1"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToJSON('jobs', 'jobs.json')}
                  disabled={exporting}
                  className="flex-1"
                >
                  <Database className="mr-2 h-4 w-4" />
                  JSON
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Full Database Backup</CardTitle>
              <CardDescription>
                Export all data for backup purposes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={async () => {
                  const tables = ['clients', 'products', 'quotations', 'invoices', 'jobs', 'expenses', 'recurring_contracts']
                  const backup = {}

                  for (const table of tables) {
                    const { data } = await supabase.from(table).select('*')
                    backup[table] = data || []
                  }

                  const json = JSON.stringify(backup, null, 2)
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `backup-${new Date().toISOString().split('T')[0]}.json`
                  a.click()
                  window.URL.revokeObjectURL(url)

                  alert('Full backup exported successfully!')
                }}
                disabled={exporting}
              >
                <Database className="mr-2 h-4 w-4" />
                Download Full Backup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Team Members</h2>
              <p className="text-muted-foreground">Manage access and roles</p>
            </div>
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new account for a team member.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUser}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Temporary Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Account</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)} className="text-destructive hover:text-destructive/90">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No users found.</p>
            )}
          </div>
        </TabsContent>
        {/* Banking Details Tab */}
        <TabsContent value="banking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Banking Details</CardTitle>
              <CardDescription>
                These details will appear on all generated invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Bank Name</Label>
                <Input
                  value={settings.bankName || ''}
                  onChange={(e) => updateSetting('bankName', e.target.value)}
                  placeholder="FNB/RMB"
                />
              </div>
              <div className="grid gap-2">
                <Label>Account Holder</Label>
                <Input
                  value={settings.bankAccountHolder || ''}
                  onChange={(e) => updateSetting('bankAccountHolder', e.target.value)}
                  placeholder="Global Security Solutions"
                />
              </div>
              <div className="grid gap-2">
                <Label>Account Type</Label>
                <Input
                  value={settings.bankAccountType || ''}
                  onChange={(e) => updateSetting('bankAccountType', e.target.value)}
                  placeholder="Cheque Account"
                />
              </div>
              <div className="grid gap-2">
                <Label>Account Number</Label>
                <Input
                  value={settings.bankAccountNumber || ''}
                  onChange={(e) => updateSetting('bankAccountNumber', e.target.value)}
                  placeholder="63182000223"
                />
              </div>
              <div className="grid gap-2">
                <Label>Branch Code</Label>
                <Input
                  value={settings.bankBranchCode || ''}
                  onChange={(e) => updateSetting('bankBranchCode', e.target.value)}
                  placeholder="250655"
                />
              </div>
              <div className="grid gap-2">
                <Label>Reference</Label>
                <Input
                  placeholder="Invoice Number"
                  value={settings.bankReference || ''}
                  onChange={(e) => updateSetting('bankReference', e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground pt-2">
                * Changes are saved automatically (Synced to Cloud).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <CardTitle>Currency</CardTitle>
          </div>
          <CardDescription>Select your preferred currency symbol</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>System Currency</Label>
            <Select
              value={currency}
              onValueChange={updateCurrency}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ZAR">ZAR (R)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            * Changes are applied immediately across the application.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Switch between light and dark mode</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === 'light' ? (
              <Sun className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {theme.charAt(0).toUpperCase() + theme.slice(1)} Mode
            </span>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
