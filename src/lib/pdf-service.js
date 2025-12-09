import jsPDF from 'jspdf'
import 'jspdf-autotable'

const generatePDF = (docType, data) => {
    const doc = new jsPDF()

    // Company Logo/Header
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text('Global Security Solutions', 14, 22)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('123 Business Road, Tech City', 14, 30)
    doc.text('contact@gssolutions.co.za | +1 (555) 123-4567', 14, 35)

    // Document Info
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text(docType.toUpperCase(), 140, 22, { align: 'right' })

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`#${data.id.substring(0, 8)}`, 140, 30, { align: 'right' })
    doc.text(`Date: ${new Date(data.date_created).toLocaleDateString()}`, 140, 35, { align: 'right' })

    // Client Info
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Bill To:', 14, 50)

    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(data.clients?.name || 'Unknown Client', 14, 56)
    if (data.clients?.company) doc.text(data.clients.company, 14, 61)
    if (data.clients?.email) doc.text(data.clients.email, 14, 66)

    // Table
    // Since we don't have line items in the simple view (Sales.jsx often just loads summary), 
    // we might need to assume or fetch lines. For this implementation, 
    // we'll check if lines exist, otherwise show a summary row.

    const hasLines = data.lines && data.lines.length > 0

    const tableColumn = ["Description", "Quantity", "Unit Price", "Total"]
    const tableRows = []

    if (hasLines) {
        data.lines.forEach(line => {
            const rowData = [
                line.description || 'Item',
                line.quantity,
                `R${parseFloat(line.unit_price).toFixed(2)}`,
                `R${parseFloat(line.line_total).toFixed(2)}`
            ]
            tableRows.push(rowData)
        })
    } else {
        // Fallback summary row if detailed lines aren't loaded in the view
        tableRows.push([
            `Total ${docType} Amount`,
            '1',
            `R${parseFloat(data.total_amount).toFixed(2)}`,
            `R${parseFloat(data.total_amount).toFixed(2)}`
        ])
    }

    doc.autoTable({
        startY: 80,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
    })

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10

    doc.setFontSize(10)
    doc.text(`Total Amount: R${parseFloat(data.total_amount).toFixed(2)}`, 140, finalY, { align: 'right' })

    // Banking Details
    const bankName = localStorage.getItem('bankName') || 'FNB/RMB'
    const accHolder = localStorage.getItem('bankAccountHolder') || 'Global Security Solutions'
    const accNum = localStorage.getItem('bankAccountNumber') || '63182000223'
    const branchCode = localStorage.getItem('bankBranchCode') || '250655'
    const accType = localStorage.getItem('bankAccountType') || 'First Business Zero Account'
    const reference = localStorage.getItem('bankReference') || 'Invoice Number'

    if (accNum) {
        doc.setFontSize(11)
        doc.setTextColor(0, 0, 0)
        doc.text('Payment Information:', 14, finalY + 20)

        doc.setFontSize(10)
        doc.setTextColor(60, 60, 60)
        doc.text(`Bank: ${bankName}`, 14, finalY + 26)
        doc.text(`Account Holder: ${accHolder}`, 14, finalY + 31)
        doc.text(`Account Type: ${accType}`, 14, finalY + 36)
        doc.text(`Account Number: ${accNum}`, 14, finalY + 41)
        doc.text(`Branch Code: ${branchCode}`, 14, finalY + 46)
        doc.text(`Reference: ${reference}`, 14, finalY + 51)

        doc.setFontSize(9)
        doc.setTextColor(220, 38, 38)
        doc.text('Proof of payment must be sent to Kyle@GSSolutions.co.za', 14, finalY + 61)
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Thank you for your business.', 14, 280)

    // Save
    doc.save(`${docType}_${data.id.substring(0, 8)}.pdf`)
}

export const generateInvoicePDF = (invoice) => generatePDF('Invoice', invoice)
export const generateQuotePDF = (quote) => generatePDF('Quotation', quote)
