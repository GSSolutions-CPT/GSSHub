
import { getDocument } from 'pdfjs-dist';
import fs from 'fs/promises';

async function run() {
    try {
        const data = await fs.readFile('./Regal Price List Trade - Retail February 2026.pdf');
        const loadingTask = getDocument({
            data: new Uint8Array(data),
            useSystemFonts: true,
            disableFontFace: true
        });
        const pdfDocument = await loadingTask.promise;

        for (let i = 4; i <= 5; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();

            const items = textContent.items
                .filter(item => item.str.trim().length > 0)
                .map(item => ({
                    str: item.str,
                    x: item.transform[4],
                    y: item.transform[5]
                }));

            // Group by Y (allow small variance for same line)
            // Sort items by Y descending, then X ascending
            items.sort((a, b) => Math.abs(a.y - b.y) < 4 ? (a.x - b.x) : (b.y - a.y));

            let currentY = -1;
            let line = [];

            console.log(`\n--- Page ${i} Analysis ---`);
            for (const item of items) {
                if (currentY === -1) currentY = item.y;

                if (Math.abs(item.y - currentY) > 4) {
                    console.log(line.join('\t'));
                    line = [];
                    currentY = item.y;
                }
                line.push(item.str);
            }
            if (line.length > 0) console.log(line.join('\t'));
        }
    } catch (err) {
        console.error(err);
    }
}

run();
