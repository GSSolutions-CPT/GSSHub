
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Credentials from .env
const SUPABASE_URL = 'https://vtyhrydpbqdnoysuuhot.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eWhyeWRwYnFkbm95c3V1aG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzY3MTcsImV4cCI6MjA3OTI1MjcxN30.NsG9yp0cSgZBco7cp9gR6zpfrxCeNM0-2wvnplZiQG8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    try {
        const data = await fs.readFile('./extracted_products.json', 'utf-8');
        const products = JSON.parse(data);

        console.log(`Importing ${products.length} products...`);

        const BATCH_SIZE = 50;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE).map(p => ({
                code: p.code,
                name: p.description,
                category: p.category,
                retail_price: p.retail_price,
                cost_price: p.trade_price,
                description: p.details || null
            }));

            const { error } = await supabase.from('products').upsert(batch, { onConflict: 'code' });

            if (error) {
                console.error(`Error importing batch ${i}:`, error.message);
                errorCount += batch.length;
            } else {
                console.log(`Imported batch ${i} - ${Math.min(i + BATCH_SIZE, products.length)}`);
                successCount += batch.length;
            }
        }

        console.log(`Import complete. Success: ${successCount}, Failed: ${errorCount}`);

    } catch (err) {
        console.error('Script Error:', err);
    }
}

run();
