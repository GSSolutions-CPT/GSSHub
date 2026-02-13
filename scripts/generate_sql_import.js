
import fs from 'fs/promises';

async function run() {
    try {
        const data = await fs.readFile('./extracted_products.json', 'utf-8');
        let products = JSON.parse(data);

        // Deduplicate by code
        const uniqueProducts = new Map();
        products.forEach(p => {
            if (!uniqueProducts.has(p.code)) {
                uniqueProducts.set(p.code, p);
            }
        });
        products = Array.from(uniqueProducts.values());

        console.log(`Generating SQL for ${products.length} unique products...`);

        await fs.mkdir('./sql_chunks', { recursive: true });

        const CHUNK_SIZE = 200; // Smaller chunks for tool limits
        let chunkIndex = 0;

        const escape = (str) => {
            if (!str) return 'NULL';
            return "'" + str.replace(/'/g, "''") + "'";
        };

        for (let i = 0; i < products.length; i += CHUNK_SIZE) {
            const batch = products.slice(i, i + CHUNK_SIZE);

            let sql = `INSERT INTO products (code, name, category, retail_price, cost_price, description)\nVALUES\n`;

            const values = batch.map(p => {
                // name is description from PDF
                const name = p.description || p.code;
                const desc = p.details || null;

                return `(${escape(p.code)}, ${escape(name)}, ${escape(p.category)}, ${p.retail_price || 0}, ${p.trade_price || 0}, ${escape(desc)})`;
            }).join(',\n');

            sql += values;
            sql += `\nON CONFLICT (code) DO UPDATE SET
name = EXCLUDED.name,
category = EXCLUDED.category,
retail_price = EXCLUDED.retail_price,
cost_price = EXCLUDED.cost_price,
description = EXCLUDED.description;`;

            await fs.writeFile(`./sql_chunks/chunk_${chunkIndex}.sql`, sql);
            console.log(`Generated chunk_${chunkIndex}.sql`);
            chunkIndex++;
        }

    } catch (err) {
        console.error(err);
    }
}

run();
