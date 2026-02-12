import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { hexToHsl } from '@/lib/utils'

const SettingsContext = createContext({
    settings: {},
    loading: true,
    updateSetting: async () => { }
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

    const updateSetting = async (key, value) => {
        try {
            // Optimistic update
            setSettings(prev => ({ ...prev, [key]: value }))
            localStorage.setItem(key, value)

            // Upsert to Supabase
            const { error } = await supabase
                .from('settings')
                .upsert({ key, value }, { onConflict: 'key' })

            if (error) throw error
            // toast.success('Setting saved') 
        } catch (error) {
            console.error('Error updating setting:', error)
            toast.error('Failed to save settings')
        }
    }

    return (
        <SettingsContext.Provider value={{ settings, loading, updateSetting }}>
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


