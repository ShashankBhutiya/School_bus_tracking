const store = require('./store');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');

module.exports = (io, socket) => {
    // Verify token
    const token = socket.handshake.auth.token;
    if (!token) {
        console.log('Socket connection rejected: No token');
        socket.disconnect();
        return;
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('Socket connection rejected: Invalid token');
            socket.disconnect();
            return;
        }

        socket.data.user = decoded;
        console.log(`Socket connected for user ${decoded.email} (${decoded.role})`);

        socket.on('join_bus', ({ busId, role }) => {
            // Security Check
            if (socket.data.user.role === 'admin' || socket.data.user.role === 'driver') {
                // Allowed
            } else if (socket.data.user.role === 'parent') {
                // In strict mode, we'd verify access against the database here.
            }

            socket.join(`bus_${busId}`);
            console.log(`Socket ${socket.id} joined bus_${busId} as ${role}`);
        });


        socket.on('driver_update_location', async ({ busId, lat, lng, status, speed }) => {
            try {
                // Update live location table
                const location = await store.updateLocation(busId, lat, lng, speed);

                // Update status if provided
                if (status) {
                    await store.updateBusStatus(busId, status);
                }

                // Fetch bus details to broadcast full object
                const bus = await store.findBusById(busId);

                if (bus) {
                    const updatePayload = {
                        ...bus,
                        location, // Latest location
                        current_status: status || bus.current_status
                    };

                    console.log(`Broadcasting update for bus ${busId} to admin_room`);
                    // Broadcast to everyone listening to this bus
                    io.to(`bus_${busId}`).emit('location_update', updatePayload);

                    // Also broadcast to admin room
                    io.to('admin_room').emit('global_update', updatePayload);
                } else {
                    console.log(`Bus ${busId} not found in store`);
                }
            } catch (e) {
                console.error('Socket update error:', e);
            }
        });

        socket.on('driver_mark_attendance', async ({ studentId, status, busId }) => {
            // Save to DB
            try {
                await store.markAttendance(studentId, status, busId);
                // Broadcast update
                io.to(`bus_${busId}`).emit('attendance_update', { studentId, status });
            } catch (e) { console.error(e); }
        });

        socket.on('join_admin', () => {
            console.log(`Socket ${socket.id} joined admin_room`);
            socket.join('admin_room');
        });
    });
};
