const db = require('../db');

const verify = async () => {
    try {
        console.log('Verifying Data...');
        const users = await db.query('SELECT role, count(*) FROM users GROUP BY role');
        console.table(users.rows);

        const buses = await db.query('SELECT * FROM buses');
        console.log('Buses:', buses.rows.length);
        if (buses.rows.length > 0) {
            console.log('Bus Driver ID:', buses.rows[0].driver_id);
            console.log('Bus Status:', buses.rows[0].current_status);
        }

        const students = await db.query('SELECT * FROM students');
        console.log('Students:', students.rows.length);
        if (students.rows.length > 0) {
            console.log('Sample Student:', students.rows[0].name);
            console.log('  -> Parent ID:', students.rows[0].parent_id);
            console.log('  -> Bus ID:', students.rows[0].bus_id);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verify();
