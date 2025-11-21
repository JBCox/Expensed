const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function loginUser() {
  const email = 'admin2@covaer.com';
  const password = 'password123';

  console.log(`Attempting to login ${email}...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Successfully logged in: ${email}`);
      console.log('Access Token:', data.access_token ? 'Present' : 'Missing');
    } else {
      console.log(`❌ Failed to login: ${data.msg || data.error_description || data.message}`);
      console.log('Full error:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

loginUser();
