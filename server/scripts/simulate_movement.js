const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Use the same secret as server/middleware/auth.js
const JWT_SECRET = 'super_secret_key';

// Generate a valid token for the driver
const token = jwt.sign(
    { id: 'driver_demo', email: 'driver@demo.com', role: 'driver', name: 'Demo Driver' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

// Connect to the server
const socket = io('http://localhost:3001', {
    auth: {
        token: token
    }
});

// Mock data
const BUS_ID = 'bus_demo'; // PROD_FIX: Use a valid bus ID from the DB
const START_LAT = 31.2982;
const START_LNG = 75.5626;

// Path simulation: A simple loop around the initial location (Punjab)
const path = [
    { lat: 31.2982, lng: 75.5626 }, // Start
    { lat: 31.3000, lng: 75.5650 },
    { lat: 31.3020, lng: 75.5600 },
    { lat: 31.2982, lng: 75.5626 }
];

// Generate more points for smoothness
function interpolatePath(points, stepsPerSegment) {
    let fullPath = [];
    for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        for (let j = 0; j < stepsPerSegment; j++) {
            const t = j / stepsPerSegment;
            fullPath.push({
                lat: start.lat + (end.lat - start.lat) * t,
                lng: start.lng + (end.lng - start.lng) * t
            });
        }
    }
    return fullPath;
}

const detailedPath = interpolatePath(path, 20);
let currentIndex = 0;

socket.on('connect', () => {
    console.log('Connected to server as Driver Simulator (Demo)');

    // Join bus room
    socket.emit('join_bus', { busId: BUS_ID, role: 'driver' });

    setInterval(() => {
        const point = detailedPath[currentIndex];

        // console.log(`Sending Location: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`);

        socket.emit('driver_update_location', {
            busId: BUS_ID,
            lat: point.lat,
            lng: point.lng,
            status: 'moving',
            speed: 30 + Math.random() * 10
        });

        currentIndex = (currentIndex + 1) % detailedPath.length;
    }, 2000); // Update every 2 seconds
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});
