import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- BRAND CONFIGURATION ---
// --- BRAND CONFIGURATION ---
const DEFAULT_COLORS = {
    PRIMARY: [37, 99, 235],     // #2563eb
    SECONDARY: [100, 116, 139], // #64748b (Slate 500)
    DARK: [15, 23, 42],         // #0f172a (Slate 900)
    LIGHT: [248, 250, 252],     // #f8fafc (Slate 50)
    BORDER: [226, 232, 240],    // #e2e8f0 (Slate 200)
    TEXT_MAIN: [30, 41, 59],    // #1e293b (Slate 800)
    TEXT_MUTED: [148, 163, 184] // #94a3b8 (Slate 400)
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
    console.log('Generating PDF (Premium V2) for:', docType, data, settings)
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
        // Initialize PDF (A4 Portrait)
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth() // 210mm
        const pageHeight = doc.internal.pageSize.getHeight() // 297mm
        const margin = 15
        const contentW = pageWidth - (margin * 2)

        // Helper: Styled Text
        const text = (str, x, y, options = {}) => {
            const { size = 10, color = COLORS.TEXT_MAIN, font = 'helvetica', style = 'normal', align = 'left', maxWidth = 0 } = options
            doc.setFontSize(size)
            doc.setTextColor(...color)
            doc.setFont(font, style)
            if (maxWidth > 0) {
                doc.text(String(str), x, y, { align, maxWidth })
            } else {
                doc.text(String(str), x, y, { align })
            }
        }

        // ==========================================
        // 1. BRAND SIDEBAR ACCENT OR MINIMAL HEADER
        // ==========================================
        // We'll go with a clean top layout with a subtle left accent bar on the title

        // 1.1 Brand Logo (Top Left)
        try {
            const logoUrl = settings.logoUrl || (window.location.origin + '/logo.png')
            const img = await fetchImage(logoUrl)

            const logoH = 22
            const imgProps = doc.getImageProperties(img)
            const logoW = (imgProps.width * logoH) / imgProps.height

            doc.addImage(img, 'PNG', margin, 12, logoW, logoH)
        } catch (e) {
            console.warn('Logo load failed', e)
            text(company.name, margin, 25, { size: 18, style: 'bold', color: COLORS.PRIMARY })
        }

        // 1.2 Document Title & ID (Top Right)
        let titleText = docType.toUpperCase()
        if (docType === 'Invoice') titleText = data.vat_applicable ? 'TAX INVOICE' : 'INVOICE'
        if (docType === 'Quotation' && (data.status === 'Accepted')) titleText = 'PROFORMA INVOICE'

        text(titleText, pageWidth - margin, 20, { size: 20, align: 'right', color: COLORS.TEXT_MAIN, style: 'bold', font: 'helvetica' })

        doc.setDrawColor(...COLORS.PRIMARY)
        doc.setLineWidth(1)
        doc.line(pageWidth - margin - 40, 24, pageWidth - margin, 24) // Accent line under title

        text(`# ${data.id.substring(0, 8).toUpperCase()}`, pageWidth - margin, 30, { size: 10, align: 'right', color: COLORS.SECONDARY })

        // ==========================================
        // 2. HEADER GRID (FROM / TO / DETAILS)
        // ==========================================
        let cursorY = 50

        // 2.1 Sender (Company) Details - Subtle, Left
        text("FROM", margin, cursorY, { size: 7, color: COLORS.TEXT_MUTED, style: 'bold' })
        cursorY += 5
        text(company.name, margin, cursorY, { size: 9, style: 'bold' })
        cursorY += 5
        text(company.address, margin, cursorY, { size: 8, color: COLORS.SECONDARY })
        cursorY += 4
        text(company.email, margin, cursorY, { size: 8, color: COLORS.SECONDARY })
        cursorY += 4
        text(company.phone, margin, cursorY, { size: 8, color: COLORS.SECONDARY })
        if (company.vat) {
            cursorY += 4
            text(`VAT: ${company.vat}`, margin, cursorY, { size: 8, color: COLORS.SECONDARY })
        }

        // 2.2 Client Details - Right aligned to center or right? Let's do Left-Center for balance
        const clientColX = margin + 80
        let clientY = 50

        text(docType === 'Purchase Order' ? 'VENDOR' : 'BILL TO', clientColX, clientY, { size: 7, color: COLORS.TEXT_MUTED, style: 'bold' })
        clientY += 5

        const clientName = docType === 'Purchase Order' ? (data.suppliers?.name || 'Unknown Supplier') : (data.clients?.name || 'Unknown Client')
        const contactPerson = docType === 'Purchase Order' ? data.suppliers?.contact_person : data.clients?.contact_person
        const clientEmail = docType === 'Purchase Order' ? data.suppliers?.email : data.clients?.email
        const clientPhone = docType === 'Purchase Order' ? data.suppliers?.phone : data.clients?.phone
        const clientAddr = docType === 'Purchase Order' ? data.suppliers?.address : data.clients?.address
        const clientCompany = docType === 'Purchase Order' ? '' : data.clients?.company

        text(clientCompany || clientName, clientColX, clientY, { size: 9, style: 'bold' })
        clientY += 5

        if (clientCompany && clientName !== clientCompany) {
            text(`Attn: ${clientName}`, clientColX, clientY, { size: 8, color: COLORS.SECONDARY })
            clientY += 4
        }
        if (contactPerson) {
            // Optional
        }
        if (clientEmail) { text(clientEmail, clientColX, clientY, { size: 8, color: COLORS.SECONDARY }); clientY += 4 }
        if (clientPhone) { text(clientPhone, clientColX, clientY, { size: 8, color: COLORS.SECONDARY }); clientY += 4 }
        if (clientAddr) {
            doc.setFontSize(8); doc.setTextColor(...COLORS.SECONDARY);
            const splitAddr = doc.splitTextToSize(clientAddr, 70)
            doc.text(splitAddr, clientColX, clientY)
        }

        // 2.3 Dates & Meta - Far Right
        const metaX = pageWidth - margin - 40
        let metaY = 50

        const metaRow = (label, val) => {
            text(label, metaX, metaY, { size: 7, color: COLORS.TEXT_MUTED, style: 'bold' })
            text(val, pageWidth - margin, metaY, { size: 8, align: 'right', color: COLORS.TEXT_MAIN })
            metaY += 8
        }

        metaRow("DATE", new Date(data.date_created).toLocaleDateString())

        if (data.valid_until) metaRow("VALID UNTIL", new Date(data.valid_until).toLocaleDateString())
        if (data.due_date) metaRow("DUE DATE", new Date(data.due_date).toLocaleDateString())

        if (data.metadata?.reference) {
            text("REFERENCE", metaX, metaY, { size: 7, color: COLORS.TEXT_MUTED, style: 'bold' })
            // wrapping ref id if long
            const refH = doc.getTextDimensions(data.metadata.reference, { fontSize: 8, maxWidth: 40 }).h
            text(data.metadata.reference, pageWidth - margin, metaY, { size: 8, align: 'right', color: COLORS.TEXT_MAIN, maxWidth: 40 })
            metaY += (Math.max(8, refH + 2))
        }

        // ==========================================
        // 3. CLEAN TABLE
        // ==========================================
        const tableY = Math.max(cursorY, clientY, metaY) + 15

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
            theme: 'plain', // Minimalist
            headStyles: {
                fillColor: COLORS.LIGHT,
                textColor: COLORS.TEXT_MUTED,
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: { top: 4, bottom: 4, left: 2, right: 2 }
            },
            bodyStyles: {
                textColor: COLORS.TEXT_MAIN,
                fontSize: 9,
                cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
                valign: 'top',
                lineColor: COLORS.BORDER,
                lineWidth: { bottom: 0.1 } // Only bottom border
            },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Desc
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 35, halign: 'right' },
                3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
            },
            didDrawPage: () => {
                // No complex headers needed per page
            }
        })

        // ==========================================
        // 4. FOOTER / TOTALS LAYOUT
        // ==========================================
        let finalY = doc.lastAutoTable.finalY + 10
        if (finalY > pageHeight - 60) {
            doc.addPage()
            finalY = 20
        }

        // Totals Calculation
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

        // 4.1 Banking Details (Floating Left, Clean)
        if (docType !== 'Purchase Order') {
            text("BANKING DETAILS", margin, finalY + 4, { size: 8, style: 'bold', color: COLORS.TEXT_MAIN })

            // Accent Line
            doc.setDrawColor(...COLORS.PRIMARY)
            doc.setLineWidth(0.5)
            doc.line(margin, finalY + 7, margin + 40, finalY + 7)

            let bankY = finalY + 14
            const bankRow = (label, val) => {
                text(label, margin, bankY, { size: 8, color: COLORS.TEXT_MUTED })
                text(val, margin + 25, bankY, { size: 8, color: COLORS.TEXT_MAIN, style: 'bold' })
                bankY += 5
            }

            bankRow("Bank:", settings.bankName || 'FNB')
            bankRow("Branch:", settings.bankBranchCode || '250655')
            bankRow("Account:", settings.bankAccountNumber || '63182000223')
            bankRow("Reference:", settings.bankReference || data.id.substring(0, 8))
        }

        // 4.2 Totals (Right Aligned, Large Typography)
        const totalsW = 80
        const totalsX = pageWidth - margin - totalsW
        let totalsY = finalY

        const totalRow = (label, value, size = 9, color = COLORS.TEXT_MUTED, weight = 'normal') => {
            text(label, totalsX, totalsY, { size, color, style: weight })
            text(value, pageWidth - margin, totalsY, { size, align: 'right', color: COLORS.TEXT_MAIN, style: 'bold' })
            totalsY += (size + 4)
        }

        totalRow("Subtotal", `R ${subtotalVal.toFixed(2)}`)
        if (vatVal > 0) totalRow(`VAT (${(taxRate * 100).toFixed(0)}%)`, `R ${vatVal.toFixed(2)}`)

        totalsY += 4
        // Big Total
        text("TOTAL", totalsX, totalsY, { size: 10, style: 'bold' })
        text(`R ${totalVal.toFixed(2)}`, pageWidth - margin, totalsY, { size: 14, style: 'bold', color: COLORS.PRIMARY, align: 'right' })
        totalsY += 10

        if (depositVal > 0) {
            totalRow("Less Paid", `(R ${depositVal.toFixed(2)})`, 9, COLORS.TEXT_MUTED)
            // Balance Accent
            doc.setFillColor(...COLORS.LIGHT)
            doc.roundedRect(totalsX - 2, totalsY - 4, totalsW + 2, 12, 1, 1, 'F')

            text("BALANCE DUE", totalsX + 2, totalsY + 4, { size: 9, style: 'bold', color: COLORS.TEXT_MAIN })
            text(`R ${balanceDue.toFixed(2)}`, pageWidth - margin - 2, totalsY + 4, { size: 11, style: 'bold', align: 'right', color: COLORS.PRIMARY })
        }


        // ==========================================
        // 5. SITE PLAN PAGE (Quotations with site plans)
        // ==========================================
        if (docType === 'Quotation' && data.site_plan_url) {
            try {
                doc.addPage()
                let planY = 20

                // Header
                text("SITE PLAN", margin, planY, { size: 14, style: 'bold', color: COLORS.TEXT_MAIN })
                planY += 4

                doc.setDrawColor(...COLORS.PRIMARY)
                doc.setLineWidth(0.8)
                doc.line(margin, planY, margin + 50, planY)
                planY += 8

                text(`Quotation #${data.id.substring(0, 8).toUpperCase()}`, margin, planY, { size: 9, color: COLORS.SECONDARY })
                planY += 10

                // Fetch and embed site plan image
                const sitePlanImg = await fetchImage(data.site_plan_url)
                const imgProps = doc.getImageProperties(sitePlanImg)

                // Scale to fit available space (A4 with margins)
                const availW = contentW
                const availH = pageHeight - planY - 30 // leave space for footer
                const scaleX = availW / imgProps.width
                const scaleY = availH / imgProps.height
                const scale = Math.min(scaleX, scaleY)
                const imgW = imgProps.width * scale
                const imgH = imgProps.height * scale

                // Center horizontally
                const imgX = margin + (availW - imgW) / 2

                doc.addImage(sitePlanImg, 'PNG', imgX, planY, imgW, imgH)

            } catch (e) {
                console.warn('Failed to load site plan image:', e)
            }
        }


        // ==========================================
        // 6. TERMS (New Page if Needed)
        // ==========================================
        if (docType !== 'Purchase Order') {
            const terms = settings.legalTerms || null
            if (terms) {
                // Always add a new page for Terms & Conditions
                doc.addPage()
                finalY = 20

                // Heading
                let termsY = finalY

                text("TERMS AND CONDITIONS", margin, termsY, { size: 9, style: 'bold', color: COLORS.TEXT_MAIN })
                termsY += 5

                doc.setFontSize(7)
                doc.setTextColor(...COLORS.TEXT_MUTED)
                doc.setFont('helvetica', 'normal')

                // Ensure terms is a string
                const termsStr = Array.isArray(terms) ? terms.join('\n') : String(terms)

                // Two Column Layout
                const gap = 10
                const colWidth = (contentW - gap) / 2

                // Split text into lines that fit in one column
                const allLines = doc.splitTextToSize(termsStr, colWidth)

                // Calculate split point (approx half)
                // We want to balance the columns, so we take total lines / 2
                const splitIndex = Math.ceil(allLines.length / 2)

                const leftCol = allLines.slice(0, splitIndex)
                const rightCol = allLines.slice(splitIndex)

                doc.text(leftCol, margin, termsY)
                doc.text(rightCol, margin + colWidth + gap, termsY)

                // Draw Vertical Divider Line
                const termsHeight = leftCol.length * 3 // approx 3mm line height
                doc.setDrawColor(...COLORS.BORDER)
                doc.setLineWidth(0.1)
                doc.line(margin + colWidth + (gap / 2), termsY, margin + colWidth + (gap / 2), termsY + termsHeight)

                // Update Y for signature (based on column height)
                const textHeight = termsHeight

                // Signature Section
                // Check if we need new page for signature
                // If terms + sig lines don't fit, add page
                if (termsY + textHeight + 30 > pageHeight - 20) {
                    doc.addPage()
                    // If we added a page, signatures go to top
                }

                // Signature Lines Position
                // If we are on a new page (from the check above), start at top
                let currentY = termsY + textHeight + 20
                if (currentY > pageHeight - 30) {
                    currentY = 30
                }

                const sigLineY = currentY
                const sigW = 70

                doc.line(margin, sigLineY, margin + sigW, sigLineY) // Client
                text("CLIENT SIGNATURE", margin, sigLineY + 5, { size: 7, color: COLORS.TEXT_MUTED })

                doc.line(pageWidth - margin - sigW, sigLineY, pageWidth - margin, sigLineY) // Date
                text("DATE", pageWidth - margin - sigW, sigLineY + 5, { size: 7, color: COLORS.TEXT_MUTED })



                // Render Digital Signature if available
                if (data.client_signature) {
                    try {
                        // Check if it's a URL or base64 (Storage URLs start with http)
                        // If it's a URL, we need to fetch it first
                        let signatureImg = data.client_signature
                        if (data.client_signature.startsWith('http')) {
                            const imgObj = await fetchImage(data.client_signature)
                            signatureImg = imgObj
                        }

                        doc.addImage(signatureImg, 'PNG', 14, pageHeight - 38, 50, 18)
                        doc.setFontSize(6)
                        doc.setTextColor(0, 128, 0)
                        doc.text(`Digitally Signed: ${new Date(data.accepted_at || new Date()).toLocaleString()}`, 14, pageHeight - 12)
                    } catch (e) {
                        console.warn('Error rendering signature:', e)
                        doc.setFontSize(8)
                        doc.setTextColor(255, 0, 0)
                        doc.text('(Signature could not be loaded)', 14, pageHeight - 30)

                    }
                }
            }
        }


        // ==========================================
        // 7. GLOBAL FOOTER (Page Numbers)
        // ==========================================
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            const pH = doc.internal.pageSize.getHeight()

            // Subtle footer line
            doc.setDrawColor(...COLORS.BORDER)
            doc.setLineWidth(0.1)
            doc.line(margin, pH - 15, pageWidth - margin, pH - 15)

            text(company.website || company.email, margin, pH - 10, { size: 8, color: COLORS.TEXT_MUTED })
            text(`Page ${i} of ${pageCount}`, pageWidth - margin, pH - 10, { size: 8, color: COLORS.TEXT_MUTED, align: 'right' })
        }

        doc.save(`${titleText}_${data.id.substring(0, 8)}.pdf`)

    } catch (error) {
        console.error('PDF Generation Error:', error)
        alert(`Failed to generate PDF: ${error.message}`)
    }
}

// Helper to fetch logo or images from URL
const fetchImage = (url) => {
    return new Promise((resolve, reject) => {
        if (!url) {
            reject(new Error('No URL provided'))
            return
        }
        const img = new Image()
        img.crossOrigin = "Anonymous"
        img.src = url
        img.onload = () => resolve(img)
        img.onerror = (e) => {
            console.error('Failed to load image:', url, e)
            reject(new Error(`Failed to load image from ${url}`))
        }
    })
}

// Export functions for your CRM
export const generateInvoicePDF = (invoice, settings) => generatePDF('Invoice', invoice, settings)
export const generateQuotePDF = (quote, settings) => generatePDF('Quotation', quote, settings)
export const generatePurchaseOrderPDF = (po, settings) => generatePDF('Purchase Order', po, settings)