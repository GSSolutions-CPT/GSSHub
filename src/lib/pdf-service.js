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

const generatePDF = async (docType, data, settings = {}) => {
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
        } else if (docType === 'Purchase Order') {
            titleText = 'PURCHASE ORDER'
        }

        // Document Title (Right aligned)
        doc.setFontSize(26)
        doc.setTextColor(200, 200, 200)
        doc.text(titleText, 196, 30, { align: 'right' })

        // Document Details (Right aligned below Title)
        doc.setTextColor(...COLORS.GRAY_TEXT)
        doc.setFontSize(10)
        doc.text(`#${data.id.substring(0, 8)}`, 196, 40, { align: 'right' })

        let dateLabel = 'Date:'
        let dateValue = new Date(data.date_created).toLocaleDateString()

        if (docType === 'Purchase Order' && data.expected_date) {
            // For PO, maybe show Expected Date too?
            // checking space...
        }

        doc.text(`${dateLabel} ${dateValue}`, 196, 45, { align: 'right' })

        // Address Blocks
        const leftColX = 14
        const rightColX = 120 // Moved slightly right for better separation
        const blockY = 70 // Moved down to clear header space

        if (docType === 'Purchase Order') {
            // PO Layout: 
            // Left: VENDOR (Supplier)
            // Right: SHIP TO (Us)

            // VENDOR (Left)
            doc.setFontSize(9)
            doc.setTextColor(...COLORS.GRAY_LABEL)
            doc.text('VENDOR', leftColX, blockY)

            doc.setFontSize(11)
            doc.setTextColor(0, 0, 0)
            doc.text(data.suppliers?.name || 'Unknown Supplier', leftColX, blockY + 6)

            doc.setFontSize(10)
            doc.setTextColor(...COLORS.GRAY_TEXT)
            let addrY = blockY + 11

            // Use supplier details if available
            if (data.suppliers?.contact_person) {
                doc.text(`Attn: ${data.suppliers.contact_person}`, leftColX, addrY)
                addrY += 5
            }
            if (data.suppliers?.email) {
                doc.text(data.suppliers.email, leftColX, addrY)
                addrY += 5
            }
            if (data.suppliers?.phone) {
                doc.text(data.suppliers.phone, leftColX, addrY)
                addrY += 5
            }
            if (data.suppliers?.address) { // Handle multiline address
                const splitAddr = doc.splitTextToSize(data.suppliers.address, 80)
                doc.text(splitAddr, leftColX, addrY)
            }


            // SHIP TO (Right) - US
            doc.setFontSize(9)
            doc.setTextColor(...COLORS.GRAY_LABEL)
            doc.text('SHIP TO', rightColX, blockY)

            doc.setFontSize(11)
            doc.setTextColor(0, 0, 0)
            doc.text('Global Security Solutions', rightColX, blockY + 6)

            const companyPhone = settings.companyPhone || localStorage.getItem('companyPhone') || '062 955 8559'
            const companyAddress = settings.companyAddress || localStorage.getItem('companyAddress') || '66 Robyn RD, Durbanville'

            doc.setFontSize(10)
            doc.setTextColor(...COLORS.GRAY_TEXT)
            doc.text(companyPhone, rightColX, blockY + 11)
            doc.text(companyAddress, rightColX, blockY + 16)

        } else {
            // Standard Invoice/Quote Layout
            // Left: BILL TO (Client)
            // Right: FROM (Us)

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
            doc.text('Global Security Solutions', rightColX, blockY + 6)

            const companyPhone = settings.companyPhone || localStorage.getItem('companyPhone') || '062 955 8559'
            const companyAddress = settings.companyAddress || localStorage.getItem('companyAddress') || '66 Robyn RD, Durbanville'
            const companyEmail = settings.companyEmail || localStorage.getItem('companyEmail') || 'Kyle@GSSolutions.co.za'
            const companyVat = settings.companyVat || localStorage.getItem('companyVat') || ''

            doc.text(companyPhone, rightColX, blockY + 11)
            doc.text(companyAddress, rightColX, blockY + 16)
            doc.text(companyEmail, rightColX, blockY + 21)
            // Add VAT Number for Tax Invoices
            if (titleText === 'TAX INVOICE' && companyVat) {
                doc.text(`VAT Reg: ${companyVat}`, rightColX, blockY + 26)
            }
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
        // Banking Left
        const bankName = settings.bankName || localStorage.getItem('bankName') || 'FNB/RMB'
        const accHolder = settings.bankAccountHolder || localStorage.getItem('bankAccountHolder') || 'Global Security Solutions'
        const accNum = settings.bankAccountNumber || localStorage.getItem('bankAccountNumber') || '63182000223'
        const accType = settings.bankAccountType || localStorage.getItem('bankAccountType') || 'Cheque Account'
        const branchCode = settings.bankBranchCode || localStorage.getItem('bankBranchCode') || '250655'

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
        if (data.vat_applicable || (docType === 'Purchase Order' && data.metadata?.vat_applicable)) {
            // For PO with "Prices Exclude VAT" (vat_applicable=true), the total stored IS the gross?
            // Wait, in CreatePurchaseOrder we stored total = sub + vat.
            // So reverse calc is correct: total is inclusive. 
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
        addFooter(doc, 1, docType === 'Purchase Order' ? 1 : 2) // PO is 1 page usually unless long list. Simple logic.

        // --- PAGE 2: TERMS & CONDITIONS (Skip for PO) ---
        if (docType !== 'Purchase Order') {
            doc.addPage()

            doc.setFontSize(16)
            doc.setTextColor(...COLORS.NAVY)
            doc.text('GENERAL TERMS & CONDITIONS', 105, 20, { align: 'center' })

            const defaultTerms = [
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

            const termsCallback = settings.companyTerms || localStorage.getItem('companyTerms');
            const terms = termsCallback ? JSON.parse(termsCallback) : defaultTerms;

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
        }

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
            // Render Image or PDF Placeholder
            try {
                // Check if it's a PDF
                if (data.payment_proof.startsWith('data:application/pdf')) {
                    // Render PDF Placeholder
                    doc.setFillColor(240, 240, 240)
                    doc.setDrawColor(200, 200, 200)
                    doc.rect(14, 40, 180, 60, 'FD')

                    doc.setFontSize(14)
                    doc.setTextColor(...COLORS.NAVY)
                    doc.text('PDF DOCUMENT', 105, 65, { align: 'center' })

                    doc.setFontSize(10)
                    doc.setTextColor(...COLORS.GRAY_TEXT)
                    doc.text('The payment proof is a PDF document.', 105, 75, { align: 'center' })
                    doc.text('Please view the original file in the Sales Dashboard.', 105, 80, { align: 'center' })
                } else {
                    // It's likely an image (PNG/JPEG/etc)
                    let format = 'PNG'; // Default
                    if (data.payment_proof.startsWith('data:image/')) {
                        const mimeType = data.payment_proof.split(';')[0].split(':')[1];
                        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
                            format = 'JPEG';
                        }
                    }
                    // Fit max width 180, max height 200. "0" for height maintains aspect ratio in jsPDF
                    doc.addImage(data.payment_proof, format, 14, 40, 180, 0)
                }
            } catch (e) {
                console.error("Error rendering payment proof:", e)
                doc.setTextColor(255, 0, 0)
                doc.setFontSize(10)
                doc.text(`Error rendering evidence: ${e.message}`, 14, 50)
            }
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

export const generateInvoicePDF = (invoice, settings) => generatePDF('Invoice', invoice, settings)
export const generateQuotePDF = (quote, settings) => generatePDF('Quotation', quote, settings)
export const generatePurchaseOrderPDF = (po, settings) => generatePDF('Purchase Order', po, settings)
