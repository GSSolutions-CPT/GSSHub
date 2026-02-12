import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- BRAND CONFIGURATION ---
// --- BRAND CONFIGURATION ---
const DEFAULT_COLORS = {
    PRIMARY: [37, 99, 235],     // #2563eb (Security Blue) - Default
    SECONDARY: [71, 85, 105],   // #475569 (Slate 600)
    DARK: [15, 23, 42],         // #0f172a (Slate 900)
    LIGHT: [241, 245, 249],     // #f1f5f9 (Slate 100)
    WHITE: [255, 255, 255],
    TEXT_MAIN: [30, 41, 59],    // #1e293b
    TEXT_MUTED: [100, 116, 139] // #64748b
}

const hexToRgb = (hex) => {
    if (!hex) return null
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null
}

// --- MAIN GENERATOR FUNCTION ---
const generatePDF = async (docType, data, settings = {}) => {
    console.log('Generating PDF for:', docType, data, settings)
    const COLORS = { ...DEFAULT_COLORS }

    // Apply dynamic primary color
    if (settings.primaryColor) {
        const rgb = hexToRgb(settings.primaryColor)
        if (rgb) COLORS.PRIMARY = rgb
    }

    // Company Config
    const company = {
        name: settings.companyName || "Global Security Solutions",
        address: settings.companyAddress || "66 Robyn Rd, Durbanville",
        phone: settings.companyPhone || "062 955 8559",
        email: settings.companyEmail || "Kyle@GlobalSecuritySolutions.co.za",
        vat: settings.companyVat || "",
        website: "globalsecuritysolutions.co.za"
    }

    try {
        // Initialize PDF (A4 Portrait) - Margins: Left/Right 15mm
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth() // 210mm
        const pageHeight = doc.internal.pageSize.getHeight() // 297mm
        const margin = 15
        const contentWidth = pageWidth - (margin * 2)

        // Helper: Styled Text
        const text = (str, x, y, options = {}) => {
            const { size = 10, color = COLORS.TEXT_MAIN, font = 'helvetica', style = 'normal', align = 'left' } = options
            doc.setFontSize(size)
            doc.setTextColor(...color)
            doc.setFont(font, style)
            doc.text(String(str), x, y, { align })
        }

        // Helper: Draw Section Background
        const drawSectionBg = (y, h, color) => {
            doc.setFillColor(...color)
            doc.rect(0, y, pageWidth, h, 'F')
        }

        // ==========================================
        // 1. HEADER SECTION
        // ==========================================
        // Background Strip
        drawSectionBg(0, 40, COLORS.DARK)

        // Logo Handling
        try {
            const logoUrl = settings.logoUrl || (window.location.origin + '/logo.png')
            const img = await fetchImage(logoUrl)

            // Fixed height, auto width to maintain aspect ratio
            const logoH = 20
            const imgProps = doc.getImageProperties(img)
            const logoW = (imgProps.width * logoH) / imgProps.height

            doc.addImage(img, 'PNG', margin, 10, logoW, logoH)
        } catch (e) {
            console.warn('Logo load failed', e)
            text(company.name, margin, 22, { size: 18, color: COLORS.WHITE, style: 'bold' })
        }

        // Company Details (Right Aligned in Header)
        const headerTextX = pageWidth - margin
        let headerY = 12
        text(company.address, headerTextX, headerY, { align: 'right', color: COLORS.LIGHT, size: 9 })
        headerY += 5
        text(company.email, headerTextX, headerY, { align: 'right', color: COLORS.LIGHT, size: 9 })
        headerY += 5
        text(company.phone, headerTextX, headerY, { align: 'right', color: COLORS.LIGHT, size: 9 })
        if (company.vat) {
            headerY += 5
            text(`VAT: ${company.vat}`, headerTextX, headerY, { align: 'right', color: COLORS.LIGHT, size: 9 })
        }

        // ==========================================
        // 2. DOCUMENT TITLE STRIP
        // ==========================================
        drawSectionBg(40, 15, COLORS.PRIMARY)

        // Title
        let titleText = docType.toUpperCase()
        if (docType === 'Invoice') titleText = data.vat_applicable ? 'TAX INVOICE' : 'INVOICE'
        if (docType === 'Quotation' && (data.status === 'Accepted')) titleText = 'PROFORMA INVOICE'

        text(titleText, margin, 50, { size: 14, color: COLORS.WHITE, style: 'bold', font: 'helvetica' })

        // Meta (Doc Number & Date)
        const dateValue = new Date(data.date_created).toLocaleDateString()
        const metaText = `NUMBER: ${data.id.substring(0, 8).toUpperCase()}    |    DATE: ${dateValue}`
        text(metaText, pageWidth - margin, 50, { align: 'right', size: 10, color: COLORS.WHITE, style: 'bold' })


        // ==========================================
        // 3. INFORMATION GRID
        // ==========================================
        const gridY = 70
        const colW = contentWidth / 2 - 5

        // LEFT COLUMN: BILL TO
        text(docType === 'Purchase Order' ? 'VENDOR' : 'BILL TO', margin, gridY, { size: 9, color: COLORS.TEXT_MUTED, style: 'bold' })

        const clientName = docType === 'Purchase Order' ? (data.suppliers?.name || 'Unknown Supplier') : (data.clients?.name || 'Unknown Client')
        const contactPerson = docType === 'Purchase Order' ? data.suppliers?.contact_person : data.clients?.contact_person
        if (contactPerson) {
            // Optional: Display contact person
        } // Not displaying contact person in main block to save space, or maybe add if space permits
        const clientEmail = docType === 'Purchase Order' ? data.suppliers?.email : data.clients?.email
        const clientPhone = docType === 'Purchase Order' ? data.suppliers?.phone : data.clients?.phone
        const clientAddr = docType === 'Purchase Order' ? data.suppliers?.address : data.clients?.address
        const clientCompany = docType === 'Purchase Order' ? '' : data.clients?.company

        let clientY = gridY + 6

        // Primary Name (Company or Individual)
        text(clientCompany || clientName, margin, clientY, { size: 11, style: 'bold', color: COLORS.TEXT_MAIN })
        clientY += 5

        doc.setFontSize(10)
        doc.setTextColor(...COLORS.TEXT_MAIN)
        doc.setFont('helvetica', 'normal')

        // If company, show contact person
        if (clientCompany && clientName !== clientCompany) {
            doc.text(`Attn: ${clientName}`, margin, clientY)
            clientY += 5
        }

        if (clientEmail) { doc.text(clientEmail, margin, clientY); clientY += 5 }
        if (clientPhone) { doc.text(clientPhone, margin, clientY); clientY += 5 }

        if (clientAddr) {
            const splitAddr = doc.splitTextToSize(clientAddr, colW)
            doc.text(splitAddr, margin, clientY)
        }

        // RIGHT COLUMN: DETAILS / SHIP TO
        const rightColX = pageWidth - margin - colW

        text(docType === 'Purchase Order' ? 'SHIP TO' : 'PROJECT DETAILS', rightColX, gridY, { size: 9, color: COLORS.TEXT_MUTED, style: 'bold' })

        let refY = gridY + 6

        if (docType === 'Purchase Order') {
            text(company.name, rightColX, refY, { size: 11, style: 'bold', color: COLORS.TEXT_MAIN })
            refY += 5
            doc.setFontSize(10); doc.setTextColor(...COLORS.TEXT_MAIN); doc.setFont('helvetica', 'normal')
            const splitSite = doc.splitTextToSize(company.address, colW)
            doc.text(splitSite, rightColX, refY)
        } else {
            // Reference
            if (data.metadata?.reference) {
                text("Reference:", rightColX, refY, { size: 9, color: COLORS.TEXT_MUTED })
                const splitRef = doc.splitTextToSize(data.metadata.reference, colW - 25)
                doc.setTextColor(...COLORS.TEXT_MAIN)
                doc.text(splitRef, rightColX + 22, refY)
                refY += (splitRef.length * 5) + 2
            }

            // Validity (Quotes) or Due Date (Invoices)
            if (docType === 'Quotation' && data.valid_until) {
                text("Valid Until:", rightColX, refY, { size: 9, color: COLORS.TEXT_MUTED })
                text(new Date(data.valid_until).toLocaleDateString(), rightColX + 22, refY, { size: 9, color: COLORS.TEXT_MAIN })
                refY += 6
            }
            if (docType === 'Invoice' && data.due_date) {
                text("Due Date:", rightColX, refY, { size: 9, color: COLORS.TEXT_MUTED })
                text(new Date(data.due_date).toLocaleDateString(), rightColX + 22, refY, { size: 9, color: COLORS.TEXT_MAIN })
                refY += 6
            }

            // Payment Terms
            text("Terms:", rightColX, refY, { size: 9, color: COLORS.TEXT_MUTED })
            const termText = data.payment_type === 'full'
                ? '100% Upfront'
                : `${data.deposit_percentage || 75}% Deposit`
            text(termText, rightColX + 22, refY, { size: 9, color: COLORS.PRIMARY, style: 'bold' })
        }

        // ==========================================
        // 4. ITEMS TABLE
        // ==========================================
        const tableY = Math.max(clientY, refY) + 10

        const tableRows = []
        if (data.lines && data.lines.length > 0) {
            data.lines.forEach(line => {
                tableRows.push([
                    line.description || 'Item',
                    line.quantity,
                    `R ${parseFloat(line.unit_price || 0).toFixed(2)}`,
                    `R ${parseFloat(line.line_total || 0).toFixed(2)}`
                ])
            })
        } else {
            tableRows.push([`Total ${docType} Amount`, '1', `R ${parseFloat(data.total_amount || 0).toFixed(2)}`, `R ${parseFloat(data.total_amount || 0).toFixed(2)}`])
        }

        autoTable(doc, {
            startY: tableY,
            head: [["DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"]],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: COLORS.PRIMARY,
                textColor: COLORS.WHITE,
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: { top: 3, bottom: 2, left: 3, right: 3 }
            },
            bodyStyles: {
                textColor: COLORS.TEXT_MAIN,
                fontSize: 9,
                cellPadding: 3,
                valign: 'middle',
                lineColor: [226, 232, 240] // Slate 200
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 15, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
            },
            didDrawPage: () => {
                // Header is already drawn
            }
        })

        // ==========================================
        // 5. FOOTER SECTION (Bank & Totals)
        // ==========================================
        let finalY = doc.lastAutoTable.finalY + 10

        // Ensure we don't start too close to bottom
        if (finalY > pageHeight - 60) {
            doc.addPage()
            finalY = 20
        }

        // --- Totals Calculation ---
        let taxRate = 0.15
        if (settings.taxRate) taxRate = parseFloat(settings.taxRate) / 100

        const totalVal = parseFloat(data.total_amount || 0)
        let subtotalVal = totalVal
        let vatVal = 0

        if (data.vat_applicable) {
            subtotalVal = totalVal / (1 + taxRate)
            vatVal = totalVal - subtotalVal
        }

        const depositVal = parseFloat(data.deposit_amount || 0)
        const balanceDue = totalVal - depositVal


        // --- Banking Details Box (Left Side) ---
        if (docType !== 'Purchase Order') {
            const bankBoxW = 90
            const bankBoxH = 35

            doc.setFillColor(...COLORS.LIGHT)
            doc.roundedRect(margin, finalY, bankBoxW, bankBoxH, 2, 2, 'F')

            // Header
            doc.setFillColor(...COLORS.SECONDARY)
            doc.roundedRect(margin, finalY, bankBoxW, 7, 2, 2, 'F')
            // Fix corners? simplified: just draw rect
            doc.rect(margin, finalY + 5, bankBoxW, 2, 'F') // filler to square off bottom corners of header

            text("BANKING DETAILS", margin + 3, finalY + 4.5, { size: 8, color: COLORS.WHITE, style: 'bold' })

            // Details
            let bankY = finalY + 11
            const bankLabelX = margin + 3
            const bankValX = margin + 30

            const bankRow = (label, value) => {
                text(label, bankLabelX, bankY, { size: 8, color: COLORS.TEXT_MUTED })
                text(value, bankValX, bankY, { size: 8, color: COLORS.TEXT_MAIN, style: 'bold' })
                bankY += 5
            }

            bankRow("Bank:", settings.bankName || 'FNB')
            bankRow("Branch:", settings.bankBranchCode || '250655')
            bankRow("Account:", settings.bankAccountNumber || '63182000223')
            bankRow("Reference:", settings.bankReference || data.id.substring(0, 8))
        }

        // --- Totals Box (Right Side) ---
        const totalsW = 80
        const totalsX = pageWidth - margin - totalsW
        let totalsY = finalY

        const totalRow = (label, value, isBold = false, isGrand = false) => {
            text(label, totalsX, totalsY, { size: isGrand ? 11 : 9, color: isGrand ? COLORS.TEXT_MAIN : COLORS.TEXT_MUTED, style: (isGrand || isBold) ? 'bold' : 'normal' })
            text(value, pageWidth - margin, totalsY, { align: 'right', size: isGrand ? 12 : 9, color: isGrand ? COLORS.PRIMARY : COLORS.TEXT_MAIN, style: (isGrand || isBold) ? 'bold' : 'normal' })
            totalsY += isGrand ? 8 : 6
        }

        totalRow("Subtotal", `R ${subtotalVal.toFixed(2)}`)
        totalRow(data.vat_applicable ? `VAT (${(taxRate * 100).toFixed(0)}%)` : "VAT (0%)", `R ${vatVal.toFixed(2)}`)

        // Dotted Line
        doc.setDrawColor(...COLORS.SECONDARY)
        doc.setLineWidth(0.1)
        doc.setLineDash([1, 1], 0)
        doc.line(totalsX, totalsY - 2, pageWidth - margin, totalsY - 2)
        doc.setLineDash([])
        totalsY += 2

        totalRow("TOTAL", `R ${totalVal.toFixed(2)}`, true, true)

        if (depositVal > 0) {
            totalsY += 2
            totalRow("Paid / Deposit", `(R ${depositVal.toFixed(2)})`)

            // Balance Highlight
            doc.setFillColor(...COLORS.LIGHT)
            doc.roundedRect(totalsX - 2, totalsY - 4, totalsW + 2, 10, 1, 1, 'F')
            totalsY += 2
            text("BALANCE DUE", totalsX + 2, totalsY, { size: 10, style: 'bold', color: COLORS.TEXT_MAIN })
            text(`R ${balanceDue.toFixed(2)}`, pageWidth - margin - 2, totalsY, { align: 'right', size: 10, style: 'bold', color: COLORS.PRIMARY })
        }

        // ==========================================
        // 6. TERMS (Separate Page if needed, or inline)
        // ==========================================

        if (docType !== 'Purchase Order') {

            const terms = settings.legalTerms || "Standard Terms and Conditions apply. Please request a copy if required. Goods remain property of the supplier until paid in full."

            // Heading
            let termsY = finalY + 45
            if (termsY > pageHeight - 30) {
                doc.addPage()
                termsY = 20
            }

            text("TERMS AND CONDITIONS", margin, termsY, { size: 9, style: 'bold', color: COLORS.TEXT_MAIN })
            termsY += 5

            doc.setFontSize(8)
            doc.setTextColor(...COLORS.TEXT_MUTED)
            doc.setFont('helvetica', 'normal')

            const splitTerms = doc.splitTextToSize(terms, contentWidth)
            doc.text(splitTerms, margin, termsY)

            // Signature Section
            const sigY = pageHeight - 40

            // Check if we need new page for signature
            if (termsY + splitTerms.length * 4 > sigY - 20) {
                doc.addPage()
            }

            // Signature Lines
            doc.setDrawColor(...COLORS.SECONDARY)
            doc.setLineWidth(0.5)

            const sigLineY = pageHeight - 30
            const sigW = 70

            doc.line(margin, sigLineY, margin + sigW, sigLineY) // Client
            text("CLIENT SIGNATURE", margin, sigLineY + 5, { size: 7, color: COLORS.TEXT_MUTED })

            doc.line(pageWidth - margin - sigW, sigLineY, pageWidth - margin, sigLineY) // Date
            text("DATE", pageWidth - margin - sigW, sigLineY + 5, { size: 7, color: COLORS.TEXT_MUTED })

            // Digital Signature Render
            if (data.client_signature) {
                try {
                    doc.addImage(data.client_signature, 'PNG', margin + 5, sigLineY - 15, 40, 15)
                    text(`Digital ID: ${data.id}`, margin, sigLineY + 9, { size: 6, color: COLORS.TEXT_MUTED })
                } catch (e) {
                    console.log('Sig render error', e)
                }
            }
        }

        // ==========================================
        // 7. PAGE NUMBERS
        // ==========================================
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)

            // Footer Line
            doc.setDrawColor(...COLORS.LIGHT)
            doc.setLineWidth(0.5)
            doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

            // Text
            const footerText = `${company.name}  |  ${company.website || company.email}`
            text(footerText, margin, pageHeight - 10, { size: 8, color: COLORS.TEXT_MUTED })
            text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right', size: 8, color: COLORS.TEXT_MUTED })
        }

        doc.save(`${titleText}_${data.id.substring(0, 8)}.pdf`)

    } catch (error) {
        console.error('PDF Generation Error:', error)
        alert(`Failed to generate PDF: ${error.message}`)
    }
}

// Helper to fetch logo
const fetchImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "Anonymous"
        img.src = url
        img.onload = () => resolve(img)
        img.onerror = reject
    })
}

// Export functions for your CRM
export const generateInvoicePDF = (invoice, settings) => generatePDF('Invoice', invoice, settings)
export const generateQuotePDF = (quote, settings) => generatePDF('Quotation', quote, settings)
export const generatePurchaseOrderPDF = (po, settings) => generatePDF('Purchase Order', po, settings)