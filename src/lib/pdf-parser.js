import * as pdfjsLib from 'pdfjs-dist';

// Use CDN for worker to avoid build/bundling issues with Vite for now
// In a production environment, you might want to serve the worker file locally
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export const extractItemsFromPDF = async (file) => {
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onload = async function() {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        const numPages = pdf.numPages;
        let fullText = '';
        const items = [];

        // Loop through all pages
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Simple text extraction (concatenating items)
          // A more robust approach would use item.transform to sort by Y position more accurately
          const pageText = textContent.items.map(item => item.str).join(' ');
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
    // A helper to try and find structured data from the raw text
    // This is experimental and depends heavily on the specific invoice format
    const lines = text.split('\n');
    const potentialItems = [];

    // Regex for finding a line with a number (qty) and a price (currency)
    // loose regex: some text ... number ... price
    const itemRegex = /(.+?)\s+(\d+)\s+([R$€£]?\s?[\d,]+\.\d{2})/i;
    
    // Attempt another common format: Qty ... Description ... Price
    // const itemRegex2 = /(\d+)\s+(.+?)\s+([R$€£]?\s?[\d,]+\.\d{2})/i;

    // We will just return raw lines for the user to pick from or edit in the UI
    // because automatic parsing is too error-prone without specific templates.
    
    return [];
}
