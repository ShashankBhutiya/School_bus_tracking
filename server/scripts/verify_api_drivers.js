const http = require('http');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const token = jwt.sign({ id: 'verifier_admin', role: 'admin', email: 'admin@verify.com' }, JWT_SECRET);

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/drivers',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

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
