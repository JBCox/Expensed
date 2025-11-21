#!/usr/bin/env node

/**
 * Complete Dev Setup Script
 * 1. Registers test users via Supabase Auth
 * 2. Adds them to the Covaer Manufacturing organization
 * 3. Assigns appropriate roles
 */

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; // Covaer Manufacturing

const testUsers = [
  { email: 'josh@covaer.com', password: 'password123', name: 'Josh Smith', role: 'employee', department: 'Shipping' },
  { email: 'admin@covaer.com', password: 'password123', name: 'Admin User', role: 'admin', department: 'Administration' },
  { email: 'manager@covaer.com', password: 'password123', name: 'Manager User', role: 'manager', department: 'Operations' },
  { email: 'finance@covaer.com', password: 'password123', name: 'Finance User', role: 'finance', department: 'Finance' }
];

async function registerUser(email, password, fullName) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      email: email,
      password: password,
      data: {
        full_name: fullName
      }
    })
  });

  const data = await response.json();

  if (response.ok && data.user) {
    console.log(`✅ Registered: ${email} (ID: ${data.user.id})`);
    return data.user;
  } else {
    // User might already exist - try to get their ID
    console.log(`⚠️  User may already exist: ${email}`);
    return null;
  }
}

async function addUserToOrganization(userId, email, role, department) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/organization_members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      organization_id: ORG_ID,
      user_id: userId,
      role: role,
      department: department,
      is_active: true
    })
  });

  if (response.ok || response.status === 201) {
    console.log(`   ✓ Added to organization with role: ${role}`);
    return true;
  } else {
    const error = await response.text();
    console.log(`   ✗ Failed to add to organization: ${error}`);
    return false;
  }
}

async function updateUserOrganizationId(userId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      organization_id: ORG_ID
    })
  });

  if (response.ok) {
    console.log(`   ✓ Updated user profile with organization_id`);
  }
}

async function main() {
  console.log('🚀 Setting up test users for Covaer Manufacturing...\n');
  console.log(`Organization ID: ${ORG_ID}\n`);

  for (const user of testUsers) {
    console.log(`\n📧 Processing: ${user.email}`);

    const authUser = await registerUser(user.email, user.password, user.name);

    if (authUser && authUser.id) {
      // Add to organization
      await addUserToOrganization(authUser.id, user.email, user.role, user.department);
      await updateUserOrganizationId(authUser.id);
    } else {
      console.log(`   ⏭️  Skipping organization setup (user may already be configured)`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n\n✅ Setup complete!\n');
  console.log('You can now sign in with any of these accounts:');
  console.log('━'.repeat(60));
  testUsers.forEach(u => {
    console.log(`  ${u.email.padEnd(25)} | ${u.role.padEnd(10)} | password123`);
  });
  console.log('━'.repeat(60));
  console.log('\n🌐 Login at: http://localhost:4200/auth/login\n');
}

main().catch(console.error);
