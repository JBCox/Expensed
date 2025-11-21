import { createClient } from '@supabase/supabase-js';

// Supabase configuration - UPDATE WITH YOUR VALUES
const supabaseUrl = 'https://bfudcugrarerqvvyfpoz.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY_HERE'; // Get from Supabase Dashboard → Settings → API

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUserProfiles() {
  try {
    console.log('Fetching all auth users...');

    // List all users using admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    console.log(`Found ${users.length} auth users`);

    if (users.length === 0) {
      console.log('No users found.');
      return;
    }

    // Check which users are missing profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('users')
      .select('id');

    if (profilesError) {
      console.error('Error fetching existing profiles:', profilesError);
      return;
    }

    const existingProfileIds = new Set(existingProfiles.map(p => p.id));

    // Create missing profiles
    let created = 0;
    for (const user of users) {
      if (!existingProfileIds.has(user.id)) {
        console.log(`Creating profile for: ${user.email} (${user.id})`);

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: 'employee'
          });

        if (insertError) {
          console.error(`Error creating profile for ${user.email}:`, insertError);
        } else {
          console.log(`✓ Created profile for: ${user.email}`);
          created++;
        }
      } else {
        console.log(`Profile already exists for: ${user.email}`);
      }
    }

    console.log(`\n✅ Created ${created} user profiles!`);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixUserProfiles();
