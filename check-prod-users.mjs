import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfudcugrarerqvvyfpoz.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdWRjdWdyYXJlcnF2dnlmcG96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAzOTMwNSwiZXhwIjoyMDc4NjE1MzA1fQ.vuSRqyVsjIuz8GIMvVhQftpDIAF73AJt1crJ1F9r6G8';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔍 Checking production database for users...\n');

async function checkUsers() {
  // Get all organizations
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name');

  if (orgError) {
    console.error('❌ Error fetching organizations:', orgError.message);
    return;
  }

  console.log('📊 Organizations in production:');
  if (orgs && orgs.length > 0) {
    orgs.forEach(org => {
      console.log(`   - ${org.name} (${org.id})`);
    });
  } else {
    console.log('   ⚠️  No organizations found!');
  }

  // Get all organization members
  const { data: members, error: memberError } = await supabase
    .from('organization_members')
    .select('user_id, organization_id, role');

  if (memberError) {
    console.error('❌ Error fetching members:', memberError.message);
    return;
  }

  console.log(`\n👥 Organization members: ${members?.length || 0}`);

  if (members && members.length > 0) {
    console.table(members);
  } else {
    console.log('   ⚠️  No members found!');
  }

  // Try to list auth users (may not have permission)
  console.log('\n🔐 Auth users:');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('   ⚠️  Cannot list auth users:', authError.message);
    console.log('   (This is expected - need admin API access)');
  } else if (authData && authData.users) {
    console.log(`   Total users: ${authData.users.length}`);
    authData.users.forEach(user => {
      console.log(`   - ${user.email} (${user.id.substring(0, 8)}...)`);
    });
  }
}

checkUsers().catch(err => {
  console.error('Fatal error:', err);
});
