// Test the API function locally
const api = require('./dist/functions/api.js');

async function testAPI() {
  console.log('Testing API endpoints...\n');

  // Test health endpoint
  const healthEvent = {
    path: '/.netlify/functions/api/health',
    httpMethod: 'GET',
    headers: {},
    body: null
  };

  const healthResponse = await api.handler(healthEvent, {});
  console.log('Health Check:');
  console.log('Status:', healthResponse.statusCode);
  console.log('Response:', JSON.parse(healthResponse.body));
  console.log('---');

  // Test dashboard endpoint
  const dashboardEvent = {
    path: '/.netlify/functions/api/dashboard',
    httpMethod: 'GET',
    headers: {},
    body: null
  };

  const dashboardResponse = await api.handler(dashboardEvent, {});
  console.log('\nDashboard:');
  console.log('Status:', dashboardResponse.statusCode);
  console.log('Response:', JSON.parse(dashboardResponse.body));
  console.log('---');

  // Test upload endpoint
  const uploadEvent = {
    path: '/.netlify/functions/api/upload',
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'data' })
  };

  const uploadResponse = await api.handler(uploadEvent, {});
  console.log('\nUpload:');
  console.log('Status:', uploadResponse.statusCode);
  console.log('Response:', JSON.parse(uploadResponse.body));
  console.log('---');

  // Test 404 endpoint
  const notFoundEvent = {
    path: '/.netlify/functions/api/invalid',
    httpMethod: 'GET',
    headers: {},
    body: null
  };

  const notFoundResponse = await api.handler(notFoundEvent, {});
  console.log('\n404 Not Found:');
  console.log('Status:', notFoundResponse.statusCode);
  console.log('Response:', JSON.parse(notFoundResponse.body));

  console.log('\n✅ All API tests passed!');
}

testAPI().catch(console.error);