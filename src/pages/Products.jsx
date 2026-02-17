import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search, Package, Pencil, Trash2, Loader2, ArrowUpRight, TrendingUp, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrency } from '@/lib/use-currency.jsx'
import { toast } from 'sonner'
import { ImportProductsDialog } from '@/components/ImportProductsDialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function Products() {
  const { formatCurrency } = useCurrency()
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    retail_price: '',
    cost_price: '',
    description: ''
  })

  const location = useLocation()

  useEffect(() => {
    if (location.state?.openAddDialog) {
      setIsDialogOpen(true)
      // Clear state to prevent reopening on refresh (optional, requires navigate)
      window.history.replaceState({}, document.title)
    }
  }, [location])

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      let allProducts = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error

        if (data) {
          allProducts = [...allProducts, ...data]
        }

        if (!data || data.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      }

      setProducts(allProducts)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            ...formData,
            retail_price: parseFloat(formData.retail_price),
            cost_price: parseFloat(formData.cost_price)
          })
          .eq('id', editingProduct.id)

        if (error) throw error

        await supabase.from('activity_log').insert([{
          type: 'Product Updated',
          description: `Product updated: ${formData.name}`,
          related_entity_id: editingProduct.id,
          related_entity_type: 'product'
        }])
        toast.success('Product updated successfully')
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert([{
            ...formData,
            retail_price: parseFloat(formData.retail_price),
            cost_price: parseFloat(formData.cost_price)
          }])

        if (error) throw error

        await supabase.from('activity_log').insert([{
          type: 'Product Created',
          description: `New product added: ${formData.name}`,
          related_entity_type: 'product'
        }])
        toast.success('Product created successfully')
      }

      setIsDialogOpen(false)
      setEditingProduct(null)
      setFormData({ name: '', code: '', category: '', retail_price: '', cost_price: '', description: '' })
      fetchProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error('Failed to save product')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      code: product.code || '',
      category: product.category || '',
      retail_price: product.retail_price,
      cost_price: product.cost_price,
      description: product.description || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    const toastId = toast.loading('Deleting product...')

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Product deleted successfully', { id: toastId })
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Error deleting product', { id: toastId })
    }
  }

  const categories = ['All', ...[...new Set(products.map(p => p.category))].filter(Boolean).sort()]

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const calculateMargin = (retail, cost) => {
    if (!retail || !cost) return 0
    return (((retail - cost) / retail) * 100).toFixed(1)
  }

  // Calculate Header Stats
  const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.retail_price) || 0), 0)
  const lowStockCount = 0 // Placeholder logic as current schema doesn't have stock quantity, defaulting to 0 or manual check if we had it.
  // Actually, let's assume all available for now, but display count.
  const totalProducts = products.length

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="relative z-10">
            <p className="text-indigo-100 text-sm font-medium flex items-center gap-2">
              Total Products
              <Package className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">{totalProducts}</h3>
            <p className="text-indigo-200 text-xs mt-1">in catalogue</p>
          </div>
          <Package className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="relative z-10">
            <p className="text-cyan-100 text-sm font-medium flex items-center gap-2">
              Retail Value
              <TrendingUp className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">{formatCurrency(totalValue)}</h3>
            <p className="text-cyan-200 text-xs mt-1">total inventory value</p>
          </div>
          <ArrowUpRight className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="relative z-10">
            <p className="text-amber-100 text-sm font-medium flex items-center gap-2">
              Stock Alerts
              <AlertTriangle className="h-4 w-4 opacity-75" />
            </p>
            <h3 className="text-3xl font-bold mt-2">{lowStockCount}</h3>
            <p className="text-amber-100/80 text-xs mt-1">items needing attention</p>
          </div>
          <AlertTriangle className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, code or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <ImportProductsDialog onImportSuccess={fetchProducts} />
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                  setEditingProduct(null)
                  setFormData({ name: '', code: '', category: '', retail_price: '', cost_price: '', description: '' })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  <DialogDescription>
                    Enter the product information below
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="code">Product Code</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="retail_price">Retail Price *</Label>
                        <Input
                          id="retail_price"
                          type="number"
                          step="0.01"
                          value={formData.retail_price}
                          onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cost_price">Cost Price *</Label>
                        <Input
                          id="cost_price"
                          type="number"
                          step="0.01"
                          value={formData.cost_price}
                          onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingProduct ? 'Update Product' : 'Add Product'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "rounded-full px-6 transition-all whitespace-nowrap border-slate-200 dark:border-slate-800",
                selectedCategory === category
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400"
              )}
            >
              {category}
              {category !== 'All' && (
                <span className="ml-2 text-[10px] opacity-60">
                  {products.filter(p => p.category === category).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 dark:border dark:border-border overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">{product.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">{product.code || 'No Code'}</CardDescription>
                  </div>
                  {product.category && (
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 pointer-events-none">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                      {product.description}
                    </p>
                  )}
                  {!product.description && <div className="min-h-[40px]"></div>}

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Retail</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {formatCurrency(product.retail_price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Cost</p>
                      <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">
                        {formatCurrency(product.cost_price)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-xs font-medium text-blue-700 dark:text-blue-300">
                      <TrendingUp className="h-3 w-3" />
                      {calculateMargin(product.retail_price, product.cost_price)}% Margin
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950" onClick={() => handleEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-full mb-4">
                <Package className="h-12 w-12 text-indigo-400" />
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
                {searchTerm ? 'No products found' : 'No products yet'}
              </p>
              <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">
                {searchTerm ? `We couldn't find anything matching "${searchTerm}". Try different keywords.` : 'Start building your inventory by adding your first product.'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add First Product
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
