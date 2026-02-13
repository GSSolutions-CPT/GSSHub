
import { getDocument } from 'pdfjs-dist';
import fs from 'fs/promises';

const PDF_PATH = './Regal Price List Trade - Retail February 2026.pdf';
const OUT_PATH = './extracted_products.json';

async function run() {
    try {
        console.log(`Reading PDF from ${PDF_PATH}...`);
        const data = await fs.readFile(PDF_PATH);
        const loadingTask = getDocument({
            data: new Uint8Array(data),
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: 0
        });
        const pdfDocument = await loadingTask.promise;
        console.log(`PDF Loaded. Processing ${pdfDocument.numPages} pages...`);

        const products = [];
        let currentCategory = 'Uncategorized';
        let lastProduct = null;

        for (let i = 4; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();

            const items = textContent.items
                .filter(item => item.str.trim().length > 0)
                .map(item => ({
                    str: item.str.trim(),
                    x: item.transform[4],
                    y: item.transform[5]
                }));

            items.sort((a, b) => Math.abs(a.y - b.y) < 4 ? (a.x - b.x) : (b.y - a.y));

            let currentY = -1000;
            let line = [];
            const lines = [];

            for (const item of items) {
                if (Math.abs(item.y - currentY) > 4) {
                    if (line.length > 0) lines.push(line);
                    line = [];
                    currentY = item.y;
                }
                line.push(item);
            }
            if (line.length > 0) lines.push(line);

            for (const lineItems of lines) {
                const lineStr = lineItems.map(l => l.str).join(' ');

                if (lineStr.match(/Page: \d+/)) continue;
                if (lineStr.includes('REGAL SECURITY')) continue;
                if (lineStr.includes('subject to change')) continue;
                if (lineStr.includes('Trade Price List')) continue;
                if (lineStr.includes('Our Code')) continue;

                const parsePrice = (s) => parseFloat(s.replace(/\s/g, '').replace(',', '.'));
                const pricePattern = /^\d[\d\s]*\.\d{2}$/;
                const priceIndices = [];
                lineItems.forEach((item, idx) => {
                    if (pricePattern.test(item.str)) {
                        priceIndices.push(idx);
                    }
                });

                if (priceIndices.length >= 2) {
                    const tradePriceIndex = priceIndices[priceIndices.length - 1];
                    const retailPriceIndex = priceIndices[priceIndices.length - 2];
                    const code = lineItems[0].str; // rudimentary code detection
                    // ensure code is not too long? Codes usually < 20 chars

                    const descriptionParts = lineItems.slice(1, retailPriceIndex).map(l => l.str);
                    const description = descriptionParts.join(' ');

                    const retailPrice = parsePrice(lineItems[retailPriceIndex].str);
                    const tradePrice = parsePrice(lineItems[tradePriceIndex].str);

                    // If description is empty, maybe code was actually part of description?
                    // But with 2 prices, structure is likely strong.
                    if (code.length < 30) {
                        const product = {
                            code,
                            description,
                            category: currentCategory,
                            retail_price: retailPrice,
                            trade_price: tradePrice,
                            details: ''
                        };
                        products.push(product);
                        lastProduct = product;
                        continue;
                    }
                }

                // Not a product line (no prices detected)
                if (!lineStr.match(pricePattern)) {
                    // Deciding between Category and Details
                    // Categories:
                    // - Usually short (< 60 chars)
                    // - Rarely contain many commas
                    // - Often Uppercase (but not reliable to check without knowing case)
                    // Details:
                    // - Often follow a product
                    // - Can be long
                    // - Contain specific keywords ("Consist of", "incl", etc)

                    const isLikelyCategory = (str) => {
                        if (str.length > 60) return false;
                        if ((str.match(/,/g) || []).length > 2) return false;
                        // If it starts with lowercase, unlikely to be category
                        if (/^[a-z]/.test(str)) return false;
                        return true;
                    };

                    if (lastProduct && !isLikelyCategory(lineStr)) {
                        lastProduct.details += (lastProduct.details ? ' ' : '') + lineStr;
                    } else {
                        // If it really looks like a category, identify it
                        // e.g. "SURVEILLANCE"
                        currentCategory = lineStr;
                        lastProduct = null;
                    }
                }
            }
        }

        console.log(`Extracted ${products.length} products.`);
        await fs.writeFile(OUT_PATH, JSON.stringify(products, null, 2));
        console.log(`Saved to ${OUT_PATH}`);

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
