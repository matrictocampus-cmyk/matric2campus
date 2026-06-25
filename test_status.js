import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://igfnrntcwzotligxdslf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZm5ybnRjd3pvdGxpZ3hkc2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODQ3ODksImV4cCI6MjA3MjY2MDc4OX0.91dJ2m8wlohXfMaTJnGsxzuLp5-ZK8AvyEPnqyiabmM'
)

async function run() {
  // Login as admin
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@test.com',
    password: 'password123!'
  })

  if (error) {
    console.error('Login failed:', error)
    return
  }

  console.log('Admin logged in:', data.user.id)

  // IMPORTANT: use a REAL application id from your table
  const APPLICATION_ID = 1

  const { error: rpcError } = await supabase.rpc(
    'update_application_status',
    {
      p_application_id: APPLICATION_ID,
      p_new_status: 'submitted',
      p_comment: null
    }
  )

  if (rpcError) {
    console.error('RPC failed:', rpcError)
  } else {
    console.log('Status updated successfully')
  }
}

run()