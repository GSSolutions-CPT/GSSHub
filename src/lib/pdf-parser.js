import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const extractItemsFromPDF = async (file) => {
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        const numPages = pdf.numPages;
        let fullText = '';


        // Loop through all pages
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();

          // Simple text extraction (concatenating items)
          // A more robust approach would use item.transform to sort by Y position more accurately
          // Simpler text extraction respecting EOL if available
          const pageText = textContent.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
          fullText += pageText + '\n';

          // Attempt to extract line items
          // This is a naive implementation. Real-world PDF parsing often requires
          // checking Y-coordinates or analyzing table structures.
          // We will look for patterns that resemble: Description ... Qty ... Price

          // Heuristic: Split by common line text items
          // This part is highly dependent on the PDF layout. 
          // For now, we will just return the full text and let the user copy-paste or 
          // allow the UI to try to regex match common patterns.

          // Let's rely on basic Regex to find 3-part structures: Text ... Number ... Currency
          // Example: "Widget A 5 $10.00"
        }

        resolve({ text: fullText, items: [] });
      } catch (error) {
        reject(error);
      }
    };

    fileReader.readAsArrayBuffer(file);
  });
};

export const parseTextToItems = (text) => {
  const items = [];

  // Strategy 1: Global "Price Qty Price" pattern (e.g. "10,500.00 1 10,500.00")
  // This is very robust for invoices that list Unit Price, Qty, Total in sequence
  // We capture the text BETWEEN these matches to find the description.

  // Regex: 
  // Group 1: Unit Price
  // Group 2: Quantity
  // Group 3: Total Price
  const priceQtyTotalRegex = /([R$€£]?\s?[\d,]+\.\d{2})\s+(\d+)\s+([R$€£]?\s?[\d,]+\.\d{2})/g;

  const matches = [...text.matchAll(priceQtyTotalRegex)];

  if (matches.length > 0) {
    let lastIndex = 0;

    matches.forEach((match) => {
      // Description is the text before this match, starting from end of previous match
      // If it's the first match, it might contain header info, but we take it anyway and let user edit.
      // To make it cleaner, we can try to find the start of the line or stripping common indices like "01", "02".

      let rawDesc = text.substring(lastIndex, match.index).trim();

      // Cleanup description: remove trailing newlines or weird chars
      // Also try to remove leading index numbers like "01 " or "1 " if they exist at the start
      rawDesc = rawDesc.replace(/^0?\d+\s+/, '');

      // If first item, the description might be huge (header). 
      // Heuristic: take last 100 chars? Or just split by newline and take last non-empty line?
      // For now, simpler is better.

      items.push({
        description: rawDesc,
        quantity: parseInt(match[2]),
        unit_price: parseFloat(match[1].replace(/[^\d.]/g, ''))
      });

      lastIndex = match.index + match[0].length;
    });

    return items;
  }

  // Strategy 2: Fallback to line-by-line strict patterns match
  const lines = text.split('\n');
  const endPattern = /^(.*?)\s+(\d+)\s+([R$€£]?\s?[\d,]+\.\d{2})$/i;
  const startPattern = /^(\d+)\s+(.+?)\s+([R$€£]?\s?[\d,]+\.\d{2})$/i;

  lines.forEach(line => {
    let match = line.trim().match(endPattern);
    if (match) {
      items.push({
        description: match[1].trim(),
        quantity: parseInt(match[2]),
        unit_price: parseFloat(match[3].replace(/[^\d.]/g, ''))
      });
      return;
    }

    match = line.trim().match(startPattern);
    if (match) {
      items.push({
        description: match[2].trim(),
        quantity: parseInt(match[1]),
        unit_price: parseFloat(match[3].replace(/[^\d.]/g, ''))
      });
    }
  });

  // Cleanup: Filter out items with 0 quantity or 0 total (likely options or headers)
  return items.filter(item => item.quantity > 0 && (item.unit_price > 0 || item.line_total > 0));
}
