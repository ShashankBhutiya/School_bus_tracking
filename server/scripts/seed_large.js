const db = require('../db');
const bcrypt = require('bcryptjs');

const locations = {
    school: { lat: 28.6139, lng: 77.2090 }, // New Delhi Central
    north: { lat: 28.6500, lng: 77.2100 },
    south: { lat: 28.5500, lng: 77.2100 },
    east: { lat: 28.6100, lng: 77.2600 },
    west: { lat: 28.6100, lng: 77.1600 },
};

const getRandomLoc = (base, variation = 0.02) => {
    return {
        lat: base.lat + (Math.random() - 0.5) * variation,
        lng: base.lng + (Math.random() - 0.5) * variation
    };
};

const seed = async () => {
    try {
        console.log('🧹 Cleaning database...');
        await db.query('DELETE FROM attendance');
        await db.query('DELETE FROM trip_logs');
        await db.query('DELETE FROM trips');
        await db.query('DELETE FROM live_locations');
        await db.query('DELETE FROM students');
        await db.query('DELETE FROM buses');
        await db.query('DELETE FROM routes');
        await db.query('DELETE FROM users');

        console.log('🌱 Seeding Users...');
        const passwordHash = await bcrypt.hash('123', 10);

        // 1. Admin
        await db.query("INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ('admin1', 'Super Admin', 'admin@school.com', '0000000000', $1, 'admin')", [passwordHash]);

        // 2. Drivers & Buses
        const routes = [
            { id: 'r1', name: 'Route 1 (North)', base: locations.north },
            { id: 'r2', name: 'Route 2 (South)', base: locations.south },
            { id: 'r3', name: 'Route 3 (East)', base: locations.east },
            { id: 'r4', name: 'Route 4 (West)', base: locations.west }
        ];

        let busCount = 0;
        const busIds = [];

        for (const route of routes) {
            // Create Route
            await db.query("INSERT INTO routes (id, name, waypoints, estimated_distance) VALUES ($1, $2, '[]', 10000)", [route.id, route.name]);

            // 2 Buses per route
            for (let i = 1; i <= 2; i++) {
                busCount++;
                const driverId = `driver${busCount}`;
                const busId = `bus${busCount}`;
                busIds.push({ id: busId, routeBase: route.base });

                // Driver
                await db.query(
                    "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, '5555555555', $4, 'driver')",
                    [driverId, `Driver ${busCount} (${route.name})`, `driver${busCount}@school.com`, passwordHash]
                );

                // Bus
                await db.query(
                    "INSERT INTO buses (id, bus_number, driver_id, route_name) VALUES ($1, $2, $3, $4)",
                    [busId, `BUS-${100 + busCount}`, driverId, route.name]
                );
            }
        }

        console.log(`✅ Created ${busCount} buses and drivers.`);

        // 3. Parents & Students
        let studentCount = 0;
        for (let i = 1; i <= 20; i++) {
            const parentId = `parent${i}`;
            await db.query(
                "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, '9999999999', $4, 'parent')",
                [parentId, `Parent ${i}`, `parent${i}@school.com`, passwordHash]
            );

            // 1-2 Students per parent
            const numKids = Math.random() > 0.7 ? 2 : 1;
            for (let k = 0; k < numKids; k++) {
                studentCount++;
                // Assign random bus
                const assignedBus = busIds[Math.floor(Math.random() * busIds.length)];
                const loc = getRandomLoc(assignedBus.routeBase);

                await db.query(
                    "INSERT INTO students (id, name, parent_id, bus_id, pickup_lat, pickup_lng) VALUES ($1, $2, $3, $4, $5, $6)",
                    [`student${studentCount}`, `Student ${studentCount}`, parentId, assignedBus.id, loc.lat, loc.lng]
                );
            }
        }

        console.log(`✅ Created 20 parents and ${studentCount} students.`);
        console.log('✨ Database seeding complete! Ready for demo.');

    } catch (e) {
        console.error('Error seeding data:', e);
    } finally {
        process.exit();
    }
};

seed();
