const db = require('../db');

async function updateStudentLocation() {
    try {
        console.log('📍 Updating Student 101 Location...');
        const lat = 31.2972;
        const lng = 75.5727;

        await db.query(`
            UPDATE students 
            SET pickup_lat = $1, pickup_lng = $2 
            WHERE id = 'student_101'
        `, [lat, lng]);

        console.log(`✅ Student 101 updated to Green Model Town, Jalandhar (${lat}, ${lng})`);

        // Also verify
        const res = await db.query('SELECT * FROM students WHERE id = $1', ['student_101']);
        console.log('Current Record:', res.rows[0]);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateStudentLocation();
