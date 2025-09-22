// Test the full backend API
const api = require('./netlify/functions/api.js');

async function testFullBackend() {
  console.log('🧪 Testing Full Backend API...\n');

  // Test 1: Health Check
  console.log('1️⃣  Health Check:');
  const healthResponse = await api.handler({
    path: '/.netlify/functions/api/health',
    httpMethod: 'GET',
    headers: {},
    body: null
  }, {});
  console.log('   Status:', healthResponse.statusCode);
  console.log('   Body:', JSON.parse(healthResponse.body).message);

  // Test 2: Dashboard (empty)
  console.log('\n2️⃣  Dashboard (no data):');
  const dashboardResponse = await api.handler({
    path: '/.netlify/functions/api/dashboard',
    httpMethod: 'GET',
    headers: {},
    body: null
  }, {});
  const dashData = JSON.parse(dashboardResponse.body);
  console.log('   Status:', dashboardResponse.statusCode);
  console.log('   Message:', dashData.message);

  // Test 3: Upload data
  console.log('\n3️⃣  Upload test data:');
  const uploadResponse = await api.handler({
    path: '/.netlify/functions/api/upload',
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'test-portfolio.json',
      size: 1024,
      uploadedBy: 'Test User',
      description: 'Test portfolio data',
      data: {
        title: 'Q4 2024 Portfolio',
        projects: ['Project A', 'Project B', 'Project C']
      }
    })
  }, {});
  const uploadData = JSON.parse(uploadResponse.body);
  console.log('   Status:', uploadResponse.statusCode);
  console.log('   Success:', uploadData.success);
  console.log('   Version ID:', uploadData.version?.id);

  // Test 4: Dashboard (with data)
  console.log('\n4️⃣  Dashboard (after upload):');
  const dashboardResponse2 = await api.handler({
    path: '/.netlify/functions/api/dashboard',
    httpMethod: 'GET',
    headers: {},
    body: null
  }, {});
  const dashData2 = JSON.parse(dashboardResponse2.body);
  console.log('   Status:', dashboardResponse2.statusCode);
  console.log('   Has data:', dashData2.data.portfolioSnapshot !== null);

  // Test 5: Versions
  console.log('\n5️⃣  Version history:');
  const versionsResponse = await api.handler({
    path: '/.netlify/functions/api/versions',
    httpMethod: 'GET',
    headers: {},
    body: null
  }, {});
  const versionsData = JSON.parse(versionsResponse.body);
  console.log('   Status:', versionsResponse.statusCode);
  console.log('   Total versions:', versionsData.total);

  // Test 6: Template
  console.log('\n6️⃣  Template info:');
  const templateResponse = await api.handler({
    path: '/.netlify/functions/api/template',
    httpMethod: 'GET',
    headers: {},
    body: null
  }, {});
  const templateData = JSON.parse(templateResponse.body);
  console.log('   Status:', templateResponse.statusCode);
  console.log('   Template name:', templateData.template.name);
  console.log('   Sheets:', templateData.template.sheets.length);

  console.log('\n✅ All backend tests passed!');
}

testFullBackend().catch(console.error);