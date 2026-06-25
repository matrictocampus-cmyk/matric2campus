import { createClient } from '@supabase/supabase-js'

// Replace with your project info
const SUPABASE_URL = 'https://igfnrntcwzotligxdslf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZm5ybnRjd3pvdGxpZ3hkc2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODQ3ODksImV4cCI6MjA3MjY2MDc4OX0.91dJ2m8wlohXfMaTJnGsxzuLp5-ZK8AvyEPnqyiabmM'

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testAssign() {
  // Sign in as an admin
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@test.com', // your admin test account
    password: 'password123!'
  })

  if (signInError) {
    console.error('Sign in failed:', signInError)
    return
  }

  console.log('Admin logged in:', data.user.id)

  // Call the RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc('assign_next_user')

  if (rpcError) console.error('RPC failed:', rpcError)
  else console.log('RPC success:', rpcData)
}

testAssign()