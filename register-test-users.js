#!/usr/bin/env node

// Script to register test users via Supabase Auth API
// Run with: node register-test-users.js

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const testUsers = [
  { email: 'josh@covaer.com', password: 'password123', name: 'Josh Smith' },
  { email: 'admin@covaer.com', password: 'password123', name: 'Admin User' },
  { email: 'manager@covaer.com', password: 'password123', name: 'Manager User' },
  { email: 'finance@covaer.com', password: 'password123', name: 'Finance User' }
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

  if (response.ok) {
    console.log(`✅ Registered: ${email}`);
    return data;
  } else {
    console.log(`❌ Failed to register ${email}:`, data.msg || data.error_description || data.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Registering test users...\n');

  for (const user of testUsers) {
    await registerUser(user.email, user.password, user.name);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ Done! You can now sign in with any of these accounts:');
  console.log('   Email: josh@covaer.com, manager@covaer.com, finance@covaer.com, admin@covaer.com');
  console.log('   Password: password123');
}

main().catch(console.error);
