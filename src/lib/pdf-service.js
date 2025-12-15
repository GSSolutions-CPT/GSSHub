import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Brand Colors
const COLORS = {
    NAVY: [0, 40, 85],      // #002855
    GRAY_LIGHT: [245, 245, 245],
    GRAY_TEXT: [100, 100, 100],
    GRAY_LABEL: [128, 128, 128],
    ACCENT_BLUE: [0, 60, 120]
}

const generatePDF = async (docType, data) => {
    console.log('Generating PDF for:', docType, data)
    try {
        const doc = new jsPDF()

        // --- PAGE 1: DOC FACE ---

        // Top Brand Line
        doc.setDrawColor(...COLORS.NAVY)
        doc.setLineWidth(1.5)
        doc.line(0, 5, 220, 5) // Full width top line

        // Logo & Header Block
        try {
            const logoUrl = window.location.origin + '/logo.png'
            const img = await fetchImage(logoUrl)
            // Fix: Constrain logo width/height to avoid overlap.
            // Width 40, Height Auto. Assuming square-ish logo.
            doc.addImage(img, 'PNG', 14, 10, 40, 0)
        } catch (e) {
            console.warn('Logo load failed', e)
            doc.setFontSize(22)
            doc.setTextColor(...COLORS.NAVY)
            doc.text('GSS', 14, 25)
        }

        // Tagline - Moved down to Y=55 to clear the logo
        doc.setFontSize(8)
        doc.setTextColor(...COLORS.GRAY_LABEL)
        doc.text('INSTALLATIONS • MAINTENANCE • AUTOMATION', 14, 55)

        // Fix: Determine Title Logic based on requirements
        let titleText = docType.toUpperCase()

        if (docType === 'Invoice') {
            titleText = data.vat_applicable ? 'TAX INVOICE' : 'INVOICE'
        } else if (docType === 'Quotation') {
            if (data.status === 'Accepted' || data.status === 'Approved') {
                titleText = 'PROFORMA INVOICE'
            }
        }

        // Document Title (Right aligned)
        doc.setFontSize(26)
        doc.setTextColor(200, 200, 200)
        doc.text(titleText, 196, 30, { align: 'right' })

        // Document Details (Right aligned below Title)
        doc.setTextColor(...COLORS.GRAY_TEXT)
        doc.setFontSize(10)
        doc.text(`#${data.id.substring(0, 8)}`, 196, 40, { align: 'right' })
        doc.text(`Date: ${new Date(data.date_created).toLocaleDateString()}`, 196, 45, { align: 'right' })

        // Address Blocks
        const leftColX = 14
        const rightColX = 120 // Moved slightly right for better separation
        const blockY = 70 // Moved down to clear header space

        // Bill To (Left)
        doc.setFontSize(9)
        doc.setTextColor(...COLORS.GRAY_LABEL)
        doc.text('BILL TO', leftColX, blockY)

        doc.setFontSize(11)
        doc.setTextColor(0, 0, 0)
        doc.text(data.clients?.name || 'Unknown Client', leftColX, blockY + 6)

        doc.setFontSize(10)
        doc.setTextColor(...COLORS.GRAY_TEXT)
        let addrY = blockY + 11
        if (data.clients?.company) {
            doc.text(data.clients.company, leftColX, addrY)
            addrY += 5
        }
        if (data.clients?.email) doc.text(data.clients.email, leftColX, addrY)

        // From (Right)
        doc.setFontSize(9)
        doc.setTextColor(...COLORS.GRAY_LABEL)
        doc.text('FROM', rightColX, blockY)

        doc.setFontSize(11)
        doc.setTextColor(0, 0, 0)
        // Check if TAX INVOICE to show VAT number if available (just mocking for now/using stored logic if needed)
        doc.text('Global Security Solutions', rightColX, blockY + 6)

        doc.setFontSize(10)
        doc.setTextColor(...COLORS.GRAY_TEXT)
        doc.text('062 955 8559', rightColX, blockY + 11)
        doc.text('66 Robyn RD, Durbanville', rightColX, blockY + 16)
        doc.text('Kyle@GSSolutions.co.za', rightColX, blockY + 21)
        // Add VAT Number for Tax Invoices
        if (titleText === 'TAX INVOICE') {
            doc.text('VAT Reg: 4440263660', rightColX, blockY + 26) // Example placeholder or usage from settings
        }

        // Details Strip
        const stripY = blockY + 35
        doc.setFontSize(9)
        doc.setTextColor(...COLORS.GRAY_LABEL)
        doc.text('DATE', 14, stripY)
        doc.text('REFERENCE', 70, stripY) // Adjusted spacing
        doc.text('DOC NR', 140, stripY)   // Adjusted spacing

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.text(new Date().toLocaleDateString(), 14, stripY + 5)
        doc.text(docType === 'Quotation' ? 'Security System' : 'Invoice Payment', 70, stripY + 5)
        doc.text(`${data.id.substring(0, 6)}`, 140, stripY + 5)

        // --- PRICING TABLE ---
        const tableY = stripY + 15

        const hasLines = data.lines && data.lines.length > 0
        const tableColumn = ["Description", "QTY", "Unit Price", "Total"]
        const tableRows = []

        if (hasLines) {
            data.lines.forEach(line => {
                tableRows.push([
                    line.description || 'Item',
                    line.quantity,
                    `R${parseFloat(line.unit_price || 0).toFixed(2)}`,
                    `R${parseFloat(line.line_total || 0).toFixed(2)}`
                ])
            })
        } else {
            tableRows.push([
                `Total ${docType} Amount`,
                '1',
                `R${parseFloat(data.total_amount || 0).toFixed(2)}`,
                `R${parseFloat(data.total_amount || 0).toFixed(2)}`
            ])
        }

        autoTable(doc, {
            startY: tableY,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped', // Zebra striping
            headStyles: {
                fillColor: COLORS.NAVY,
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: {
                cellPadding: 3,
                fontSize: 10,
                valign: 'middle'
            },
            alternateRowStyles: {
                fillColor: COLORS.GRAY_LIGHT
            },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Description
                1: { cellWidth: 20, halign: 'center' }, // Qty
                2: { cellWidth: 35, halign: 'right' }, // Price
                3: { cellWidth: 35, halign: 'right' }  // Total
            }
        })

        // --- TOTALS & BANKING ---
        const finalY = doc.lastAutoTable.finalY + 10

        // Banking Left
        const bankName = localStorage.getItem('bankName') || 'FNB/RMB'
        const accHolder = localStorage.getItem('bankAccountHolder') || 'Global Security Solutions'
        const accNum = localStorage.getItem('bankAccountNumber') || '63182000223'
        const accType = localStorage.getItem('bankAccountType') || 'Cheque Account'
        const branchCode = localStorage.getItem('bankBranchCode') || '250655'

        doc.setFontSize(9)
        doc.setTextColor(...COLORS.GRAY_LABEL)
        doc.text('PAYMENT INFORMATION', 14, finalY)

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.text(`Bank: ${bankName}`, 14, finalY + 6)
        doc.text(`Account Holder: ${accHolder}`, 14, finalY + 11)
        doc.text(`Account Number: ${accNum}`, 14, finalY + 16)
        doc.text(`Branch Code: ${branchCode}`, 14, finalY + 21)
        doc.text(`Account Type: ${accType}`, 14, finalY + 26)

        // Totals Right - Logic for VAT display
        const totalsX = 140
        const totalVal = parseFloat(data.total_amount || 0)

        let subtotalVal = totalVal
        let vatVal = 0

        // Reverse calc if total includes VAT (simple logic for now if data doesn't split it perfectly)
        // Ideally data.trade_subtotal exists.
        if (data.vat_applicable) {
            vatVal = totalVal - (totalVal / 1.15)
            subtotalVal = totalVal - vatVal
        }

        doc.setFontSize(10)
        doc.setTextColor(...COLORS.GRAY_TEXT)
        doc.text('Subtotal:', totalsX, finalY + 6)
        doc.text(`R${subtotalVal.toFixed(2)}`, 200, finalY + 6, { align: 'right' })

        doc.text('VAT (15%):', totalsX, finalY + 11)
        doc.text(`R${vatVal.toFixed(2)}`, 200, finalY + 11, { align: 'right' })

        // Divider
        doc.setDrawColor(200, 200, 200)
        doc.line(totalsX, finalY + 15, 200, finalY + 15)

        // Grand Total
        doc.setFontSize(14)
        doc.setTextColor(...COLORS.NAVY)
        doc.text('Total:', totalsX, finalY + 24)
        doc.text(`R${totalVal.toFixed(2)}`, 200, finalY + 24, { align: 'right' })


        // Footer Page 1
        addFooter(doc, 1, 2)

        // --- PAGE 2: TERMS & CONDITIONS ---
        doc.addPage()

        doc.setFontSize(16)
        doc.setTextColor(...COLORS.NAVY)
        doc.text('GENERAL TERMS & CONDITIONS', 105, 20, { align: 'center' })

        const terms = [
            {
                title: "1. Scope of Services",
                text: "We agree to supply and install the security equipment ('System') as specified. Includes Intruder Detection, CCTV, Access Control, Electric Fencing, and Automation."
            },
            {
                title: "2. System Specifications",
                text: "System components specified in the Quotation. We reserve the right to substitute with equal/superior quality if unavailable, subject to approval."
            },
            {
                title: "3. Installation Procedures",
                text: "3.1 Site Access: Client checks safe access.\n3.2 Obligations: Power supply (230V AC) required. Client must disclose concealed utilities.\n3.3 Timeline: Estimates only. Not liable for external delays.\n3.4 Completion: Handover confirmed by signature or use."
            },
            {
                title: "4. Warranties",
                text: "4.1 Workmanship: 12-month warranty.\n4.2 Equipment: Manufacturer warranty applies.\n4.3 Exclusions: Misuse, Acts of God, Third-party service failures, Consumables."
            },
            {
                title: "5. Payment Terms",
                text: "5.1 Deposit: 75% required on acceptance.\n5.2 Final: 25% due on completion.\n5.3 Ownership: Remains property of GSS until fully paid.\n5.4 Late Payments: Interest charged at prime + 5%."
            },
            {
                title: "6. Data Privacy (POPIA)",
                text: "Client is Data Controller for system data (CCTV etc). We process data only for billing/service. Remote access only with consent."
            },
            {
                title: "7. Maintenance",
                text: "Post-warranty service charged at standard rates. Maintenance contracts available separately."
            },
            {
                title: "8. Liability",
                text: "System is a deterrent, not a guarantee. GSS not liable for loss/damage unless gross negligence proven. Liability limited to Quote value."
            },
            {
                title: "9. Termination",
                text: "Client may terminate with notice. 75% deposit non-refundable if work commenced. GSS may terminate for non-payment."
            }
        ]

        let y = 30
        const colWidth = 85
        const gap = 10
        let leftCol = true

        terms.forEach((item, index) => {
            const x = leftCol ? 14 : 14 + colWidth + gap

            doc.setFontSize(9)
            doc.setTextColor(...COLORS.NAVY)
            doc.text(item.title, x, y)

            doc.setFontSize(8)
            doc.setTextColor(60, 60, 60)
            const lines = doc.splitTextToSize(item.text, colWidth)
            doc.text(lines, x, y + 5)

            const blockHeight = (lines.length * 4) + 12

            if (index === 4) { // Switch col after 5 items
                leftCol = false
                y = 30
            } else {
                y += blockHeight
            }
        })

        // Agreement Footer
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text('By accepting this Quotation, you utilize our services bound by these Terms.', 105, 260, { align: 'center' })

        // Signature Block
        doc.setDrawColor(200, 200, 200)
        doc.line(14, 275, 80, 275) // Sign 1
        doc.line(120, 275, 190, 275) // Sign 2

        doc.setFontSize(8)
        doc.text('CLIENT SIGNATURE', 14, 280)
        doc.text('GSS REPRESENTATIVE', 120, 280)

        // Render Signature Image if exists
        if (data.client_signature) {
            try {
                // Signature is usually a data URL (base64)
                doc.addImage(data.client_signature, 'PNG', 14, 255, 40, 20)
                doc.setTextColor(0, 128, 0)
                doc.setFontSize(6)
                doc.text(`Signed digitally at ${new Date(data.accepted_at).toLocaleString()}`, 14, 274)
            } catch (e) {
                console.warn('Could not render signature', e)
            }
        }

        addFooter(doc, 2, data.payment_proof ? 3 : 2)

        // --- PAGE 3: PAYMENT PROOF (If Exists) ---
        if (data.payment_proof) {
            doc.addPage()

            // Header
            doc.setDrawColor(...COLORS.NAVY)
            doc.setLineWidth(1.5)
            doc.line(0, 5, 220, 5)

            doc.setFontSize(16)
            doc.setTextColor(...COLORS.NAVY)
            doc.text('PAYMENT PROOF', 14, 25)

            doc.setFontSize(10)
            doc.setTextColor(...COLORS.GRAY_TEXT)
            doc.text('Attached below is the proof of payment provided by the client.', 14, 32)

            // Render Image
            try {
                // Assuming base64 image
                // Fit max width 180, max height 200
                doc.addImage(data.payment_proof, 'PNG', 14, 40, 180, 0)
            } catch (e) {
                doc.text('Error rendering payment proof image', 14, 50)
            }

            addFooter(doc, 3, 3)
        }

        // Save
        doc.save(`${titleText}_${data.id.substring(0, 8)}.pdf`)
    } catch (error) {
        console.error('PDF Generation Error:', error)
        alert(`Failed to generate PDF: ${error.message}`)
    }
}

const addFooter = (doc, pageNum, totalPages) => {
    const pageHeight = doc.internal.pageSize.height
    doc.setDrawColor(...COLORS.NAVY)
    doc.setLineWidth(1)
    doc.line(0, pageHeight - 15, 220, pageHeight - 15) // Bottom brand line

    doc.setFontSize(8)
    doc.setTextColor(...COLORS.GRAY_LABEL)
    doc.text('Web: www.GSSolutions.co.za   |   Email: Kyle@GSSolutions.co.za', 105, pageHeight - 10, { align: 'center' })
    doc.text(`Page ${pageNum} of ${totalPages}`, 200, pageHeight - 10, { align: 'right' })
}

// Helper to fetch image for logo
const fetchImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.src = url
        img.onload = () => resolve(img)
        img.onerror = reject
    })
}

export const generateInvoicePDF = (invoice) => generatePDF('Invoice', invoice)
export const generateQuotePDF = (quote) => generatePDF('Quotation', quote)
