const http = require('http');

// Get the bus ID first, or just hardcode if we know it from seed (bus_demo_...)
// Actually, let's fetch buses -> pick one -> fetch students

const getJSON = (path) => {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3001/api${path}`, {
            headers: { 'Authorization': 'Bearer mocking_token_middleware_bypass_if_possible_or_login' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
};

// Wait, the API requires a valid token. 
// I'll assume the previous seed script created "driver.demo@example.com" with password "password123".
// I need to login first to get a token.

const login = async () => {
    const postData = JSON.stringify({
        email: 'driver.demo@example.com',
        password: 'password123'
    });

    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
};

const verify = async () => {
    try {
        console.log('Logging in...');
        const loginRes = await login();
        if (!loginRes.success) throw new Error('Login failed: ' + loginRes.message);
        const token = loginRes.token;
        console.log('Logged in. Token acquired.');

        // Get driver's bus
        const options = { headers: { 'Authorization': `Bearer ${token}` } };

        // Helper for authorized GET
        const authGet = (path) => new Promise((resolve, reject) => {
            http.get({
                hostname: 'localhost',
                port: 3001,
                path: '/api' + path,
                headers: { 'Authorization': `Bearer ${token}` }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        console.log('Fetching Buses...');
        // Driver endpoint returns list of buses? or filtered?
        // api.js: /buses -> filtered by role.
        const busRes = await authGet('/buses');
        if (!busRes.success) throw new Error('Failed to fetch buses');

        const myBus = busRes.buses.find(b => b.driver_id === loginRes.user.id);
        if (!myBus) throw new Error('No bus assigned to driver');
        console.log('Found Bus:', myBus.id, myBus.bus_number);

        console.log('Fetching Students for Bus...');
        const stuRes = await authGet(`/buses/${myBus.id}/students`);

        if (stuRes.success) {
            console.log('✅ Success! Found students:', stuRes.students.length);
            stuRes.students.forEach(s => console.log(` - ${s.name}`));
        } else {
            console.error('❌ Failed:', stuRes.error);
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
};

verify();
