const db = require('../db');
const bcrypt = require('bcryptjs');

const run = async () => {
    try {
        console.log('Adding Demo Users...');
        const hash = await bcrypt.hash('123', 10);

        // 1. Driver: driver@school.com
        await db.query("DELETE FROM users WHERE email = 'driver@school.com'");
        await db.query(
            "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ('driver_demo', 'Demo Driver', 'driver@school.com', '5555555555', $1, 'driver')",
            [hash]
        );

        // Assign a bus to this driver
        await db.query("DELETE FROM buses WHERE id = 'bus_demo'");
        // Ensure route exists or use one. seed_large made r1..r4. Use r1.
        await db.query(
            "INSERT INTO buses (id, bus_number, driver_id, route_name) VALUES ('bus_demo', 'DEMO-BUS', 'driver_demo', 'Route 1 (North)')"
        );

        // 2. Parent: parent@school.com
        await db.query("DELETE FROM users WHERE email = 'parent@school.com'");
        await db.query(
            "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ('parent_demo', 'Demo Parent', 'parent@school.com', '9999999999', $1, 'parent')",
            [hash]
        );

        // Assign a student to this parent and the demo bus
        await db.query("DELETE FROM students WHERE parent_id = 'parent_demo'");
        await db.query(
            "INSERT INTO students (id, name, parent_id, bus_id, pickup_lat, pickup_lng) VALUES ('student_demo', 'Demo Student', 'parent_demo', 'bus_demo', 28.6500, 77.2100)"
        );

        // Initial Location for Demo Bus so map isn't empty
        await db.query("DELETE FROM live_locations WHERE bus_id = 'bus_demo'");
        const now = Date.now();
        await db.query(
            "INSERT INTO live_locations (bus_id, latitude, longitude, timestamp) VALUES ('bus_demo', 28.6139, 77.2090, $1)",
            [now]
        );

        console.log('✅ Demo credentials ready:');
        console.log('   Driver: driver@school.com / 123');
        console.log('   Parent: parent@school.com / 123');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
};

run();
