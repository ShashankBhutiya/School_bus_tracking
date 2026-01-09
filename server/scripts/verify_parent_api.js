const http = require('http');

const makeRequest = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data); // In case it's not JSON
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

async function verifyParentDashboard() {
    try {
        console.log('1. Logging in as Parent...');
        const loginData = await makeRequest('POST', '/auth/login', { email: 'parent19@school.com', password: '123' });

        if (!loginData.success) {
            console.error('Login failed:', loginData);
            return;
        }
        console.log('Login successful. Token obtained.');
        const token = loginData.token;

        console.log('\n2. Fetching Parent Dashboard...');
        const dashData = await makeRequest('GET', '/api/parent/dashboard', null, token);

        if (dashData.success) {
            console.log('Dashboard Data Received:');
            console.log(JSON.stringify(dashData.data, null, 2));
            if (Array.isArray(dashData.data)) {
                console.log(`\nSUCCESS: Received array of ${dashData.data.length} items.`);
            } else {
                console.log('\nERROR: Expected data to be an array.');
            }
        } else {
            console.error('Failed to fetch dashboard:', dashData);
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

verifyParentDashboard();
