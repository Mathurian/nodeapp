/**
 * Test script to verify SUPER_ADMIN bypasses rate limiting
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testRateLimitBypass() {
  try {
    console.log('Testing rate limit bypass for SUPER_ADMIN...\n');

    // Login as SUPER_ADMIN
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@eventmanager.com',
      password: 'SuperSecurePassword123!',
      tenantIdentifier: 'default'
    });

    const token = loginResponse.data.token;
    console.log('✓ Logged in as SUPER_ADMIN');

    // Make rapid requests to test rate limiting
    console.log('\nMaking 50 rapid requests to test rate limit bypass...');

    let successCount = 0;
    let failCount = 0;
    let rateLimitErrors = 0;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Slug': 'default'
    };

    for (let i = 0; i < 50; i++) {
      try {
        await axios.get(`${API_BASE}/users/me`, { headers });
        successCount++;
        process.stdout.write('.');
      } catch (error) {
        if (error.response?.status === 429) {
          rateLimitErrors++;
          process.stdout.write('X');
        } else {
          failCount++;
          process.stdout.write('!');
        }
      }
    }

    console.log('\n\n=== RESULTS ===');
    console.log(`Successful requests: ${successCount}/50`);
    console.log(`Rate limit errors (429): ${rateLimitErrors}/50`);
    console.log(`Other errors: ${failCount}/50`);

    if (rateLimitErrors === 0) {
      console.log('\n✓ SUCCESS: SUPER_ADMIN bypasses rate limiting!');
    } else {
      console.log('\n✗ FAILURE: SUPER_ADMIN is still being rate limited!');
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testRateLimitBypass();
