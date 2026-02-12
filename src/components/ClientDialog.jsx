import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function ClientDialog({
    trigger,
    title = "Add New Client",
    description = "Enter the client's information below",
    clientToEdit = null,
    onSuccess,
    open: controlledOpen,
    onOpenChange: setControlledOpen
}) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? setControlledOpen : setInternalOpen

    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        phone: '',
        address: ''
    })

    useEffect(() => {
        if (open) {
            if (clientToEdit) {
                setFormData({
                    name: clientToEdit.name,
                    company: clientToEdit.company || '',
                    email: clientToEdit.email || '',
                    phone: clientToEdit.phone || '',
                    address: clientToEdit.address || ''
                })
            } else {
                setFormData({ name: '', company: '', email: '', phone: '', address: '' })
            }
        }
    }, [open, clientToEdit])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            let resultClient = null

            if (clientToEdit) {
                // Update existing client
                const { data, error } = await supabase
                    .from('clients')
                    .update(formData)
                    .eq('id', clientToEdit.id)
                    .select()
                    .single()

                if (error) throw error
                resultClient = data

                await supabase.from('activity_log').insert([{
                    type: 'Client Updated',
                    description: `Client updated: ${formData.name}`,
                    related_entity_id: clientToEdit.id,
                    related_entity_type: 'client'
                }])
                toast.success('Client updated successfully')
            } else {
                // Create new client
                const { data, error } = await supabase
                    .from('clients')
                    .insert([formData])
                    .select()
                    .single()

                if (error) throw error
                resultClient = data

                await supabase.from('activity_log').insert([{
                    type: 'Client Created',
                    description: `New client added: ${formData.name}`,
                    related_entity_type: 'client'
                }])
                toast.success('Client created successfully')
            }

            setOpen(false)
            setFormData({ name: '', company: '', email: '', phone: '', address: '' })

            if (onSuccess) {
                onSuccess(resultClient)
            }

        } catch (error) {
            console.error('Error saving client:', error)
            toast.error('Failed to save client')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{clientToEdit ? 'Edit Client' : title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="company">Company</Label>
                            <Input
                                id="company"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {clientToEdit ? 'Update Client' : 'Add Client'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
