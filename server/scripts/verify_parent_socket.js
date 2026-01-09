const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
const store = require('../store');
const { JWT_SECRET } = require('../middleware/auth');

async function verifyParentSocket() {
    try {
        console.log('👶 Starting Parent Socket Verification for Bus 101...');

        // 1. Setup Parent & Driver
        const parentToken = jwt.sign({ id: 'parent_101', role: 'parent', email: 'parent101@demo.com' }, JWT_SECRET);
        const driverToken = jwt.sign({ id: 'driver_101', role: 'driver', email: 'driver101@demo.com' }, JWT_SECRET);
        const busId = 'bus_101';

        // 2. Parent Socket
        const parentSocket = io('http://localhost:3001', { auth: { token: parentToken } });

        parentSocket.on('connect', () => {
            console.log('✅ Parent Connected');
            // Parent joins the bus room
            parentSocket.emit('join_bus', { busId: busId, role: 'parent' });
        });

        parentSocket.on('location_update', (data) => {
            console.log('📩 Parent received location_update:');
            console.log(`   Bus: ${data.bus_number}, Status: ${data.current_status}, Lat: ${data.location.latitude}`);

            if (data.current_status === 'moving') {
                console.log('🎉 SUCCESS: Parent received "moving" status update!');
                process.exit(0);
            }
        });

        // 3. Driver Socket (Simulates movement)
        const driverSocket = io('http://localhost:3001', { auth: { token: driverToken } });

        driverSocket.on('connect', () => {
            console.log('🚌 Driver Connected. Sending update in 2s...');

            setTimeout(() => {
                console.log('🚀 Driver sending "moving" status...');
                driverSocket.emit('driver_update_location', {
                    busId: busId,
                    lat: 28.6150,
                    lng: 77.2100,
                    status: 'moving',
                    speed: 45
                });
            }, 2000);
        });

        // Timeout
        setTimeout(() => {
            console.error('❌ TIMEOUT: Parent did not receive "moving" update.');
            process.exit(1);
        }, 10000);

    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

verifyParentSocket();
