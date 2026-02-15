import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database, Users, Building, Trash2, Shield, Upload, Download, CreditCard, Palette, FileText, Globe } from 'lucide-react'
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

  // REFACTORED: Only create a user profile in the public.users table.
  // Auth user creation requires admin/service-role privileges.
  // The admin should invite the user via Supabase Dashboard > Authentication.
  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('users').insert([{
        email: newUser.email,
        role: newUser.role,
        is_active: true
      }])

      if (error) throw error
      alert('User profile created! Please invite this email address via the Supabase Dashboard > Authentication tab to finish setting up their account.')
      setIsUserDialogOpen(false)
      setNewUser({ email: '', role: 'technician', password: '' })
      fetchUsers()
    } catch (error) {
      console.error('Error adding user:', error)
      alert('Failed to add user profile')
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(filePath)

      updateSetting('logoUrl', publicUrl)
      alert('Logo uploaded successfully!')
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error uploading logo')
    }
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Manage organization details, team access, and system preferences</p>
        </div>
      </div>

      <Tabs defaultValue="organization" className="space-y-8">
        <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-full max-w-3xl grid grid-cols-4 gap-2">
          <TabsTrigger
            value="organization"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all duration-300 py-3"
          >
            <Building className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Organization</span>
            <span className="sm:hidden">Org</span>
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all duration-300 py-3"
          >
            <Users className="mr-2 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all duration-300 py-3"
          >
            <Palette className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
            <span className="sm:hidden">Pref</span>
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md rounded-lg transition-all duration-300 py-3"
          >
            <Database className="mr-2 h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab: Company + Banking */}
        <TabsContent value="organization" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-500" />
                  Company Profile
                </CardTitle>
                <CardDescription>Details displayed on invoices and quotes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Company Name</Label>
                  <Input value={settings.companyName || ''} onChange={(e) => updateSetting('companyName', e.target.value)} placeholder="Company Name" className="bg-white/50 dark:bg-slate-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {settings.logoUrl && (
                      <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 object-contain bg-white rounded-md border p-1" />
                    )}
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} className="bg-white/50 dark:bg-slate-800/50" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Phone Number</Label>
                  <Input value={settings.companyPhone || ''} onChange={(e) => updateSetting('companyPhone', e.target.value)} placeholder="Phone" className="bg-white/50 dark:bg-slate-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label>WhatsApp Number</Label>
                  <Input
                    value={settings.whatsappNumber || settings.companyPhone || ''}
                    onChange={(e) => updateSetting('whatsappNumber', e.target.value)}
                    placeholder="e.g. 062 123 4567"
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                  <p className="text-xs text-muted-foreground">Used for &apos;Chat on WhatsApp&apos; links. Defaults to Phone Number if empty.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Email Address</Label>
                  <Input value={settings.companyEmail || ''} onChange={(e) => updateSetting('companyEmail', e.target.value)} placeholder="Email" className="bg-white/50 dark:bg-slate-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label>Physical Address</Label>
                  <Input value={settings.companyAddress || ''} onChange={(e) => updateSetting('companyAddress', e.target.value)} placeholder="Address" className="bg-white/50 dark:bg-slate-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label>VAT Registration</Label>
                  <Input value={settings.companyVat || ''} onChange={(e) => updateSetting('companyVat', e.target.value)} placeholder="VAT Number" className="bg-white/50 dark:bg-slate-800/50" />
                </div>
              </CardContent>
              <Globe className="absolute -right-6 -bottom-6 h-32 w-32 text-slate-100 dark:text-slate-800 opacity-50 group-hover:scale-110 transition-transform duration-500" />
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                  Banking Details
                </CardTitle>
                <CardDescription>Banking info for invoices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="grid gap-2">
                  <Label>Bank Name</Label>
                  <Input value={settings.bankName || ''} onChange={(e) => updateSetting('bankName', e.target.value)} placeholder="Bank Name" className="bg-white/50 dark:bg-slate-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label>Account Holder</Label>
                  <Input value={settings.bankAccountHolder || ''} onChange={(e) => updateSetting('bankAccountHolder', e.target.value)} placeholder="Account Holder" className="bg-white/50 dark:bg-slate-800/50" />
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Account Type</Label>
                    <Input value={settings.bankAccountType || ''} onChange={(e) => updateSetting('bankAccountType', e.target.value)} placeholder="Type" className="bg-white/50 dark:bg-slate-800/50" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Branch Code</Label>
                    <Input value={settings.bankBranchCode || ''} onChange={(e) => updateSetting('bankBranchCode', e.target.value)} placeholder="Code" className="bg-white/50 dark:bg-slate-800/50" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Account Number</Label>
                  <Input value={settings.bankAccountNumber || ''} onChange={(e) => updateSetting('bankAccountNumber', e.target.value)} placeholder="Account Number" className="bg-white/50 dark:bg-slate-800/50" />
                </div>
                <div className="grid gap-2">
                  <Label>Reference</Label>
                  <Input value={settings.bankReference || ''} onChange={(e) => updateSetting('bankReference', e.target.value)} placeholder="Default Reference" className="bg-white/50 dark:bg-slate-800/50" />
                </div>
              </CardContent>
              <CreditCard className="absolute -right-6 -bottom-6 h-32 w-32 text-slate-100 dark:text-slate-800 opacity-50 group-hover:scale-110 transition-transform duration-500" />
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
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"><Users className="mr-2 h-4 w-4" /> Add User</Button>
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
              <Card key={user.id} className="border-none shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                      user.role === 'manager' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'
                      }`}>
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{user.email}</p>
                      <p className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                        {user.role}
                        {user.is_active && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {users.length === 0 && <p className="text-center text-muted-foreground py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">No users found.</p>}
          </div>
        </TabsContent>

        {/* Preferences Tab: Theme + Currency + Legal */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-500/50"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-purple-500" />
                  System Preferences
                </CardTitle>
                <CardDescription>Customize your experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Toggle theme</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={updateCurrency}>
                    <SelectTrigger className="bg-white/50 dark:bg-slate-800/50">
                      <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">South African Rand (ZAR)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Primary Brand Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={settings.primaryColor || '#2563eb'}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="w-12 h-12 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={settings.primaryColor || '#2563eb'}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      placeholder="#2563eb"
                      className="flex-1 bg-white/50 dark:bg-slate-800/50"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>VAT / Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.taxRate || '15'}
                    onChange={(e) => updateSetting('taxRate', e.target.value)}
                    placeholder="15"
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Default Quote Validity (Days)</Label>
                  <Input
                    type="number"
                    value={settings.defaultQuoteValidityDays || '14'}
                    onChange={(e) => updateSetting('defaultQuoteValidityDays', e.target.value)}
                    placeholder="14"
                    className="bg-white/50 dark:bg-slate-800/50"
                  />
                  <p className="text-xs text-muted-foreground">Days before a quote expires.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-500/50"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-purple-500" />
                  System Appearance
                </CardTitle>
                <CardDescription>Customize the look and feel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground">Switch between Light and Dark mode.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-950 p-1 rounded-lg">
                    <Button
                      variant={theme === 'light' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTheme('light')}
                      className="rounded-md"
                    >
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                      className="rounded-md"
                    >
                      Dark
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-base">Currency</Label>
                    <p className="text-sm text-muted-foreground">Default currency for financials.</p>
                  </div>
                  <Select value={currency} onValueChange={updateCurrency}>
                    <SelectTrigger className="w-[120px] bg-white dark:bg-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR (R)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <Palette className="absolute -right-6 -bottom-6 h-32 w-32 text-slate-100 dark:text-slate-800 opacity-50 group-hover:scale-110 transition-transform duration-500" />
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/50"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  Legal Terms
                </CardTitle>
                <CardDescription>Appended to Quotes and Invoices.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <Textarea
                  className="min-h-[200px] bg-white/50 dark:bg-slate-800/50 resize-y"
                  placeholder="Enter your standard terms and conditions here..."
                  value={settings.legalTerms || ''}
                  onChange={(e) => updateSetting('legalTerms', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Visible on all generated PDF documents.
                </p>
              </CardContent>
              <FileText className="absolute -right-6 -bottom-6 h-32 w-32 text-slate-100 dark:text-slate-800 opacity-50 group-hover:scale-110 transition-transform duration-500" />
            </Card>
          </div>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-rose-500" />
                  Import Data
                </CardTitle>
                <CardDescription>Bulk upload via CSV.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <Label>Import Clients</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleImportClients(e.target.files[0])} disabled={importing} className="bg-white/50 dark:bg-slate-800/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Import Products</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleImportProducts(e.target.files[0])} disabled={importing} className="bg-white/50 dark:bg-slate-800/50" />
                  </div>
                </div>
              </CardContent>
              <Upload className="absolute -right-6 -bottom-6 h-32 w-32 text-slate-100 dark:text-slate-800 opacity-50 group-hover:scale-110 transition-transform duration-500" />
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/50"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-indigo-500" />
                  Export Data
                </CardTitle>
                <CardDescription>Download your data in CSV or JSON.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto py-3 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => exportData('clients', 'clients.csv')} disabled={exporting}>
                    <div className="flex flex-col items-center gap-1">
                      <Users className="h-4 w-4 mb-1" />
                      Clients
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => exportData('products', 'products.csv')} disabled={exporting}>
                    <div className="flex flex-col items-center gap-1">
                      <Database className="h-4 w-4 mb-1" />
                      Products
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => exportData('invoices', 'invoices.csv')} disabled={exporting}>
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="h-4 w-4 mb-1" />
                      Invoices
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => exportData('jobs', 'jobs.csv')} disabled={exporting}>
                    <div className="flex flex-col items-center gap-1">
                      <Building className="h-4 w-4 mb-1" />
                      Jobs
                    </div>
                  </Button>
                </div>
              </CardContent>
              <Download className="absolute -right-6 -bottom-6 h-32 w-32 text-slate-100 dark:text-slate-800 opacity-50 group-hover:scale-110 transition-transform duration-500" />
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div >
  )
}
