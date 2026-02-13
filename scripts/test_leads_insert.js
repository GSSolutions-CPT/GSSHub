/* eslint-env node */
import { createClient } from '@supabase/supabase-js'

// GSSHUB Credentials
const supabaseUrl = 'https://vtyhrydpbqdnoysuuhot.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eWhyeWRwYnFkbm95c3V1aG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzY3MTcsImV4cCI6MjA3OTI1MjcxN30.NsG9yp0cSgZBco7cp9gR6zpfrxCeNM0-2wvnplZiQG8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPublicInsert() {
    console.log('Testing PUBLIC INSERT into "clients" table...')

    const testClient = {
        name: 'Integration Test User',
        email: 'test@example.com',
        phone: '0000000000',
        company: 'Review Me - Website Lead',
        address: 'Test Suburb',
        // additional fields if needed
    }

    try {
        const { data, error } = await supabase
            .from('clients')
            .insert([testClient])
            .select()

        if (error) {
            console.error('INSERT FAILED:', error)
            if (error.code === '42501') {
                console.log('Reason: RLS Policy Violation (Permission Denied). You (anon role) cannot insert into clients table.')
            }
            process.exit(1)
        }

        console.log('INSERT SUCCESSFUL for:', data)

        // Attempt Cleanup
        const { error: deleteError } = await supabase.from('clients').delete().eq('id', data[0].id)
        if (deleteError) {
            console.log('Cleanup failed (expected since anons usually cant delete):', deleteError.message)
        } else {
            console.log('Cleanup successful.')
        }

        process.exit(0)
    } catch (err) {
        console.error('Unexpected error:', err)
        process.exit(1)
    }
}

testPublicInsert()
