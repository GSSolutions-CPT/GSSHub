import { createClient } from '@supabase/supabase-js'
import { supabase as mockSupabase } from './supabase-mock'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isRealSupabase = supabaseUrl && supabaseAnonKey

export const supabase = isRealSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase

if (!isRealSupabase) {
  console.log('Running with Mock Supabase Client. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use real backend.')
}
