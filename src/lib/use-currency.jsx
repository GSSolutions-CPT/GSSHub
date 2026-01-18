/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'

const CurrencyContext = createContext()

export function CurrencyProvider({ children }) {
    const [currency, setCurrency] = useState('ZAR')

    useEffect(() => {
        const savedCurrency = localStorage.getItem('currency')
        if (savedCurrency) {
            setCurrency(savedCurrency)
        }
    }, [])

    const updateCurrency = (newCurrency) => {
        setCurrency(newCurrency)
        localStorage.setItem('currency', newCurrency)
        // We don't need to reload page anymore since we use context
    }

    const formatCurrency = (amount) => {
        const value = parseFloat(amount) || 0

        // Currency configuration
        const config = {
            ZAR: { locale: 'en-ZA', currency: 'ZAR' },
            USD: { locale: 'en-US', currency: 'USD' },
            EUR: { locale: 'en-IE', currency: 'EUR' }, // en-IE typically uses € before number
            GBP: { locale: 'en-GB', currency: 'GBP' },
        }

        const { locale, currency: currencyCode } = config[currency] || config.ZAR

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
        }).format(value)
    }

    return (
        <CurrencyContext.Provider value={{ currency, updateCurrency, formatCurrency }}>
            {children}
        </CurrencyContext.Provider>
    )
}

export function useCurrency() {
    const context = useContext(CurrencyContext)
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider')
    }
    return context
}
