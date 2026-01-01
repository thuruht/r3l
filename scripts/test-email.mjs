// Test script for Email Registration Flow
// Usage: node scripts/test-email.mjs <base_url>
// Example: node scripts/test-email.mjs http://localhost:8787

const BASE_URL = process.argv[2] || 'http://localhost:8787';

async function testRegistration() {
  const timestamp = Date.now();
  const username = `testuser_${timestamp}`;
  const email = `test_${timestamp}@resend.dev`;
  const password = 'password123';

  console.log(`--- Test 1: Registering new user ---`);
  console.log(`User: ${username}`);
  console.log(`Email: ${email}`);

  try {
    const res = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });

    const data = await res.json();
    console.log('Response:', res.status, data);

    if (res.status === 200 && data.message.includes('check your email')) {
      console.log('✅ Registration successful, email trigger initiated.');
    } else {
      console.error('❌ Registration failed.');
      process.exit(1);
    }

    console.log(`
--- Test 2: Duplicate Email ---`);
    const username2 = `testuser_2_${timestamp}`;
    console.log(`Attempting to register different user with SAME email: ${email}`);
    
    const res2 = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username2, password, email }) 
    });
    
    const data2 = await res2.json();
    console.log('Response:', res2.status, data2);

    if (res2.status === 409) {
      console.log('✅ Duplicate email correctly rejected.');
    } else {
      console.error('❌ Duplicate email test failed (Expected 409).');
      // process.exit(1); // Don't exit, continue testing if possible
    }

  } catch (error) {
    console.error('Test script error:', error);
  }
}

testRegistration();
