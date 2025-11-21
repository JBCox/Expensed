#!/usr/bin/env node

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

async function verifySetup() {
  // Check organization members
  const membersResponse = await fetch(`${SUPABASE_URL}/rest/v1/organization_members?organization_id=eq.${ORG_ID}&select=user_id,role,department,is_active`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const members = await membersResponse.json();

  console.log('📊 Covaer Manufacturing Organization Members:');
  console.log('━'.repeat(60));

  for (const member of members) {
    // Get user email
    const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${member.user_id}&select=email,full_name`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    const users = await userResponse.json();
    const user = users[0];

    const email = (user?.email || 'Unknown').padEnd(25);
    const role = member.role.padEnd(10);
    const dept = member.department || 'N/A';
    console.log(`  ${email} | ${role} | ${dept}`);
  }

  console.log('━'.repeat(60));
  console.log(`\nTotal Members: ${members.length}`);
  console.log('\n✅ You can now sign in with any of these accounts:');
  console.log('   Password: password123');
  console.log('   URL: http://localhost:4200/auth/login\n');
}

verifySetup().catch(console.error);
