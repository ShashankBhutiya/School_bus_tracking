const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
const store = require('../store');
const { JWT_SECRET } = require('../middleware/auth');

async function test() {
    try {
        console.log('Starting verification...');

        // 1. Get a bus
        const buses = await store.getBuses();
        if (buses.length === 0) {
            console.log('No buses found in DB. Cannot test.');
            process.exit(1);
        }
        const bus = buses[0];
        console.log(`Using bus: ${bus.id} (${bus.bus_number})`);

        // 2. Generate tokens
        const adminToken = jwt.sign({ id: 'verifier_admin', role: 'admin', email: 'admin@verify.com' }, JWT_SECRET);
        const driverToken = jwt.sign({ id: bus.driver_id || 'driver_1', role: 'driver', email: 'driver@verify.com' }, JWT_SECRET);

        // 3. Admin Socket
        const adminSocket = io('http://localhost:3001', { auth: { token: adminToken } });

        adminSocket.on('connect', () => {
            console.log('Admin connected');
            adminSocket.emit('join_admin');
        });

        adminSocket.on('connect_error', (err) => {
            console.error('Admin connection error:', err.message);
        });

        adminSocket.on('global_update', (data) => {
            console.log('SUCCESS: Admin received global_update');
            console.log('Data:', JSON.stringify(data, null, 2));
            process.exit(0);
        });

        // 4. Driver Socket
        const driverSocket = io('http://localhost:3001', { auth: { token: driverToken } });

        driverSocket.on('connect', () => {
            console.log('Driver connected');
            driverSocket.emit('join_bus', { busId: bus.id, role: 'driver' });

            // Emit location after a delay to ensure admin is joined
            setTimeout(() => {
                console.log('Driver sending location...');
                driverSocket.emit('driver_update_location', {
                    busId: bus.id,
                    lat: 28.6139,
                    lng: 77.2090,
                    status: 'moving',
                    speed: 40
                });
            }, 1000);
        });

        driverSocket.on('connect_error', (err) => {
            console.error('Driver connection error:', err.message);
        });

        // Timeout
        setTimeout(() => {
            console.log('TIMEOUT: Admin did not receive update within 5 seconds.');
            process.exit(1);
        }, 5000);

    } catch (e) {
        console.error('Test failed with exception:', e);
        process.exit(1);
    }
}

test();
