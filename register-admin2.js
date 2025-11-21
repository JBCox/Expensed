const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function registerUser() {
  const email = 'admin2@covaer.com';
  const password = 'password123';
  const fullName = 'Admin Two';

  console.log(`Attempting to register ${email}...`);

  try {
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
      console.log(`✅ Successfully registered: ${email}`);
      console.log('User ID:', data.user?.id || data.id);
    } else {
      console.log(`❌ Failed to register: ${data.msg || data.error_description || data.message}`);
      console.log('Full error:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

registerUser();
