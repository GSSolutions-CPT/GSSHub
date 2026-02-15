import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Upload, X, Camera, Hash, Loader2, Trash2 } from 'lucide-react'

export default function InstallationDetails({ invoiceId, readonly = false }) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [installationDetail, setInstallationDetail] = useState(null)
    const [photos, setPhotos] = useState([])
    const [serialNumbers, setSerialNumbers] = useState([])
    const [notes, setNotes] = useState('')
    const [uploading, setUploading] = useState(false)

    const fetchInstallationDetails = useCallback(async () => {
        try {
            setLoading(true)

            // Fetch installation detail record
            const { data: detailData, error: detailError } = await supabase
                .from('installation_details')
                .select('*')
                .eq('invoice_id', invoiceId)
                .single()

            if (detailError && detailError.code !== 'PGRST116') throw detailError

            if (detailData) {
                setInstallationDetail(detailData)
                setSerialNumbers(detailData.serial_numbers || [])
                setNotes(detailData.notes || '')

                // Fetch photos
                const { data: photosData, error: photosError } = await supabase
                    .from('installation_photos')
                    .select('*')
                    .eq('installation_detail_id', detailData.id)
                    .order('uploaded_at', { ascending: true })

                if (photosError) throw photosError
                setPhotos(photosData || [])
            }
        } catch (error) {
            console.error('Error fetching installation details:', error)
            toast.error('Failed to load installation details')
        } finally {
            setLoading(false)
        }
    }, [invoiceId])

    useEffect(() => {
        fetchInstallationDetails()
    }, [fetchInstallationDetails])

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        setUploading(true)
        const toastId = toast.loading(`Uploading ${files.length} photo(s)...`)

        try {
            // Ensure installation detail record exists
            let detailId = installationDetail?.id
            if (!detailId) {
                const { data: newDetail, error: createError } = await supabase
                    .from('installation_details')
                    .insert([{ invoice_id: invoiceId, serial_numbers: [], notes: '' }])
                    .select()
                    .single()

                if (createError) throw createError
                detailId = newDetail.id
                setInstallationDetail(newDetail)
            }

            // Upload each file
            const uploadedPhotos = []
            for (const file of files) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${invoiceId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('installation-photos')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('installation-photos')
                    .getPublicUrl(fileName)

                // Insert photo record
                const { data: photoData, error: photoError } = await supabase
                    .from('installation_photos')
                    .insert([{
                        installation_detail_id: detailId,
                        photo_url: publicUrl,
                        caption: file.name
                    }])
                    .select()
                    .single()

                if (photoError) throw photoError
                uploadedPhotos.push(photoData)
            }

            setPhotos([...photos, ...uploadedPhotos])
            toast.success(`${files.length} photo(s) uploaded successfully`, { id: toastId })
        } catch (error) {
            console.error('Error uploading photos:', error)
            toast.error('Failed to upload photos', { id: toastId })
        } finally {
            setUploading(false)
        }
    }

    const handleDeletePhoto = async (photoId, photoUrl) => {
        if (!confirm('Are you sure you want to delete this photo?')) return

        const toastId = toast.loading('Deleting photo...')
        try {
            // Extract file path from URL
            const urlParts = photoUrl.split('/installation-photos/')
            const filePath = urlParts[1]

            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('installation-photos')
                .remove([filePath])

            if (storageError) throw storageError

            // Delete from database
            const { error: dbError } = await supabase
                .from('installation_photos')
                .delete()
                .eq('id', photoId)

            if (dbError) throw dbError

            setPhotos(photos.filter(p => p.id !== photoId))
            toast.success('Photo deleted', { id: toastId })
        } catch (error) {
            console.error('Error deleting photo:', error)
            toast.error('Failed to delete photo', { id: toastId })
        }
    }

    const addSerialNumber = () => {
        setSerialNumbers([...serialNumbers, { component: '', serial: '' }])
    }

    const updateSerialNumber = (index, field, value) => {
        const updated = [...serialNumbers]
        updated[index][field] = value
        setSerialNumbers(updated)
    }

    const removeSerialNumber = (index) => {
        setSerialNumbers(serialNumbers.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        setSaving(true)
        const toastId = toast.loading('Saving installation details...')

        try {
            if (installationDetail) {
                // Update existing record
                const { error } = await supabase
                    .from('installation_details')
                    .update({
                        serial_numbers: serialNumbers,
                        notes: notes,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', installationDetail.id)

                if (error) throw error
            } else {
                // Create new record
                const { data: newDetail, error } = await supabase
                    .from('installation_details')
                    .insert([{
                        invoice_id: invoiceId,
                        serial_numbers: serialNumbers,
                        notes: notes
                    }])
                    .select()
                    .single()

                if (error) throw error
                setInstallationDetail(newDetail)
            }

            toast.success('Installation details saved successfully', { id: toastId })
        } catch (error) {
            console.error('Error saving installation details:', error)
            toast.error('Failed to save installation details', { id: toastId })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Photos Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Installation Photos
                    </CardTitle>
                    <CardDescription>Upload photos of the completed installation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Photo Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map((photo) => (
                            <div key={photo.id} className="relative group">
                                <img
                                    src={photo.photo_url}
                                    alt={photo.caption || 'Installation photo'}
                                    className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-800"
                                />
                                {!readonly && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDeletePhoto(photo.id, photo.photo_url)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        {/* Upload Button */}
                        {!readonly && (
                            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoUpload}
                                    disabled={uploading}
                                />
                                {uploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                ) : (
                                    <>
                                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                                        <span className="text-xs text-muted-foreground">Add Photos</span>
                                    </>
                                )}
                            </label>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Serial Numbers Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Serial Numbers
                    </CardTitle>
                    <CardDescription>Record serial numbers for installed components</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {serialNumbers.map((item, index) => (
                        <div key={index} className="flex gap-2 items-start">
                            <Input
                                placeholder="Component (e.g., Camera 1)"
                                value={item.component}
                                onChange={(e) => updateSerialNumber(index, 'component', e.target.value)}
                                disabled={readonly}
                                className="flex-1"
                            />
                            <Input
                                placeholder="Serial Number"
                                value={item.serial}
                                onChange={(e) => updateSerialNumber(index, 'serial', e.target.value)}
                                disabled={readonly}
                                className="flex-1"
                            />
                            {!readonly && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeSerialNumber(index)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}

                    {!readonly && (
                        <Button
                            variant="outline"
                            onClick={addSerialNumber}
                            className="w-full"
                        >
                            + Add Serial Number
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Notes Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Installation Notes</CardTitle>
                    <CardDescription>Additional details about the installation</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="Enter any additional notes about the installation..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={readonly}
                        rows={4}
                        className="resize-none"
                    />
                </CardContent>
            </Card>

            {/* Save Button */}
            {!readonly && (
                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="min-w-32"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}
