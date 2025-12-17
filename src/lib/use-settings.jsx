import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useSettings() {
    const [settings, setSettings] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from('settings').select('*')
            if (error) {
                // If table doesn't exist yet (migration pending), ignore error and use local
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

            // Sync to localStorage for redundancy/fallback
            Object.keys(settingsMap).forEach(key => {
                localStorage.setItem(key, settingsMap[key])
            })

        } catch (error) {
            // Fallback: Load from localStorage if DB fails
            console.log('Falling back to localStorage for settings')
            const localKeys = [
                'companyName', 'companyAddress', 'companyPhone', 'companyEmail', 'companyVat',
                'bankName', 'bankAccountHolder', 'bankAccountNumber', 'bankAccountType', 'bankBranchCode', 'bankReference'
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
        } catch (error) {
            console.error('Error updating setting:', error)
            // TODO: Toast notification here would be nice but we lack context
        }
    }

    return { settings, loading, updateSetting }
}
