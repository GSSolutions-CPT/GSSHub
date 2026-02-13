/* eslint-env node */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')

let env = {}
try {
    const envFile = fs.readFileSync(envPath, 'utf8')
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=')
        if (key && value) {
            env[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
        }
    })
} catch (e) {
    console.error('Error reading .env file:', e)
}

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseServiceKey = env.VITE_SUPABASE_ANON_KEY // Using Anon key for check

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkLeadsTable() {
    console.log('Checking for "leads" table...')

    try {
        const { count, error } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })

        if (error) {
            if (error.code === '42P01') { // undefined_table
                console.log('Leads table does NOT exist.')
            } else {
                console.error('Error checking leads table:', error)
            }
        } else {
            console.log('Leads table EXISTS.')
        }
    } catch (err) {
        console.error('Unexpected error:', err)
    }
}

checkLeadsTable()
