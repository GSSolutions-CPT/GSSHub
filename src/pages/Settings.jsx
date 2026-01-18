import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database, Users, Building, Settings as SettingsIcon, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/use-theme.jsx'
import { useCurrency } from '@/lib/use-currency.jsx'
import { useSettings } from '@/lib/use-settings.jsx'
import { Textarea } from '@/components/ui/textarea'
import Papa from 'papaparse'

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
      const { error } = await supabase.from('users').insert([{
        email: newUser.email,
        role: newUser.role,
        password_hash: 'hashed_placeholder',
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

  const handleImportClients = (file) => {
    setImporting(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data } = results
          if (!data || data.length === 0) throw new Error('No data found in file')

          // Clean keys and values
          const clients = data.map(row => {
            const cleanRow = {}
            Object.keys(row).forEach(key => {
              if (key.trim()) {
                cleanRow[key.trim()] = row[key]?.trim() || ''
              }
            })
            return cleanRow
          })

          const { error } = await supabase.from('clients').insert(clients)
          if (error) throw error
          alert(`Successfully imported ${clients.length} clients!`)
        } catch (error) {
          console.error('Error importing clients:', error)
          alert('Error importing clients: ' + error.message)
        } finally {
          setImporting(false)
        }
      },
      error: (error) => {
        console.error('CSV Parse Error:', error)
        alert('Failed to parse CSV file')
        setImporting(false)
      }
    })
  }

  const handleImportProducts = (file) => {
    setImporting(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data } = results
          if (!data || data.length === 0) throw new Error('No data found in file')

          const products = data.map(row => {
            const product = {}
            Object.keys(row).forEach(key => {
              const cleanKey = key.trim()
              const value = row[key] ? row[key].trim() : ''

              if (cleanKey === 'retail_price' || cleanKey === 'cost_price') {
                product[cleanKey] = parseFloat(value) || 0
              } else if (cleanKey) {
                product[cleanKey] = value
              }
            })
            return product
          })

          const { error } = await supabase.from('products').insert(products)
          if (error) throw error
          alert(`Successfully imported ${products.length} products!`)
        } catch (error) {
          console.error('Error importing products:', error)
          alert('Error importing products: ' + error.message)
        } finally {
          setImporting(false)
        }
      },
      error: (error) => {
        console.error('CSV Parse Error:', error)
        alert('Failed to parse CSV file')
        setImporting(false)
      }
    })
  }

  const exportData = async (table, filename, format = 'csv') => {
    setExporting(true)
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw error
      if (!data || data.length === 0) {
        alert('No data to export')
        return
      }

      let content, type
      if (format === 'csv') {
        const headers = Object.keys(data[0])
        content = headers.join(',') + '\n'
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header]
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value || ''
          })
          content += values.join(',') + '\n'
        })
        type = 'text/csv'
      } else {
        content = JSON.stringify(data, null, 2)
        type = 'application/json'
      }

      const blob = new Blob([content], { type })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Error exporting data')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage organization, team, and system preferences</p>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="organization">
            <Building className="mr-2 h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="mr-2 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="mr-2 h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab: Company + Banking */}
        <TabsContent value="organization" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>Details displayed on invoices and quotes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Company Name</Label>
                  <Input value={settings.companyName || ''} onChange={(e) => updateSetting('companyName', e.target.value)} placeholder="Company Name" />
                </div>
                <div className="grid gap-2">
                  <Label>Phone Number</Label>
                  <Input value={settings.companyPhone || ''} onChange={(e) => updateSetting('companyPhone', e.target.value)} placeholder="Phone" />
                </div>
                <div className="grid gap-2">
                  <Label>Email Address</Label>
                  <Input value={settings.companyEmail || ''} onChange={(e) => updateSetting('companyEmail', e.target.value)} placeholder="Email" />
                </div>
                <div className="grid gap-2">
                  <Label>Physical Address</Label>
                  <Input value={settings.companyAddress || ''} onChange={(e) => updateSetting('companyAddress', e.target.value)} placeholder="Address" />
                </div>
                <div className="grid gap-2">
                  <Label>VAT Registration</Label>
                  <Input value={settings.companyVat || ''} onChange={(e) => updateSetting('companyVat', e.target.value)} placeholder="VAT Number" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Banking Details</CardTitle>
                <CardDescription>Banking info for invoices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Bank Name</Label>
                  <Input value={settings.bankName || ''} onChange={(e) => updateSetting('bankName', e.target.value)} placeholder="Bank Name" />
                </div>
                <div className="grid gap-2">
                  <Label>Account Holder</Label>
                  <Input value={settings.bankAccountHolder || ''} onChange={(e) => updateSetting('bankAccountHolder', e.target.value)} placeholder="Account Holder" />
                </div>
                <div className="grid gap-2">
                  <Label>Account Type</Label>
                  <Input value={settings.bankAccountType || ''} onChange={(e) => updateSetting('bankAccountType', e.target.value)} placeholder="Account Type" />
                </div>
                <div className="grid gap-2">
                  <Label>Account Number</Label>
                  <Input value={settings.bankAccountNumber || ''} onChange={(e) => updateSetting('bankAccountNumber', e.target.value)} placeholder="Account Number" />
                </div>
                <div className="grid gap-2">
                  <Label>Branch Code</Label>
                  <Input value={settings.bankBranchCode || ''} onChange={(e) => updateSetting('bankBranchCode', e.target.value)} placeholder="Branch Code" />
                </div>
                <div className="grid gap-2">
                  <Label>Reference</Label>
                  <Input value={settings.bankReference || ''} onChange={(e) => updateSetting('bankReference', e.target.value)} placeholder="Default Reference" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Team Members</h2>
              <p className="text-muted-foreground">Manage access and roles</p>
            </div>
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogTrigger asChild>
                <Button><Users className="mr-2 h-4 w-4" /> Add User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new account for a team member.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUser}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>Role</Label>
                      <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Temporary Password</Label>
                      <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                    </div>
                  </div>
                  <DialogFooter><Button type="submit">Create Account</Button></DialogFooter>
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
            {users.length === 0 && <p className="text-center text-muted-foreground py-8">No users found.</p>}
          </div>
        </TabsContent>

        {/* Preferences Tab: Theme + Currency + Legal */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Appearance</CardTitle>
                <CardDescription>Customize the look and feel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Switch between Light and Dark mode.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>Light</Button>
                    <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>Dark</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Currency</Label>
                    <p className="text-sm text-muted-foreground">Default currency for financials.</p>
                  </div>
                  <Select value={currency} onValueChange={updateCurrency}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR (R)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Legal Terms & Conditions</CardTitle>
                <CardDescription>Appended to Quotes and Invoices.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[200px]"
                  placeholder="Enter your standard terms and conditions here..."
                  value={settings.legalTerms || ''}
                  onChange={(e) => updateSetting('legalTerms', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">* These terms will be automatically visible on generated PDF documents.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Import Data</CardTitle>
                <CardDescription>Bulk upload Clients and Products via CSV.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Import Clients (CSV)</Label>
                  <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleImportClients(e.target.files[0])} disabled={importing} />
                </div>
                <div>
                  <Label>Import Products (CSV)</Label>
                  <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleImportProducts(e.target.files[0])} disabled={importing} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download your data in CSV or JSON.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => exportData('clients', 'clients.csv')} disabled={exporting}>Export Clients (CSV)</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => exportData('products', 'products.csv')} disabled={exporting}>Export Products (CSV)</Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => exportData('invoices', 'invoices.csv')} disabled={exporting}>Export Invoices (CSV)</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => exportData('jobs', 'jobs.csv')} disabled={exporting}>Export Jobs (CSV)</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
