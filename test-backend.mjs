// Test the backend API locally
import { handler } from './netlify/functions/api.mjs';

async function testBackend() {
  console.log('🧪 Testing Backend API Endpoints...\n');

  // Test 1: Health Check
  console.log('1️⃣  Testing /health endpoint:');
  const healthEvent = {
    path: '/.netlify/functions/api/health',
    httpMethod: 'GET',
    headers: {},
    body: null
  };

  try {
    const healthResponse = await handler(healthEvent, {});
    console.log('   Status:', healthResponse.statusCode);
    console.log('   Response:', JSON.parse(healthResponse.body));
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 2: Dashboard
  console.log('\n2️⃣  Testing /dashboard endpoint:');
  const dashboardEvent = {
    path: '/.netlify/functions/api/dashboard',
    httpMethod: 'GET',
    headers: {},
    body: null
  };

  try {
    const dashboardResponse = await handler(dashboardEvent, {});
    console.log('   Status:', dashboardResponse.statusCode);
    const body = JSON.parse(dashboardResponse.body);
    console.log('   Success:', body.success);
    console.log('   Message:', body.message);
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 3: Versions
  console.log('\n3️⃣  Testing /versions endpoint:');
  const versionsEvent = {
    path: '/.netlify/functions/api/versions',
    httpMethod: 'GET',
    headers: {},
    body: null
  };

  try {
    const versionsResponse = await handler(versionsEvent, {});
    console.log('   Status:', versionsResponse.statusCode);
    const body = JSON.parse(versionsResponse.body);
    console.log('   Success:', body.success);
    console.log('   Total versions:', body.total);
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 4: Upload (mock)
  console.log('\n4️⃣  Testing /upload endpoint (without file):');
  const uploadEvent = {
    path: '/.netlify/functions/api/upload',
    httpMethod: 'POST',
    headers: {
      'content-type': 'multipart/form-data'
    },
    body: null
  };

  try {
    const uploadResponse = await handler(uploadEvent, {});
    console.log('   Status:', uploadResponse.statusCode);
    const body = JSON.parse(uploadResponse.body);
    console.log('   Success:', body.success || false);
    console.log('   Message:', body.error || body.message);
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n✅ Backend API test complete!');
}

// Run tests
testBackend().catch(console.error);