const db = require('../db');

const update = async () => {
    try {
        console.log('Fixing Attendance Schema...');
        await db.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE');
        await db.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS bus_id TEXT');
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

update();
