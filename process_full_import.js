import fs from 'fs';

let rawData = "";

export function appendData(chunk) {
    rawData += chunk;
}

export function processData() {
    const headerPattern = /name,code,category,retail_price,cost_price,description/g;
    let cleanData = rawData.replace(headerPattern, " ");
    cleanData = cleanData.replace(/\s+/g, ' ').trim();

    const anchorRegex = /,([A-Z0-9-\/]+),([A-Za-z0-9 &-]+),(\d+\.\d{2}),(\d+\.\d{2}),/g;

    let matches = [];
    let match;
    while ((match = anchorRegex.exec(cleanData)) !== null) {
        matches.push({
            index: match.index,
            end: match.index + match[0].length,
            code: match[1],
            category: match[2],
            retail: match[3],
            cost: match[4]
        });
    }

    let rows = [];
    let prevName = matches.length > 0 ? cleanData.substring(0, matches[0].index).trim() : "";

    for (let i = 0; i < matches.length; i++) {
        let currentMatch = matches[i];
        let nextMatch = matches[i + 1];
        let startOfBlock = currentMatch.end;
        let endOfBlock = nextMatch ? nextMatch.index : cleanData.length;
        let block = cleanData.substring(startOfBlock, endOfBlock).trim();

        let desc = "";
        let nextName = "";

        if (i === matches.length - 1) {
            desc = block;
        } else {
            let firstSpace = block.indexOf(' ');
            if (firstSpace === -1) {
                desc = block;
                nextName = "";
            } else {
                let firstWord = block.substring(0, firstSpace);
                if (/\d/.test(firstWord) || firstWord.includes("-")) {
                    desc = firstWord;
                    nextName = block.substring(firstSpace + 1);
                } else {
                    desc = "";
                    nextName = block;
                }
            }
        }

        // CSV Escape
        const safeName = prevName.replace(/"/g, '""');
        const safeDesc = desc.replace(/"/g, '""');
        rows.push(`"${safeName}","${currentMatch.code}","${currentMatch.category}",${currentMatch.retail},${currentMatch.cost},"${safeDesc}"`);
        prevName = nextName;
    }

    const header = "name,code,category,retail_price,cost_price,description";
    const csvContent = header + "\n" + rows.join("\n");
    fs.writeFileSync('products_import.csv', csvContent);
    console.log(`Generated products_import.csv with ${rows.length} rows.`);
}
