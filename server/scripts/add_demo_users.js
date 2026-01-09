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

        // Clear ALL live locations to ensure no ghost buses
        await db.query("DELETE FROM live_locations");

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
