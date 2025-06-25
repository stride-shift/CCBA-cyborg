// Bulk create users using Supabase Admin SDK
// Run: npm install @supabase/supabase-js
// Set your SUPABASE_SERVICE_ROLE_KEY environment variable

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'YOUR_SUPABASE_URL'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Your service role key

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function bulkCreateUsers() {
  console.log('🚀 Starting bulk user creation...')
  
  const testUsers = [
    { email: 'testuser1@example.com', password: 'password123', firstName: 'Test', lastName: 'User 1' },
    { email: 'testuser2@example.com', password: 'password123', firstName: 'Test', lastName: 'User 2' },
    { email: 'testuser3@example.com', password: 'password123', firstName: 'Test', lastName: 'User 3' },
    { email: 'testuser4@example.com', password: 'password123', firstName: 'Test', lastName: 'User 4' },
    { email: 'testuser5@example.com', password: 'password123', firstName: 'Test', lastName: 'User 5' },
    { email: 'testuser6@example.com', password: 'password123', firstName: 'Test', lastName: 'User 6' },
    { email: 'testuser7@example.com', password: 'password123', firstName: 'Test', lastName: 'User 7' },
    { email: 'testuser8@example.com', password: 'password123', firstName: 'Test', lastName: 'User 8' },
    { email: 'testuser9@example.com', password: 'password123', firstName: 'Test', lastName: 'User 9' },
    { email: 'testuser10@example.com', password: 'password123', firstName: 'Test', lastName: 'User 10' },
  ]

  for (const user of testUsers) {
    try {
      console.log(`Creating user: ${user.email}`)
      
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      })

      if (authError) {
        console.error(`Error creating auth user ${user.email}:`, authError.message)
        continue
      }

      console.log(`✅ Auth user created: ${authUser.user.email}`)

      // Create user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authUser.user.id,
          role: 'user',
          first_name: user.firstName,
          last_name: user.lastName,
          organization_name: 'Cyborg Habit Co.'
        })

      if (profileError) {
        console.error(`Error creating profile for ${user.email}:`, profileError.message)
      } else {
        console.log(`✅ Profile created for: ${user.email}`)
      }

    } catch (error) {
      console.error(`Unexpected error with ${user.email}:`, error.message)
    }
  }

  console.log('🎉 Bulk user creation completed!')
}

// Run the script
bulkCreateUsers().catch(console.error) 