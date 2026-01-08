const express = require('express');
const router = express.Router();
const store = require('../store');
const { verifyToken, requireRole } = require('../middleware/auth');

// Apply verifyToken to all routes in this file
router.use(verifyToken);

// --- Routes ---
router.get('/routes', async (req, res) => {
    try {
        const routes = await store.getRoutes();
        res.json({ success: true, routes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/routes', requireRole('admin'), async (req, res) => {
    try {
        const { name, waypoints, estimated_distance } = req.body;
        const id = 'route_' + Date.now();
        await store.addRoute({ id, name, waypoints: waypoints || [], estimated_distance: estimated_distance || 0 });
        res.json({ success: true, message: 'Route added' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Buses ---
router.get('/buses', async (req, res) => {
    try {
        const buses = await store.getBuses();
        const locations = await store.getLiveLocations(); // Returns map { busId: loc }

        if (req.user.role === 'admin') {
            const result = buses.map(bus => {
                const loc = locations[bus.id];
                return { ...bus, location: loc || null };
            });
            res.json({ success: true, buses: result });
        } else if (req.user.role === 'driver') {
            res.json({ success: true, buses: buses });
        } else {
            res.status(403).json({ success: false, message: 'Access denied' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/buses', requireRole('admin'), async (req, res) => {
    try {
        const { bus_number, driver_id, route_name } = req.body;
        const id = 'bus_' + Date.now();
        await store.addBus({ id, bus_number, driver_id, route_name });
        res.json({ success: true, message: 'Bus added' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/buses/:id', requireRole('admin'), async (req, res) => {
    try {
        await store.removeBus(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Drivers ---
router.get('/drivers', requireRole('admin'), async (req, res) => {
    try {
        const drivers = await store.getUsersByRole('driver');
        res.json({ success: true, drivers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/drivers', requireRole('admin'), async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const id = 'user_' + Date.now();
        await store.addUser({ id, name, email, phone, password_hash: password || '123', role: 'driver' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/drivers/:id', requireRole('admin'), async (req, res) => {
    try {
        await store.removeUser(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Students ---
router.get('/students', requireRole('admin'), async (req, res) => {
    try {
        const students = await store.getStudents();
        res.json({ success: true, students });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/students', requireRole('admin'), async (req, res) => {
    try {
        const { name, parent_id, bus_id, pickup_lat, pickup_lng } = req.body;
        const id = 'stu_' + Date.now();
        await store.addStudent({ id, name, parent_id, bus_id, pickup_lat, pickup_lng });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Parent Data Fetching ---
router.get('/parent/my-bus', async (req, res) => {
    try {
        const userId = req.user.id;
        const myStudent = await store.findStudentByParentId(userId);

        if (myStudent && myStudent.bus_id) {
            const bus = await store.findBusById(myStudent.bus_id);
            const locations = await store.getLiveLocations();
            const loc = locations[myStudent.bus_id];

            if (bus) {
                res.json({ success: true, bus: { ...bus, location: loc } });
                return;
            }
        }
        res.status(404).json({ success: false, message: 'No active bus found for your student' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/bus/:id', async (req, res) => {
    try {
        if (req.user.role === 'parent') {
            const userId = req.user.id;
            const myStudent = await store.findStudentByParentAndBus(userId, req.params.id);
            if (!myStudent) {
                return res.status(403).json({ success: false, message: 'Not authorized for this bus' });
            }
        }

        const bus = await store.findBusById(req.params.id);
        const locations = await store.getLiveLocations();
        const loc = locations[req.params.id];

        if (bus) {
            res.json({ success: true, bus: { ...bus, location: loc } });
        } else {
            res.status(404).json({ success: false });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- History ---
router.get('/trips/:busId/history', async (req, res) => {
    try {
        const logs = await store.getTripLogs(req.params.busId);
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
