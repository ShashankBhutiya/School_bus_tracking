const http = require('http');

const makeRequest = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
            });
        });
        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

async function check() {
    console.log('🔍 Verifying Bus 101 Credentials...');

    const creds = [
        { role: 'Admin', email: 'admin@demo.com', pass: '123' },
        { role: 'Driver', email: 'driver101@demo.com', pass: '123' },
        { role: 'Parent', email: 'parent101@demo.com', pass: '123' }
    ];

    for (const c of creds) {
        process.stdout.write(`Testing ${c.role} (${c.email})... `);
        try {
            const res = await makeRequest('POST', '/auth/login', { email: c.email, password: c.pass });
            if (res.success) {
                console.log('✅ OK');
                if (c.role === 'Parent') {
                    // Check dashboard access
                    const dash = await makeRequest('GET', '/api/parent/dashboard', null, res.token);
                    if (dash.success && dash.data.length > 0) console.log('   -> Parent Dashboard Data: ✅ Found Student/Bus');
                    else console.log('   -> Parent Dashboard Data: ❌ Missing', dash);
                }
            } else {
                console.log('❌ FAILED', res);
            }
        } catch (e) {
            console.log('❌ ERROR', e.message);
        }
    }
}

check();
