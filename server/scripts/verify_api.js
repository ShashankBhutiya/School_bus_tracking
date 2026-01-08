const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/buses',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer ' + 'dummy_token_will_fail_if_auth_strict_but_server_seems_lax_or_handled'
    }
};

// We need a valid token if auth is strict. 
// Let's use the login endpoint first to get a token, or just mock it if we can access store directly.
// But verifying via HTTP is better.
// Let's copy the token logic from verify_socket.js

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const token = jwt.sign({ id: 'verifier_admin', role: 'admin', email: 'admin@verify.com' }, JWT_SECRET);

options.headers['Authorization'] = `Bearer ${token}`;

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Response not JSON:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
