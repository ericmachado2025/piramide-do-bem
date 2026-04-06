import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://frdpscbdtudaulscexyp.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ4MzEsImV4cCI6MjA5MDgxMDgzMX0.acvN82Uwmcfy7v5WQfQ-lSLGuYZp7UI2Oyxvbaxlt3o'

export const supabase = createClient(supabaseUrl, supabaseKey)
