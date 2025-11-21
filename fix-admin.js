const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'http://127.0.0.1:54321';
// Using the Secret key from status output as service_role key
const SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdminUser() {
  const email = 'admin@covaer.com';
  const password = 'password123';
  const fullName = 'Admin User';

  console.log(`Attempting to fix user ${email}...`);

  try {
    // 1. Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      // Fallback: try to create directly
    }

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      console.log(`Found existing user ${email} (ID: ${existingUser.id})`);
      console.log('Updating password and confirming email...');

      const { data, error } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: password,
          email_confirm: true,
          user_metadata: { full_name: fullName }
        }
      );

      if (error) {
        console.error('❌ Failed to update user:', error);
      } else {
        console.log('✅ User updated successfully!');
      }
    } else {
      console.log(`User ${email} not found. Creating new user...`);
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (error) {
        console.error('❌ Failed to create user:', error);
      } else {
        console.log('✅ User created successfully!');
        console.log('User ID:', data.user.id);
      }
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixAdminUser();
