#!/usr/bin/env node

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function checkUsers() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=email,organization_id`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const users = await response.json();

  console.log('📧 Registered Users:');
  console.log('━'.repeat(60));
  users.forEach(u => {
    const orgId = u.organization_id ? u.organization_id.substring(0, 8) + '...' : 'None';
    console.log(`  ${u.email.padEnd(30)} | Org: ${orgId}`);
  });
  console.log('━'.repeat(60));
  console.log(`\nTotal: ${users.length} users\n`);
  console.log('✅ Correct emails to use:');
  console.log('   josh@covaer.com');
  console.log('   admin@covaer.com');
  console.log('   manager@covaer.com');
  console.log('   finance@covaer.com');
  console.log('\n   Password: password123\n');
}

checkUsers().catch(console.error);
