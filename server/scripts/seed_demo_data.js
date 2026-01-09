const db = require('../db');
// uuid removed

// Actually, looking at package.json (from file list earlier), I don't see uuid in the file list but I can't be sure. 
// I'll stick to string concatenation for IDs to be safe and dependency-free for now, or use crypto.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateId = (prefix) => `${prefix}_${crypto.randomBytes(4).toString('hex')}`;

const seedData = async () => {
    try {
        console.log('🌱 Starting Seed Process...');

        const hashedPassword = await bcrypt.hash('password123', 10);

        // 0. Create an Admin
        const adminId = generateId('admin');
        const adminEmail = 'admin.demo@example.com';
        console.log(`Creating Admin: ${adminEmail}`);

        // Clean up admin if exists
        await db.query('DELETE FROM users WHERE email = $1', [adminEmail]);

        await db.query(
            'INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
            [adminId, 'Demo Admin', adminEmail, '555-0000', hashedPassword, 'admin']
        );

        // 1. Create a Driver
        const driverId = generateId('driver');
        const driverEmail = 'driver.demo@example.com';
        console.log(`Creating Driver: ${driverEmail}`);

        // Clean up if exists (optional, purely for robust demo re-runs)
        await db.query("DELETE FROM users WHERE email IN ($1, 'driver@school.com', 'admin@school.com', 'parent@school.com')", [driverEmail]);
        // Also remove old drivers by role if we want a clean slate? No, might kill valid users.
        // Just remove confirmed conflicts.
        await db.query("DELETE FROM buses WHERE bus_number IN ('BUS-101', 'DEMO-BUS', 'BUS-001')");
        await db.query("DELETE FROM students WHERE bus_id IN (SELECT id FROM buses WHERE bus_number IN ('DEMO-BUS', 'BUS-001'))");

        // We need to delete students FIRST before deleting buses if there is FK constraint (which there isn't strictly enforced in my memory, but good practice)
        // Actually, schema might have references.
        // Let's safe delete:
        // 1. Delete students of old buses.
        // 2. Delete old buses.
        // 3. Delete old users.

        console.log('Cleaning up old data...');
        const conflictingBuses = ['DEMO-BUS', 'BUS-001'];
        for (const bNum of conflictingBuses) {
            const bRes = await db.query('SELECT id FROM buses WHERE bus_number = $1', [bNum]);
            if (bRes.rows.length > 0) {
                const oldBusId = bRes.rows[0].id;
                await db.query('DELETE FROM attendance WHERE bus_id = $1', [oldBusId]);
                await db.query('DELETE FROM students WHERE bus_id = $1', [oldBusId]);
                await db.query('DELETE FROM buses WHERE id = $1', [oldBusId]);
            }
        }
        await db.query("DELETE FROM users WHERE email IN ('driver@school.com', 'parent@school.com', 'driver@bus.com')");

        await db.query('DELETE FROM users WHERE email = $1', [driverEmail]);

        await db.query(
            'INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
            [driverId, 'Demo Driver', driverEmail, '555-0101', hashedPassword, 'driver']
        );

        // 2. Create a Bus
        const busId = generateId('bus');
        const busNumber = 'BUS-101';
        console.log(`Creating Bus: ${busNumber}`);

        // Cleanup bus with same number
        await db.query('DELETE FROM buses WHERE bus_number = $1', [busNumber]);

        await db.query(
            'INSERT INTO buses (id, bus_number, driver_id, route_name, current_status) VALUES ($1, $2, $3, $4, $5)',
            [busId, busNumber, driverId, 'School Route A', 'stopped']
        );

        // 3. Create 7 Parents and 7 Students
        for (let i = 1; i <= 7; i++) {
            const parentId = generateId('parent');
            const parentEmail = `parent.demo${i}@example.com`;
            console.log(`Creating Parent ${i}: ${parentEmail}`);

            await db.query('DELETE FROM users WHERE email = $1', [parentEmail]);

            await db.query(
                'INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
                [parentId, `Parent Demo ${i}`, parentEmail, `555-020${i}`, hashedPassword, 'parent']
            );

            const studentId = generateId('student');
            const studentName = `Student Demo ${i}`;
            // Spread lat/lng slightly around a central point (e.g., New Delhi)
            const baseLat = 28.6139;
            const baseLng = 77.2090;
            const lat = baseLat + (Math.random() * 0.02 - 0.01);
            const lng = baseLng + (Math.random() * 0.02 - 0.01);

            console.log(`  -> Linking Student: ${studentName}`);

            await db.query(
                'INSERT INTO students (id, name, parent_id, bus_id, pickup_lat, pickup_lng) VALUES ($1, $2, $3, $4, $5, $6)',
                [studentId, studentName, parentId, busId, lat, lng]
            );
        }

        console.log('✅ Seeding Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding data:', err);
        process.exit(1);
    }
};

seedData();
