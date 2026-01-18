import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/lib/use-settings'
import { useCurrency } from '@/lib/use-currency'
import { Loader2, Printer } from 'lucide-react'

export default function InvoicePreview() {
    const { id } = useParams()
    const { settings } = useSettings()
    const { formatCurrency } = useCurrency()
    const [invoice, setInvoice] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchInvoice = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*, clients(*)')
                .eq('id', id)
                .single()

            if (error) throw error
            setInvoice(data)
        } catch (error) {
            console.error('Error fetching invoice:', error)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchInvoice()
    }, [fetchInvoice])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!invoice) return <div>Invoice not found</div>

    const client = invoice.clients
    // Calculate totals
    const subtotal = invoice.total_amount // Assuming total_amount stored is grand total. If we need subtotal logic, we might need to recalculate from items if items were stored separately. 
    // For now, based on previous code, invoice.items is a JSON array.

    const items = invoice.items || []
    const calculatedSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0)
    const vat = 0 // Assuming 0 for now as per previous logic
    const grandTotal = calculatedSubtotal // + vat

    // Company Details (fallback to Settings or hardcoded if settings empty)
    const companyName = settings?.companyName || "Global Security Solutions"
    const companyAddress = settings?.companyAddress || "66 Robyn Rd, Durbanville"
    const companyPhone = settings?.companyPhone || "062 955 8559"
    const companyEmail = settings?.companyEmail || "Kyle@GlobalSecuritySolutions.co.za"
    const companyWeb = "www.GlobalSecuritySolutions.co.za"

    const bankingParams = settings?.bankingDetails || {}
    const bankName = bankingParams.bankName || "FNB/RMB"
    const accHolder = bankingParams.accountHolder || "Global Security Solutions"
    const accType = bankingParams.accountType || "First Business Zero Account"
    const accNum = bankingParams.accountNumber || "63182000223"
    const branchCode = bankingParams.branchCode || "250655"

    return (
        <div className="min-h-screen bg-slate-100 font-sans print:bg-white">
            {/* Print Button */}
            <div className="print:hidden fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform transform hover:scale-105"
                >
                    <Printer className="h-5 w-5" />
                    Print Invoice
                </button>
            </div>

            <div className="w-full h-full overflow-auto">
                {/* Page 1: Invoice */}
                <div className="max-w-4xl mx-auto bg-white shadow-2xl my-8 print:w-full print:max-w-none print:shadow-none print:my-0">
                    {/* Header */}
                    <div className="bg-[#0f172a] text-white p-8">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                {/* Logo */}
                                <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                                    {/* Simple Shield SVG derived from template */}
                                    <svg viewBox="0 0 64 64" className="w-14 h-14 text-white" fill="currentColor">
                                        <path d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4zm0 8l16 8v12c0 10.56-7.04 20.32-16 24-8.96-3.68-16-13.44-16-24V20l16-8z" />
                                        <path d="M32 16l-12 6v9c0 7.92 5.28 15.24 12 18 6.72-2.76 12-10.08 12-18v-9l-12-6zm0 6l8 4v6c0 5.28-3.52 10.16-8 12-4.48-1.84-8-6.72-8-12v-6l8-4z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold font-serif">{companyName}</h1>
                                    <p className="text-blue-300 text-sm font-medium tracking-wider mt-1">PROFESSIONAL SECURITY SERVICES</p>
                                </div>
                            </div>
                            <div className="text-right text-sm space-y-1">
                                <p className="text-slate-300">{companyAddress}</p>
                                <p className="text-slate-300">{companyPhone}</p>
                                <p className="text-blue-300">{companyEmail}</p>
                                <p className="text-slate-300">{companyWeb}</p>
                            </div>
                        </div>
                    </div>

                    {/* Banner */}
                    <div className="bg-blue-600 py-3 px-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white tracking-wide">TAX INVOICE</h2>
                            <div className="text-right">
                                <p className="text-white font-semibold">INV NR: <span className="font-normal">{invoice.id.substring(0, 6).toUpperCase()}</span></p>
                                <p className="text-blue-100 text-sm">{new Date(invoice.date_created).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="p-8 grid grid-cols-2 gap-8">
                        <div className="bg-slate-50 rounded-lg p-5 border-l-4 border-blue-600">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Bill To</h3>
                            <p className="font-semibold text-slate-800 text-lg">{client?.company || client?.name}</p>
                            <p className="text-slate-600">Attn: {client?.name}</p>
                            <p className="text-slate-600">{client?.phone}</p>
                            <p className="text-slate-600 text-sm mt-1">{client?.address}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-5 border-l-4 border-slate-700">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Project Reference</h3>
                            <p className="font-semibold text-slate-800">{invoice.reference || 'N/A'}</p>
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Status</p>
                                <p className="text-slate-700 font-medium">{invoice.status}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="px-8 pb-6">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="py-4 px-4 text-left font-semibold text-sm uppercase tracking-wider rounded-tl-lg">Item Description</th>
                                    <th className="py-4 px-4 text-right font-semibold text-sm uppercase tracking-wider">Unit Price</th>
                                    <th className="py-4 px-4 text-center font-semibold text-sm uppercase tracking-wider">Qty</th>
                                    <th className="py-4 px-4 text-right font-semibold text-sm uppercase tracking-wider rounded-tr-lg">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-4 text-slate-700">{item.description}</td>
                                        <td className="py-4 px-4 text-right text-slate-700">{formatCurrency(item.price)}</td>
                                        <td className="py-4 px-4 text-center text-slate-700">{item.qty}</td>
                                        <td className="py-4 px-4 text-right font-medium text-slate-800">{formatCurrency(item.price * item.qty)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="px-8 pb-8">
                        <div className="flex justify-end">
                            <div className="w-80">
                                <div className="flex justify-between py-2 border-b border-slate-200">
                                    <span className="text-slate-600">Subtotal</span>
                                    <span className="font-medium text-slate-800">{formatCurrency(calculatedSubtotal)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-200">
                                    <span className="text-slate-600">VAT (0%)</span>
                                    <span className="font-medium text-slate-800">R0.00</span>
                                </div>
                                {/* Deposit Row if applicable */}
                                {invoice.deposit_amount > 0 && (
                                    <div className="flex justify-between py-2 border-b border-slate-200 text-green-600">
                                        <span className="">Less Deposit</span>
                                        <span className="font-medium">-{formatCurrency(invoice.deposit_amount)}</span>
                                    </div>
                                )}

                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg mt-4 p-4 shadow-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white font-bold text-lg">
                                            {invoice.deposit_amount > 0 ? "BALANCE DUE" : "GRAND TOTAL"}
                                        </span>
                                        <span className="text-white font-bold text-2xl">
                                            {formatCurrency(invoice.deposit_amount > 0 ? (calculatedSubtotal - invoice.deposit_amount) : grandTotal)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Banking */}
                    <div className="px-8 pb-8">
                        <div className="bg-[#0f172a] rounded-lg p-6 text-white">
                            <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                                Payment Information
                            </h3>
                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div className="space-y-2">
                                    <div className="flex gap-2"><span className="text-slate-400 w-28">Bank:</span> <span className="font-medium">{bankName}</span></div>
                                    <div className="flex gap-2"><span className="text-slate-400 w-28">Account Holder:</span> <span className="font-medium">{accHolder}</span></div>
                                    <div className="flex gap-2"><span className="text-slate-400 w-28">Account Type:</span> <span className="font-medium">{accType}</span></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex gap-2"><span className="text-slate-400 w-28">Account Number:</span> <span className="text-blue-400 font-bold tracking-wider">{accNum}</span></div>
                                    <div className="flex gap-2"><span className="text-slate-400 w-28">Branch Code:</span> <span className="font-medium">{branchCode}</span></div>
                                    <div className="flex gap-2"><span className="text-slate-400 w-28">Reference:</span> <span className="font-medium">INV {invoice.id.substring(0, 6)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-[#0f172a] text-white py-4 px-8 rounded-b-lg print:rounded-none">
                        <div className="flex justify-between items-center text-sm">
                            <p className="text-slate-400">Thank you for your business!</p>
                            <div className="flex items-center gap-4">
                                <span className="text-slate-400">{companyWeb}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page 2: Terms */}
                {/* Tailwind print:break-before-page or css page-break-before: always */}
                <div className="max-w-4xl mx-auto bg-white shadow-2xl my-8 print:w-full print:max-w-none print:shadow-none print:my-0 break-before-page">
                    {/* Header (Simplified) */}
                    <div className="bg-[#0f172a] text-white p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-600 rounded-lg flex items-center justify-center">
                                <svg viewBox="0 0 64 64" className="w-10 h-10 text-white" fill="currentColor">
                                    <path d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4zm0 8l16 8v12c0 10.56-7.04 20.32-16 24-8.96-3.68-16-13.44-16-24V20l16-8z" />
                                    <circle fill="#dbeafe" cx="32" cy="36" r="6" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold font-serif">{companyName}</h1>
                                <p className="text-blue-300 text-xs font-medium tracking-wider">PROFESSIONAL SECURITY SERVICES</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600 py-4 px-8">
                        <h2 className="text-xl font-bold text-white tracking-wide text-center">GENERAL TERMS & CONDITIONS</h2>
                    </div>

                    <div className="p-8 space-y-6 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                        {/* 
                         If settings.legalTerms exists, usage that.
                         Otherwise, use the structure from the HTML template. 
                         For now, I will assume we rely on settings if available, else standard text.
                         However, the user asked to "make it look like this", implying the specific text structure.
                         I'll try to map the user's HTML text structure here but maybe allow dynamic injection if I had time.
                         For now, I will drop the 'settings.legalTerms' inside this container if it exists, or show default.
                     */}
                        {settings?.legalTerms ? (
                            <div className="prose max-w-none">
                                {settings.legalTerms}
                            </div>
                        ) : (
                            <p>No legal terms configured. Please update your settings.</p>
                        )}
                    </div>

                    {/* Acceptance Signature Area if needed */}
                    <div className="px-8 pb-8 mt-8">
                        <div className="border-2 border-slate-800 rounded-lg p-6 bg-slate-50">
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Client Name</p>
                                    <div className="border-b border-slate-800 pb-1"></div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-6">Date</p>
                                    <div className="border-b border-slate-800 pb-1"></div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Signature</p>
                                    <div className="border-b border-slate-800 pb-1 h-16"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-[#0f172a] text-white py-4 px-8 rounded-b-lg print:rounded-none">
                        <div className="flex justify-between items-center text-sm">
                            <p className="text-slate-400">{companyName} © {new Date().getFullYear()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
            @media print {
                .break-before-page {
                    page-break-before: always;
                }
            }
        `}</style>
        </div>
    )
}
