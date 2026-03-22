import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { hexToHsl } from '@/lib/utils'

const SettingsContext = createContext({
    settings: {},
    loading: true,
    updateSetting: () => { },
    saveAllSettings: async () => { }
})

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSettings()
    }, [])

    // Dynamic Theming Effect
    useEffect(() => {
        if (settings.primaryColor) {
            const root = document.documentElement
            const hsl = hexToHsl(settings.primaryColor)
            root.style.setProperty('--primary', hsl)
            // Optional: Update other related colors if needed
            // root.style.setProperty('--sidebar-primary', hsl)
        }
    }, [settings.primaryColor])

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from('settings').select('*')
            if (error) {
                console.warn('Settings fetch error (table may not exist yet):', error)
                throw error
            }

            const settingsMap = {}
            if (data) {
                data.forEach(item => {
                    settingsMap[item.key] = item.value
                })
            }
            setSettings(settingsMap)

            // Sync to localStorage
            Object.keys(settingsMap).forEach(key => {
                localStorage.setItem(key, settingsMap[key])
            })

        } catch (error) {
            console.log('Falling back to localStorage for settings')
            const localKeys = [
                'companyName', 'companyAddress', 'companyPhone', 'companyEmail', 'companyVat',
                'bankName', 'bankAccountHolder', 'bankAccountNumber', 'bankAccountType', 'bankBranchCode', 'bankReference',
                'primaryColor', 'taxRate', 'logoUrl', 'whatsappNumber', 'legalTerms', 'defaultQuoteValidityDays'
            ]
            const localSettings = {}
            localKeys.forEach(key => {
                const val = localStorage.getItem(key)
                if (val) localSettings[key] = val
            })
            setSettings(prev => ({ ...prev, ...localSettings }))
        } finally {
            setLoading(false)
        }
    }

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
        localStorage.setItem(key, value)
    }

    const saveAllSettings = async () => {
        const toastId = toast.loading('Saving settings...')
        try {
            const updates = Object.keys(settings).map(key => ({
                key,
                value: settings[key]
            }))
            
            const { error } = await supabase
                .from('settings')
                .upsert(updates, { onConflict: 'key' })

            if (error) throw error
            toast.success('Settings saved successfully!', { id: toastId })
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error('Failed to save settings', { id: toastId })
        }
    }

    return (
        <SettingsContext.Provider value={{ settings, loading, updateSetting, saveAllSettings }}>
            {children}
        </SettingsContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}


