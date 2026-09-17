const BASE = 'http://localhost:3000/api/v1';

async function main() {
  // Test 1: forgot-password with non-existent email
  console.log('=== POST /api/v1/auth/forgot-password (non-existent email) ===');
  try {
    const res = await fetch(`${BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'no-existe-123@example.com' }),
    });
    const body = await res.json().catch(() => null);
    console.log('HTTP status:', res.status);
    console.log('Response:', JSON.stringify(body));
  } catch (e) {
    console.log('ERROR:', (e as Error).message);
  }

  // Test 2: forgot-password with existing email
  console.log('\n=== POST /api/v1/auth/forgot-password (existing email) ===');
  try {
    const res = await fetch(`${BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cliente@surtitelas.com' }),
    });
    const body = await res.json().catch(() => null);
    console.log('HTTP status:', res.status);
    console.log('Response:', JSON.stringify(body));
  } catch (e) {
    console.log('ERROR:', (e as Error).message);
  }

  // Test 3: reset-password with a clearly invalid token
  console.log('\n=== POST /api/v1/auth/reset-password (invalid token) ===');
  try {
    const res = await fetch(`${BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalidtoken123', newPassword: 'Password123!' }),
    });
    const body = await res.json().catch(() => null);
    console.log('HTTP status:', res.status);
    console.log('Response:', JSON.stringify(body));
  } catch (e) {
    console.log('ERROR:', (e as Error).message);
  }

  // Test 4: Try /api/v1/recovery/reset-password
  console.log('\n=== POST /api/v1/recovery/reset-password (invalid token) ===');
  try {
    const res = await fetch(`${BASE}/recovery/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalidtoken123', newPassword: 'Password123!' }),
    });
    const body = await res.json().catch(() => null);
    console.log('HTTP status:', res.status);
    console.log('Response:', JSON.stringify(body));
  } catch (e) {
    console.log('ERROR:', (e as Error).message);
  }

  // Test 5: Check health endpoint
  console.log('\n=== GET /health ===');
  try {
    const res = await fetch(`${BASE.replace('/api/v1', '')}/health`);
    const body = await res.json().catch(() => null);
    console.log('HTTP status:', res.status);
    console.log('Response:', JSON.stringify(body));
  } catch (e) {
    console.log('ERROR:', (e as Error).message);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
