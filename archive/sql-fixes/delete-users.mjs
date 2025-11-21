import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://guxmpvwrieglrqufggbr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1eG1wdndyaWVnbHJxdWZnZ2JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTQ0MzcxOCwiZXhwIjoyMDQ3MDE5NzE4fQ.VQhH8fhXjUiQxU7j-DPjOLbNYAjXMjJQIV2fC1Wg1tQ';

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAllUsers() {
  try {
    console.log('Fetching all users...');

    // List all users using admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    console.log(`Found ${users.length} users to delete`);

    if (users.length === 0) {
      console.log('No users to delete.');
      return;
    }

    // Delete each user
    for (const user of users) {
      console.log(`Deleting user: ${user.email} (${user.id})`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error(`Error deleting user ${user.email}:`, deleteError);
      } else {
        console.log(`✓ Deleted user: ${user.email}`);
      }
    }

    console.log('\n✅ All users deleted successfully!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

deleteAllUsers();
