import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- BRAND CONFIGURATION ---
// --- BRAND CONFIGURATION ---
const DEFAULT_COLORS = {
    PRIMARY: [37, 99, 235],     // #2563eb (Security Blue)
    DARK: [15, 23, 42],         // #0f172a (Slate 900)
    LIGHT: [239, 246, 255],     // #eff6ff (Blue 50)
    GRAY_BG: [248, 250, 252],   // #f8fafc (Slate 50)
    TEXT_DARK: [30, 41, 59],    // #1e293b (Slate 800)
    TEXT_GRAY: [100, 116, 139], // #64748b (Slate 500)
    WHITE: [255, 255, 255]
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
        website: "globalsecuritysolutions.co.za" // Could be added to settings later
    }

    try {
        // Initialize PDF (A4 Portrait)
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        // Helper: Draw Rounded Card Background
        const drawCard = (x, y, w, h, color) => {
            doc.setFillColor(...color)
            doc.roundedRect(x, y, w, h, 2, 2, 'F')
        }

        // ==========================================
        // 1. HEADER SECTION
        // ==========================================
        doc.setFillColor(...COLORS.DARK)
        doc.rect(0, 0, pageWidth, 35, 'F')

        // Logo Handling
        try {
            // Use settings logo or fallback
            const logoUrl = settings.logoUrl || (window.location.origin + '/logo.png')

            // If it's a relative path/local asset, prepend origin if needed, 
            // but settings.logoUrl from Supabase is absolute.
            // window.location.origin might be needed for '/logo.png'.

            const img = await fetchImage(logoUrl)

            // Calculate aspect ratio
            const imgProps = doc.getImageProperties(img)
            const logoWidth = 40
            const logoHeight = (imgProps.height * logoWidth) / imgProps.width

            doc.addImage(img, 'PNG', 14, 5, logoWidth, logoHeight)
        } catch (e) {
            console.warn('Logo load failed, using text fallback', e)
            // Fallback Text Logo
            doc.setFontSize(22)
            doc.setTextColor(...COLORS.PRIMARY)
            doc.setFont('helvetica', 'bold')
            doc.text(company.name.substring(0, 3).toUpperCase(), 14, 25)
        }

        // Contact Info (Right Aligned)
        const rightX = pageWidth - 14
        doc.setTextColor(203, 213, 225) // Slate 300
        doc.setFontSize(9)
        doc.text(company.address, rightX, 10, { align: 'right' })
        doc.text(company.phone, rightX, 15, { align: 'right' })
        doc.setTextColor(...COLORS.PRIMARY)
        doc.text(company.email, rightX, 20, { align: 'right' })
        doc.setTextColor(203, 213, 225)
        if (company.vat) {
            doc.text(`VAT: ${company.vat}`, rightX, 25, { align: 'right' })
        }

        // ==========================================
        // 2. BLUE BANNER STRIP
        // ==========================================
        doc.setFillColor(...COLORS.PRIMARY)
        doc.rect(0, 35, pageWidth, 8, 'F')

        // Determine Title
        let titleText = docType.toUpperCase()
        if (docType === 'Invoice') titleText = data.vat_applicable ? 'TAX INVOICE' : 'INVOICE'
        if (docType === 'Quotation' && (data.status === 'Accepted')) titleText = 'PROFORMA INVOICE'

        doc.setFontSize(12)
        doc.setTextColor(...COLORS.WHITE)
        doc.setFont('helvetica', 'bold')
        doc.text(titleText, 14, 40.5)

        // Meta Data
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const dateValue = new Date(data.date_created).toLocaleDateString()
        doc.text(`NR: ${data.id.substring(0, 8)}   |   DATE: ${dateValue}`, rightX, 40.5, { align: 'right' })

        // ==========================================
        // 3. INFO CARDS
        // ==========================================
        const cardY = 55
        const cardH = 35
        const colGap = 10
        const colW = (pageWidth - 28 - colGap) / 2

        // --- Card 1: Bill To (Light Blue) ---
        drawCard(14, cardY, colW, cardH, COLORS.LIGHT)
        doc.setDrawColor(...COLORS.PRIMARY)
        doc.setLineWidth(1)
        doc.line(14, cardY + 2, 14, cardY + cardH - 2)

        doc.setTextColor(...COLORS.PRIMARY)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(docType === 'Purchase Order' ? 'VENDOR' : 'BILL TO', 18, cardY + 8)

        // Client Details
        const clientName = docType === 'Purchase Order' ? (data.suppliers?.name || 'Unknown Supplier') : (data.clients?.name || 'Unknown Client')
        const contactPerson = docType === 'Purchase Order' ? data.suppliers?.contact_person : data.clients?.contact_person
        const clientPhone = docType === 'Purchase Order' ? data.suppliers?.phone : data.clients?.phone
        const clientAddr = docType === 'Purchase Order' ? data.suppliers?.address : data.clients?.address
        const clientCompany = docType === 'Purchase Order' ? '' : data.clients?.company

        doc.setTextColor(...COLORS.TEXT_DARK)
        doc.setFontSize(10)
        doc.text(clientCompany || clientName, 18, cardY + 14)

        doc.setTextColor(...COLORS.TEXT_GRAY)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        let clientY = cardY + 19
        if (clientCompany && clientName !== clientCompany) { doc.text(clientName, 18, clientY); clientY += 4 }
        if (contactPerson) { doc.text(`Attn: ${contactPerson}`, 18, clientY); clientY += 4 }
        if (clientPhone) { doc.text(clientPhone, 18, clientY); clientY += 4 }
        if (clientAddr) {
            const splitAddr = doc.splitTextToSize(clientAddr.substring(0, 50) + (clientAddr.length > 50 ? '...' : ''), colW - 10)
            doc.text(splitAddr, 18, clientY)
        }

        // --- Card 2: Reference (Gray) ---
        const refX = 14 + colW + colGap
        drawCard(refX, cardY, colW, cardH, COLORS.GRAY_BG)
        doc.setDrawColor(148, 163, 184)
        doc.line(refX, cardY + 2, refX, cardY + cardH - 2)

        doc.setTextColor(...COLORS.TEXT_GRAY)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(docType === 'Purchase Order' ? 'SHIP TO' : 'PROJECT REFERENCE', refX + 4, cardY + 8)

        doc.setTextColor(...COLORS.TEXT_DARK)
        doc.setFontSize(10)

        if (docType === 'Purchase Order') {
            doc.text(company.name, refX + 4, cardY + 14)
            doc.setFontSize(9)
            doc.setTextColor(...COLORS.TEXT_GRAY)
            doc.setFont('helvetica', 'normal')
            doc.text(company.address, refX + 4, cardY + 19)
        } else {
            const refText = data.metadata?.reference || 'Security System Installation'
            const splitRef = doc.splitTextToSize(refText, colW - 10)
            doc.text(splitRef, refX + 4, cardY + 14)

            // Payment Terms Label
            doc.setFontSize(8)
            doc.setTextColor(...COLORS.TEXT_GRAY)
            doc.text('Payment Terms:', refX + 4, cardY + 28)
            doc.setTextColor(...COLORS.PRIMARY)
            doc.setFont('helvetica', 'bold')
            const termText = data.payment_type === 'full'
                ? '100% Upfront'
                : `${data.deposit_percentage || 75}% Deposit / ${100 - (data.deposit_percentage || 75)}% on Completion`
            doc.text(termText, refX + 30, cardY + 28)
        }

        // ==========================================
        // 4. PRICING TABLE
        // ==========================================
        const tableY = cardY + cardH + 10

        const tableRows = []
        if (data.lines && data.lines.length > 0) {
            data.lines.forEach(line => {
                tableRows.push([
                    line.description || 'Item',
                    line.quantity,
                    `R${parseFloat(line.unit_price || 0).toFixed(2)}`,
                    `R${parseFloat(line.line_total || 0).toFixed(2)}`
                ])
            })
        } else {
            // Fallback if no lines
            tableRows.push([`Total ${docType} Amount`, '1', `R${parseFloat(data.total_amount || 0).toFixed(2)}`, `R${parseFloat(data.total_amount || 0).toFixed(2)}`])
        }

        autoTable(doc, {
            startY: tableY,
            head: [["Description", "Qty", "Unit Price", "Total"]],
            body: tableRows,
            theme: 'plain',
            headStyles: {
                fillColor: COLORS.GRAY_BG,
                textColor: COLORS.TEXT_GRAY,
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: 4
            },
            bodyStyles: {
                textColor: COLORS.TEXT_DARK,
                fontSize: 10,
                cellPadding: 4,
                valign: 'middle'
            },
            alternateRowStyles: {
                fillColor: COLORS.LIGHT
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 35, halign: 'right' },
                3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
            }
        })

        // ==========================================
        // 5. FOOTER SECTION (Bank & Totals)
        // ==========================================
        const finalY = doc.lastAutoTable.finalY + 10

        // --- Banking Card ---
        if (docType !== 'Purchase Order') {
            const bankWidth = 110
            drawCard(14, finalY, bankWidth, 32, COLORS.DARK)

            doc.setTextColor(...COLORS.PRIMARY)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.text('BANKING DETAILS', 20, finalY + 8)

            doc.setTextColor(...COLORS.WHITE)
            doc.setFontSize(9)

            const labelX = 20
            const valX = 60
            let bankY = finalY + 15
            const lineH = 5

            doc.setFont('helvetica', 'normal'); doc.text('Bank:', labelX, bankY);
            doc.setFont('helvetica', 'bold'); doc.text(settings.bankName || 'FNB/RMB', valX, bankY);
            bankY += lineH;

            doc.setFont('helvetica', 'normal'); doc.text('Holder:', labelX, bankY);
            doc.setFont('helvetica', 'bold'); doc.text(settings.bankAccountHolder || company.name, valX, bankY);
            bankY += lineH;

            doc.setFont('helvetica', 'normal'); doc.text('Account:', labelX, bankY);
            doc.setTextColor(...COLORS.PRIMARY); doc.setFont('helvetica', 'bold');
            doc.text(settings.bankAccountNumber || '63182000223', valX, bankY);
            doc.setTextColor(...COLORS.WHITE);
            bankY += lineH;

            doc.setFont('helvetica', 'normal'); doc.text('Branch:', labelX, bankY);
            doc.setFont('helvetica', 'bold'); doc.text(settings.bankBranchCode || '250655', valX, bankY);

            // Optional: Type
            if (settings.bankAccountType) {
                bankY += lineH;
                doc.setFont('helvetica', 'normal'); doc.text('Type:', labelX, bankY);
                doc.setFont('helvetica', 'bold'); doc.text(settings.bankAccountType, valX, bankY);
            }
        }

        // --- Totals ---
        const totalsX = 140
        let currentTotalY = finalY + 5

        const totalVal = parseFloat(data.total_amount || 0)

        let taxRate = 0.15
        if (settings.taxRate) {
            taxRate = parseFloat(settings.taxRate) / 100
        }

        // Calculate VAT backwards (Assumption: Total includes VAT)
        // If vat_applicable is false, then total is just subtotal.
        // If vat_applicable is true, then total = subtotal * (1 + rate) -> subtotal = total / (1 + rate)

        const subtotalVal = totalVal / (data.vat_applicable ? (1 + taxRate) : 1)
        const vatVal = data.vat_applicable ? (totalVal - subtotalVal) : 0

        const depositVal = parseFloat(data.deposit_amount || 0)
        const balanceDue = totalVal - depositVal

        doc.setTextColor(...COLORS.TEXT_GRAY)
        doc.setFontSize(10)

        // Subtotal
        doc.text('Subtotal', totalsX, currentTotalY)
        doc.text(`R${subtotalVal.toFixed(2)}`, rightX, currentTotalY, { align: 'right' })
        currentTotalY += 6

        // VAT
        doc.text(data.vat_applicable ? `VAT (${(taxRate * 100).toFixed(0)}%)` : 'VAT (0%)', totalsX, currentTotalY)
        doc.text(`R${vatVal.toFixed(2)}`, rightX, currentTotalY, { align: 'right' })
        currentTotalY += 10

        // Grand Total Box
        doc.setFillColor(...COLORS.PRIMARY)
        doc.roundedRect(totalsX - 5, currentTotalY - 6, (rightX - totalsX) + 10, 12, 1, 1, 'F')

        doc.setTextColor(...COLORS.WHITE)
        doc.setFont('helvetica', 'bold')
        doc.text('GRAND TOTAL', totalsX, currentTotalY + 2)
        doc.setFontSize(12)
        doc.text(`R${totalVal.toFixed(2)}`, rightX, currentTotalY + 2, { align: 'right' })

        // Deposit / Balance
        if (depositVal > 0) {
            currentTotalY += 12
            doc.setTextColor(...COLORS.TEXT_GRAY)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.text('Less Deposit:', totalsX, currentTotalY)
            doc.text(`(R${depositVal.toFixed(2)})`, rightX, currentTotalY, { align: 'right' })

            currentTotalY += 6
            doc.setTextColor(...COLORS.TEXT_DARK)
            doc.setFont('helvetica', 'bold')
            doc.text('Balance Due:', totalsX, currentTotalY)
            doc.text(`R${balanceDue.toFixed(2)}`, rightX, currentTotalY, { align: 'right' })
        }

        // ==========================================
        // 6. TERMS & CONDITIONS (Page 2)
        // ==========================================
        if (docType !== 'Purchase Order') {
            doc.addPage()

            // Header for T&C Page
            doc.setFillColor(...COLORS.DARK)
            doc.rect(0, 0, pageWidth, 25, 'F')
            doc.setTextColor(...COLORS.WHITE)
            doc.setFontSize(14)
            doc.text('TERMS & CONDITIONS', 14, 17)
            doc.setFontSize(9)
            doc.text('Standard Terms of Service', rightX, 17, { align: 'right' })

            let termY = 40
            const bottomMargin = 30

            // Custom Terms from Settings or Default
            let termsContent = settings.legalTerms

            if (!termsContent) {
                // Default Terms if none provided
                termsContent = `1. Scope of Services
We agree to supply and install the equipment as specified.

2. Ownership
Equipment remains property of ${company.name} until fully paid.

3. Payment
Payment is due as per agreed terms. Late payments may incur interest.

4. Warranty
Standard manufacturer warranties apply. Workmanship is guaranteed for 12 months.`
            }

            // Preamble
            doc.setFontSize(8)
            doc.setTextColor(100, 116, 139) // Slate 500
            const preamble = `These Terms and Conditions govern the provision services by ${company.name} to the customer.`
            doc.text(preamble, 14, termY)
            termY += 10

            doc.setFontSize(9)
            doc.setTextColor(...COLORS.TEXT_DARK)
            doc.setFont('helvetica', 'normal')

            // Simple text wrapping for the whole block if it's just a blob of text
            const splitTerms = doc.splitTextToSize(termsContent, pageWidth - 28)

            // Check if it fits, else handle simple pagination
            // For simplicity, we just dump it, but let's try to paginate if needed
            let currentLine = 0
            while (currentLine < splitTerms.length) {
                if (termY > pageHeight - bottomMargin) {
                    doc.addPage()
                    termY = 20
                }
                doc.text(splitTerms[currentLine], 14, termY)
                termY += 5
                currentLine++
            }

            // Acceptance Block
            const finalPageHeight = doc.internal.pageSize.getHeight()
            doc.setDrawColor(200, 200, 200)
            doc.line(14, finalPageHeight - 40, pageWidth - 14, finalPageHeight - 40)

            doc.setFontSize(9)
            doc.setTextColor(...COLORS.TEXT_DARK)
            doc.text('I acknowledge I have read and agree to these terms.', pageWidth / 2, finalPageHeight - 35, { align: 'center' })

            doc.line(14, finalPageHeight - 20, 80, finalPageHeight - 20)
            doc.setFontSize(8)
            doc.setTextColor(...COLORS.TEXT_GRAY)
            doc.text('CLIENT SIGNATURE', 14, finalPageHeight - 15)

            doc.line(120, finalPageHeight - 20, 180, finalPageHeight - 20)
            doc.text('DATE', 120, finalPageHeight - 15)

            // Render Digital Signature if available
            if (data.client_signature) {
                try {
                    doc.addImage(data.client_signature, 'PNG', 14, finalPageHeight - 38, 50, 18)
                    doc.setFontSize(6)
                    doc.setTextColor(0, 128, 0)
                    doc.text(`Digitally Signed: ${new Date(data.accepted_at || new Date()).toLocaleString()}`, 14, finalPageHeight - 12)
                } catch (e) {
                    console.warn('Error rendering signature:', e)
                }
            }
        }

        // --- GLOBAL FOOTER ---
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            const pH = doc.internal.pageSize.getHeight()

            doc.setDrawColor(200, 200, 200)
            doc.setLineWidth(0.5)
            doc.line(14, pH - 15, pageWidth - 14, pH - 15)

            doc.setFontSize(8)
            doc.setTextColor(...COLORS.TEXT_GRAY)
            doc.text(`Web: ${company.website || ''}   |   Email: ${company.email}   |   ${company.phone}`, pageWidth / 2, pH - 10, { align: 'center' })
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pH - 10, { align: 'right' })
        }

        // Output
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