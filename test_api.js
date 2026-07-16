import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 5000, // assuming backend is 5000
  path: '/api/missions/m_c1331960/submissions',
  method: 'GET',
  headers: {
    // We don't have a token, so we'll probably get 401. But let's see.
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
});
req.on('error', e => console.error(e));
req.end();
