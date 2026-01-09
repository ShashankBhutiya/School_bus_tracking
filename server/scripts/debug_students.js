const db = require('../db');

const debug = async () => {
    try {
        console.log('--- BUSES ---');
        const buses = await db.query('SELECT * FROM buses');
        console.table(buses.rows);

        console.log('--- STUDENTS ---');
        const students = await db.query('SELECT id, name, bus_id, parent_id FROM students');
        // console.table(students.rows); // might be too big
        console.log(`Total Students: ${students.rows.length}`);

        const bus101 = buses.rows.find(b => b.bus_number === 'BUS-101');
        if (bus101) {
            console.log(`\nChecking students for BUS-101 (ID: ${bus101.id})...`);
            const busStudents = students.rows.filter(s => s.bus_id === bus101.id);
            console.log(`Count: ${busStudents.length}`);
            busStudents.forEach(s => console.log(` - ${s.name} (${s.id})`));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
