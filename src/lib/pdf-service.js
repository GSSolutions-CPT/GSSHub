import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- BRAND CONFIGURATION ---
const COLORS = {
    PRIMARY: [37, 99, 235],     // #2563eb (Security Blue)
    DARK: [15, 23, 42],         // #0f172a (Slate 900)
    LIGHT: [239, 246, 255],     // #eff6ff (Blue 50)
    GRAY_BG: [248, 250, 252],   // #f8fafc (Slate 50)
    TEXT_DARK: [30, 41, 59],    // #1e293b (Slate 800)
    TEXT_GRAY: [100, 116, 139], // #64748b (Slate 500)
    WHITE: [255, 255, 255]
}

const COMPANY_DETAILS = {
    name: "Global Security Solutions",
    tagline: "PROFESSIONAL SECURITY SERVICES",
    address: "66 Robyn Rd, Durbanville",
    phone: "062 955 8559",
    email: "Kyle@GlobalSecuritySolutions.co.za",
    website: "globalsecuritysolutions.co.za"
}

// --- MAIN GENERATOR FUNCTION ---
const generatePDF = async (docType, data) => {
    console.log('Generating PDF for:', docType, data)
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
        doc.rect(0, 0, pageWidth, 45, 'F')

        // Logo Handling
        try {
            // Assumes logo.png is in your public folder
            const logoUrl = window.location.origin + '/logo.png'
            const img = await fetchImage(logoUrl)
            doc.addImage(img, 'PNG', 14, 10, 25, 25)
        } catch (e) {
            // Fallback Text Logo
            doc.setFontSize(22)
            doc.setTextColor(...COLORS.PRIMARY)
            doc.setFont('helvetica', 'bold')
            doc.text('GSS', 14, 25)
        }

        // Company Info
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(20)
        doc.setTextColor(...COLORS.WHITE)
        doc.text(COMPANY_DETAILS.name, 45, 20)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(148, 163, 184) // Slate 400
        doc.text(COMPANY_DETAILS.tagline, 45, 26)

        // Contact Info (Right Aligned)
        const rightX = pageWidth - 14
        doc.setTextColor(203, 213, 225) // Slate 300
        doc.setFontSize(9)
        doc.text(COMPANY_DETAILS.address, rightX, 15, { align: 'right' })
        doc.text(COMPANY_DETAILS.phone, rightX, 20, { align: 'right' })
        doc.setTextColor(...COLORS.PRIMARY)
        doc.text(COMPANY_DETAILS.email, rightX, 25, { align: 'right' })
        doc.setTextColor(203, 213, 225)
        doc.text(COMPANY_DETAILS.website, rightX, 30, { align: 'right' })

        // ==========================================
        // 2. BLUE BANNER STRIP
        // ==========================================
        doc.setFillColor(...COLORS.PRIMARY)
        doc.rect(0, 45, pageWidth, 12, 'F')

        // Determine Title
        let titleText = docType.toUpperCase()
        if (docType === 'Invoice') titleText = data.vat_applicable ? 'TAX INVOICE' : 'INVOICE'
        if (docType === 'Quotation' && (data.status === 'Accepted')) titleText = 'PROFORMA INVOICE'

        doc.setFontSize(12)
        doc.setTextColor(...COLORS.WHITE)
        doc.setFont('helvetica', 'bold')
        doc.text(titleText, 14, 52.5)

        // Meta Data
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const dateValue = new Date(data.date_created).toLocaleDateString()
        doc.text(`NR: ${data.id.substring(0, 8)}   |   DATE: ${dateValue}`, rightX, 52.5, { align: 'right' })

        // ==========================================
        // 3. INFO CARDS
        // ==========================================
        const cardY = 65
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

        doc.setTextColor(...COLORS.TEXT_DARK)
        doc.setFontSize(10)
        doc.text(clientName, 18, cardY + 14)

        doc.setTextColor(...COLORS.TEXT_GRAY)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        let clientY = cardY + 19
        if (contactPerson) { doc.text(`Attn: ${contactPerson}`, 18, clientY); clientY += 4 }
        if (clientPhone) { doc.text(clientPhone, 18, clientY); clientY += 4 }
        if (clientAddr) {
            const splitAddr = doc.splitTextToSize(clientAddr, colW - 10)
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
            doc.text(COMPANY_DETAILS.name, refX + 4, cardY + 14)
            doc.setFontSize(9)
            doc.setTextColor(...COLORS.TEXT_GRAY)
            doc.setFont('helvetica', 'normal')
            doc.text(COMPANY_DETAILS.address, refX + 4, cardY + 19)
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
            doc.text('75% Deposit / 25% on Completion', refX + 30, cardY + 28)
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
            drawCard(14, finalY, bankWidth, 45, COLORS.DARK)

            doc.setTextColor(...COLORS.PRIMARY)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.text('BANKING DETAILS', 20, finalY + 10)

            doc.setTextColor(...COLORS.WHITE)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')

            const labelX = 20
            const valX = 60
            let bankY = finalY + 18
            const lineH = 5

            doc.text('Bank:', labelX, bankY); doc.text('FNB/RMB', valX, bankY); bankY += lineH;
            doc.text('Holder:', labelX, bankY); doc.text('Global Security Solutions', valX, bankY); bankY += lineH;

            doc.text('Account:', labelX, bankY);
            doc.setTextColor(...COLORS.PRIMARY); doc.setFont('helvetica', 'bold');
            doc.text('63182000223', valX, bankY);
            doc.setTextColor(...COLORS.WHITE); doc.setFont('helvetica', 'normal');
            bankY += lineH;

            doc.text('Branch:', labelX, bankY); doc.text('250655', valX, bankY); bankY += lineH;
            doc.text('Type:', labelX, bankY); doc.text('First Business Zero', valX, bankY);
        }

        // --- Totals ---
        const totalsX = 140
        let currentTotalY = finalY + 5

        const totalVal = parseFloat(data.total_amount || 0)
        // Calculate VAT backwards (Assumption: Total includes VAT)
        const subtotalVal = totalVal / (data.vat_applicable ? 1.15 : 1)
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
        doc.text(data.vat_applicable ? 'VAT (15%)' : 'VAT (0%)', totalsX, currentTotalY)
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
            doc.setTextColor(148, 163, 184)
            doc.text('Agreement governing the provision and installation of premium security systems.', rightX, 17, { align: 'right' })

            let termY = 40
            const bottomMargin = 30
            const terms = [
                { t: '1. Scope of Services', c: 'We agree to supply and install the security equipment ("System") as specified in the signed Quotation at the address provided ("Site"). The scope includes the physical installation of components, system configuration, basic user training upon handover, and any other services explicitly detailed in the Quotation. Services may include: Intruder Detection, CCTV, Access Control, Electric Fencing, Gate and Garage Automation, Smart Home and System Integration.' },
                { t: '2. System Specifications', c: 'The make, model, quantity, and specific capabilities of all System components will be detailed in the formal Quotation. We reserve the right to propose a substitution of components with items of equal or superior quality and specification if the quoted items become unavailable. Such a substitution will only be made subject to your prior written approval.' },
                { t: '3. Installation Procedures', c: '3.1 Site Access: You shall provide us with safe, unimpeded access to the Site during agreed-upon working hours.\n3.2 Customer Obligations: You are responsible for ensuring the Site is ready for installation, including providing a stable 230V AC power supply. You must inform us of concealed utilities.\n3.3 Timeline: Estimates only. We are not liable for delays beyond our control.\n3.4 Completion & Handover: Installation is deemed complete upon successful testing. Acceptance is confirmed by signing our job completion form or by using the system.' },
                { t: '4. Warranties', c: '4.1 Workmanship: 12-month warranty on installation workmanship. Covers faults directly resulting from installation.\n4.2 Equipment: Manufacturer warranty applies. We facilitate claims.\n4.3 Exclusions: Misuse, neglect, Acts of God (lightning, surge), third-party service failures, consumables (batteries, fuses).' },
                { t: '5. Payment Terms', c: '5.1 Deposit: 75% required on acceptance to secure equipment.\n5.2 Final Payment: 25% due upon completion and handover.\n5.3 Ownership: Equipment remains property of Global Security Solutions until fully paid. We reserve right to remove system if unpaid.\n5.4 Late Payments: Interest charged on overdue accounts at prime plus 5%.' },
                { t: '6. Data Privacy', c: '6.1 Compliance: We handle data in compliance with POPIA.\n6.2 System Data: You are the Data Controller for CCTV footage/logs. You are solely responsible for lawful use.\n6.3 Remote Access: Required for maintenance; done only with your explicit consent.' },
                { t: '7. Maintenance & Support', c: '7.1 Post-Warranty Service: Service calls requested after warranty period are chargeable at standard rates.\n7.2 Maintenance Contracts: Available for ongoing care.\n7.3 Call-Outs: Standard fees apply for on-site support outside warranty.' },
                { t: '8. Limitation of Liability', c: '8.1 No Guarantee: Systems are deterrents, not guarantees against loss. GSS is not an insurer.\n8.2 Indemnity: Not liable for loss/damage unless gross negligence is proven.\n8.3 Maximum Liability: Limited to the total contract value.' },
                { t: '9. Termination', c: '9.1 By You: 75% deposit is non-refundable if work commenced. Costs for work done are due.\n9.2 By Us: We may terminate for non-payment or breach.' },
                { t: '10. General', c: '10.1 Governing Law: Republic of South Africa.\n10.2 Dispute Resolution: Cape Town courts jurisdiction.\n10.3 Entire Agreement: This document + Quotation supersedes all prior communications.' }
            ]

            // Preamble
            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139) // Slate 500
            const preamble = "These Terms and Conditions (\"Agreement\") govern the provision and installation of security systems and related services (\"Services\") by Global Security Solutions (\"we,\" \"us,\" \"our\") to the customer (\"you,\" \"your\"). This Agreement, together with the official Quotation provided, constitutes the entire contract between both parties."
            const preambleLines = doc.splitTextToSize(preamble, pageWidth - 28)
            doc.text(preambleLines, 14, termY)
            termY += (preambleLines.length * 4) + 10

            doc.setTextColor(...COLORS.TEXT_DARK)
            terms.forEach(term => {
                // Check Page Break
                if (termY > pageHeight - bottomMargin - 20) {
                    doc.addPage()
                    termY = 20
                }

                doc.setFontSize(10)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(...COLORS.PRIMARY)
                doc.text(term.t, 14, termY)

                doc.setFontSize(9)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(60, 60, 60)
                const lines = doc.splitTextToSize(term.c, pageWidth - 28)
                doc.text(lines, 14, termY + 5)
                termY += (lines.length * 4) + 8
            })

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
            doc.text(`Web: ${COMPANY_DETAILS.website}   |   Email: ${COMPANY_DETAILS.email}   |   ${COMPANY_DETAILS.phone}`, pageWidth / 2, pH - 10, { align: 'center' })
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