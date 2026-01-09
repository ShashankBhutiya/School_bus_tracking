const db = require('../db');
const bcrypt = require('bcryptjs');

async function seedDemo101() {
    try {
        console.log('🌱 Seeding Bus 101 Demo Data...');

        const passwordHash = await bcrypt.hash('123', 10);

        // 1. Users
        const users = [
            { id: 'admin_demo', name: 'Demo Admin', email: 'admin@demo.com', role: 'admin' },
            { id: 'driver_101', name: 'Driver 101', email: 'driver101@demo.com', role: 'driver' },
            { id: 'parent_101', name: 'Parent 101', email: 'parent101@demo.com', role: 'parent' }
        ];

        for (const u of users) {
            await db.query(`
                INSERT INTO users (id, name, email, password_hash, role)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (email) DO UPDATE 
                SET id = $1, name = $2, password_hash = $4, role = $5
            `, [u.id, u.name, u.email, passwordHash, u.role]);
            console.log(`✅ User ensured: ${u.email}`);
        }

        // 2. Bus
        // We need to ensure the driver is assigned to this bus.
        // First, check if bus exists to get its ID if we want to keep it, or force a fixed ID.
        // Let's use fixed ID 'bus_101' for simplicity.
        const busId = 'bus_101';
        await db.query(`
            INSERT INTO buses (id, bus_number, driver_id, route_name, current_status)
            VALUES ($1, 'BUS-101', 'driver_101', 'Demo Route 101', 'stopped')
            ON CONFLICT (id) DO UPDATE 
            SET bus_number = 'BUS-101', driver_id = 'driver_101', route_name = 'Demo Route 101'
        `, [busId]);
        console.log(`✅ Bus ensured: BUS-101 (linked to driver_101)`);

        // 3. Student
        const studentId = 'student_101';
        await db.query(`
            INSERT INTO students (id, name, parent_id, bus_id, pickup_lat, pickup_lng)
            VALUES ($1, 'Student 101', 'parent_101', 'bus_101', 28.6139, 77.2090)
            ON CONFLICT (id) DO UPDATE 
            SET name = 'Student 101', parent_id = 'parent_101', bus_id = 'bus_101'
        `, [studentId]);
        console.log(`✅ Student ensured: Student 101 (linked to parent_101 & bus_101)`);

        console.log('\n🎉 Demo Data 101 Created Successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error seeding data:', err);
        process.exit(1);
    }
}

seedDemo101();
